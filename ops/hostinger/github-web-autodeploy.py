"""Pull verified GitHub main commits. No inbound port, token or SSH key needed."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import os
import re
import shutil
import socket
import subprocess
import urllib.parse
import urllib.request

REPOSITORY = 'moonsightmedia/KWS-BETA-APP'
REPOSITORY_ID = 1085646768
WORKFLOW = '.github/workflows/web-production.yml'
VERIFY_JOB = 'Verify web release'
INSTALL = Path('/opt/kws/github-web-autodeploy')
STATE = Path('/var/lib/kws-web-autodeploy')
WEB = Path('/opt/kws/web-production')
API = 'https://api.github.com/repos/' + REPOSITORY


def sha(value):
    if not isinstance(value, str) or not re.fullmatch('[0-9a-f]{40}', value):
        raise ValueError('Invalid revision')
    return value


def get_json(url):
    request = urllib.request.Request(url, headers={
        'User-Agent': 'KWS-web-autodeploy', 'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28', 'Cache-Control': 'no-cache'})
    with urllib.request.urlopen(request, timeout=30) as response:
        return json.load(response)


def main_revision():
    # Git transport avoids spending GitHub's anonymous REST allowance when idle.
    result = subprocess.run(['git', 'ls-remote', '--exit-code',
                             'https://github.com/' + REPOSITORY + '.git', 'refs/heads/main'],
                            capture_output=True, text=True, timeout=30, check=True,
                            env={**os.environ, 'GIT_TERMINAL_PROMPT': '0'})
    fields = result.stdout.strip().split()
    if len(fields) != 2 or fields[1] != 'refs/heads/main':
        raise ValueError('Unexpected branch response')
    return sha(fields[0])


def verified_run(runs, revision):
    # Select the newest attempt; an older green run cannot override a newer failure.
    matching = [run for run in runs if run.get('head_sha') == revision
                and run.get('head_branch') == 'main'
                and run.get('event') in ('push', 'workflow_dispatch')
                and run.get('path', '').split('@')[0] == WORKFLOW
                and run.get('repository', {}).get('id') == REPOSITORY_ID
                and run.get('head_repository', {}).get('id') == REPOSITORY_ID]
    if not matching:
        return None
    run = max(matching, key=lambda item: item['id'])
    if run.get('status') not in ('in_progress', 'completed'):
        return None
    if run.get('conclusion') not in (None, 'success'):
        return None
    return run


def verification_passed(jobs):
    checks = [job for job in jobs if job.get('name') == VERIFY_JOB]
    return len(checks) == 1 and checks[0].get('status') == 'completed' and checks[0].get('conclusion') == 'success'


def is_forward_release(comparison, previous, revision):
    return (comparison.get('status') == 'ahead'
            and comparison.get('base_commit', {}).get('sha') == previous
            and comparison.get('merge_base_commit', {}).get('sha') == previous
            and comparison.get('commits', [])
            and comparison['commits'][-1].get('sha') == revision)


def save_status(status, **fields):
    value = {'status': status, 'observed_at': datetime.now(timezone.utc).isoformat(), **fields}
    target = STATE / 'status.json'
    temporary = STATE / 'status.tmp'
    temporary.write_text(json.dumps(value) + '\n')
    temporary.replace(target)
    if status == 'deployed':
        (STATE / 'last-deployment.json').write_text(json.dumps(value) + '\n')
    print(json.dumps(value), flush=True)
    return value


def tick():
    previous = sha(json.loads((WEB / 'SOURCE.json').read_text())['revision'])
    revision = main_revision()
    if revision == previous:
        return save_status('up_to_date', revision=revision)
    query = urllib.parse.urlencode({'branch': 'main', 'head_sha': revision, 'per_page': 20})
    runs = get_json(API + '/actions/workflows/web-production.yml/runs?' + query)
    run = verified_run(runs.get('workflow_runs', []), revision)
    if run is None:
        return save_status('waiting_for_checks', revision=revision, live_revision=previous)
    run_id, attempt = int(run['id']), int(run['run_attempt'])
    jobs = get_json(API + '/actions/runs/' + str(run_id) + '/attempts/' + str(attempt) + '/jobs?per_page=100')
    if not verification_passed(jobs.get('jobs', [])):
        return save_status('waiting_for_checks', revision=revision, run_id=run_id, live_revision=previous)
    identity = {'revision': revision, 'run_id': run_id, 'run_attempt': attempt}
    failure_file = STATE / 'failed.json'
    if failure_file.exists() and json.loads(failure_file.read_text()) == identity:
        return save_status('failed_attempt_requires_rerun', **identity, live_revision=previous)
    comparison = get_json(API + '/compare/' + previous + '...' + revision)
    if not is_forward_release(comparison, previous, revision):
        return save_status('non_forward_release_blocked', **identity, live_revision=previous)
    if shutil.disk_usage(WEB).free < 3 * 1024**3:
        raise RuntimeError('Insufficient free disk space for a retained release')
    operator = INSTALL / 'update-production-web.py'
    expected = json.loads((INSTALL / 'config.json').read_text())['operator_sha256']
    if hashlib.sha256(operator.read_bytes()).hexdigest() != expected:
        raise RuntimeError('Installed deployment operator differs')
    archive_url = 'https://github.com/' + REPOSITORY + '/archive/' + revision + '.tar.gz'
    with urllib.request.urlopen(archive_url, timeout=120) as response:
        archive = response.read(256 * 1024**2 + 1)
    if len(archive) > 256 * 1024**2:
        raise RuntimeError('Unexpected source archive size')
    archive_hash = hashlib.sha256(archive).hexdigest()
    del archive
    # A newer push or manual release takes precedence over this pending candidate.
    if main_revision() != revision or json.loads((WEB / 'SOURCE.json').read_text())['revision'] != previous:
        return save_status('superseded', **identity, live_revision=previous)
    save_status('deploying', **identity, archive_sha256=archive_hash)
    # Never execute a candidate's deployment scripts or apply its SQL migrations.
    with (STATE / 'operator.log').open('ab') as log:
        result = subprocess.run(['/usr/bin/python3', str(operator), '--revision', revision,
                                 '--archive-sha256', archive_hash, '--expected-revision', previous,
                                 '--web-only'], stdout=log, stderr=log, check=False)
    actual = sha(json.loads((WEB / 'SOURCE.json').read_text())['revision'])
    if result.returncode != 0 or actual != revision:
        failure_file.write_text(json.dumps(identity) + '\n')
        save_status('deployment_failed', **identity, live_revision=actual)
        raise RuntimeError('Deployment failed; inspect protected operator and build logs')
    proof = get_json('https://beta.kletterwelt-sauerland.de/release.json?revision=' + revision)
    if proof.get('revision') != revision:
        raise RuntimeError('Public release proof differs')
    return save_status('deployed', **identity, live_revision=revision, archive_sha256=archive_hash)


def main():
    import fcntl
    assert os.geteuid() == 0 and socket.gethostname().split('.')[0] == 'srv2044594'
    os.umask(0o077)
    STATE.mkdir(mode=0o700, parents=True, exist_ok=True)
    with Path('/run/lock/kws-web-autodeploy.lock').open('w') as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return
        try:
            tick()
        except Exception as error:
            save_status('error', error_type=type(error).__name__)
            raise SystemExit(1)


if __name__ == '__main__':
    main()
