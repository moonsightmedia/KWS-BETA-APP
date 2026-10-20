"""Fetch pinned official MIT HAN Lab ONNX weights and verify their SHA-256."""
import hashlib, os, urllib.request
from pathlib import Path
from model_contract import REVISION, MODELS
FILES={name:identity[1] for name,identity in MODELS.items()}
def digest(path):
 with path.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
def verify_models(root):
 root=Path(root)
 for name,(size,expected) in MODELS.items():
  target=root/name
  if target.is_symlink() or not target.is_file() or target.stat().st_size!=size or digest(target)!=expected:
   raise ValueError('Unverified model: '+name)
 return True

def download(root):
 root=Path(root);root.mkdir(parents=True,exist_ok=True)
 if root.is_symlink():raise ValueError('Model directory must not be a symlink.')
 for name,(size,expected) in MODELS.items():
  final=root/name
  if final.is_symlink():raise ValueError('Model must not be a symlink.')
  if final.exists() and final.stat().st_size==size and digest(final)==expected:print(name+': verified');continue
  temporary=final.with_suffix('.download')
  if temporary.exists() or temporary.is_symlink():raise ValueError('Existing download must be reviewed before retrying: '+temporary.name)
  created=False
  try:
   # Exclusive creation avoids following an operator-created symlink. Stream a
   # fixed maximum, so a changed endpoint cannot fill the server filesystem.
   with urllib.request.urlopen(f'https://huggingface.co/mit-han-lab/efficientvit-sam/resolve/{REVISION}/onnx/{name}?download=true',timeout=60) as response, temporary.open('xb') as output:
    created=True
    remaining=size
    while remaining:
     chunk=response.read(min(1024*1024,remaining))
     if not chunk:raise ValueError('Incomplete model download.')
     output.write(chunk);remaining-=len(chunk)
    if response.read(1):raise ValueError('Model exceeds pinned size.')
   if digest(temporary)!=expected:raise ValueError('Model checksum mismatch; refusing to install.')
   temporary.replace(final);print(name+': downloaded and verified')
  except BaseException:
   # This path belongs exclusively to this invocation, never an old user file.
   if created and temporary.exists() and not temporary.is_symlink():temporary.unlink()
   raise
 verify_models(root)
if __name__=='__main__':
 download(os.getenv('THUMBNAIL_MODEL_DIR',str(Path(__file__).resolve().parent/'models')))
