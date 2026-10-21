import unittest
from collect import validate_backend

class BackendPreflightTests(unittest.TestCase):
    def test_stale_configuration_is_rejected(self):
        with self.assertRaisesRegex(ValueError,'explicitly verified live backend'):
            validate_backend('https://old-project.supabase.co','https://beta-api.kletterwelt-sauerland.de')

    def test_same_origin_normalizes_trailing_slash(self):
        self.assertEqual(validate_backend('https://beta-api.kletterwelt-sauerland.de/','https://beta-api.kletterwelt-sauerland.de'),'https://beta-api.kletterwelt-sauerland.de')

    def test_not_an_https_origin_is_rejected(self):
        for value in ['http://example.test','https://user:password@example.test','https://example.test/path','https://example.test?key=test']:
            with self.subTest(value=value),self.assertRaises(ValueError):validate_backend(value,value)

if __name__=='__main__':unittest.main()
