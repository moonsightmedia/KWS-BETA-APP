# Silent originals and SDR playback

This release has three separate steps: video service, library migration, then
web/native clients. A main merge deploys only web/landing. **Do not merge the client
change before the video service advertises its archival capabilities.** The new
client refuses original uploads on an older server instead of losing the source.

## Contract

- The selected camera/library video's compressed picture stream is preserved.
  Audio is removed by a codec-copy remux before upload, including the native path.
  There is no lossy on-device video encoder in the active chunk-upload path.
- Maximum upload size remains 512 MiB. Longer 4K recordings may exceed that limit;
  they fail clearly rather than being silently reduced.
- `/data/originals/<job UUID>/source.*` is private, with a SHA-256 manifest and
  provenance. Audio-bearing legacy inputs are stripped without changing video
  packets. Newly silent sources are copied byte-for-byte. No original appears in
  `/videos` or the public listing. Authenticated administrators can download a
  verified original at `/originals/<job UUID>`; responses are `no-store`.
- A source must be archived and verified before any new rendition family is ready.
  Archive failure fails the job. Sources survive successful transcoding. Explicit
  media deletion also removes that job's private archive.
- Playback is H.264, yuv420p, no audio, maximum 1080p/30 fps for HD. HDR HLG/PQ
  pixels are tone mapped to SDR BT.709. Mobius, `npl=300`, `param=0.3`, `desat=0`
  follows the improved sample, rather than the rejected Hable/desaturated sample.
  HD uses CRF18 / 4 Mbit ceiling and medium preset; SD and Low derive independently
  from the source. Eligible SDR HD remains a lossless remux.
- Unsupported/ambiguous Dolby Vision fails without publishing incorrect colors.
  Compatible profile8 with explicit PQ/HLG base metadata is supported. Actual
  device viewing remains necessary to accept appearance across different screens.
- Historical camera originals were not retained. Migration archives the best
  existing published HD as `best-available-published-hd`; future original uploads
  are distinguished as `selected-video-lossless`. Already lost 4K detail cannot
  be recovered. Old client uploads are labeled `legacy-upload-master`.

## Verified inventory before this release

2026-10-20, read-only production REST and ffprobe:
143 boulders, 133 with video, 399 distinct referenced quality URLs, no probe errors.
132 boulders / 396 URLs carry HLG HDR metadata. The corrected test family is SDR.
213 referenced historical files still contain audio, despite the current upload
pipeline removing audio. Inventory evidence is in the operator's ignored
`output/media-inventory-20261020/` folder, not in source control.

## Service release

Only target `srv2044594`, `187.7.70.230`, existing project
`/opt/kws/video-production`, service `video`, container `kws-video-production`.
Use the already configured operator access. Never reset credentials or broaden
SSH/firewall access for this operation.

1. Stage final `hostinger-video-server` changes, then run from repository root:
   `python ops/hostinger/media/build-release-manifest.py --base <fresh-reviewed-main-SHA>`.
   Commit the generated manifest (`git add -f ops/hostinger/media/release-manifest.json`).
   CI tests the exact Alpine image with real FFmpeg, archive privacy, recovery,
   concurrent edits and an uncertain database commit.
2. Transfer the committed `release.py` to a private operator directory and verify
   its hash against the Git revision. Run `python3 release.py --inspect` on the VPS.
   Review image ID, source hashes, correct data mount and idle health. The script
   rejects source differences from its reviewed base; investigate differences
   rather than overriding the guard. Do not expose `.env` contents in logs.
3. Run `python3 release.py --revision <exact-40-char-SHA> --manifest-sha256 <SHA256-of-Git-manifest> --expected-image <inspected-sha256-image-ID>`.
   It retains the existing image/config, builds and tests an isolated candidate,
   dumps the database, rechecks idle/config/image state, and recreates only `video`.
   Failed health/source checks restore the previous image configuration.
4. Verify public `/health` reports `private_silent_originals` and `sdr_playback`.
   Perform a real admin upload, inspect its video-only private source and three
   SDR renditions, then test actual iPhone/Samsung playback. Keep proof private.

The Hostinger panel is reachable in the correct KWS Chrome profile, but its web
console requires a separate Linux login. That login is not available on this PC.
The panel's Docker editor reports it cannot process the existing YAML/variables;
it has not been used to replace the running configuration. SSH also timed out.
This is an execution blocker, not a completed server deployment.

## Library migration

After the new server is live, run inside its existing environment (no credentials
on the command line). Use one fresh UUID as RUN_ID and reuse it for resume:

```sh
docker exec kws-video-production node src/migrate-library.js --run-id RUN_ID
docker exec kws-video-production node src/migrate-library.js --run-id RUN_ID --execute --limit 1
```

The first command prints a plan only. The second prepares one canary. Review it
on actual devices and compare colors against the corrected sample before running:

```sh
docker exec kws-video-production node src/migrate-library.js --run-id RUN_ID --execute
```

The private journal `/data/maintenance/sdr-RUN_ID.json` records old/new fields and
job/source provenance before each action. A process-wide lock prevents two library
operators. A stale lock after a hard crash must be investigated against running
processes before removal; the tool never guesses that another operator is dead.
Each old HD is archived silently. New UUID families are fully probed and decoded,
and public routing is verified before one conditional database patch changes all
quality URLs. All five existing media lifecycle fields are compared to detect a
parallel upload. Unknown outcomes reconcile against the journal, without replaying
an unsafe write. Operator jobs do not enter the asynchronous upload publisher.
Old files remain intact for rollback; no cached URL is overwritten or deleted.

Rollback is also conditional and leaves later uploads untouched:

```sh
docker exec kws-video-production node src/migrate-library.js --run-id RUN_ID --rollback
```

Finish with a fresh full inventory using `inventory.mjs`, source/archive checks,
and real playback checks: zero HDR / zero audio among all current in-app references,
no unresolved URLs, all 133 best available sources archived, and no unexpected
media changes. Parallel/new uploads may change the count and require reconciliation.
Do not describe the bulk migration as completed until these checks pass.

## Clients and backup

After server verification, merge the client PR through CI/main for web. Packaged
iOS and Android need their own build/store release. Existing installed clients
still perform their old device compression until updated, even though their
playback can use migrated database URLs immediately. Use the laptop's existing
Android build/signing setup as requested; do not install SDKs or signing keys here.

Include the entire video `/data` (especially `originals`, jobs and maintenance
journals) in encrypted production backup and an independently verified NAS copy.
The PC's mapped KWS NAS folder was unavailable during preparation; no independent
NAS copy has been claimed. Server-local archival alone is not an independent backup.

## Laptop rollout follow-up, 20 October 2026

The browser `dynamic-range-limit: standard` hint from PR64 is included alongside
PR68, without importing PR64's older Hable server transform or its native branch
ancestry. The server candidate remains the exact verified source at
`aba3aa97c15364584557a780e3bc8518c8bb76ec`; the candidate source manifest is unchanged.

The existing laptop SSH key is reachable again after the user explicitly approved
a firewall allowance for its current single address. Production backup
`20261020T120838Z` was decrypted and restored in isolation: 94 tables, 22,793 rows,
two sequences and Vault decryption match. The encrypted independent NAS transfer
is still in progress; do not claim it verified yet. The exact server candidate
has passed its tests in a separate Docker container; the live service and library
remain unchanged until the backup and release gates are complete.
