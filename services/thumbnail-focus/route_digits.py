"""Small local digit-shape check for printed route cards; no OCR service."""
from functools import lru_cache
import cv2,numpy as np
from PIL import Image,ImageDraw,ImageFont

def normal(mask):
 points=cv2.findNonZero(mask)
 if points is None:return np.zeros((32,32),np.uint8)
 x,y,w,h=cv2.boundingRect(points);crop=mask[y:y+h,x:x+w];factor=26/max(w,h);nw,nh=max(1,round(w*factor)),max(1,round(h*factor));out=np.zeros((32,32),np.uint8);out[(32-nh)//2:(32-nh)//2+nh,(32-nw)//2:(32-nw)//2+nw]=cv2.resize(crop,(nw,nh),interpolation=cv2.INTER_AREA)>80
 return out

@lru_cache(maxsize=1)
def templates():
 rows=[]
 for font in ['C:/Windows/Fonts/arial.ttf','C:/Windows/Fonts/arialbd.ttf','C:/Windows/Fonts/calibri.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']:
  try:f=ImageFont.truetype(font,48)
  except OSError:continue
  for digit in '12345678?':
   im=Image.new('L',(80,80));ImageDraw.Draw(im).text((40,40),digit,font=f,anchor='mm',fill=255)
   for angle in range(0,360,15):rows.append(normal(np.asarray(im.rotate(angle,resample=Image.Resampling.BICUBIC))))
 if not rows:raise RuntimeError('Install DejaVu Sans fonts for number-card checks.')
 return np.array(rows,dtype=np.float32).reshape(-1,1024)

def digit_evidence(rgb,mask):
 gray=cv2.cvtColor(rgb,cv2.COLOR_RGB2GRAY);inner=cv2.erode(mask,np.ones((3,3),np.uint8))>0
 if inner.sum()<10 or min(cv2.boundingRect(cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)[0][0])[2:])<15:inner=mask>0
 median=np.median(gray[inner]);ink=(inner&(gray<median-35)).astype(np.uint8)*255
 contours=cv2.findContours(ink,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)[0];best=0.
 for c in contours:
  x,y,w,h=cv2.boundingRect(c);area=cv2.contourArea(c)
  if max(w,h)<4 or min(w,h)<2 or area<2:continue
  glyph=np.zeros_like(ink);cv2.drawContours(glyph,[c],-1,255,-1)
  # Retain enclosed counters in 6/8 rather than filling the printed glyph.
  glyph=cv2.bitwise_and(glyph,ink)
  flat=normal(glyph).reshape(-1).astype(np.float32);bank=templates();inter=bank@flat;dice=2*inter/np.maximum(1,bank.sum(axis=1)+flat.sum());best=max(best,float(dice.max()))
 return best
