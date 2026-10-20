"""Local classical CV baseline. No fixtures, filenames or hand masks in detection."""
from __future__ import annotations
import base64
import io
import math
import time
import hashlib
import cv2
import numpy as np
from PIL import Image, ImageOps

VERSION = 'opencv-boundary-2'
COLORS = ('green', 'yellow', 'white', 'black', 'red', 'blue', 'orange', 'purple')
cv2.setNumThreads(2)
Image.MAX_IMAGE_PIXELS = 30_000_000

def decode_image(raw: bytes) -> np.ndarray:
    with Image.open(io.BytesIO(raw)) as image:
        if image.width * image.height > 30_000_000:
            raise ValueError('Foto zu groß: maximal 30 Megapixel.')
        image = ImageOps.exif_transpose(image).convert('RGB')
        image.thumbnail((720, 720), Image.Resampling.LANCZOS)
        if min(image.size) < 48:
            raise ValueError('Foto zu klein: mindestens 48 Pixel je Seite.')
        return np.array(image)

def data_uri(array: np.ndarray, extension='.png') -> str:
    encoded = cv2.imencode(extension, array)[1].tobytes()
    mime = 'image/png' if extension == '.png' else 'image/jpeg'
    return 'data:' + mime + ';base64,' + base64.b64encode(encoded).decode('ascii')

def silhouette(mask: np.ndarray) -> np.ndarray:
    contours, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    result = np.zeros_like(mask, np.uint8)
    if contours:
        cv2.drawContours(result, [max(contours, key=cv2.contourArea)], -1, 255, -1)
    return result

def paper_regions(rgb: np.ndarray) -> np.ndarray:
    """Conservative bright quadrilaterals, typically paper route labels."""
    hsv=cv2.cvtColor(rgb,cv2.COLOR_RGB2HSV)
    result=np.zeros(hsv.shape[:2],np.uint8)
    contours=[]
    for threshold in (205,225,240):
        bright=((hsv[:,:,1]<55)&(hsv[:,:,2]>threshold)).astype(np.uint8)*255
        bright=cv2.morphologyEx(bright,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
        contours.extend(cv2.findContours(bright,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)[0])
    for contour in contours:
        area=cv2.contourArea(contour)
        if area<45 or area>.035*result.size:continue
        approx=cv2.approxPolyDP(contour,.045*cv2.arcLength(contour,True),True)
        if len(approx)!=4 or not cv2.isContourConvex(approx):continue
        points=approx[:,0,:].astype(float)
        angles=[]
        for i in range(4):
            a=points[(i-1)%4]-points[i];b=points[(i+1)%4]-points[i]
            angles.append(abs(np.dot(a,b)/(np.linalg.norm(a)*np.linalg.norm(b)+1e-6)))
        if max(angles)>.48:continue
        if min(np.linalg.norm(points[(i+1)%4]-points[i]) for i in range(4))<7:continue
        cv2.drawContours(result,[contour],-1,255,-1)
    return result

def refine(rgb: np.ndarray, seed: np.ndarray, point=None, paper=None) -> np.ndarray:
    h, w = seed.shape
    points = cv2.findNonZero(seed)
    if points is None:
        return seed
    x, y, bw, bh = cv2.boundingRect(points)
    margin = max(9, int(max(bw, bh) * .48))
    x0, y0, x1, y1 = max(0, x-margin), max(0, y-margin), min(w, x+bw+margin), min(h, y+bh+margin)
    local_seed = seed[y0:y1, x0:x1]
    if local_seed.size < 30:
        return seed
    # Everything outside a local expansion is definite background. A mask-based
    # GrabCut run is initialized from detected colour pixels, never from a fixture.
    expansion = max(11, int(min(bw,bh)*.32) | 1)
    expanded = cv2.dilate(local_seed, np.ones((expansion, expansion), np.uint8))
    distance=cv2.distanceTransform(local_seed,cv2.DIST_L2,3)
    core=(distance>max(1.5,.55*float(distance.max()))).astype(np.uint8)*255
    gc = np.full(local_seed.shape, cv2.GC_BGD, np.uint8)
    gc[expanded > 0] = cv2.GC_PR_BGD
    gc[local_seed > 0] = cv2.GC_PR_FGD
    gc[core > 0] = cv2.GC_FGD
    if paper is not None:
        gc[paper[y0:y1,x0:x1]>0]=cv2.GC_BGD
    if point is not None:
        px, py = point
        cv2.circle(gc, (px-x0, py-y0), 2, int(cv2.GC_FGD), -1)
    if np.count_nonzero(gc == cv2.GC_FGD) < 5 or np.count_nonzero(gc == cv2.GC_BGD) < 5:
        return silhouette(seed)
    try:
        cv2.setRNGSeed(42)
        cv2.grabCut(cv2.cvtColor(rgb[y0:y1, x0:x1], cv2.COLOR_RGB2BGR), gc, None,
                    np.zeros((1,65),np.float64), np.zeros((1,65),np.float64), 2, cv2.GC_INIT_WITH_MASK)
        result = np.zeros((h,w), np.uint8)
        result[y0:y1,x0:x1] = np.where((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
        if paper is not None:result[paper>0]=0
        result = silhouette(result)
        result = silhouette((cv2.GaussianBlur(result,(3,3),.65)>127).astype(np.uint8)*255)
        # Reject an unstable graph-cut expansion and retain the colour proposal.
        if np.count_nonzero(result) > max(3 * np.count_nonzero(seed), .25*w*h):
            return silhouette(seed)
        return result
    except cv2.error:
        return silhouette(seed)

def colour_masks(rgb: np.ndarray, color: str):
    smoothed = cv2.bilateralFilter(cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR), 7, 35, 7)
    hsv = cv2.cvtColor(smoothed, cv2.COLOR_BGR2HSV).astype(np.float32)
    lab = cv2.cvtColor(smoothed, cv2.COLOR_BGR2LAB).astype(np.float32)
    hue, sat, val = hsv[:,:,0], hsv[:,:,1], hsv[:,:,2]
    if color == 'green':
        base = (hue >= 39) & (hue <= 92) & (sat > 35) & (val > 65)
        masks = [base & (val > v) & (sat < s) for v,s in [(135,180),(155,210),(105,145),(75,255)]]
    elif color == 'yellow':
        base = (hue >= 21) & (hue <= 38) & (sat > 65) & (val > 65)
        masks = [base, base & (sat > 105), base & (val > 130)]
    elif color == 'white':
        # Warm white plastic may be beige under the hall lights. Compare it with
        # the dominant neutral wall rather than using an absolute RGB white.
        neutral = (sat < 110) & (val > 65)
        wall_b = float(np.median(lab[:,:,2][neutral])) if neutral.any() else 128
        white_chroma=(lab[:,:,1]>117)&(lab[:,:,1]<139)&(lab[:,:,2]<158)
        neutral &= white_chroma
        base = neutral & (hue < 47)
        masks = [base & (lab[:,:,2] > wall_b + d) & (val > 100) for d in (4,8,12)]
        masks.append(neutral & (val > max(145, float(np.percentile(val,82)))))
    elif color == 'black':
        base = (val < 75)
        masks = [val < v for v in (45,65,85)]
    else:
        ranges = {'red':[(0,10),(170,180)],'blue':[(92,132)],'orange':[(3,24)],'purple':[(130,172)]}
        hue_ok = np.zeros(hue.shape, bool)
        for lower, upper in ranges[color]:
            hue_ok |= (hue >= lower) & (hue <= upper)
        base = hue_ok & (sat > (27 if color=='purple' else 55)) & (val > 60)
        masks = [base, base & (sat > 100), base & (val > 125)]
    return [m.astype(np.uint8)*255 for m in masks]

def properties(mask: np.ndarray):
    contour = max(cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0], key=cv2.contourArea)
    x,y,bw,bh = cv2.boundingRect(contour)
    area = float(np.count_nonzero(mask))
    hull_area = cv2.contourArea(cv2.convexHull(contour))
    return contour, (x,y,bw,bh), area, min(1., area/max(1.,hull_area))

def boundary_evidence(rgb: np.ndarray, mask: np.ndarray):
    """Colour change across contour normals, not texture gradients anywhere."""
    lab=cv2.cvtColor(cv2.GaussianBlur(rgb,(5,5),0),cv2.COLOR_RGB2LAB).astype(np.float32)
    soft=cv2.GaussianBlur(mask.astype(np.float32)/255,(5,5),0)
    nx=cv2.Sobel(soft,cv2.CV_32F,1,0);ny=cv2.Sobel(soft,cv2.CV_32F,0,1)
    norm=np.sqrt(nx*nx+ny*ny)+1e-6;nx/=norm;ny/=norm
    yy,xx=np.mgrid[:mask.shape[0],:mask.shape[1]].astype(np.float32)
    inside=cv2.remap(lab,xx+nx*3,yy+ny*3,cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
    outside=cv2.remap(lab,xx-nx*3,yy-ny*3,cv2.INTER_LINEAR,borderMode=cv2.BORDER_REPLICATE)
    boundary=cv2.dilate(mask,np.ones((3,3),np.uint8))!=cv2.erode(mask,np.ones((3,3),np.uint8))
    delta=np.linalg.norm(inside-outside,axis=2)[boundary]
    inner=cv2.erode(mask,np.ones((3,3),np.uint8))>0
    ring=(cv2.dilate(mask,np.ones((9,9),np.uint8))>0)&(mask==0)
    contrast=float(np.linalg.norm(np.median(lab[inner],axis=0)-np.median(lab[ring],axis=0))) if inner.any() and ring.any() else 0
    return float(np.mean(delta>18)),float(np.median(delta)),contrast

def edge_regions(rgb: np.ndarray, allowed: np.ndarray):
    gray=cv2.cvtColor(cv2.GaussianBlur(rgb,(3,3),0),cv2.COLOR_RGB2GRAY)
    edges=cv2.Canny(gray,35,90)
    edges=cv2.morphologyEx(edges,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
    contours,_=cv2.findContours(edges,cv2.RETR_LIST,cv2.CHAIN_APPROX_SIMPLE)
    regions=[]
    for contour in contours:
        area=cv2.contourArea(contour)
        if area<.0018*allowed.size or area>.23*allowed.size:continue
        hull=cv2.contourArea(cv2.convexHull(contour))
        if area/max(1,hull)<.7:continue
        mask=np.zeros(allowed.shape,np.uint8);cv2.drawContours(mask,[contour],-1,255,-1)
        colour_fraction=np.mean(allowed[mask>0]>0)
        if colour_fraction<.23:continue
        regions.append(mask)
    return regions

def detect(rgb: np.ndarray, color: str):
    if color not in COLORS:
        raise ValueError('Unbekannte Boulderfarbe.')
    h,w = rgb.shape[:2]
    proposals=[]
    paper=paper_regions(rgb)
    masks=colour_masks(rgb,color)
    allowed=np.maximum.reduce(masks);allowed[paper>0]=0
    regions=[]
    for binary in masks:
        binary[paper>0]=0
        binary = cv2.morphologyEx(binary,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
        # Break narrow colour bridges between hold and similarly coloured wall.
        opening = max(3, int(min(w,h)*.019) | 1)
        binary = cv2.morphologyEx(binary,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(opening,opening)))
        count,labels,stats,_ = cv2.connectedComponentsWithStats(binary)
        for label in range(1,count):
            x,y,bw,bh,area = stats[label]
            fraction = area/(w*h)
            borders = int(x<=1)+int(y<=1)+int(x+bw>=w-1)+int(y+bh>=h-1)
            if fraction < .0018 or fraction > .23 or min(bw,bh)<8 or borders>=2:
                continue
            seed = silhouette(np.where(labels==label,255,0).astype(np.uint8))
            contour,box,size,solidity = properties(seed)
            if solidity < .56 or max(bw,bh)/max(1,min(bw,bh))>5:
                continue
            regions.append(seed)
    regions.extend(edge_regions(rgb,allowed))
    for seed in regions:
            contour,box,size,solidity=properties(seed)
            x,y,bw,bh=box
            borders=int(x<=1)+int(y<=1)+int(x+bw>=w-1)+int(y+bh>=h-1)
            if borders>=2:continue
            # Rank compact, reasonably large colour regions away from edges.
            # This is an explicit heuristic, not a probability of a start hold.
            centrality = 1-min(1,math.hypot((x+bw/2)/w-.5,(y+bh/2)/h-.5)/.71)
            score = 1.7*math.sqrt(size/(w*h))+.3*solidity+.18*centrality-.2*borders
            proposals.append((score,seed))
    proposals.sort(key=lambda p:p[0],reverse=True)
    candidates=[]
    for _,seed in proposals:
        if any(np.count_nonzero((seed>0)&(m>0))/max(1,np.count_nonzero((seed>0)|(m>0)))>.95 for _,m in candidates):
            continue
        candidates.append((_,seed))
        if len(candidates)>=40:
            break
    refined=[]
    for score,seed in candidates:
        mask=refine(rgb,seed,paper=paper)
        if np.count_nonzero(mask)<.001*w*h:
            continue
        contour,box,area,solidity=properties(mask)
        support,delta,contrast=boundary_evidence(rgb,mask)
        if support<(.52 if color=='white' else .78) or delta<(16 if color=='white' else 22) or solidity<.68:continue
        x,y,bw,bh=box
        if color=='white' and (contrast<20 or x<=1 or y<=1 or x+bw>=w-1 or y+bh>=h-1):continue
        if color=='orange':
            hsv=cv2.cvtColor(rgb,cv2.COLOR_RGB2HSV)
            if float(np.median(hsv[:,:,0][mask>0]))>=21:continue
        if np.mean(allowed[mask>0]>0)<(.30 if color=='white' else .2):continue
        score=score+.45*support
        refined.append((score,mask))
    refined.sort(key=lambda p:p[0],reverse=True)
    unique=[]
    for score,mask in refined:
        if any(np.count_nonzero((mask>0)&(m>0))/max(1,min(np.count_nonzero(mask),np.count_nonzero(m)))>.65 for _,m in unique):continue
        unique.append((score,mask))
    return unique[:8]

def point_candidate(rgb: np.ndarray, x: float, y: float):
    h,w=rgb.shape[:2]
    px,py=int(np.clip(x,0,1)*(w-1)),int(np.clip(y,0,1)*(h-1))
    lab=cv2.cvtColor(cv2.GaussianBlur(rgb,(5,5),0),cv2.COLOR_RGB2LAB).astype(np.float32)
    patch=lab[max(0,py-2):py+3,max(0,px-2):px+3]
    center=np.median(patch.reshape(-1,3),axis=0)
    delta=lab-center
    distance=np.sqrt((delta[:,:,0]*.55)**2+delta[:,:,1]**2+delta[:,:,2]**2)
    similar=(distance<19).astype(np.uint8)*255
    radius=max(20,int(min(w,h)*.23))
    roi=np.zeros((h,w),np.uint8)
    cv2.circle(roi,(px,py),radius,255,-1)
    similar=cv2.bitwise_and(similar,roi)
    similar=cv2.morphologyEx(similar,cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))
    _,labels,stats,_=cv2.connectedComponentsWithStats(similar)
    label=labels[py,px]
    if label==0 or stats[label,4]<15:
        raise ValueError('An dieser Stelle keine zusammenhängende Fläche gefunden. Bitte auf die Griffoberfläche tippen.')
    mask=silhouette(np.where(labels==label,255,0).astype(np.uint8))
    mask=refine(rgb,mask,(px,py))
    return mask

def candidate_json(mask: np.ndarray, index: str, score: float|None=None):
    contour,box,area,solidity=properties(mask)
    contour=cv2.approxPolyDP(contour, max(.75, .0015*cv2.arcLength(contour,True)), True)
    x,y,bw,bh=[int(v) for v in box]
    return {'id':index,'mask':data_uri(mask),'polygon':contour[:,0,:].tolist(),
            'box':[x,y,bw,bh],'area':int(area),'rank_score':round(score,4) if score is not None else None,
            'source':'automatic' if score is not None else 'point_correction'}

def analyze(raw: bytes,color: str,point=None):
    start=time.perf_counter()
    rgb=decode_image(raw)
    h,w=rgb.shape[:2]
    if point is not None:
        candidates=[candidate_json(point_candidate(rgb,*point),'manual')]
    else:
        candidates=[candidate_json(mask,'c'+str(i),score) for i,(score,mask) in enumerate(detect(rgb,color))]
    selected=[candidates[0]['id']] if candidates else []
    return {'version':VERSION,'image_hash':hashlib.sha256(raw).hexdigest(),'color':color,
            'width':w,'height':h,'image':data_uri(cv2.cvtColor(rgb,cv2.COLOR_RGB2BGR),'.jpg'),
            'candidates':candidates,'selected':selected,'duration_ms':round((time.perf_counter()-start)*1000),
            'status':'needs_review' if candidates else 'no_candidate',
            'note':'Startfunktion nicht erkannt. Auswahl nach Farbe, Fläche und Form; bitte prüfen.',
            'library':cv2.__version__}
