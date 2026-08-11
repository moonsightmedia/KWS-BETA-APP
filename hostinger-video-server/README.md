# KWS Hostinger video server

Versioned source for the Hostinger VPS upload/transcode service. It creates progressive MP4 renditions only—HD, SD, and Low; no HLS.

## API

The authenticated chunk upload remains `POST /upload.php`. Completed video uploads return:

```json
{"status":"queued","job_id":"uuid","url":"..._hd.mp4","urls":{"hd":"...","sd":"...","low":"..."}}
```

`GET /jobs/:jobId` and `GET /upload-status.php?session_id=...` require the owning user or an admin. Both are `Cache-Control: no-store`. `GET /health` preserves the live contract with numeric `queue`; capacity is additive in `queue_capacity` and `queue_details`. It exposes only non-secret upload-limit, quota, free-space, and concurrency values.

## Processing guarantees

- A queue slot is synchronously reserved before any destructive merge. The bounded queue is sequential. A `429` leaves the manifest and all chunks retryable.
- Session manifests and jobs persist owner IDs and atomic status. Reserved, queued, processing, source-original, and ready-marker states recover after restart.
- Each session is locked across manifest reads/writes, SHA-256 duplicate checks, and finalization. Identical chunk retries are idempotent; changed bytes return `409`.
- Uploads are limited by chunk/upload/chunk-count configuration, per-user active sessions, active multipart requests, managed-data quota, and filesystem headroom.
- Sector IDs are strict single path segments. Managed roots, sessions, staging, final sectors, static reads, and deletion reject symlink ancestors.
- FFmpeg maps optional audio, strips metadata/chapters, outputs H.264/yuv420p at at most 30 fps, and avoids upscaling. Caps are HD 4 Mbit/s + 128 kbit/s AAC, SD 2 Mbit/s + 96 kbit/s AAC, and Low 640-pixel edge at 600 kbit/s + 64 kbit/s AAC.
- All three renditions are encoded and ffprobe-validated privately. A single atomic ready marker gates public visibility. Pending new families return `404`/`no-store`; a complete set is served with one-year immutable caching.

Video deletion is exact-family only and changes its persisted job state to `deleted`. New families require their owner or an admin. Older files without ownership metadata are intentionally admin-only. Automatic cleanup removes stale upload sessions only; it never removes published finals. A processing job cannot be deleted via a not-yet-public URL.

## Configuration

Copy `.env.example` to `.env` only on the deployment host and populate values from the approved secret store. Never commit `.env`. Defaults support 512 MiB uploads split into 5 MiB chunks (`MAX_TOTAL_CHUNKS=1024`, at least 103 required). Set `MAX_DATA_BYTES` and `MIN_FREE_BYTES` for the actual volume.

## Verification and deployment runbook

```sh
npm ci
npm test
docker compose config
docker compose build
```

The tests include real local FFmpeg/ffprobe audio and silent-video integration, failure publication, queue reservation, SHA retry/race, resumability, owner/admin access, exact deletion, and limit validation.

For a separately authorized deployment:

1. Back up `data/` and retain the existing production `.env` without copying it into Git.
2. Run the commands above on a deployment candidate.
3. Rebuild/restart during a maintenance window; do not delete `data/jobs`, `data/staging`, `data/temp`, or `data/final`.
4. Verify `/health`, upload one small video with audio and one without, poll each job to `completed`, and fetch all three immutable URLs.
5. Confirm a non-owner cannot read status/jobs or delete the family, while an admin can.

Production rollout completed on 11 August 2026 after the same 11-test suite passed inside the built Alpine/FFmpeg container. The existing `.env` and data volume were retained unchanged; public health, authentication rejection and playback of an existing video were smoke-tested. The VPS keeps a code/image rollback and a byte-matched data snapshot from the rollout. An authenticated upload from the new app and the physical-iPhone/Xcode check remain release acceptance steps.

The service container currently keeps its existing root UID for compatibility with the ownership of the live bind-mounted `./data` tree. Compose still removes all Linux capabilities, enables `no-new-privileges`, makes the image filesystem read-only, and permits writes only to `/data` and a bounded `/tmp`. Moving to a non-root UID requires a separately authorized, verified ownership migration of the live data volume; doing that implicitly during deployment could make existing videos unreadable or unwritable.
