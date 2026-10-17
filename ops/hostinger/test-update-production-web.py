import importlib.util
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('web_release', Path(__file__).with_name('update-production-web.py'))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)

class UnifiedReleaseTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.stage = self.root / 'stage'; self.stage.mkdir()
        self.candidate = self.stage / 'source'; self.candidate.mkdir()
        self.previous = self.root / 'previous'
        old = self.root / 'source'; (old / 'dist/landing').mkdir(parents=True)
        (old / 'dist/index.html').write_text('old app')
        (old / 'dist/landing/index.html').write_text('old landing')
        self.metadata = {'SOURCE.json': b'old source', 'BUILD-VERIFIED.json': b'old build', 'LANDING-VERIFIED.json': b'old landing proof', 'docker-compose.yml': b'old compose'}
        for name, content in self.metadata.items(): (self.root / name).write_bytes(content)
        (self.candidate / 'dist/landing').mkdir(parents=True)
        (self.candidate / 'dist/index.html').write_text('new app')
        (self.candidate / 'dist/landing/index.html').write_text('new landing')

    def test_post_swap_failure_restores_both_sites_mount_and_all_proofs(self):
        starts = []
        def verify():
            self.assertEqual((self.root / 'source/dist/landing/index.html').read_text(), 'new landing')
            (self.root / 'SOURCE.json').write_text('partial metadata')
            raise RuntimeError('landing smoke failed')
        with self.assertRaisesRegex(RuntimeError, 'landing smoke failed'):
            release.activate_release(self.root, self.stage, self.candidate, self.previous, 'new compose', lambda: starts.append(1), verify, lambda: None)
        self.assertEqual(len(starts), 2)
        self.assertEqual((self.root / 'source/dist/index.html').read_text(), 'old app')
        self.assertEqual((self.root / 'source/dist/landing/index.html').read_text(), 'old landing')
        self.assertEqual((self.stage / 'failed-source/dist/index.html').read_text(), 'new app')
        for name, content in self.metadata.items(): self.assertEqual((self.root / name).read_bytes(), content)

    def test_success_keeps_previous_pair_and_publishes_one_pair(self):
        release.activate_release(self.root, self.stage, self.candidate, self.previous, 'new compose', lambda: None, lambda: None, lambda: (self.root / 'SOURCE.json').write_text('new proof'))
        self.assertEqual((self.root / 'source/dist/index.html').read_text(), 'new app')
        self.assertEqual((self.root / 'source/dist/landing/index.html').read_text(), 'new landing')
        self.assertEqual((self.previous / 'dist/landing/index.html').read_text(), 'old landing')
        self.assertEqual((self.root / 'SOURCE.json').read_text(), 'new proof')
        self.assertEqual((self.stage / 'docker-compose.yml.previous').read_bytes(), b'old compose')

    def test_only_reviewed_landing_mount_changes_and_migration_is_idempotent(self):
        before = 'other: unchanged\n   - ' + str(self.root / 'landing-releases/1234567890abcdef/public/landing') + ':/landing:ro\n'
        after = release.unified_compose(self.root, before)
        self.assertEqual(after, 'other: unchanged\n   - ' + str(self.root / 'source/dist/landing') + ':/landing:ro\n')
        self.assertEqual(release.unified_compose(self.root, after), after)
        with self.assertRaisesRegex(AssertionError, 'Landing mount differs'):
            release.unified_compose(self.root, ' - /foreign:/landing:ro\n')
        with self.assertRaises(AssertionError): release.unified_compose(self.root, before + before)

    def manifest(self):
        source = self.candidate; directory = source / 'dist/landing'
        routes = source / 'ops/hostinger/landingpage/routes.caddy'; routes.parent.mkdir(parents=True); routes.write_bytes(b'reviewed routes')
        names = ['index.html','privacy.html','imprint.html','community-rules.html','robots.txt','sitemap.xml','googlef8c88b5192841789.html','beta-favicon.ico']
        files = []
        for name in names:
            data = name.encode(); (directory / name).write_bytes(data)
            files.append({'path':'public/landing/' + name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
        manifest = {'schema':1,'revision':'a'*40,'canonical':'https://beta.kletterwelt-sauerland.de/landingpage','release':'1234567890abcdef','routesSha256':hashlib.sha256(routes.read_bytes()).hexdigest(),'files':files}
        (directory / 'release.json').write_text(json.dumps(manifest))
        return manifest

    def test_landing_requires_matching_revision_complete_files_and_exact_hashes(self):
        manifest = self.manifest()
        self.assertEqual(release.verified_landing(self.candidate, 'a'*40), manifest)
        with self.assertRaisesRegex(AssertionError, 'Landing revision differs'): release.verified_landing(self.candidate, 'b'*40)
        icon = self.candidate / 'dist/landing/beta-favicon.ico'; original = icon.read_bytes(); icon.write_bytes(b'wrong icon')
        with self.assertRaisesRegex(AssertionError, 'Landing asset differs'): release.verified_landing(self.candidate, 'a'*40)
        icon.write_bytes(original); (self.candidate / 'dist/landing/unexpected.txt').write_text('unexpected')
        with self.assertRaisesRegex(AssertionError, 'Unexpected or missing'): release.verified_landing(self.candidate, 'a'*40)

    def test_landing_manifest_cannot_read_outside_the_release(self):
        manifest = self.manifest(); manifest['files'][0]['path'] = 'public/landing//etc/passwd'
        (self.candidate / 'dist/landing/release.json').write_text(json.dumps(manifest))
        with self.assertRaises(AssertionError): release.verified_landing(self.candidate, 'a'*40)


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
