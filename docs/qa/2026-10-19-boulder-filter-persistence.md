# Boulderfilter nach Seitenwechsel erhalten

Die Boulderübersicht hielt Suche, Filter und Sortierung ausschließlich in lokalem
React-Zustand. Nach einem Wechsel zu Home wurde sie neu aufgebaut; zusätzlich
setzte ein URL-/Sektordaten-Effekt die Auswahl auch ohne expliziten Filterlink zurück.

Die Auswahl wird jetzt in der laufenden Browsersitzung gespeichert, mit
Arbeitsspeicher als Ersatz bei gesperrtem Storage. Konten, Gast und Demo haben
getrennte Schlüssel. Verlaufseinträge erhalten ihre eigene Auswahl, damit
Browser-Zurück auch zusätzliche Filter nach einem Sektor-/Schnellfilterlink erhält.
Neue explizite Links beginnen ihre angegebene Auswahl. Mitteilungsansichten sind
temporär und überschreiben die reguläre Auswahl nicht. Zurücksetzen speichert den
bewusst geleerten Filter; Oberfläche und Serverabfragen bleiben unverändert.

## Verifikation

- 13 neue Browserfälle bei 375/768/1280/1920px: kombinierte Grad-/Farbfilter,
  Detailrückweg, Home und zurück, Browser-Zurück, Neuladen, Suche/Sortierung,
  leere Treffer und Zurücksetzen. Zusätzliche Fälle für gesperrten Storage,
  explizite Links, Kontowechsel, Gast und manuelle Ergänzungen zu Schnellfiltern.
- 19 bestehende Detail-/Scroll-/Video- und 14 Mitteilungsregressionen bestanden;
  zusätzlicher Fall zur regulären Suche vor/nach einer Mitteilungsansicht.
  Veraltete Mitteilungstext-Erwartungen folgen der vorhandenen Treffer-Beschriftung.
  Der Mitteilungs-Mock erfasst nur seine eigenen Endpunkte; Toastaktionen sind
  eindeutig zugeordnet und die Überlaufprüfung berücksichtigt Scrollbalken.
  Endgültige lokale Prüfungen liefen auf dem eigenen Port 4197, unabhängig von
  parallel laufenden Checkouts auf dem üblichen Entwicklungsport.
- Vier Node-Tests prüfen Datenvalidierung, getrennte Auswahlen, Rücksetzen,
  Storage-Ausfall und explizite Links. Scoped ESLint und Hostinger-Vite-Build
  bestanden. TypeScript gegen die unveränderten Seiten verglichen: jeweils
  69 bestehende Diagnosen, keine hinzugefügte Diagnose.
- Zwei visuelle Runden auf allen vier Breiten, acht Zustandsaufnahmen angesehen:
  gewählte/zurückgekehrte Filter, Leerzustand und zurückgesetzte Liste; kein
  horizontaler Überlauf. Fotos werden vor endgültigen Aufnahmen geladen.
  Lokale Bilder: `test-results/boulder-filter-persistence-20261019/`.

Die Fixtures verwenden echte Seiten, Header, Sidebar und Navigation mit
synthetischen Boulder-/Kontodaten und blockierten externen Anfragen. Versteckte
QA-Navigationsknöpfe ermöglichen das Verlassen der Gastansicht; sie gehören nicht
zur Produktoberfläche. Keine produktiven Datenänderungen, keine neuen Dependencies.
Die Filter- und Mitteilungssuites laufen im Web-Release-Workflow mit.
