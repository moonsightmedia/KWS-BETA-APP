import importlib.util
import hashlib
import json
from pathlib import Path, PurePosixPath
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
        # Compose runs on Linux; exercise its path contract on every test host.
        linux_root = PurePosixPath('/opt/kws/web-production')
        before = 'other: unchanged\n   - ' + str(linux_root / 'landing-releases/1234567890abcdef/public/landing') + ':/landing:ro\n'
        after = release.unified_compose(linux_root, before)
        self.assertEqual(after, 'other: unchanged\n   - ' + str(linux_root / 'source/dist/landing') + ':/landing:ro\n')
        self.assertEqual(release.unified_compose(linux_root, after), after)
        with self.assertRaisesRegex(AssertionError, 'Landing mount differs'):
            release.unified_compose(linux_root, ' - /foreign:/landing:ro\n')
        with self.assertRaises(AssertionError): release.unified_compose(linux_root, before + before)

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

class MonitoringBuildGuardTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name); self.functions = self.root / 'functions'; self.functions.mkdir()
    def write(self, name, document):
        path = self.root / name; path.write_text(json.dumps(document)); path.chmod(0o600)
    def enabled(self):
        config = {'version':1,'collection_enabled':True,'client':{'sentry_dsn':None}}
        self.write('config.json',config)
        checksum = hashlib.sha256(json.dumps(config,sort_keys=True,separators=(',',':')).encode()).hexdigest()
        artifacts = {}
        for filename in ('common.py','alert_worker.py','sentry_importer.py','store_importer.py','maintenance.py','install.py'):
            path = self.root / filename; path.write_text('reviewed worker'); artifacts[filename] = hashlib.sha256(path.read_bytes()).hexdigest()
        self.write('activation.json',{'allow_jobs':True,'config_sha256':checksum,'artifacts':artifacts})
        files = {}
        for filename in ('monitoring-events/handler.ts','monitoring-events/index.ts','send-push-notification/handler.ts','send-push-notification/index.ts'):
            path = self.functions / filename; path.parent.mkdir(exist_ok=True); path.write_text('reviewed')
            files[filename] = hashlib.sha256(path.read_bytes()).hexdigest()
            candidate_path = self.root / 'supabase/functions' / filename; candidate_path.parent.mkdir(parents=True,exist_ok=True); candidate_path.write_text('reviewed')
        migration = self.root / 'supabase/migrations/20261017203000_beta_launch_monitoring.sql'; migration.parent.mkdir(parents=True,exist_ok=True); migration.write_text('reviewed schema')
        self.write('edge-installation.json',{'runtime_mount_verified':True,'handler_hashes_verified':True,'functions_restarted':True,'files':files})
        self.write('ingest-verification.json',{'ingest_verified':True,'config_sha256':checksum,'migration_sha256':hashlib.sha256(migration.read_bytes()).hexdigest(),'files':files,'database_signature':'a'*32})
    def test_default_and_disabled_configuration_never_enable_sentry_or_collection(self):
        self.assertEqual(release.monitoring_build_values(self.root,self.functions)['VITE_MONITORING_ENABLED'],'false')
        self.write('config.json',{'version':1,'collection_enabled':False,'client':{'sentry_dsn':'not-used'}})
        self.assertEqual(release.monitoring_build_values(self.root,self.functions)['VITE_SENTRY_DSN'],'')
    def test_enabled_collection_requires_exact_private_activation_and_edge_proof(self):
        self.enabled()
        self.assertEqual(release.monitoring_build_values(self.root,self.functions,self.root)['VITE_MONITORING_ENABLED'],'true')
        self.write('activation.json',{'allow_jobs':True,'config_sha256':'changed'})
        with self.assertRaisesRegex(AssertionError,'not approved'): release.monitoring_build_values(self.root,self.functions,self.root)
    def test_changed_edge_handler_or_missing_restart_stops_build(self):
        self.enabled(); (self.functions / 'monitoring-events/handler.ts').write_text('changed')
        with self.assertRaisesRegex(AssertionError,'differs'): release.monitoring_build_values(self.root,self.functions,self.root)
        self.enabled(); receipt = json.loads((self.root / 'edge-installation.json').read_text()); receipt['functions_restarted'] = False; self.write('edge-installation.json',receipt)
        with self.assertRaisesRegex(AssertionError,'not verified'): release.monitoring_build_values(self.root,self.functions,self.root)
    def test_missing_ingest_or_changed_candidate_blocks_collection(self):
        self.enabled(); proof = json.loads((self.root / 'ingest-verification.json').read_text()); proof['ingest_verified'] = False; self.write('ingest-verification.json',proof)
        with self.assertRaisesRegex(AssertionError,'not verified'): release.monitoring_build_values(self.root,self.functions,self.root)
        self.enabled(); (self.root / 'supabase/functions/monitoring-events/handler.ts').write_text('different')
        with self.assertRaisesRegex(AssertionError,'candidate handler differs'): release.monitoring_build_values(self.root,self.functions,self.root)
        self.enabled(); (self.root / 'supabase/migrations/20261017203000_beta_launch_monitoring.sql').write_text('different schema')
        with self.assertRaisesRegex(AssertionError,'migration differs'): release.monitoring_build_values(self.root,self.functions,self.root)
    def test_changed_or_missing_worker_binding_stops_collection(self):
        self.enabled(); (self.root / 'common.py').write_text('changed')
        with self.assertRaisesRegex(AssertionError,'worker changed'): release.monitoring_build_values(self.root,self.functions,self.root)
        self.enabled(); proof = json.loads((self.root / 'activation.json').read_text()); del proof['artifacts']['maintenance.py']; self.write('activation.json',proof)
        with self.assertRaisesRegex(AssertionError,'worker proof is incomplete'): release.monitoring_build_values(self.root,self.functions,self.root)

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


class ThumbnailActivationTests(unittest.TestCase):
    def setUp(self):
        self.workspace = tempfile.TemporaryDirectory()
        self.addCleanup(self.workspace.cleanup)
        self.root = Path(self.workspace.name)
        self.gateway = self.root / 'Gateway.Caddyfile'
        self.gateway.write_bytes(b'reviewed private routes')
        self.proof = self.root / 'VERIFIED.json'
        self.proof.write_text(json.dumps({'models_verified': True, 'private_networks_only': True, 'local_only_false': True}))
        self.proof.chmod(0o600)
        self.config = self.root / 'ACTIVATION.json'
        self.activation = {'version': 1, 'enabled': True, 'verified_sha256': hashlib.sha256(self.proof.read_bytes()).hexdigest(), 'gateway_sha256': hashlib.sha256(self.gateway.read_bytes()).hexdigest()}
    def save(self):
        self.config.write_text(json.dumps(self.activation))
        self.config.chmod(0o600)
    def health(self, url):
        return {'ok': True, 'local_only': False, 'environment': 'review' if 'review-api' in url else 'production', 'provider': 'CPUExecutionProvider', 'model_revision': 'e4668c026bd3743c6011cc5453dbe32d4d67cadf', 'version': 'sam-number-cards-3.2'}
    def test_absent_or_disabled_stays_off_without_network(self):
        self.assertEqual(release.thumbnail_build_values(self.root, self.gateway)['VITE_THUMBNAIL_FOCUS'], 'false')
        self.activation['enabled'] = False; self.save()
        self.assertEqual(release.thumbnail_build_values(self.root, self.gateway)['VITE_THUMBNAIL_FOCUS'], 'false')
    def test_verified_private_production_and_review_enable_feature(self):
        self.save()
        values = release.thumbnail_build_values(self.root, self.gateway, self.health)
        self.assertEqual(values, {'VITE_THUMBNAIL_FOCUS': 'true', 'VITE_THUMBNAIL_API_PATH': '/thumbnail-focus'})
    def test_changed_receipt_or_gateway_blocks_activation(self):
        self.save(); original = self.proof.read_bytes()
        self.proof.write_bytes(original + b' ')
        with self.assertRaises(AssertionError): release.thumbnail_build_values(self.root, self.gateway, self.health)
        self.proof.write_bytes(original); self.gateway.write_bytes(b'changed routes')
        with self.assertRaises(AssertionError): release.thumbnail_build_values(self.root, self.gateway, self.health)
    def test_wrong_backend_and_local_bypass_block_activation(self):
        self.save()
        for mismatch in ({'environment': 'other'}, {'local_only': True}, {'provider': 'GPU'}, {'model_revision': 'other'}, {'version': 'other'}):
            def bad_health(url): return {**self.health(url), **mismatch}
            with self.subTest(mismatch=mismatch), self.assertRaises(AssertionError):
                release.thumbnail_build_values(self.root, self.gateway, bad_health)
    def test_unverified_runtime_blocks_even_healthy_endpoints(self):
        self.proof.write_text(json.dumps({'models_verified': False, 'private_networks_only': True, 'local_only_false': True}))
        self.activation['verified_sha256'] = hashlib.sha256(self.proof.read_bytes()).hexdigest(); self.save()
        with self.assertRaises(AssertionError): release.thumbnail_build_values(self.root, self.gateway, self.health)

if __name__ == '__main__':
    unittest.main()
