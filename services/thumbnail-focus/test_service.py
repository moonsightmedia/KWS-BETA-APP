import base64, io, json, threading, unittest, urllib.error, urllib.request
from http.server import ThreadingHTTPServer
from unittest.mock import patch
from PIL import Image, ImageDraw
import server
import collect
from detector_start_v3 import analyze
from detector_start_v3 import shape_ok
import numpy as np

class Contract(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  server.LOCAL=True
  server.READY=True
  cls.http=ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
  server.PORT=cls.http.server_port
  cls.thread=threading.Thread(target=cls.http.serve_forever,daemon=True);cls.thread.start()
 @classmethod
 def tearDownClass(cls):cls.http.shutdown();cls.http.server_close();cls.thread.join()
 def call(self,path='/api/analyze',data=None,headers=None):
  request=urllib.request.Request(f'http://127.0.0.1:{server.PORT}'+path,data=None if data is None else json.dumps(data).encode(),headers={'Content-Type':'application/json',**(headers or {})})
  try:
   with urllib.request.urlopen(request,timeout=60) as r:return r.status,json.load(r)
  except urllib.error.HTTPError as e:return e.code,json.load(e)
 def test_health_and_no_file_server(self):
  self.assertEqual(self.call('/api/health')[0],200);self.assertEqual(self.call('/server.py')[0],404)
 def test_hostile_browser_origin(self):
  self.assertEqual(self.call(data={'image':'','color':'red'},headers={'Origin':'https://evil.test'})[0],403)
 def test_invalid_body(self):
  for data in [{},{'image':'bad-base64','color':'red'},{'image':'aA==','color':'manual'},{'image':'aA==','color':'red','point':[True,0]}]:
   self.assertEqual(self.call(data=data)[0],400)
 def test_production_denies_missing_or_unverifiable_token(self):
  with patch.object(server,'LOCAL',False):
   self.assertEqual(self.call(data={})[0],403)
   with patch.dict('os.environ',{'THUMBNAIL_AUTH_URL':'https://auth.test','THUMBNAIL_PUBLIC_KEY':'test'}),patch.object(server.AUTH_HTTP,'open',side_effect=OSError('offline')):
    self.assertFalse(server.authorized('Bearer unverifiable'))
 def test_backpressure(self):
  server.LOCK.acquire()
  try:self.assertEqual(self.call(data={'color':'red'})[0],429)
  finally:server.LOCK.release()
 def test_inventory_pagination_has_no_100_row_cap(self):
  pages=[]
  def fake(url,headers):
   from urllib.parse import urlparse,parse_qs
   query=parse_qs(urlparse(url).query);offset=int(query['offset'][0]);pages.append(offset)
   return json.dumps([{'id':str(i)} for i in range(offset,min(offset+100,204))]).encode()
  with patch.object(collect,'get',fake):self.assertEqual(len(collect.collect('https://example.test',{})),204)
  self.assertEqual(pages,[0,100,200])
 def test_blank_fallback_and_arbitrary_color_tap(self):
  photo=Image.new('RGB',(180,240),'#999999');out=io.BytesIO();photo.save(out,format='JPEG')
  result=analyze(out.getvalue(),'red');self.assertEqual(result['selected'],[])
  draw=ImageDraw.Draw(photo);draw.ellipse((50,70,130,150),fill='#ec5099',outline='black',width=3);out=io.BytesIO();photo.save(out,format='JPEG')
  result=analyze(out.getvalue(),'manual',[.5,.45]);self.assertEqual(len(result['selected']),1);self.assertEqual(result['candidates'][0]['source'],'point_correction')
 def test_manual_large_cropped_hold_does_not_relax_automatic_wall_filter(self):
  mask=np.zeros((480,360),np.uint8);mask[:300,:]=255
  self.assertFalse(shape_ok(mask,.8));self.assertTrue(shape_ok(mask,.8,manual=True))
  self.assertFalse(shape_ok(np.ones_like(mask)*255,.8,manual=True))
 def test_manual_revision_keeps_existing_automatic_review_keys(self):
  row={'id':'fixture','color':'red','thumbnail_url':'https://example.test/photo.jpg'};original=collect.cache_key(row)
  with patch.object(collect,'VERSION','different-manual-revision'):self.assertEqual(collect.cache_key(row),original)
  self.assertNotEqual(collect.cache_key({**row,'color':'blue'}),original)

if __name__=='__main__':unittest.main()
