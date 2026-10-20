import importlib.util
from pathlib import Path
import unittest
import hashlib
import json

spec = importlib.util.spec_from_file_location('media_release', Path(__file__).with_name('release.py'))
release = importlib.util.module_from_spec(spec)
spec.loader.exec_module(release)


class ReleaseGuards(unittest.TestCase):
    def test_manifest_matches_candidate_git_text(self):
        folder = Path(__file__).parent
        manifest = json.loads((folder / 'release-manifest.json').read_text(encoding='utf-8'))
        server = folder.parents[2] / 'hostinger-video-server'
        for relative, digest in manifest['candidate_sha256'].items():
            release.safe_relative(relative)
            data = (server / relative).read_bytes().replace(b'\r\n', b'\n')
            self.assertEqual(hashlib.sha256(data).hexdigest(), digest, relative + ': regenerate manifest after staging source edits')

    def test_only_video_image_variable_changes(self):
        before = 'UNCHANGED=fixture\nKWS_VIDEO_IMAGE=old\nOTHER=fixture\n'
        after = release.replace_image(before, 'kws-video-production:sdr-0123456789ab')
        self.assertEqual(after, before.replace('KWS_VIDEO_IMAGE=old', 'KWS_VIDEO_IMAGE=kws-video-production:sdr-0123456789ab'))
        for wrong in ['OTHER=fixture\n', 'KWS_VIDEO_IMAGE=a\nKWS_VIDEO_IMAGE=b\n']:
            with self.assertRaises(AssertionError):
                release.replace_image(wrong, 'kws-video-production:sdr-0123456789ab')

    def test_source_paths_are_scoped(self):
        for wrong in ['../.env', '/etc/passwd', 'src/../../.env', 'src\\server.js', '.env', 'node_modules/file.js']:
            with self.assertRaises(AssertionError):
                release.safe_relative(wrong)
        self.assertEqual(release.safe_relative('src/server.js'), 'src/server.js')

    def test_existing_container_volume_and_service_are_required(self):
        container = {'Image': 'sha256:fixture', 'Config': {'Labels': {'com.docker.compose.project.working_dir': str(release.ROOT), 'com.docker.compose.service': 'video'}}, 'Mounts': [{'Source': str(release.ROOT / 'data'), 'Destination': '/data', 'RW': True}]}
        release.validate_container(container, 'sha256:fixture')
        container['Mounts'][0]['Source'] = '/unrelated/data'
        with self.assertRaises(AssertionError):
            release.validate_container(container, 'sha256:fixture')


if __name__ == '__main__':
    unittest.main()
