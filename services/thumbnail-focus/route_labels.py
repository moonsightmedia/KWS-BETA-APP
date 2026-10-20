"""Image-only proposals for white route-number cards; no OCR or file-specific rules."""
import cv2
import numpy as np

def _detect_labels(rgb):
    h,w=rgb.shape[:2]
    smooth=cv2.GaussianBlur(rgb,(3,3),0)
    hsv=cv2.cvtColor(smooth,cv2.COLOR_RGB2HSV)
    gray=cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY)
    proposals=[]
    binaries=[((hsv[:,:,1]<95)&(hsv[:,:,2]>v)).astype(np.uint8)*255 for v in range(120,241,10)]
    adaptive=cv2.adaptiveThreshold(gray,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C,cv2.THRESH_BINARY,31,-7)
    adaptive[(hsv[:,:,1]>95)|(hsv[:,:,2]<90)]=0
    binaries.append(adaptive)
    # Dark printed glyphs can separate a card even when its white paper touches chalk.
    dark=(gray.astype(float)<cv2.GaussianBlur(gray,(17,17),0).astype(float)-28).astype(np.uint8)*255
    for glyph in cv2.findContours(dark,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)[0]:
        area=cv2.contourArea(glyph);x,y,gw,gh=cv2.boundingRect(glyph)
        if not (3<area<130 and 2<=min(gw,gh) and 5<=max(gw,gh)<=24):continue
        hull=cv2.contourArea(cv2.convexHull(glyph))
        if area/max(1,hull)>.8:continue
        rect=cv2.minAreaRect(glyph);(cx,cy),(rw,rh),angle=rect
        box=cv2.boxPoints(((cx,cy),(max(12,rw*2.4),max(12,rh*1.9)),angle)).astype(np.int32)
        proposal=np.zeros((h,w),np.uint8);cv2.fillConvexPoly(proposal,box,255)
        selected=proposal>0
        if float(np.median(gray[selected]))<135 or float(np.mean(hsv[:,:,1][selected]<95))<.4:continue
        binaries.append(proposal)
    for binary in binaries:
        binary=cv2.morphologyEx(binary,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
        for contour in cv2.findContours(binary,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)[0]:
            area=cv2.contourArea(contour)
            if area<50 or area>.035*w*h:continue
            x,y,bw,bh=cv2.boundingRect(contour)
            if x<=1 or y<=1 or x+bw>=w-1 or y+bh>=h-1:continue
            rect=cv2.minAreaRect(contour);rw,rh=rect[1]
            if min(rw,rh)<8 or max(rw,rh)>min(w,h)*.30:continue
            if max(rw,rh)/min(rw,rh)>2.8:continue
            rectangularity=area/max(1,rw*rh)
            if rectangularity<.60:continue
            mask=np.zeros((h,w),np.uint8);cv2.drawContours(mask,[contour],-1,255,-1)
            inner=cv2.erode(mask,np.ones((3,3),np.uint8))>0
            if inner.sum()<20:continue
            median=float(np.median(gray[inner]));ink=inner&(gray<median-32)
            if not 3<=ink.sum()<=.32*inner.sum():continue
            ring=(cv2.dilate(mask,np.ones((7,7),np.uint8))>0)&(mask==0)
            contrast=median-float(np.median(gray[ring])) if ring.any() else 0
            if contrast<5:continue
            # A white brand mark printed inside a coloured hold is not a paper card.
            if np.mean(hsv[:,:,1][ring]>120)>.65:continue
            score=rectangularity+min(.5,contrast/100)
            proposals.append((score,mask,contour))
    unique=[]
    for score,mask,contour in sorted(proposals,key=lambda p:p[0],reverse=True):
        if any(np.count_nonzero((mask>0)&(m>0))/max(1,min(np.count_nonzero(mask),np.count_nonzero(m)))>.45 for _,m,_ in unique):continue
        unique.append((score,mask,contour))
    return unique


def detect_labels(rgb):
    h,w=rgb.shape[:2]
    proposals=_detect_labels(rgb)
    if max(h,w)<=720:
        for score,mask,contour in _detect_labels(cv2.resize(rgb,(w*2,h*2),interpolation=cv2.INTER_CUBIC)):
            mask=cv2.resize(mask,(w,h),interpolation=cv2.INTER_NEAREST)
            contours=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)[0]
            if contours:proposals.append((score,mask,max(contours,key=cv2.contourArea)))
    unique=[]
    for score,mask,contour in sorted(proposals,key=lambda p:p[0],reverse=True):
        if any(np.count_nonzero((mask>0)&(m>0))/max(1,min(np.count_nonzero(mask),np.count_nonzero(m)))>.45 for _,m,_ in unique):continue
        unique.append((score,mask,contour))
    unique=[(score,mask,contour) for score,mask,contour in unique
            if np.count_nonzero(mask)>=60 and min(cv2.minAreaRect(contour)[1])>=6]
    unique.sort(key=lambda item:item[0]+min(1,np.count_nonzero(item[1])/300),reverse=True)
    return unique[:12]
