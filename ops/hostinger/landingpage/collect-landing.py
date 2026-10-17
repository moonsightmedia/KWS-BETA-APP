"""Publish bounded, anonymous daily request totals; never expose access records."""
from pathlib import Path
from collections import Counter
from zoneinfo import ZoneInfo
import datetime as dt, gzip, json, os, tempfile

LOGS = Path('/opt/kws/web-production/landing-metrics')
OUTPUT = Path('/opt/kws/operations-dashboard/public/ops/landing.json')
ALLOWED = {'level', 'ts', 'logger', 'msg', 'status', 'page'}

def aggregate(directory, now):
    counts = Counter()
    first = None
    for path in sorted(directory.glob('access*.jsonl*')):
        if not path.is_file() or path.is_symlink(): continue
        opener = gzip.open if path.suffix == '.gz' else open
        with opener(path, 'rt', encoding='utf8') as records:
            for line in records:
                if not line.strip(): continue
                try: record = json.loads(line)
                except json.JSONDecodeError:
                    # The active file may end with an in-flight write. Never accept malformed rolled files.
                    if path.name == 'access.jsonl' and not line.endswith('\n'): continue
                    raise
                assert set(record) <= ALLOWED, 'Unexpected fields in privacy-filtered counter'
                assert record.get('page') == 'landingpage', 'Unexpected page'
                stamp = dt.datetime.strptime(record['ts'], '%Y-%m-%dT%H:00Z').replace(tzinfo=dt.timezone.utc)
                assert stamp <= now + dt.timedelta(hours=1)
                first = min(first, stamp) if first else stamp
                if record['status'] in (200, 304):
                    day = stamp.astimezone(ZoneInfo('Europe/Berlin')).date()
                    if now.astimezone(ZoneInfo('Europe/Berlin')).date() - dt.timedelta(days=30) <= day:
                        counts[day.isoformat()] += 1
    return counts, first

def snapshot(directory, now, previous=None):
    counts, first = aggregate(directory, now)
    since = previous.get('measuredSince') if previous else None
    since = since or (first or now).isoformat()
    today = now.astimezone(ZoneInfo('Europe/Berlin')).date()
    days = [{'date': (today-dt.timedelta(days=i)).isoformat(), 'views': counts[(today-dt.timedelta(days=i)).isoformat()]} for i in range(30,-1,-1)]
    return {'schema':1,'generatedAt':now.isoformat(),'measuredSince':since,'timezone':'Europe/Berlin','metric':'successful-http-get-requests','days':days,'totals':{'today':days[-1]['views'],'last7':sum(d['views'] for d in days[-7:]),'last30':sum(d['views'] for d in days[-30:])}}

if __name__ == '__main__':
    assert os.geteuid() == 0
    previous = json.loads(OUTPUT.read_text()) if OUTPUT.exists() else None
    result = snapshot(LOGS, dt.datetime.now(dt.timezone.utc), previous)
    # No file is replaced if reading or validation fails; UI detects a stale snapshot.
    fd, name = tempfile.mkstemp(prefix='.landing-', dir=OUTPUT.parent)
    try:
        with os.fdopen(fd,'w') as target: json.dump(result,target);target.write('\n')
        os.chmod(name,0o644);os.replace(name,OUTPUT)
    finally:
        if os.path.exists(name): os.unlink(name)
