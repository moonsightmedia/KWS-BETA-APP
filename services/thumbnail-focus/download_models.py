"""Fetch pinned official MIT HAN Lab ONNX weights and verify their SHA-256."""
import hashlib, os, urllib.request
from pathlib import Path
REVISION='e4668c026bd3743c6011cc5453dbe32d4d67cadf'
FILES={
 'l0_encoder.onnx':'7a37ebd16e65c31253416e33897e7e6b07699127765d538e99ecbfaa3ad1e727',
 'l0_decoder.onnx':'053e72c5703736a8a8a92482c9990c4a26dde9dcb7ff26b05843cf0bc433f42f',
}
def digest(path):
 with path.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()
if __name__=='__main__':
 root=Path(os.getenv('THUMBNAIL_MODEL_DIR',str(Path(__file__).resolve().parent/'models')));root.mkdir(parents=True,exist_ok=True)
 for name,expected in FILES.items():
  final=root/name
  if final.exists() and digest(final)==expected:print(name+': verified');continue
  temporary=final.with_suffix('.download')
  urllib.request.urlretrieve(f'https://huggingface.co/mit-han-lab/efficientvit-sam/resolve/{REVISION}/onnx/{name}?download=true',temporary)
  if digest(temporary)!=expected:raise SystemExit('Model checksum mismatch; refusing to install.')
  temporary.replace(final);print(name+': downloaded and verified')
