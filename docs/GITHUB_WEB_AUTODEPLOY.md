# Automatic GitHub → Hostinger web releases

Pushes and merged pull requests on `main` run **Web production**. The workflow
checks the locked dependency install, Node regression tests, deployment safety,
desktop/mobile browser regressions and a production build. Pull requests run the
same checks without deploying. Production configuration stays on the VPS.

`srv2044594` checks `main` every minute. It accepts only a successful **Verify web
release** job in the newest matching workflow run from this repository and branch.
The workflow's deployment job waits for the exact SHA in the public
[release proof](https://beta.kletterwelt-sauerland.de/release.json), then records
success in GitHub's `production-web` environment. A failed test never qualifies.

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
- Failed builds retain the current app. A failed post-swap local smoke test restores
  the previous source and restarts it. Previous downloads and hashed assets survive.
- Failed attempts stop until the workflow is rerun or a new commit qualifies.
  Retrying retains earlier diagnostics in a separate release directory.
- Version comes from committed `package.json`; build time and `release.json` SHA
  identify each deploy even when a commit does not bump the app version.

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
