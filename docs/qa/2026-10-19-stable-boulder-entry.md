# Boulder öffnen: ruhiger Eintritt statt Foto-Flug

## Nutzerkorrektur und Richtung

Nach dem Timeout-Fix meldet der Nutzer weiterhin einen optisch verzerrten,
kurz vorbeigleitenden Bildschnipsel. Fehlerfreiheit der API war kein ausreichender
Nachweis einer guten Animation. Der kleine 4:5-Kartenausschnitt wurde als eigener
nativer Snapshot auf den anders zugeschnittenen Video-/Platzhaltercontainer
interpoliert, während die Zielseite bereits erschien.

Richtung: Das Detail steht vom ersten Bild an an seiner endgültigen Position.
Kein herumfliegendes Foto, Größenmorphing, Verschieben des Kopfs oder zweiter
Eintritt. Eine einzige dezente150ms-Deckkraftangleichung von92% auf100% reicht;
die äußere Vordergrundfläche bleibt immer deckend. Reduced Motion ist statisch.
Diese Nutzerkorrektur ersetzt die ursprüngliche Foto-Snapshot-Regel in DESIGN.md.

## Umsetzung

- Home, persönliche Home-Karten, Boulder-Grid/-Liste und Gastkarten navigieren
  direkt mit unverändertem Herkunfts-/Scrollzustand.
- Native Fotoübergangslogik, flushSync, Markierungsattribute und zugehörige
  Pseudoelement-CSS entfallen, statt die Fehler global auszublenden.
- Eintritt animiert ausschließlich Deckkraft, niemals Position oder Maße.
- Beibehalten: gezeichnete/inaktive Ausgangsseite, Filter, Thumbnail-DOM,
  Fokus, Scrollposition, sichere Direktlinks und sofortige Rücknavigation.
- Kein zusätzliches Bild, Medien-Preloading, Videostart oder Warte-Callback.
  Keine Änderung von Konten, Diagnosedaten, Berechtigungen oder Alarmen.

## Verifikation

- Vier neue Frame-Verträge zunächst gegen den Ausgangscode rot
  (nativer Fotoübergang wird noch aufgerufen), danach alle grün.
- Bei375/768/1280/1920 echte Eintrittsframes bei0/75/150ms angehalten,
  gerendert und visuell geprüft. Bild-/Video- und Kopfgeometrie identisch,
  kein transform, stets deckende Vordergrundfläche und kein horizontaler Überlauf.
  Lokale Filmstreifen: output/boulder-motion-filmstrip-{Breite}.png.
- Zweiter gerenderter Loop: gescrollte Liste und Rückkehr bei allen vier Breiten;
  output/boulder-motion-return-loop.png. Filter, Fokus, Scroll und Bilder erhalten.
- Boulder-Browsersuite19/19 lokal grün, einschließlich absichtlich bei0ms
  angehaltenem Eintritt mit wiederholtem sofortigem Zurück/Vorwärts, Gast,
  Reduced Motion, Videoquellen und genau einem Medienstart.
- Vier neue Node-Verträge für deckkraftbasierte Bewegung, direkte Einstiege,
  Herkunftserhalt und ungültige Herkunft. Die neun Tests des vollständig
  entfernten nativen Effekts sind obsolet und ersetzt, nicht übersprungen.
  Gesamtlauf323/323 ohne Skip bestanden.
- React-Check: keine neuen Hooks/Listener, kein imperatives Snapshot-Update,
  normale Event-Navigation, keine zusätzliche Render-/Medieninstanz.
- App-TypeScript weiterhin71 bestehende Diagnosen; keine neuen Befunde im
  Vergleich der geänderten Quellen. ESLint-Vergleich gegen den Ausgangsstand
  prüft die vier Produktseiten und die Browserfälle auf neue Meldungen.

Lokale Belege sind isolierte Fixtures. Veröffentlichung erst nach grüner
PR-/Main-CI und exakt passender öffentlicher App-/Landing-Revision bestätigen;
anschließend echte Webnavigation am Desktop und in Handygröße prüfen.
