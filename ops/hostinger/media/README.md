# Silent originals and SDR playback

This release coordinates the video service, library migration and web/native
clients. A main merge deploys only web/landing. **Do not merge the client change
before the video service advertises its archival capabilities.** Verify the exact
service source, a real original upload and one production canary before releasing
clients. The remaining journaled migration can then continue alongside clients:
unique URLs and conditional database updates preserve concurrent uploads. This
also protects new source uploads while historical encoding finishes. Do not call
the library migration complete until its final inventory and archive checks pass.

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

The laptop follow-up below records the successful guarded release. The panel's
Docker editor was not used to rewrite the existing Compose configuration.

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

On this VPS the normal service uses `http://kws-api-internal:80`. After confirming
that its complete media catalog matches the public production endpoint, pass
`-e SUPABASE_URL=https://beta-api.kletterwelt-sauerland.de` to `docker exec` for
the operator CLI only. Keep the running service's internal address unchanged.
Physical iPhone/HDR appearance acceptance remains unverified; successful browser
playback and full media validation are not hardware acceptance.

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
The PC's mapped NAS was unavailable during initial preparation; the laptop's
independent pre-migration copy is now verified as recorded below. Server-local
archival alone is not an independent backup. After migration, back up the updated
database, new originals/renditions and journal, and verify the independent copy.

## Laptop rollout follow-up, 20 October 2026

The browser `dynamic-range-limit: standard` hint from PR64 is included alongside
PR68, without importing PR64's older Hable server transform or its native branch
ancestry. The server candidate remains the exact verified source at
`aba3aa97c15364584557a780e3bc8518c8bb76ec`; the candidate source manifest is unchanged.

The existing laptop SSH key is reachable again after the user explicitly approved
a firewall allowance for its current single address. Production backup
`20261020T120838Z` was decrypted and restored in isolation: 94 tables, 22,793 rows,
two sequences and Vault decryption match. The 3,410,158,632-byte encrypted archive
and all three metadata/restore-proof files are independently verified on the NAS
with matching sizes and SHA-256 digests (20 October, 13:02 UTC).

The exact candidate passed all 34 tests in a separate Alpine container and again
in the guarded production release. Both production and isolated Store Review now
advertise archival/SDR capabilities with exact running source hashes verified.
Review retains its previous Compose configuration and database dump. A real HTTP
upload using existing demo roles preserved a synthetic silent 2160x3840 HLG source
byte-for-byte; HD/SD/Low are silent BT.709 and fully decoded. Anonymous, customer
and setter original downloads are denied; administrator downloads are no-store.
Only these synthetic review jobs were subsequently deleted.

Production canary `03a06939-cbe7-48e0-94f6-23620ba301e1` committed successfully.
Its private best-available HD archive, three SDR qualities, database fields and
actual app playback (1080x1920, readyState4, progressing time) are verified.
Full run `798a952d-1208-462e-ad84-4daba25ce7e5` is active as
`kws-sdr-library-20261020.service`; it is not yet complete. A temporary runtime
CPU allowance of three cores must return to the normal two after migration.
Memory remains 2 GiB and Compose is unchanged. Keep the old files/image/config.

Android83 is available in the existing internal track from native source
`6b575eb407d29414f8fb8422717e7618f0537630`, after full CI, actual AAB source,
signature, secret-exclusion, icon and 16-KB ELF checks. iOS processing is separate.
Client delivery after these service/canary gates does not imply that all historical
videos or their post-migration independent backup are already finished.
