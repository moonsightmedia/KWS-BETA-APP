from pathlib import Path
import datetime as dt, importlib.util, json, tempfile, unittest
spec=importlib.util.spec_from_file_location('counter',Path(__file__).with_name('collect-landing.py'))
counter=importlib.util.module_from_spec(spec);spec.loader.exec_module(counter)
class CounterTests(unittest.TestCase):
    def test_berlin_midnight_success_only_and_window(self):
        with tempfile.TemporaryDirectory() as temporary:
            folder=Path(temporary)
            rows=[{'ts':stamp,'status':status,'page':'landingpage'} for stamp,status in [('2026-10-16T21:00Z',200),('2026-10-16T22:00Z',200),('2026-10-16T22:00Z',304),('2026-10-16T22:00Z',404),('2026-08-01T01:00Z',200)]]
            (folder/'access.jsonl').write_text(''.join(json.dumps(row)+'\n' for row in rows))
            data=counter.snapshot(folder,dt.datetime(2026,10,17,0,tzinfo=dt.timezone.utc))
            self.assertEqual(data['totals']['today'],2)
            self.assertEqual(data['totals']['last7'],3)
            self.assertEqual(len(data['days']),31)
            self.assertEqual(data['days'][-1]['date'],'2026-10-17')
    def test_reject_personal_fields(self):
        with tempfile.TemporaryDirectory() as temporary:
            folder=Path(temporary);(folder/'access.jsonl').write_text(json.dumps({'ts':'2026-10-16T22:00Z','status':200,'page':'landingpage','request':{'remote_ip':'192.0.2.1'}})+'\n')
            with self.assertRaises(AssertionError):counter.snapshot(folder,dt.datetime.now(dt.timezone.utc))
    def test_incomplete_active_line_and_failure(self):
        with tempfile.TemporaryDirectory() as temporary:
            folder=Path(temporary);(folder/'access.jsonl').write_text('{')
            self.assertEqual(counter.snapshot(folder,dt.datetime.now(dt.timezone.utc))['totals']['today'],0)
            (folder/'access-rolled.jsonl').write_text('{\n')
            with self.assertRaises(json.JSONDecodeError):counter.snapshot(folder,dt.datetime.now(dt.timezone.utc))
if __name__=='__main__':unittest.main()
