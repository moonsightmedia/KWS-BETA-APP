# Doppelte Tour in der laufenden Vorschau

Nutzerscreenshot zeigte den ersten und zweiten Tourhinweis gleichzeitig. Auch die tatsächliche geöffnete In-App-Vorschau enthielt zwei Tourdialoge. Ein frischer Browserstart hatte den Fehler nicht gezeigt; die bisherigen Tourtests erfassten keine erneute Ausführung des Vorschau-Einstiegs.

Ursache reproduziert: Erneutes Importieren von `test/fixtures/training-preview.tsx` erzeugte mit dem bisherigen unbedingten `createRoot` eine zweite React-Wurzel auf demselben DOM-Container. Portale der vorherigen Wurzel blieben im Dokument. Das entspricht dem erneuten Ausführen des Einstiegmoduls nach einer invalidierten Vite-Refresh-Grenze. Die vorigen Layouttests widerlegten diesen Fehler nicht.

Fix: Der Vorschau-Container hält seine React-Wurzel; bei erneuter Ausführung wird dieselbe Wurzel gerendert. React räumt den vorherigen Baum samt Portalen regulär auf. Keine Änderung an Trainingsdaten, Tourgestaltung oder produktivem App-Einstieg. Bereits verwaiste Portale eines alten Starts brauchen einmaliges Neuladen; die tatsächliche Nutzervorschau wurde neu geladen und beim gleichen Filter-Schritt mit genau einem Dialog überprüft.

Prüfung: Vorher zwei Dialoge/zwei Hervorhebungen, nachher einer/eine. Neuer E2E-Fall importiert den Einstieg dreimal erneut, prüft jeweils genau eine Tour und Hervorhebung sowie vollständiges Entfernen beim Schließen. Acht Einführungstests bestanden. Zwei visuelle Loops bei375/768/1280/1920 jeweils mit Einstieg-Neuausführung und Wechsel zum Filter; acht geprüfte Kombinationen, jeweils eine Tour/eine Hervorhebung. ScopedESLint für Fixture und E2E ohne Fehler. Die geänderte Fixture ist ausschließlich die lokale Vorschau und kein Produktionsbuildbestandteil; kein erneuter Produktionsbuild nötig.

Nachweis der tatsächlichen Nutzervorschau: `test-results/training-intro-root-fixed-user.png`. Loopbilder unter `test-results/training-help-loop1/root-fix/` und `training-help-loop2/root-fix/`. Nächster Schritt: Auftraggeber setzt den sichtbaren Filter-Schritt fort.
