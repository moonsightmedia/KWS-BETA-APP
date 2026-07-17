# BACKEND_EVOLUTION_PLAN

## Zielbild
Stabile, nachvollziehbare und migrationssichere Backend-Architektur für KWS-BETA-APP mit klarem Domain-Modell, robusten Upload-Flows und konsistenter Datenhaltung in Supabase.

---

## 1) Executive Summary (priorisiert)

### P0 (sofort, 1–2 Sprints)
1. **Datenmodell-Härtung in Supabase**
   - Primär-/Fremdschlüssel, Unique-Constraints, Check-Constraints, NOT NULL, sinnvolle Defaults.
   - `updated_at` Trigger, soft-delete-Strategie (falls erforderlich) standardisieren.
2. **Konsistenzregeln in DB statt nur im Client**
   - Geschäftslogik, die Datenintegrität betrifft, in SQL/Functions/Triggers verankern.
   - Idempotente Schreibpfade für kritische Upserts.
3. **Upload-Schnittstelle absichern**
   - Signierte Upload-URLs, MIME-/Size-Validation, virus/file-type gate (mindestens serverseitige Typprüfung).
   - Atomarer Metadaten-Write (Datei + DB-Record konsistent).
4. **RLS-Baseline + Rollenmodell**
   - Row Level Security für alle produktiven Tabellen aktivieren.
   - Policies nach Use-Case (owner/team/admin) explizit definieren.

### P1 (kurzfristig, 2–4 Sprints)
5. **Service-/Hook-Layer entkoppeln**
   - Trennung: `domain services` (geschäftlich), `infra repositories` (Supabase-I/O), `hooks` (UI-state orchestration).
6. **Schema-Migrationsprozess standardisieren**
   - Versionierte SQL-Migrationen, reproducible local reset, CI Drift-Check.
7. **Observability + Fehlerklassifikation**
   - Einheitliche Error-Codes, Korrelation-ID, strukturierte Logs, Alerting für Upload-/DB-Fehler.

### P2 (mittelfristig)
8. **Performance/Skalierung**
   - Indizes nach realen Query-Pfaden, Pagination/Cursor, N+1-Reduktion.
9. **Eventing/Async-Workflows**
   - Hintergrundjobs (z. B. Post-Upload-Processing), Retry/Dead-letter-Strategie.

---

## 2) Zielarchitektur (Backend / Domain)

- **Domain Layer**: Entities, Value Objects, Invariants.
- **Application Layer**: Use-Cases (Create/Update/Delete/UploadFinalize).
- **Infrastructure Layer**:
  - Supabase Postgres (persistente Domain-Daten)
  - Supabase Storage (Binary-Dateien)
  - RPC/Edge Functions für atomare kritische Flows
- **Presentation Hooks (Frontend)**:
  - Nur Orchestrierung/State; keine harten Business-Invarianten.

Prinzip: **„Integrity first in DB + thin client assumptions“**.

---

## 3) Supabase-Integration – Sollzustand

1. **Auth-Kontext überall durchreichen**
   - Jeder Schreibzugriff nutzt den User-Kontext für RLS-konforme Operationen.
2. **Typed Access**
   - Generierte DB-Typen (`supabase gen types`) im Repo versionieren.
3. **RPC für kritische Multi-Step-Operationen**
   - Beispiel: Upload finalize (Datei existiert + Metadaten + Statuswechsel) als transaktionaler Pfad.
4. **Storage-Bucket-Strategie**
   - Public/private Buckets bewusst trennen.
   - Pfadkonventionen (tenant/user/resource/datei).

---

## 4) Datenmodell – empfohlene Mindeststandards

- Jede Kern-Tabelle:
  - `id uuid pk default gen_random_uuid()`
  - `created_at timestamptz not null default now()`
  - `updated_at timestamptz not null default now()` (+ trigger)
  - optional: `deleted_at` für soft delete
- Referenzen: konsequente FK-Definition mit ON DELETE-Regeln.
- Eindeutigkeit:
  - natürliche Schlüssel als `unique` (z. B. `(tenant_id, external_ref)`).
- Statusfelder:
  - per `check` oder enum-typen validieren.

**Wichtig:** Keine geschäftskritische Validierung ausschließlich in Hooks.

---

## 5) Hooks/Services – Refactoring-Plan

### Aktuelles Risiko (typisch)
- Hooks enthalten API-Calls + Business-Logik + Mapping.
- Uneinheitliche Fehlerbehandlung.
- Seiteneffekte über mehrere Stellen verteilt.

### Ziel
- `services/domain/*`: Geschäftsregeln und Use-Cases.
- `services/infra/supabase/*`: reine DB/Storage Adapter.
- `hooks/*`: konsumieren Use-Cases, verwalten Lade-/Fehlerzustände.

### Migrationsschritte
1. Kritische Flows identifizieren (Create/Update/Upload).
2. Pro Flow Use-Case extrahieren.
3. Hook auf Use-Case umstellen.
4. Regressionstests pro Flow.

---

## 6) Upload-Schnittstellen – robustes Design

### Empfohlener Flow
1. Client fordert **signed upload URL** an.
2. Client lädt Datei direkt in Storage.
3. Server/RPC validiert Upload (Pfad, Typ, Größe, Owner).
4. Server schreibt/aktualisiert Metadaten transaktional.
5. Optional: Async Post-Processing triggern.

### Schutzmaßnahmen
- MIME-Whitelist + maximale Dateigröße.
- Hash/SHA optional für Duplikaterkennung.
- Rate Limits auf Signing-Endpunkt.
- Bereinigung verwaister Uploads per Scheduled Job.

---

## 7) Datenkonsistenz – Risikomatrix

| Risiko | Auswirkung | Eintritt | Priorität | Gegenmaßnahme |
|---|---:|---:|---:|---|
| Fehlende FK/Unique-Constraints | Inkonsistente Beziehungen, Duplikate | Mittel-Hoch | P0 | Constraints + Datenbereinigung |
| Client-only Validierung | Regelverletzungen durch Race/Bypass | Hoch | P0 | DB-Checks/RPC/Trigger |
| Nicht-atomarer Upload-Finalize | „Datei ohne Datensatz“ oder umgekehrt | Hoch | P0 | Transaktionaler finalize-Use-Case |
| Fehlende RLS/zu breite Policies | Datenleck/Unbefugter Zugriff | Mittel-Hoch | P0 | RLS-Audit + policy tests |
| Unversionierte Schemaänderungen | Deploy-Drift/Prod-Incidents | Mittel | P1 | Migrationspipeline + CI |
| Unklare Fehlercodes | schlechter Support, schweres Debugging | Mittel | P1 | Error taxonomy + logging |

---

## 8) Migrationsbedarf (konkret als Arbeitspakete)

### MP-1 Schema Inventory & Gap Analysis (P0)
- Ist-Schema gegen Domain-Use-Cases mappen.
- Fehlende Constraints/Indizes/FKs dokumentieren.
- Ergebnis: „Schema Gap Report“.

### MP-2 Constraint & Data Cleanup Migration (P0)
- Vor Constraint-Einführung Datenbereinigungsskripte.
- Danach Constraints scharf schalten.

### MP-3 RLS Hardening (P0)
- RLS auf alle relevanten Tabellen aktiv.
- Policy-Matrix (read/write/update/delete) pro Rolle.

### MP-4 Upload Finalize RPC (P0)
- Atomare Funktion für Upload-Metadaten/Status.
- Rückgabewerte standardisieren.

### MP-5 Service/Hook Refactor (P1)
- Kritische Hooks in Use-Cases überführen.
- Supabase-Zugriff in Infra-Layer zentralisieren.

### MP-6 CI/CD Migration Guards (P1)
- Migration smoke test in CI.
- Drift-Detection zwischen expected und actual schema.

---

## 9) Teststrategie (risk-based)

### A) Datenbanktests (höchste Priorität)
- Constraint-Tests (valid/invalid insert/update).
- RLS-Tests pro Rolle/User-Kontext.
- RPC-Tests für kritische Use-Cases.

### B) Integrations-Tests
- End-to-End Upload-Flow (sign → upload → finalize).
- Fehlerpfade (abgebrochener Upload, falscher MIME, fehlende Rechte).

### C) Contract-Tests
- Service-zu-UI Contracts (Payload/Errors stabil).
- Versionierung bei Response-Änderungen.

### D) Regression/Smoke
- Kernflüsse vor jedem Deploy.
- Rollback-Übung für fehlerhafte Migration.

---

## 10) Delivery-Plan (6 Wochen Beispiel)

### Sprint 1
- MP-1, MP-2 vorbereiten, Datenbereinigung, erste Constraints.
- RLS Audit starten.

### Sprint 2
- MP-3 abschließen (RLS + Tests).
- MP-4 Upload finalize RPC.

### Sprint 3
- MP-5 (kritische Hooks refactor).
- Logging/Error taxonomy.

### Sprint 4
- MP-6 CI Guards, Performance-Indizes, Abschlussregression.

---

## 11) Definition of Done (pro Paket)

- Migration versioniert, reviewt, rollback-fähig.
- Automatisierte Tests vorhanden und grün.
- Monitoring/Logs für neue Pfade vorhanden.
- Dokumentation aktualisiert (Schema, Policies, Flows).

---

## 12) Offene Architekturentscheidungen (ADR-Kandidaten)

1. Soft-delete global vs. selektiv.
2. Enum-Typen in DB vs. text + check.
3. Edge Function vs. DB RPC für kritische Orchestrierung.
4. Public URL vs. signed URL-only für bestimmte Dateiklassen.

---

## 13) Empfohlene nächste konkrete Schritte (ab morgen)

1. Schema Gap Report erstellen (2–4h).
2. Top-5 Constraints + Cleanup SQL definieren.
3. Upload finalize als RPC skizzieren.
4. RLS policy matrix tabellarisch erfassen.
5. Testfälle für P0 in CI aufnehmen.

---

## Schluss
Die größte Risikoreduktion entsteht kurzfristig durch **DB-seitige Integritätsregeln**, **RLS-Härtung** und einen **atomaren Upload-Finalize-Flow**. Hook/Service-Refactoring folgt danach, um Wartbarkeit und Änderbarkeit nachhaltig zu verbessern.
