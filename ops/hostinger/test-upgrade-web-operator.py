import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('upgrade_operator', Path(__file__).with_name('upgrade-web-operator.py'))
operator = importlib.util.module_from_spec(spec); spec.loader.exec_module(operator)

class OperatorUpgradeTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory(); self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.before, self.after = b'print("old")\n', b'print("reviewed")\n'
        (self.root / 'update-production-web.py').write_bytes(self.before)
        (self.root / 'config.json').write_text(json.dumps({'operator_sha256': operator.digest(self.before), 'other': 'retained'}))
        self.candidate = self.root / 'candidate.py'; self.candidate.write_bytes(self.after)
    def test_reviewed_upgrade_preserves_original_and_other_config(self):
        proof = operator.upgrade(self.root, self.candidate, operator.digest(self.before), operator.digest(self.after))
        self.assertEqual((Path(proof['rollback']) / 'update-production-web.py').read_bytes(), self.before)
        self.assertEqual((self.root / 'update-production-web.py').read_bytes(), self.after)
        self.assertEqual(json.loads((self.root / 'config.json').read_text()), {'operator_sha256': operator.digest(self.after), 'other': 'retained'})
    def test_stale_installed_or_candidate_hash_cannot_change_operator(self):
        for old, new in ((operator.digest(self.after), operator.digest(self.after)), (operator.digest(self.before), 'a' * 64)):
            with self.assertRaises(ValueError): operator.upgrade(self.root, self.candidate, old, new)
            self.assertEqual((self.root / 'update-production-web.py').read_bytes(), self.before)
    def test_syntax_error_cannot_replace_working_operator(self):
        broken = b'def broken(\n'; self.candidate.write_bytes(broken)
        with self.assertRaises(SyntaxError): operator.upgrade(self.root, self.candidate, operator.digest(self.before), operator.digest(broken))
        self.assertEqual((self.root / 'update-production-web.py').read_bytes(), self.before)

if __name__ == '__main__': unittest.main()
