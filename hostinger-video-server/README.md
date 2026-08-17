# KWS Hostinger video server

Versioned source for the Hostinger VPS upload/transcode service. It creates progressive MP4 renditions only—HD, SD, and Low; no HLS.

## API

The authenticated chunk upload remains `POST /upload.php`. Legacy completed video uploads return:

```json
{"status":"queued","job_id":"uuid","url":"..._hd.mp4","urls":{"hd":"...","sd":"...","low":"..."}}
```

New app versions add `X-Boulder-Id` (a UUID) to every video chunk. Its value is immutable for the resumable session. Once the final chunk is durably queued they receive `{status:"queued", job_id, session_id, url:null, urls:null}` immediately; the phone does not wait for FFmpeg. The server persists delivery of `queued`, `processing`, `completed`, and `failed` to the narrow Supabase `sync_boulder_video_job` RPC using `SUPABASE_SERVICE_ROLE_KEY`. Retries are exponential and restart-safe in each job JSON. The RPC performs the boulder/session/job compare-and-set, so delayed or replaced jobs are harmless. URLs are deliberately omitted from status endpoints until `completed`; `completed` is sent only after the atomic ready marker exists.

`GET /jobs/:jobId` and `GET /upload-status.php?session_id=...` require the owning user or an admin. Both are `Cache-Control: no-store`. `GET /health` preserves the live contract with numeric `queue`; capacity is additive in `queue_capacity` and `queue_details`. It exposes only non-secret upload-limit, quota, free-space, and concurrency values.

## Processing guarantees

- A queue slot is synchronously reserved before any destructive merge. The bounded queue is sequential. A `429` leaves the manifest and all chunks retryable.
- Session manifests and jobs persist owner IDs and atomic status. Reserved, queued, processing, source-original, and ready-marker states recover after restart.
- Each session is locked across manifest reads/writes, SHA-256 duplicate checks, and finalization. Identical chunk retries are idempotent; changed bytes return `409`.
- Uploads are limited by chunk/upload/chunk-count configuration, per-user active sessions, active multipart requests, managed-data quota, and filesystem headroom.
- Sector IDs are strict single path segments. Managed roots, sessions, staging, final sectors, static reads, and deletion reject symlink ancestors.
- The iOS upload master targets 4 Mbit/s video. HD may skip video/audio re-encoding only after ffprobe validates an actual MP4-family container, one H.264 Baseline/Main/High yuv420p video stream, at most 1920 pixels and 30.01 fps, positive duration/size/bitrate, HD bitrate caps, and optional compatible AAC audio. Extensions are never trusted. The server remuxes an eligible source privately with faststart and stripped metadata; every other source falls back to HD re-encoding.
- SD and Low are always encoded; all renditions are ffprobe-validated privately. A single atomic ready marker gates public visibility, so an HD passthrough failure cannot publish a partial family. Pending new families return `404`/`no-store`; a complete set is served with one-year immutable caching.

Video deletion is exact-family only and changes its persisted job state to `deleted`. Any authenticated `setter` or `admin` can manage completed and legacy KWS boulder-media families; ownership does not restrict this shared editorial workflow. Automatic cleanup removes stale upload sessions only; it never removes published finals. A processing job cannot be deleted via a not-yet-public URL.

## Configuration

Copy `.env.example` to `.env` only on the deployment host and populate values from the approved secret store. Never commit `.env`. `SUPABASE_SERVICE_ROLE_KEY` is required before rolling out app clients that send `X-Boulder-Id`; configure it on the VPS only. Defaults support 512 MiB uploads with a 6 MiB server chunk limit (`MAX_TOTAL_CHUNKS=1024`, at least 86 required); the one-byte native iOS chunk-read boundary remains accepted. Set `MAX_DATA_BYTES` and `MIN_FREE_BYTES` for the actual volume.

At startup, `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are validated without logging their values. The URL must be HTTP(S); the service-role key must be either a three-part JWT or an `sb_secret_...` key. Whitespace and control characters fail fast, so copied secrets are not silently trimmed or repaired.

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
4. Verify `/health`, upload one small video with audio and one without, poll each job to `completed`, and fetch all three immutable URLs. For the async path, also confirm the boulder RPC moves from `queued` to `ready` and test a temporary RPC outage/restart to observe a persisted retry.
5. Confirm a non-owner cannot read status/jobs, while an authenticated setter or admin can delete a completed/legacy family.

Production rollout completed on 11 August 2026 after the same 11-test suite passed inside the built Alpine/FFmpeg container. The existing `.env` and data volume were retained unchanged; public health, authentication rejection and playback of an existing video were smoke-tested. The VPS keeps a code/image rollback and a byte-matched data snapshot from the rollout. An authenticated upload from the new app and the physical-iPhone/Xcode check remain release acceptance steps.

The service container currently keeps its existing root UID for compatibility with the ownership of the live bind-mounted `./data` tree. Compose still removes all Linux capabilities, enables `no-new-privileges`, makes the image filesystem read-only, and permits writes only to `/data` and a bounded `/tmp`. Moving to a non-root UID requires a separately authorized, verified ownership migration of the live data volume; doing that implicitly during deployment could make existing videos unreadable or unwritable.
