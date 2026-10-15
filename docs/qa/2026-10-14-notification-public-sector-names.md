# Current public sector names in Boulder notifications

The live dispatcher selected `sectors.name` directly. Those are retained physical
legacy names (Buckbord, Kahlwinkel, etc.), whereas the app resolves structured
area/subarea fields and legacy compatibility through `resolveSectorArea`.

The new private database resolver matches that public naming policy: structured
hierarchy first, fallback for the 19 physical legacy names, and the confirmed
Felsenmeer → Kurze Platte exception. Distinct public labels feed the existing
bounded message formatter. The queue's activity/quiet period, locking, recipient
selection and completion logic stay intact; the migration replaces only the
installed dispatcher's label lookup and refuses an unexpected function body.

Existing Boulder inbox records with sector references have their message and
`data.sector_names` corrected. Read state, timestamps, links and Boulder/sector IDs
remain intact. Missing metadata and other notification topics are preserved.
The push triggers were inspected and are INSERT-only; UPDATE corrections do not
resend the inbox. Already delivered OS push text cannot be rewritten.

## Verification

- 66 parity cases generated from the actual app resolver, including all 19
  fallbacks, structured assignments, explicit reassignments, unknown names,
  invalid codes, normalization and the Felsenmeer special case.
- Node parity test passes and guards this fixture against future app mapping drift.
- Isolated PostgreSQL tests exercise those cases, historical correction without
  push, unchanged read/link/ID fields, repeat migration with no extra writes,
  private helper permissions and a future batch using the corrected labels.
- No frontend or native rebuild is required for the corrected stored messages.
  App binaries and the live web source are not replaced by this migration.

## Live result

- 80 isolated PostgreSQL checks passed: 66 resolver parity cases plus historical,
  idempotence, permissions and real-dispatcher checks. Zero real pushes were sent.
- Applied atomically on srv2044594 / supabase-db after checking the installed
  dispatcher SHA-256. 885 of 908 inbox records were corrected. A transaction-local
  snapshot verified every field except message and data.sector_names was unchanged,
  including malformed scalar metadata. Formatter and all notification trigger
  function definitions retained their hashes. All live notification triggers were
  verified not to handle UPDATE.
- Protected rollback and deployment evidence:
  /opt/kws/tools/notification-public-names-50d31ad/{rollback-dispatcher.sql,historical-label-backup.json,VERIFIED.json}.
  Do not publish the historical record backup.
- Two preliminary apply attempts stopped/rolled back before any committed change:
  a guard referenced a trigger function in the wrong schema; a snapshot comparison
  needed to preserve scalar JSON metadata. The verified migration itself is unchanged.
- Live inbox visibly shows "8 neue Boulder in den Sektoren Bug C und Bug D",
  "12 neue Boulder im Sektor Couch-Ecke B", Top-Out B/C/D, Grotte C/D and
  Kurze Platte. Existing entries remain read.
- Rendered 375/768/1280/1920 px. Visual loop 1 checked canonical labels against
  app area/subarea resolution; loop 2 checked wrapping, unchanged card actions and
  read badges. No clipping or UI repair needed. Temporary viewport reset.
  Proof: output/boulder-navigation/notification-names-{375,768,1280,1920}.png.
- Node parity test and git diff --check passed. No web or native binary was replaced.

Migration SHA-256: a7c28007813c0bf4f32040bb01af47ef87d32d5ad01f38ae10c770adbd91b609.
