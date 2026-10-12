"""Exercise the real operator control flow against synthetic adapters only."""
import contextlib, importlib.util, io, json, pathlib, tempfile, unittest
from unittest.mock import patch
spec = importlib.util.spec_from_file_location('operator', pathlib.Path(__file__).parents[1]/'ops/hostinger/account-deletion.py')
operator = importlib.util.module_from_spec(spec); spec.loader.exec_module(operator)
OWNER = 'f0000000-0000-4000-8000-000000000016'
REQUEST = 'f0000000-0000-4000-8000-000000000018'

class Response:
 def __enter__(self): return self
 def __exit__(self, *args): pass
 def read(self): return b'{}'

class OperatorTests(unittest.TestCase):
 def setUp(self):
  self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
  self.root = pathlib.Path(self.temp.name); self.video = self.root/'video'; self.private = self.root/'private'
  for name in ('temp','jobs','staging','final/sector'): (self.video/name).mkdir(parents=True, exist_ok=True)
  self.state = 'pending'; self.blocker = None; self.api = []; self.mail = []; self.purges = 0; self.fail_mail = False; self.video_running = False
  self.original_read = pathlib.Path.read_text
  self.stack = contextlib.ExitStack(); self.addCleanup(self.stack.close)
  for name, value in [('VIDEO',self.video),('PRIVATE',self.private)]: self.stack.enter_context(patch.object(operator,name,value))
  self.stack.enter_context(patch.object(operator.os,'geteuid',lambda:0,create=True)); self.stack.enter_context(patch.object(operator.socket,'gethostname',lambda:'srv2044594'))
  self.stack.enter_context(patch.object(operator.subprocess,'check_output',self.command))
  self.stack.enter_context(patch.object(operator.urllib.request,'urlopen',self.http))
  self.stack.enter_context(patch.object(pathlib.Path,'read_text',lambda file,*a,**kw: 'ANON_KEY=fixture-only\nSERVICE_ROLE_KEY=fixture-only\n' if str(file).replace('\\','/') == '/opt/kws/supabase/runtime/.env' else self.original_read(file,*a,**kw)))
  self.stack.enter_context(patch.object(operator.smtplib,'SMTP',lambda *a,**kw:self))
 def __enter__(self): return self
 def __exit__(self,*args): pass
 def starttls(self,**kw): pass
 def login(self,*args): pass
 def send_message(self,message):
  if self.fail_mail: raise ConnectionError('Synthetic SMTP failure')
  self.mail.append(message)
 def http(self,request,**kw): self.api.append(request.full_url); return Response()
 def command(self,command,input=None,**kw):
  if command[:2] == ['docker','inspect']:
   if command[2] == 'kws-video-production': return json.dumps([{'State':{'Running':self.video_running}}]).encode()
   return json.dumps([{'Config':{'Env':['GOTRUE_SMTP_HOST=example.invalid','GOTRUE_SMTP_ADMIN_EMAIL=beta@example.invalid','GOTRUE_SMTP_USER=fixture-only','GOTRUE_SMTP_PASS=fixture-only']}}]).encode()
  query = input.decode()
  if 'row_to_json(r)' in query: value = {'id':REQUEST,'user_id':OWNER,'status':self.state,'requested_at':'2026-10-12T08:00:00Z'}
  elif 'row_to_json(u)' in query: value = {'id':OWNER,'email':'qa@example.invalid','raw_user_meta_data':{}}
  elif 'FROM storage.objects' in query: value = []
  elif 'FROM pg_tables' in query: value = ['profiles','projects','upload_logs']
  elif 'FROM public."profiles"' in query: value = [{'id':OWNER,'full_name':'Synthetic QA'}]
  elif 'FROM public."projects"' in query: value = [{'id':'business','created_by':OWNER}] if self.blocker == 'business' else []
  elif 'FROM public."upload_logs"' in query: value = [{'user_id':OWNER,'session_id':'legacy','status':'completed'}] if self.blocker == 'legacy' else []
  elif 'SET status=\'processing\'' in query: self.state = 'processing'; return b''
  elif 'kws_finish_account_deletion' in query: self.state = 'completed'; self.purges += 1; value = {'completed':True}
  else: raise AssertionError('Unexpected synthetic SQL')
  return json.dumps(value).encode()
 def run_operator(self,execute=False,sha=None):
  arguments = ['account-deletion.py','--request',REQUEST] + (['--execute','--confirmed-plan-sha256',sha or 'unconfirmed'] if execute else [])
  with patch('sys.argv',arguments), contextlib.redirect_stdout(io.StringIO()): operator.main()
 def plan_sha(self): self.run_operator(); return operator.digest(json.loads((self.private/(REQUEST+'.plan.json')).read_text()))
 def test_default_plan_never_deletes_or_sends(self):
  self.plan_sha(); self.assertEqual(self.api,[]); self.assertEqual(self.mail,[]); self.assertEqual(self.purges,0)
 def test_confirmed_plan_erases_only_owned_media_then_notifies(self):
  owned = self.video/'final/sector/owned.jpg'; owned.write_bytes(b'owned')
  (owned.parent/('.'+owned.name+'.owner.json')).write_text(json.dumps({'owner_id':OWNER}))
  foreign = owned.parent/'foreign.jpg'; foreign.write_bytes(b'foreign')
  sha = self.plan_sha(); self.run_operator(True,sha)
  self.assertFalse(owned.exists()); self.assertTrue(foreign.exists()); self.assertEqual(self.purges,1)
  self.assertEqual(len(self.mail),1); self.assertEqual(self.mail[0]['Reply-To'],'marketing@kletterwelt-sauerland.de')
  self.assertTrue((self.private/(REQUEST+'.tombstone.json')).exists()); self.assertFalse((self.private/(REQUEST+'.notice.json')).exists())
 def test_changed_plan_business_and_legacy_guards_stop_before_network(self):
  for blocker in ('business','legacy',None):
   self.blocker=blocker; sha=self.plan_sha()
   with self.assertRaises(AssertionError): self.run_operator(True,sha if blocker else 'wrong-hash')
  self.assertEqual(self.api,[]); self.assertEqual(self.mail,[]); self.assertEqual(self.purges,0)
 def test_smtp_failure_retains_notice_and_retry_never_repeats_erasure(self):
  sha=self.plan_sha(); self.fail_mail=True
  with self.assertRaises(ConnectionError): self.run_operator(True,sha)
  self.assertEqual(self.purges,1); self.assertTrue((self.private/(REQUEST+'.notice.json')).exists())
  self.run_operator(False); self.assertEqual(len(self.mail),0)
  self.fail_mail=False; self.run_operator(True,sha); self.assertEqual(self.purges,1); self.assertEqual(len(self.mail),1)
 def test_running_upload_server_and_active_job_stop_before_erasure(self):
  sha=self.plan_sha(); self.video_running=True
  with self.assertRaises(AssertionError): self.run_operator(True,sha)
  self.video_running=False
  (self.video/'jobs'/'f0000000-0000-4000-8000-000000000019.json').write_text(json.dumps({'owner_id':OWNER,'status':'processing','job_id':'f0000000-0000-4000-8000-000000000019'}))
  sha=self.plan_sha()
  with self.assertRaises(AssertionError): self.run_operator(True,sha)
  self.assertEqual(self.api,[]); self.assertEqual(self.purges,0)

if __name__ == '__main__': unittest.main()
