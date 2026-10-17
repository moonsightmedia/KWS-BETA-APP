# Automatic GitHub → Hostinger web releases

Pushes and merged pull requests on `main` run **Web production**. The workflow
checks the locked dependency install, Node regression tests, deployment safety,
desktop/mobile browser regressions and a combined app/landing production build. Pull requests run the
same checks without deploying. Production configuration stays on the VPS.

`srv2044594` checks `main` every minute. It accepts only a successful **Verify web
release** job in the newest matching workflow run from this repository and branch.
The workflow's deployment job waits for the exact SHA in the public
[release proof](https://beta.kletterwelt-sauerland.de/release.json), then records
success in GitHub's `production-web` environment. Both `/release.json` and
`/landing/release.json` must identify that SHA and the same landing artifact.
A failed test never qualifies.

The server pulls over HTTPS. No GitHub SSH key, inbound webhook, new public port or
broader SSH firewall rule is needed. There is no personal token on the server.
Anonymous API failures and rate limits defer deployment; they never bypass checks.
Idle checks use Git transport rather than the REST API.

## Release contract

- Only forward commits on `main` qualify; branches, fork/PR runs, cancelled checks
  and divergent/rewound history cannot publish.
- The installed, SHA-checked operator builds the exact source archive in an
  isolated Docker container. Candidate code cannot replace the installed operator.
- Builds use the current Hostinger web configuration, including disabled training
  preview. Database migrations, video-server and native releases remain separate.
- A source revision check before building and swapping prevents overwriting a
  concurrent manual release. Deployment locks prevent overlapping automatic runs.
- Failed builds retain both current sites. Before any live swap, an isolated copy
  of the production Caddy serves the candidate app and compiled landing for HTTP
  smoke tests. A failed post-swap test restores the previous source, landing mount,
  Compose file and app/landing release proofs together. Previous downloads and
  hashed assets survive. The original independent landing directory is retained
  for rollback during the first migration.
- Failed attempts stop until the workflow is rerun or a new commit qualifies.
  Retrying retains earlier diagnostics in a separate release directory.
- Version comes from committed `package.json`; build time and `release.json` SHA
  identify each deploy even when a commit does not bump the app version.

## Landing source and build

The approved website lives in `public/landing` on `main`; the legal-page source
and generator are tracked alongside it. Edit those files in a normal branch and
open a pull request. There is no second upload or independent production release.

`node ops/hostinger/build-web.mjs <exact-40-character-SHA>` builds the app in
Hostinger mode, builds and verifies the landing package, copies its compiled fonts
and assets into `dist/landing`, and writes a shared revision proof. The server's
read-only `/landing` mount points at `source/dist/landing`, so recreating only the
web container activates both sites from the same source directory.

CI runs the built landing through the pinned production Caddy: canonical routes,
aliases, 404 assets, legal noindex, responsive layout, roadmap/partner interaction,
cookies/storage, third-party requests and the anonymous counter's privacy filter.
Generated legal pages must match their committed sources. Store placeholders stay
disabled until real links are supplied.

Caddy routing/security changes require explicit operator review. The installed
operator checks that `routes.caddy` still matches the current reviewed server
configuration; normal content and asset changes do not require an operator update.
The legacy `landingpage/publish.py` refuses independent publishing after migration.

For rollback, pause the timer as described below, restore the retained source and
the `.previous` Compose/release-proof files in the failed or deployed release
directory, then recreate only `web`. Restore the matching pair together. The first
migration's prior Compose file points to the retained independent landing mount.

## Operator commands on srv2044594

```sh
systemctl status kws-web-autodeploy.timer
cat /var/lib/kws-web-autodeploy/status.json
cat /var/lib/kws-web-autodeploy/last-deployment.json
journalctl -u kws-web-autodeploy.service -n 20 --no-pager
cat /opt/kws/web-production/SOURCE.json
```

To check immediately: `systemctl start kws-web-autodeploy.service`.
For a failed build inspect `/var/lib/kws-web-autodeploy/operator.log` and the
protected `build.log` below `/opt/kws/web-production/releases/`. Rerun the workflow
in GitHub after resolving the failure. No privileged logs are published to GitHub.

To pause or perform a deliberate rollback, first run
`systemctl disable --now kws-web-autodeploy.timer` and wait for any active deployment
to finish. Then use the retained source and metadata with the existing manual
release procedure. Do not stop an active service during its swap. Re-enable with
`systemctl enable --now kws-web-autodeploy.timer` when `main` is ready again.

## Installation and upgrades

Review and copy the installer, poller, operator and two unit files from
`ops/hostinger/` into a protected staging directory. Run the installer as root with
`--expected-revision` set to the observed live SHA. It validates the first read-only
tick before enabling the timer and refuses to replace an existing installation.
Future operator/poller upgrades require explicit review and installation; pushing
changes to those files does not silently replace the privileged server code.

Known existing full-repository TypeScript/ESLint findings are not a green check in
this workflow. The gate runs the listed functional/browser/deployment suites and
Vite build; it does not claim a complete type or security audit.

Retained sources and build diagnostics consume disk over time. Deployment stops
before building when less than 3 GiB is free; review old release retention before
removing any rollback directory.
