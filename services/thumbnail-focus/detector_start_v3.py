"""Local image-only start proposals: number-card evidence + prompted SAM masks.
No filenames, fixture IDs, image hashes or stored hand contours affect detection.
"""
import base64,hashlib,time
from collections import OrderedDict
import cv2
import numpy as np
from detector_v2_core import COLORS,decode_image,data_uri,detect,properties,candidate_json
from route_labels import detect_labels
from route_digits import digit_evidence
from detector_v2_core import boundary_evidence
from sam_local import PhotoSegments
from model_contract import VERSION, AUTOMATIC_VERSION
# This revision changes manual correction only. Automatic proposals and their
# durable review keys remain compatible with 3.1; never invalidate user approvals.
_ENCODINGS=OrderedDict()

def photo_model(rgb):
 key=hashlib.sha256(rgb.tobytes()).digest()
 if key not in _ENCODINGS:
  _ENCODINGS[key]=PhotoSegments(rgb)
  while len(_ENCODINGS)>2:_ENCODINGS.popitem(last=False)
 _ENCODINGS.move_to_end(key)
 return _ENCODINGS[key]

def affinity(rgb,color,mask):
 hsv=cv2.cvtColor(rgb,cv2.COLOR_RGB2HSV);h,s,v=[hsv[:,:,i][mask>0] for i in range(3)]
 if not len(h):return 0.
 if color=='white':
  lab=cv2.cvtColor(rgb,cv2.COLOR_RGB2LAB);a,b=lab[:,:,1][mask>0],lab[:,:,2][mask>0]
  return float(np.mean((s<135)&(h<48)&(a>115)&(a<142)&(b<165)&(v>75)))
 if color=='black':return float(np.mean((v<120)&(s<140)))
 ranges={'green':[(36,94)],'yellow':[(21,39)],'red':[(0,12),(168,180)],'blue':[(91,134)],'orange':[(3,23)],'purple':[(128,175)]}
 allowed=np.zeros(h.shape,bool)
 for lo,hi in ranges[color]:allowed|=(h>=lo)&(h<=hi)
 return float(np.mean(allowed&(s>18)&(v>45)))

def colour_supported(rgb,color,mask):
 # Pale warm walls and paper can fall into the orange hue band. Require a
 # visible resin-colour anchor; fully ambiguous surfaces stay unconfirmed.
 if color=='white':
  hsv=cv2.cvtColor(rgb,cv2.COLOR_RGB2HSV)
  strongly_yellow=(hsv[:,:,1][mask>0]>85)&(hsv[:,:,0][mask>0]>15)&(hsv[:,:,0][mask>0]<40)
  return float(np.mean(strongly_yellow))<.20
 if color=='orange':
  hsv=cv2.cvtColor(rgb,cv2.COLOR_RGB2HSV)
  return float(np.mean((hsv[:,:,1][mask>0]>80)&(hsv[:,:,0][mask>0]<24)))>=.25
 return True


def cleaned(mask,point):
 _,labels,stats,_=cv2.connectedComponentsWithStats(mask)
 x,y=[int(v) for v in point];x=np.clip(x,0,mask.shape[1]-1);y=np.clip(y,0,mask.shape[0]-1)
 label=labels[y,x]
 if not label:return np.zeros_like(mask)
 return (labels==label).astype(np.uint8)*255

def shape_ok(mask,score,manual=False):
 area=np.count_nonzero(mask)
 if score<.52 or not 65<=area<=(.92 if manual else .27)*mask.size:return False
 _,(x,y,w,h),_,solid=properties(mask)
 if min(w,h)<6 or max(w,h)/min(w,h)>7:return False
 borders=int(x<2)+int(y<2)+int(x+w>=mask.shape[1]-1)+int(y+h>=mask.shape[0]-1)
 return (manual or borders<2) and solid>.25

def unique_masks(rows,threshold=.65):
 unique=[]
 for row in sorted(rows,key=lambda x:x['quality'],reverse=True):
  m=row['mask']>0
  if any(np.count_nonzero(m&(r['mask']>0))/max(1,np.count_nonzero(m|(r['mask']>0)))>threshold for r in unique):continue
  unique.append(row)
 return unique

def outline(mask,index,quality,label_ids):
 result=candidate_json(mask,index,quality)
 contours,hierarchy=cv2.findContours(mask,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
 if contours:
  outer=max((i for i in range(len(contours)) if hierarchy[0][i][3]<0),key=lambda i:cv2.contourArea(contours[i]))
  polygon=cv2.approxPolyDP(contours[outer],.7,True)
  # OpenCV outer and inner contours have opposite winding, preserving holes in Canvas.
  result['polygon']=polygon[:,0,:].tolist()
  result['holes']=[cv2.approxPolyDP(c,.7,True)[:,0,:].tolist() for i,c in enumerate(contours) if hierarchy[0][i][3]==outer and cv2.contourArea(c)>8]
 result['start_label_ids']=label_ids;result['segmentation']='efficientvit-sam-l0'
 return result

def analyze(raw,color,point=None):
 started=time.perf_counter()
 if color not in COLORS and not (color=='manual' and point is not None):raise ValueError('Unbekannte Boulderfarbe.')
 rgb=decode_image(raw);h,w=rgb.shape[:2];model=photo_model(rgb)
 proposals=detect_labels(rgb) if point is None else []
 coarse=detect(rgb,color) if point is None else []
 seeds=[]
 for _,mask in coarse:
  distance=cv2.distanceTransform(mask,cv2.DIST_L2,3);y,x=np.unravel_index(np.argmax(distance),distance.shape);seeds.append((int(x),int(y)))
 # The same proposer finds candidates for every photo. A tap only supplies an explicit foreground point.
 if point is not None:
  seeds=[(point[0]*(w-1),point[1]*(h-1))]
  masks=model.masks(seeds);mask,quality=masks[0]
  if not shape_ok(mask,quality,manual=True):raise ValueError('An dieser Stelle keine sichere Grifffläche. Bitte auf den Griffkörper tippen oder die Kontur nachzeichnen.')
  # A manual tap may deliberately select a cropped, large hold. Still reject
  # obvious wall masks when their surface does not match the chosen route color.
  if np.count_nonzero(mask)>.27*mask.size and color!='manual' and affinity(rgb,color,mask)<.45:
   raise ValueError('Die Fläche sieht überwiegend nach Wand aus. Bitte genauer auf den Griff tippen oder die Kontur nachzeichnen.')
  candidate=outline(mask,'manual',quality,[]);candidate['source']='point_correction'
  candidates=[candidate];selected=['manual'];labels=[];note='Fläche per Tipp geschätzt. Kontur bitte prüfen.'
 else:
  # Evaluate coarse holds before assigning labels. Glyphs painted on a hold are not route cards.
  initial=[{'mask':mask,'quality':score} for mask,score in model.masks(seeds) if shape_ok(mask,score) and affinity(rgb,color,mask)>(.40 if color=='white' else .22) and colour_supported(rgb,color,mask)]
  gray=cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY);hsv=cv2.cvtColor(rgb,cv2.COLOR_RGB2HSV)
  label_points=[]
  for _,mask,_ in proposals:
   inner=cv2.erode(mask,np.ones((3,3),np.uint8))>0
   if not inner.any():inner=mask>0
   y,x=np.unravel_index(np.argmax(np.where(inner,gray,0)),gray.shape);label_points.append((int(x),int(y)))
  label_boxes=[(cv2.boundingRect(c)[0]-2,cv2.boundingRect(c)[1]-2,cv2.boundingRect(c)[0]+cv2.boundingRect(c)[2]+2,cv2.boundingRect(c)[1]+cv2.boundingRect(c)[3]+2) for _,_,c in proposals]
  labels=[]
  for (proposal_score,proposal,contour),(mask,quality) in zip(proposals,model.masks(label_points,label_boxes)):
   area=np.count_nonzero(mask);valid=False
   if 40<area<.035*w*h:
    c=max(cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)[0],key=cv2.contourArea);rw,rh=cv2.minAreaRect(c)[1]
    valid=min(rw,rh)>=6 and max(rw,rh)/max(1,min(rw,rh))<3 and area/max(1,rw*rh)>.55 and np.mean(hsv[:,:,1][mask>0]<95)>.8 and np.median(gray[mask>0])>110
   if not valid:continue
   support,delta,contrast=boundary_evidence(rgb,mask)
   glyph=digit_evidence(rgb,mask)
   if delta<15 or glyph<.60:continue
   # On pale walls a small paper card can have similar median colour while
   # retaining a clear border. Require stronger edge AND glyph evidence then.
   if contrast<8 and not (support>=.65 and glyph>=.65):continue
   labels.append({'mask':mask,'quality':quality,'low_contrast':contrast<8})
  labels=unique_masks(labels,.45)[:12]
  for label in labels:
   m=cv2.moments(label['mask']);cx=m['m10']/max(1,m['m00']);cy=m['m01']/max(1,m['m00'])
   for radius in (14,28):
    for angle in np.linspace(0,2*np.pi,8,endpoint=False):
     seeds.append((float(np.clip(cx+np.cos(angle)*radius,1,w-2)),float(np.clip(cy+np.sin(angle)*radius,1,h-2))))
  rows=list(initial)
  # Bounded work: at most 200 image-derived prompts per photo.
  for mask,quality in model.masks(seeds[:200]):
   if not shape_ok(mask,quality) or affinity(rgb,color,mask)<(.40 if color=='white' else .22) or not colour_supported(rgb,color,mask):continue
   rows.append({'mask':mask,'quality':quality})
  for row in rows:
   row['mask']=row['mask'].copy()
   for label in labels:row['mask'][label['mask']>0]=0
  hsv=cv2.cvtColor(rgb,cv2.COLOR_RGB2HSV)
  bands={'green':[(36,94)],'yellow':[(21,39)],'red':[(0,12),(168,180)],'blue':[(91,134)],'orange':[(3,23)],'purple':[(128,175)]}
  if color in bands:
   right_hue=np.zeros((h,w),bool)
   for lo,hi in bands[color]:right_hue|=(hsv[:,:,0]>=lo)&(hsv[:,:,0]<=hi)
   foreign=(hsv[:,:,1]>110)&~right_hue
   for row in rows:row['mask'][foreign]=0
  rows=[row for row in rows if np.count_nonzero(row['mask'])>=65]
  rows=unique_masks(rows)
  rows=[row for row in rows if not any(np.count_nonzero((row['mask']>0)&(label['mask']>0))/max(1,np.count_nonzero(row['mask']))>.5 for label in labels)]
  # Reject obvious long image-border frames, including the white window false positive.
  rows=[r for r in rows if not (min(properties(r['mask'])[1][:2])<.025*min(w,h) and max(properties(r['mask'])[1][2:])/min(properties(r['mask'])[1][2:])>3)]
  evidence={i:[] for i in range(len(rows))}
  for number,label in enumerate(labels):
   choices=[]
   for i,row in enumerate(rows):
    overlap=np.count_nonzero((row['mask']>0)&(label['mask']>0))/max(1,np.count_nonzero(label['mask']))
    if overlap>.45 or np.count_nonzero(row['mask'])<.65*np.count_nonzero(label['mask']):continue
    distance=cv2.distanceTransform((row['mask']==0).astype(np.uint8),cv2.DIST_L2,3)
    gap=float(np.min(distance[label['mask']>0]))
    if gap<=max(8,.04*max(w,h)):choices.append((gap,i))
   if choices:evidence[min(choices)[1]].append('label-'+str(number))
  candidates=[];selected=[]
  for i,row in enumerate(rows[:24]):
   mask=row['mask'].copy()
   # Cards remain background even when a model joins them to the resin.
   for label in labels:
    overlap=np.count_nonzero((mask>0)&(label['mask']>0))/max(1,np.count_nonzero(label['mask']))
    if overlap<.45:mask[label['mask']>0]=0
   if np.count_nonzero(mask)<65:continue
   id='c'+str(len(candidates));candidate=outline(mask,id,row['quality'],evidence[i]);candidates.append(candidate)
   if evidence[i]:selected.append(id)
  weak_start=any(labels[int(label_id.split('-')[1])]['low_contrast'] for candidate in candidates if candidate['id'] in selected for label_id in candidate['start_label_ids'])
  note=(f'{len(selected)} Griffvorschläge an Zahlenschildern. Bitte bestätigen.' if selected else 'Kein Startgriff sicher einem Zahlenschild zugeordnet. Bitte die Startgriffe antippen; das Original bleibt erhalten.')
  if weak_start:note='Kontrastarmes Zahlenschild: Startauswahl bitte besonders prüfen.'
 return {'version':VERSION,'image_hash':hashlib.sha256(raw).hexdigest(),'color':color,'width':w,'height':h,
  'image':data_uri(cv2.cvtColor(rgb,cv2.COLOR_RGB2BGR),'.jpg'),'candidates':candidates,'selected':selected,
  'duration_ms':round((time.perf_counter()-started)*1000),'status':'needs_review' if selected else 'unconfirmed',
  'note':note,'labels':[{'id':'label-'+str(i),'box':list(map(int,cv2.boundingRect(cv2.findContours(l['mask'],cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)[0][0])))} for i,l in enumerate(labels)],'label_count':len(labels),'library':cv2.__version__,'segmentation':'efficientvit-sam-l0'}
