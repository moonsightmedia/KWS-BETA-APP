"""Local CPU-only EfficientViT-SAM adapter. Loads fixed ONNX files; never downloads photos."""
from pathlib import Path
import threading
import os
import cv2
import numpy as np
import onnxruntime as ort
ROOT=Path(os.environ.get('THUMBNAIL_MODEL_DIR',str(Path(__file__).resolve().parent/'models')))
_LOCK=threading.Lock()
_SESSIONS=None

def sessions():
 global _SESSIONS
 if _SESSIONS is None:
  with _LOCK:
   if _SESSIONS is None:
    options=ort.SessionOptions();options.intra_op_num_threads=4;options.inter_op_num_threads=1
    _SESSIONS=tuple(ort.InferenceSession(str(ROOT/name),sess_options=options,providers=['CPUExecutionProvider']) for name in ['l0_encoder.onnx','l0_decoder.onnx'])
 return _SESSIONS

class PhotoSegments:
 def __init__(self,rgb):
  self.h,self.w=rgb.shape[:2]
  target=512/max(self.h,self.w);self.rh=int(self.h*target+.5);self.rw=int(self.w*target+.5)
  resized=cv2.resize(rgb,(self.rw,self.rh),interpolation=cv2.INTER_LINEAR).astype(np.float32)
  resized=(resized-np.array([123.675,116.28,103.53],np.float32))/np.array([58.395,57.12,57.375],np.float32)
  tensor=np.zeros((1,3,512,512),np.float32);tensor[0,:,:self.rh,:self.rw]=resized.transpose(2,0,1)
  self.embedding=sessions()[0].run(None,{'input_image':tensor})[0]
 def masks(self,points,boxes=None):
  results=[]
  for offset in range(0,len(points),8):
   batch=points[offset:offset+8];coords=np.zeros((len(batch),2,2),np.float32);labels=np.full((len(batch),2),-1,np.float32)
   coords[:,0,:]=np.asarray(batch,np.float32)*1024/max(self.h,self.w);labels[:,0]=1
   if boxes is not None:
    coords=np.concatenate([coords[:,:1,:],np.asarray(boxes[offset:offset+8],np.float32).reshape(-1,2,2)*1024/max(self.h,self.w)],axis=1)
    labels=np.tile(np.array([1,2,3],np.float32),(len(batch),1))
   logits,scores=sessions()[1].run(None,{'image_embeddings':self.embedding,'point_coords':coords,'point_labels':labels})
   for point,logit,score in zip(batch,logits,scores):
    large=cv2.resize(logit[0],(1024,1024),interpolation=cv2.INTER_LINEAR)
    crop=large[:int(self.h*1024/max(self.h,self.w)+.5),:int(self.w*1024/max(self.h,self.w)+.5)]
    mask=(cv2.resize(crop,(self.w,self.h),interpolation=cv2.INTER_LINEAR)>0).astype(np.uint8)*255
    x,y=map(int,point);x=max(0,min(self.w-1,x));y=max(0,min(self.h-1,y))
    _,components=cv2.connectedComponents(mask)
    label=components[y,x]
    if label:mask=(components==label).astype(np.uint8)*255
    else:mask[:]=0
    results.append((mask,float(score[0])))
  return results
