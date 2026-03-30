# Lovable UI Rework Status

Stand: 11.03.2026

## Ziel

Die Beta App wird schrittweise auf den aktuellen Lovable-Stand umgestellt. Dabei wird das Lovable-Layout als visuelle Basis genommen und anschließend mit der vorhandenen KWS-Logik verbunden.

## Bisher umgesetzt

### Boulder

- Header der Boulder-Seite an den Lovable-Stil angepasst
- Suchbereich, Quick-Chips und Tool-Buttons an Lovable angepasst
- Boulder-Karten auf den Lovable-Stil umgestellt
- Standardfilter auf `hängende Boulder` gesetzt
- Karten-Tool als einklappbarer Inline-Bereich umgesetzt
- Hallenkarte auf Original-Assets umgestellt:
  - `src/assets/boulderkarte-original.png`
  - `src/assets/honeycomb-original.png`
- Hallenkarte freibeweglich und weiter herauszoombar gemacht

### Boulder-Detail

- Detailansicht auf eigenen Screen umgestellt
- `Info`, `Track` und `Beta` als Screen-Bereiche übernommen
- automatisches Hochscrollen beim Wechsel der Bereiche ergänzt
- Community- und Tracking-Funktionen auf bestehende KWS-Daten angebunden

### Home

- Home von Dashboard in einen produktiveren Startscreen umgebaut
- Wochenstatistik ergänzt
- `Neue Boulder`-Bereich direkt unter der Wochenstatistik ergänzt
- Hallenkontext in Richtung Schraubtermine umgebaut
- Stats-Bereich auf ruhigere Mobile-Darstellung umgestellt
- große Session-Start-Kachel und `Schnelle Wege` wieder entfernt

### Profil-Flow

- Profilseite an den Lovable-Flow angenähert
- Profil bearbeiten auf sinnvolle Minimalversion reduziert:
  - `Name`
  - `E-Mail`
  - `Passwort ändern`
- Statistikseite unter Profil eingebaut
- Benachrichtigungsseite und Benachrichtigungs-Popover auf den Lovable-Stil umgebaut

### Statistik

- Statistikseite basiert auf dem Lovable-Stats-Screen
- echte Daten angebunden:
  - Fortschritt
  - Tops
  - Flashes
  - Projekte
  - Sessions
  - Versuche
  - Letzte Aktivität
- `Grad-Verteilung` zeigt jetzt die persönlich getoppten Boulder pro Grad, nicht die Hallenverteilung

### Navigation

- Rollenwechsel hinter das Profilmenü gelegt
- Hauptnavigation angepasst:
  - `Home`
  - `Boulder`
  - `Statistiken`
- `Sektoren` stattdessen im Profilbereich verlinkt

## Datenmodell / Backend

Neu bzw. erweitert:

- Boulder-Community-Basis
  - `supabase/migrations/20260308223000_create_boulder_community.sql`
- settergesteuerte Boulder-Attribute
  - `supabase/migrations/20260309164000_setter_boulder_attributes.sql`
- Tracking-Sessions
  - `supabase/migrations/20260309183000_boulder_tracking_sessions.sql`

Wichtige Hooks / Dateien:

- `src/hooks/useBoulderCommunity.tsx`
- `src/pages/Statistics.tsx`
- `src/pages/Profile.tsx`
- `src/pages/ProfileEdit.tsx`
- `src/pages/NotificationSettings.tsx`
- `src/components/NotificationCenter.tsx`

## Bewusste Entscheidungen

- Umlaute und sichtbare Texte werden ab jetzt bewusst korrigiert und nicht blind aus alten oder kaputten Quellen übernommen.
- `Profil bearbeiten` enthält nur Felder, die aktuell wirklich existieren und gebraucht werden.
- `Passwort ändern` nutzt den vorhandenen Reset-Flow statt eines separaten, unvollständigen Passwortformulars.
- `Grad-Verteilung` ist persönliche Statistik und keine Hallenstatistik.

## Noch offen

- Profil, Profil bearbeiten und Benachrichtigungen sind näher an Lovable, aber noch nicht in jedem Detail pixelgleich.
- Sektoren-Seite kann noch weiter auf den aktuellen Lovable-Stand gezogen werden.
- Notification- und Profil-Dropdowns können bei Bedarf noch weiter verdichtet werden.
- Sichtbare Mojibake-Reste außerhalb der zuletzt angefassten Screens sollten einmal repo-weit bereinigt werden.

## Notion-Status

Die Notion-Dokumentation und das Markieren erledigter Todos konnten in diesem Durchgang nicht durchgeführt werden, weil die Notion-MCP-Verbindung aktuell `Auth required` zurückgibt.

Sobald die Notion-Verbindung wieder authentifiziert ist, nachziehen:

- UI-Rework-Status in Notion dokumentieren
- betroffene Todos im `KWS Beta APP`-Bereich prüfen
- nur tatsächlich abgeschlossene Todos auf erledigt setzen
- kurze Zusammenfassung mit erledigten Punkten und offenen Restarbeiten ergänzen
