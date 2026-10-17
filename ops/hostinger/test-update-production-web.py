import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('web_release', Path(__file__).with_name('update-production-web.py'))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class StaticLegalPagesTests(unittest.TestCase):
    def test_independent_legal_pages_and_app_routes(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            self.assertEqual(release.expected_page(root, '/privacy', 'app'), 'app')
            (root / 'LANDING-VERIFIED.json').write_text('{"release":"1234567890abcdef"}')
            legal = root / 'landing-releases/1234567890abcdef/public/landing'
            legal.mkdir(parents=True)
            for route in ('privacy', 'imprint', 'community-rules'):
                (legal / (route + '.html')).write_text('static ' + route)
                self.assertEqual(release.expected_page(root, '/' + route, 'app'), 'static ' + route)
            for route in ('/', '/auth', '/reset-password', '/auth/callback'):
                self.assertEqual(release.expected_page(root, route, 'app'), 'app')

    def test_missing_or_invalid_verified_legal_release_stops_deployment(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'LANDING-VERIFIED.json').write_text('{"release":"../../outside"}')
            with self.assertRaisesRegex(AssertionError, 'Invalid landing release'):
                release.expected_page(root, '/privacy', 'app')
            (root / 'LANDING-VERIFIED.json').write_text('{"release":"1234567890abcdef"}')
            with self.assertRaises(FileNotFoundError):
                release.expected_page(root, '/privacy', 'app')


class PreserveDownloadsTests(unittest.TestCase):
    def setUp(self):
        self.workspace = tempfile.TemporaryDirectory()
        self.addCleanup(self.workspace.cleanup)
        root = Path(self.workspace.name)
        self.previous = root / 'old/dist'
        self.next = root / 'next/dist'
        self.previous.mkdir(parents=True)
        self.next.mkdir(parents=True)

    def installer(self):
        path = self.previous / 'downloads/Android Update.apk'
        path.parent.mkdir()
        path.write_bytes(b'PK\x03\x04\x00\xffinstaller')
        return path

    def test_carries_installer_when_build_drops_download_directory(self):
        installer = self.installer()
        (self.next / 'index.html').write_text('new release')
        self.assertEqual(release.preserve_downloads(self.previous, self.next), 1)
        self.assertEqual((self.next / 'downloads' / installer.name).read_bytes(), installer.read_bytes())
        self.assertEqual((self.next / 'index.html').read_text(), 'new release')

    def test_identical_installer_already_in_build_is_retained(self):
        installer = self.installer()
        destination = self.next / 'downloads' / installer.name
        destination.parent.mkdir()
        destination.write_bytes(installer.read_bytes())
        self.assertEqual(release.preserve_downloads(self.previous, self.next), 1)

    def test_conflicting_installer_stops_release_without_overwrite(self):
        installer = self.installer()
        destination = self.next / 'downloads' / installer.name
        destination.parent.mkdir()
        destination.write_bytes(b'changed installer')
        with self.assertRaisesRegex(AssertionError, 'Download differs'):
            release.preserve_downloads(self.previous, self.next)
        self.assertEqual(destination.read_bytes(), b'changed installer')
        self.assertEqual(installer.read_bytes(), b'PK\x03\x04\x00\xffinstaller')

    def test_release_without_previous_downloads(self):
        self.assertEqual(release.preserve_downloads(self.previous, self.next), 0)

    def test_retry_retains_failed_stage_and_creates_fresh_directory(self):
        root = Path(self.workspace.name)
        first = release.new_release_stage(root, 'a' * 40)
        (first / 'build.log').write_text('first attempt failed')
        second = release.new_release_stage(root, 'a' * 40)
        self.assertNotEqual(first, second)
        self.assertTrue(second.is_dir())
        self.assertEqual((first / 'build.log').read_text(), 'first attempt failed')


if __name__ == '__main__':
    unittest.main()
