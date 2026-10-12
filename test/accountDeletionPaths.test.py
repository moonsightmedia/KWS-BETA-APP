import importlib.util, pathlib, tempfile, unittest
module_path = pathlib.Path(__file__).parents[1] / 'ops/hostinger/account-deletion.py'
spec = importlib.util.spec_from_file_location('deletion', module_path)
deletion = importlib.util.module_from_spec(spec); spec.loader.exec_module(deletion)

class ErasurePathTests(unittest.TestCase):
 def test_only_paths_inside_managed_root(self):
  with tempfile.TemporaryDirectory() as tmp:
   root = pathlib.Path(tmp)
   self.assertEqual(deletion.safe_path(root, 'final/sector/avatar.jpg'), root/'final/sector/avatar.jpg')
   for value in ('../outside', '/outside', 'final/../../outside', ''):
    with self.assertRaises(ValueError): deletion.safe_path(root, value)
 def test_symlink_ancestor_is_rejected(self):
  with tempfile.TemporaryDirectory() as tmp:
   root = pathlib.Path(tmp); (root/'actual').mkdir(); (root/'link').symlink_to(root/'actual', target_is_directory=True)
   with self.assertRaises(ValueError): deletion.safe_path(root, 'link/file.jpg')
 def test_plan_digest_is_order_stable_and_content_sensitive(self):
  self.assertEqual(deletion.digest({'a':1,'b':2}), deletion.digest({'b':2,'a':1}))
  self.assertNotEqual(deletion.digest({'files':['a']}), deletion.digest({'files':['a','b']}))
 def test_nested_media_refs(self):
  self.assertEqual(list(deletion.strings({'urls':['one',{'url':'two'}],'count':5})), ['one','two'])

if __name__ == '__main__': unittest.main()
