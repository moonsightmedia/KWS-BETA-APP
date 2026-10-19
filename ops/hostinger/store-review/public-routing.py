#!/usr/bin/env python3
"""Validate and activate two HTTPS routes, with a retained gateway rollback."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import time
import urllib.request

ROOT = Path('/opt/kws/store-review')
GATEWAY = Path('/opt/kws/public-gateway')
ROUTES = '''

review-api.kletterwelt-sauerland.de {
 header {
  X-Content-Type-Options nosniff
  X-Frame-Options DENY
  Referrer-Policy no-referrer
  Cache-Control "no-store"
 }
 @app_api path /auth/v1/* /rest/v1/* /storage/v1/* /realtime/v1/*
 handle @app_api {
  reverse_proxy kws-store-review-api-gw:8000
 }
 handle {
  respond "Unknown review API route" 404
 }
}
review-video.kletterwelt-sauerland.de {
 header {
  X-Content-Type-Options nosniff
  X-Frame-Options DENY
  Referrer-Policy no-referrer
 }
 reverse_proxy kws-store-review-video:3000
}
'''


def candidate(caddy, compose):
    assert 'review-api.kletterwelt-sauerland.de' not in caddy
    assert 'review-video.kletterwelt-sauerland.de' not in caddy
    assert compose.count('    networks: [supabase]') == 1
    assert compose.count('networks:\n  supabase:') == 1
    compose = compose.replace('    networks: [supabase]', '    networks: [supabase, store_review]')
    compose = compose.replace('networks:\n  supabase:',
        'networks:\n  store_review:\n    external: true\n    name: kws-store-review-private\n  supabase:')
    return caddy.rstrip() + ROUTES, compose


def run(args, log):
    subprocess.run(args, stdout=log, stderr=log, check=True)


def http_status(url, headers=None):
    with urllib.request.urlopen(urllib.request.Request(url, headers=headers or {}), timeout=12) as response:
        return response.status


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--activate', action='store_true')
    args = parser.parse_args()
    assert os.geteuid() == 0 and socket.gethostname().split('.')[0] == 'srv2044594'
    os.umask(0o077)
    proof = ROOT / 'PUBLIC-ROUTING.json'
    if proof.exists():
        print(proof.read_text())
        return
    assert json.loads((ROOT / 'SEEDED.json').read_text())['source_rows_copied'] == 0
    assert json.loads((ROOT / 'SECURITY-VERIFIED.json').read_text())['private_media_ready']
    def public_key(path):
        values = dict(line.split('=', 1) for line in path.read_text().splitlines()
                      if line and not line.startswith('#') and '=' in line)
        return {'apikey': values['ANON_KEY']}
    production_headers = public_key(Path('/opt/kws/supabase/runtime/.env'))
    review_headers = public_key(ROOT / '.env')
    old_caddy = (GATEWAY / 'Caddyfile').read_text()
    old_compose = (GATEWAY / 'docker-compose.yml').read_text()
    new_caddy, new_compose = candidate(old_caddy, old_compose)
    plan = {'caddy_before': hashlib.sha256(old_caddy.encode()).hexdigest(),
            'compose_before': hashlib.sha256(old_compose.encode()).hexdigest(),
            'caddy_after': hashlib.sha256(new_caddy.encode()).hexdigest(),
            'compose_after': hashlib.sha256(new_compose.encode()).hexdigest(),
            'only_public_routes': ['review-api.kletterwelt-sauerland.de',
                                   'review-video.kletterwelt-sauerland.de'],
            'studio_exposed': False, 'production_routes_changed': False}
    print(json.dumps(plan))
    if not args.activate:
        return
    backup = ROOT / 'gateway-before-review'
    if backup.exists():
        assert (backup / 'Caddyfile').read_text() == old_caddy
        assert (backup / 'docker-compose.yml').read_text() == old_compose
    else:
        backup.mkdir(mode=0o700)
        (backup / 'Caddyfile').write_text(old_caddy)
        (backup / 'docker-compose.yml').write_text(old_compose)
    compose_args = ['docker', 'compose', '-f', str(GATEWAY / 'docker-compose.yml')]
    with (ROOT / 'gateway-activation.log').open('w') as log:
        try:
            (GATEWAY / 'Caddyfile').write_text(new_caddy)
            (GATEWAY / 'docker-compose.yml').write_text(new_compose)
            # Full adapter/provision validation with the existing protected environment.
            # The running gateway still has its old config until the following recreate.
            run(compose_args + ['run', '--rm', '--no-deps', 'caddy', 'caddy', 'validate',
                                '--config', '/etc/caddy/Caddyfile'], log)
            run(compose_args + ['up', '-d', '--no-deps', 'caddy'], log)
            last_error = None
            for attempt in range(30):
                try:
                    assert http_status('https://beta.kletterwelt-sauerland.de/release.json') == 200
                    assert http_status('https://beta-api.kletterwelt-sauerland.de/auth/v1/health', production_headers) == 200
                    assert http_status('https://video.kletterwelt-sauerland.de/health') == 200
                    assert http_status('https://review-api.kletterwelt-sauerland.de/auth/v1/health', review_headers) == 200
                    assert http_status('https://review-video.kletterwelt-sauerland.de/health') == 200
                    break
                except Exception as error:
                    last_error = type(error).__name__
                    time.sleep(2)
            else:
                raise RuntimeError('Gateway health failed: ' + str(last_error))
        except Exception:
            (GATEWAY / 'Caddyfile').write_text(old_caddy)
            (GATEWAY / 'docker-compose.yml').write_text(old_compose)
            run(compose_args + ['up', '-d', '--no-deps', 'caddy'], log)
            raise
    plan.update(public_routing_enabled=True, https_health_verified=True,
                rollback=str(backup), production_health_verified=True)
    proof.write_text(json.dumps(plan) + '\n')
    print(json.dumps(plan))


if __name__ == '__main__':
    main()
