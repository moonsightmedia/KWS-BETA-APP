"""Read-only paginated live inventory, immutable local originals, resumable CPU queue.
Credentials from --env-file stay in memory. No cloud write methods exist here.
"""
import argparse, hashlib, json, os, sys, time, urllib.parse, urllib.request
from datetime import datetime, timezone
from pathlib import Path
from detector_start_v3 import analyze, VERSION

COLORS={'grün':'green','gelb':'yellow','rot':'red','blau':'blue','orange':'orange','lila':'purple','weiß':'white','schwarz':'black'}
def atomic(path,data):
    tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8');tmp.replace(path)
def get(url,headers=None):
    with urllib.request.urlopen(urllib.request.Request(url,headers=headers or {}),timeout=40) as r:
        raw=r.read(12_000_001)
    if len(raw)>12_000_000:raise ValueError('Image exceeds 12 MB')
    return raw
def collect(base,headers):
    rows=[];offset=0
    while True:
        query=urllib.parse.urlencode({'select':'id,name,color,color_2,sector_id,thumbnail_url,status','thumbnail_url':'not.is.null','order':'id.asc','limit':'100','offset':str(offset)})
        page=json.loads(get(base+'/rest/v1/boulders?'+query,headers));rows.extend(page)
        if len(page)<100:break
        offset+=len(page)
    if len({r['id'] for r in rows})!=len(rows):raise ValueError('Inventory changed during pagination. Retry.')
    return rows
def run():
    parser=argparse.ArgumentParser();parser.add_argument('--env-file',required=True);parser.add_argument('--data-dir',default='.thumbnail-data');parser.add_argument('--references',help='Optional, user-confirmed selection export; used only by review UI');args=parser.parse_args()
    env={}
    for line in Path(args.env_file).read_text(encoding='utf-8-sig').splitlines():
        if '=' in line and not line.startswith('#'):
            k,v=line.split('=',1);env[k]=v.strip().strip('"').strip("'")
    base=env['VITE_SUPABASE_URL'].rstrip('/');key=env['VITE_SUPABASE_PUBLISHABLE_KEY']
    if not base.startswith('https://'):raise ValueError('HTTPS data source required')
    headers={'apikey':key,'Authorization':'Bearer '+key}
    data=Path(args.data_dir).resolve();data.mkdir(parents=True,exist_ok=True)
    (data/'photos').mkdir(exist_ok=True);(data/'results').mkdir(exist_ok=True)
    previous={}
    if (data/'inventory.json').exists():
        previous={r['cache_key']:r.get('reference') for r in json.loads((data/'inventory.json').read_text(encoding='utf-8'))['records'] if r.get('reference')}
    references={}
    if args.references:
        exported=json.loads(Path(args.references).read_text(encoding='utf-8'))
        if exported.get('schema')!='kws.start-selection-batch/v1':raise ValueError('Unsupported reference schema')
        references={r['image']['sha256']:r for r in exported['references'].values()}
    rows=collect(base,headers);snapshot={'schema':1,'read_at':datetime.now(timezone.utc).isoformat(),'source':base,'version':VERSION,'records':[]}
    for row in rows:
        # Stable key includes route metadata, source URL and detector version.
        cache=hashlib.sha256(json.dumps([row,VERSION],sort_keys=True).encode()).hexdigest()
        snapshot['records'].append({**row,'cache_key':cache,'analysis_state':'pending','photo':f'photos/{cache}.jpg','result':f'results/{cache}.json',**({'reference':previous[cache]} if cache in previous else {})})
    atomic(data/'inventory.json',snapshot)
    print(f'Live inventory: {len(rows)} thumbnails; all statuses included.',flush=True)
    for index,row in enumerate(snapshot['records']):
        photo=data/row['photo'];result=data/row['result']
        try:
            source=urllib.parse.urlparse(row['thumbnail_url'])
            if source.scheme!='https' or source.hostname not in ['cdn.kletterwelt-sauerland.de','video.kletterwelt-sauerland.de']:raise ValueError('Unapproved image origin; review manually')
            if not photo.exists():
                raw=get(row['thumbnail_url']);tmp=photo.with_suffix('.tmp');tmp.write_bytes(raw);tmp.replace(photo)
            raw=photo.read_bytes();row['photo_hash']=hashlib.sha256(raw).hexdigest()
            if row['photo_hash'] in references:row['reference']=references[row['photo_hash']]
            names=[row['color']]+([row['color_2']] if row['color_2'] else [])
            colors=[COLORS.get(n.lower()) for n in names]
            if row.get('volume_only') or None in colors:
                row['analysis_state']='manual';row['note']='Nur Volumen oder Farbe ohne automatische Erkennung. Original prüfen.'
            else:
                if not result.exists():
                    combined=None
                    for color in colors:
                        current=analyze(raw,color)
                        for c in current['candidates']:c['id']=color+'-'+c['id']
                        current['selected']=[color+'-'+x for x in current['selected']]
                        if combined:
                            combined['candidates']+=current['candidates'];combined['selected']+=current['selected']
                        else:combined=current
                    atomic(result,combined)
                row['analysis_state']='ready';row['selected_count']=len(json.loads(result.read_text(encoding='utf-8'))['selected'])
        except Exception as e:
            row['analysis_state']='error';row['note']=f'{type(e).__name__}: Foto/Erkennung fehlgeschlagen. Original bleibt erhalten.'
        atomic(data/'inventory.json',snapshot)
        print(f'{index+1}/{len(rows)}: {row["analysis_state"]}',flush=True)
    snapshot['completed_at']=datetime.now(timezone.utc).isoformat();atomic(data/'inventory.json',snapshot)
if __name__=='__main__':run()
