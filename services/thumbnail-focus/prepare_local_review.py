"""Prepare only current public, unreviewed photos; no production writes."""
import argparse,json,hashlib,urllib.request,urllib.parse,concurrent.futures
from pathlib import Path
from datetime import datetime,timezone
from detector_start_v3 import analyze,AUTOMATIC_VERSION
from detector_v2_core import decode_image
from collect import atomic,validate_backend
from PIL import Image
import base64,io
parser=argparse.ArgumentParser()
parser.add_argument('--catalog',required=True,help='Fresh public live inventory JSON with source, verified_at and rows')
parser.add_argument('--expected-backend',required=True)
parser.add_argument('--data-dir',default='.thumbnail-data/live-review')
parser.add_argument('--references',help='Optional exact-photo, user-confirmed review export; never auto-approves a new row')
args=parser.parse_args()
snapshot=json.loads(Path(args.catalog).read_text(encoding='utf-8'))
validate_backend(snapshot['source'],args.expected_backend)
assert snapshot.get('verified_at') and len({r['id'] for r in snapshot['rows']})==len(snapshot['rows'])
assert all(r['status']=='haengt' for r in snapshot['rows'])
data=Path(args.data_dir).resolve()
for folder in [data,data/'photos',data/'results']:folder.mkdir(parents=True,exist_ok=True)
colors={'grün':'green','gelb':'yellow','rot':'red','blau':'blue','orange':'orange','lila':'purple','weiß':'white','schwarz':'black'}
catalog={**snapshot,'preparation_started_at':datetime.now(timezone.utc).isoformat()}
references=json.loads(Path(args.references).read_text(encoding='utf-8'))['decisions'] if args.references else []
byhash={d['focus']['result']['image_hash']:d['focus'] for d in references if d.get('state')=='accepted' and d.get('focus',{}).get('result')}
def statesave():atomic(data/'catalog.json',catalog)
for row in catalog['rows']:
    binding={k:row[k] for k in ['id','name','color','color_2','sector_id','thumbnail_url','status']}
    key=hashlib.sha256(json.dumps([binding,AUTOMATIC_VERSION],sort_keys=True).encode()).hexdigest()
    row.update(cache_key=key,analysis_state='published' if row['published'] else 'pending',photo=f'photos/{key}.jpg',result=f'results/{key}.json')
statesave()
def download(row):
    if row['published']:return
    try:
        url=row['thumbnail_url'];u=urllib.parse.urlparse(url)
        assert u.scheme=='https' and u.hostname in ['beta.kletterwelt-sauerland.de','beta-api.kletterwelt-sauerland.de','cdn.kletterwelt-sauerland.de','video.kletterwelt-sauerland.de']
        p=data/row['photo']
        if not p.exists():
            raw=urllib.request.urlopen(url,timeout=35).read(12_000_001);assert len(raw)<=12_000_000
            temp=p.with_suffix('.tmp');temp.write_bytes(raw);temp.replace(p)
        raw=p.read_bytes();row['photo_hash']=hashlib.sha256(raw).hexdigest()
    except Exception as e:row.update(analysis_state='error',note='Foto konnte nicht lokal geladen werden. Original bleibt erhalten.');print('photo_error',row['id'],type(e).__name__,flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:list(executor.map(download,catalog['rows']))
statesave();print('all_photos_downloaded',flush=True)
for index,row in enumerate(catalog['rows']):
    if row['published'] or row['analysis_state']=='error':continue
    try:
        raw=(data/row['photo']).read_bytes();p=data/row['result']
        names=(['Schwarz','Gelb'] if row['color']=='Schwarz-Gelb' else [row['color']])+([row['color_2']] if row['color_2'] else [])
        requested=[colors.get(n.lower()) for n in names]
        result=json.loads(p.read_text(encoding='utf-8')) if p.exists() else None
        if result:assert result['image_hash']==row['photo_hash']
        if result and not (None not in requested and result.get('note')=='Diese Grifffarbe braucht eine manuelle Auswahl.'):pass
        elif row['photo_hash'] in byhash:
            prior=byhash[row['photo_hash']];result={**prior['result'],'selected':prior['selected'],'note':'Deine frühere Auswahl desselben Fotos – bitte für diesen Live-Boulder prüfen.'};atomic(p,result);row['reused_reference']=True
        elif None in requested:
            rgb=decode_image(raw);im=Image.fromarray(rgb);buf=io.BytesIO();im.save(buf,format='JPEG',quality=95)
            result={'version':'sam-number-cards-3.2','image_hash':row['photo_hash'],'image':'data:image/jpeg;base64,'+base64.b64encode(buf.getvalue()).decode(),'width':rgb.shape[1],'height':rgb.shape[0],'candidates':[],'selected':[],'note':'Diese Grifffarbe braucht eine manuelle Auswahl.'};atomic(p,result)
        else:
            result=None
            for color in requested:
                part=analyze(raw,color)
                part['candidates']=[{**c,'id':color+'-'+c['id']} for c in part['candidates']];part['selected']=[color+'-'+id for id in part['selected']]
                result={**result,'candidates':result['candidates']+part['candidates'],'selected':result['selected']+part['selected']} if result else part
            atomic(p,result)
        row.update(analysis_state='manual' if None in requested and not row.get('reused_reference') else 'ready',selected_count=len(result['selected']))
    except Exception as e:
        row.update(analysis_state='error',note='Automatischer Vorschlag fehlgeschlagen. Das Foto kann manuell korrigiert werden.');print('analysis_error',row['id'],type(e).__name__,flush=True)
    statesave()
    completed=sum(r['analysis_state'] not in ['pending','published'] for r in catalog['rows']);total=sum(not r['published'] for r in catalog['rows'])
    print(f'{completed}/{total} prepared; {row["analysis_state"]}',flush=True)
catalog['preparation_finished_at']=datetime.now(timezone.utc).isoformat();statesave()
print('complete',json.dumps({state:sum(r['analysis_state']==state for r in catalog['rows']) for state in ['ready','manual','error','published']}),flush=True)
