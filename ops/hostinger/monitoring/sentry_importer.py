"""Read Sentry issue summaries without copying events, users or raw messages."""
import argparse
import json
from pathlib import Path
import re
import urllib.parse

from common import Database, MonitoringError, ROOT, activation_valid, get_json, log_status, private_json, safe_integer, timestamp


ORIGINS = ('https://sentry.io', 'https://de.sentry.io', 'https://us.sentry.io')
ERROR_TYPES = ('TypeError', 'ReferenceError', 'SyntaxError', 'RangeError', 'NetworkError', 'TimeoutError', 'AbortError', 'Error')


def settings(config):
    value = config.get('sentry', {})
    origin = value.get('origin', 'https://sentry.io')
    organization = value.get('organization', '')
    projects = value.get('projects', [])
    if origin not in ORIGINS or not re.fullmatch(r'[a-zA-Z0-9_-]{1,100}', organization):
        raise MonitoringError('sentry_settings_invalid')
    if not isinstance(projects, list) or not 1 <= len(projects) <= 10:
        raise MonitoringError('sentry_projects_invalid')
    if any(not re.fullmatch(r'[a-zA-Z0-9_-]{1,100}', str(project)) for project in projects):
        raise MonitoringError('sentry_projects_invalid')
    return origin, organization, [str(project) for project in projects]


def summary(issue, origin, organization):
    issue_id = str(issue.get('id', ''))
    if not re.fullmatch(r'\d{1,30}', issue_id):
        raise MonitoringError('sentry_issue_id_invalid')
    short_id = str(issue.get('shortId', issue_id))
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,100}', short_id):
        short_id = issue_id
    status = issue.get('status')
    if status not in ('unresolved', 'resolved', 'ignored'):
        raise MonitoringError('sentry_issue_status_unsupported')
    level = issue.get('level') if issue.get('level') in ('fatal', 'error', 'warning', 'info', 'debug') else 'error'
    project = str(issue.get('project', {}).get('slug', ''))
    if not re.fullmatch(r'[A-Za-z0-9_-]{1,100}', project):
        raise MonitoringError('sentry_project_invalid')
    lifetime = issue.get('lifetime') or issue
    error_type = (issue.get('metadata') or {}).get('type')
    title = (error_type if error_type in ERROR_TYPES else 'Sentry-Problem') + ' (' + short_id + ')'
    return {
        'external_id': issue_id,
        'title': title,
        'short_id': short_id,
        'project_slug': project,
        'status': status,
        'level': level,
        'count': safe_integer(lifetime.get('count', 0)),
        'user_count': safe_integer(lifetime.get('userCount', 0)),
        'first_seen': timestamp(lifetime.get('firstSeen')),
        'last_seen': timestamp(lifetime.get('lastSeen')),
        'permalink': origin + '/organizations/' + organization + '/issues/' + issue_id + '/',
    }


def next_cursor(link, origin, expected_path):
    for item in str(link or '').split(','):
        if 'rel="next"' not in item or 'results="true"' not in item:
            continue
        match = re.search(r'<([^>]+)>', item)
        if not match:
            raise MonitoringError('sentry_pagination_invalid')
        parsed = urllib.parse.urlsplit(match.group(1))
        if parsed.scheme + '://' + parsed.netloc != origin or parsed.path != expected_path:
            raise MonitoringError('sentry_pagination_origin_rejected')
        cursor = urllib.parse.parse_qs(parsed.query).get('cursor', [''])[0]
        if not re.fullmatch(r'[A-Za-z0-9:_=-]{1,300}', cursor):
            raise MonitoringError('sentry_pagination_invalid')
        return cursor
    return None


def collect(config, token, getter=get_json):
    origin, organization, projects = settings(config)
    path = '/api/0/organizations/' + organization + '/issues/'
    parameters = [('query', '!has:report_id'), ('sort', 'date'), ('limit', '100'), ('statsPeriod', '90d')]
    parameters.extend(('project', project) for project in projects)
    issues = {}
    cursor = None
    seen_cursors = set()
    for page in range(5):
        query = parameters + ([('cursor', cursor)] if cursor else [])
        payload, headers = getter(origin + path + '?' + urllib.parse.urlencode(query), token, origin)
        if not isinstance(payload, list) or len(payload) > 100:
            raise MonitoringError('sentry_response_invalid')
        for issue in payload:
            value = summary(issue, origin, organization)
            issues[value['external_id']] = value
        cursor = next_cursor(headers.get('Link'), origin, path)
        if not cursor:
            return list(issues.values()), False
        if cursor in seen_cursors:
            raise MonitoringError('sentry_pagination_loop')
        seen_cursors.add(cursor)
    return list(issues.values()), True


def run(config, database, secrets=None, getter=get_json):
    value = config.get('sentry', {})
    if value.get('enabled') is not True:
        database.source('sentry', 'disabled', 'disabled')
        return log_status('sentry', 'disabled', provider_requests=0)
    token = (secrets or {}).get('sentry_token')
    if not isinstance(token, str) or not token.strip():
        database.source('sentry', 'not_connected', 'credential_missing')
        return log_status('sentry', 'not_connected', provider_requests=0)
    try:
        issues, truncated = collect(config, token, getter)
        database.call('kws_monitoring_import_sentry_issues', p_issues=issues)
        status = 'partial' if truncated else 'connected'
        code = 'pagination_limit' if truncated else 'native_gap_issues_last_90d'
        database.source('sentry', status, code, metric_count=len(issues))
        return log_status('sentry', status, imported=len(issues), bounded_window_days=90, raw_events_copied=False)
    except MonitoringError as error:
        database.source('sentry', 'error', error.code)
        raise


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    config = private_json(args.root / 'config.json')
    if not args.apply:
        log_status('sentry', 'dry_run', enabled=config.get('sentry', {}).get('enabled') is True,
                   provider_requests=0, database_changed=False)
        return
    if not activation_valid(config, args.root):
        raise MonitoringError('reviewed_activation_required')
    secrets = private_json(args.root / 'credentials.json', required=False)
    run(config, Database(), secrets)


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        log_status('sentry', 'error', code=error.code if isinstance(error, MonitoringError) else 'worker_failed')
        raise SystemExit(1)
