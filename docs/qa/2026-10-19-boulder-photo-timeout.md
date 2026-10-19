# Fotoübergang: DOM-Update-Timeout

## Gemeldetes Problem

Release `kws-beta-app@1.0.250+8c86264d98a8` meldete dreimal auf einem
erfassten Gerät `TimeoutError: Transition was aborted because of timeout in
DOM update. DOM update timed out`.

Die passende Codeursache liegt in `boulderPhotoTransition.ts`: Nach dem
synchronen React-Update wartete der optionale Fotoübergang auf zwei
`requestAnimationFrame`-Callbacks. Während des Übergangs kann das Rendern
unterdrückt sein. Ein ausbleibender Frame lässt die Update-Promise offen.
Zusätzlich wurde nur `finished`, nicht die separat ablehnende `ready`-Promise
behandelt. Ein reiner Animationsabbruch konnte so als globaler Fehler erscheinen.
Der Bericht allein beweist keinen App-Absturz oder Datenverlust.

Bezug: [W3C-Lebenszyklus und Rendering-Unterdrückung](https://www.w3.org/TR/css-view-transitions-1/)
und [Chrome: Übergänge als optionale Verbesserung](https://developer.chrome.com/docs/web-platform/view-transitions/same-document).

## Korrektur

- DOM-Update einschließlich `flushSync` endet synchron, ohne auf Frames zu warten.
- Die `ready`-Ablehnung wird unmittelbar an diesem optionalen Effekt behandelt.
  Kein globaler Timeout-Filter und keine Änderung der allgemeinen Fehlererfassung.
- Direkte Navigation, Reduced Motion, fehlende/defekte Bilder, 180ms-Effekt,
  Sofort-Zurück, bestehende Liste, Fokus und Scrollposition bleiben erhalten.
- Keine Datenbank-, Nutzer-, Rollen-, Videoquellen- oder Alarmänderung.
  Historische Meldungen werden nicht gelöscht oder automatisch geschlossen.

## Verifikation

- Ausgangscode mit angehaltenen Frames: Callback gibt eine offene Promise zurück
  und fordert einen nicht verfügbaren Frame an. Neue Implementierung aktualisiert
  synchron ohne Frameanforderung.
- Neun neue Node-Regressionen: synchrones Update, exakter Timeout, Abbruch,
  fünf direkte Fallbacks und synchrone API-Ausnahme. Gesamtlauf328/328 bestanden.
- Boulder-Navigation18/18 Browserfälle bestanden. Vier neue Fälle bei
  375/768/1280/1920 blockieren Frames nur innerhalb des DOM-Update-Callbacks
  und verlangen echten nativen `ready`-/`finished`-Erfolg ohne Seitenfehler.
- Bestehende Fälle prüfen Scroll-/Filter-/DOM-Erhalt, Videoquellen, Gast,
  Reduced Motion, Browser-Zurück/Vor und direkte Detailaufrufe.
- Zwei gerenderte QA-Loops in diesen vier Breiten: Home/Detail und
  Rückkehr/gescrollte Übersicht; lokale Kontaktbögen
  `output/photo-timeout-loop1.png` und `output/photo-timeout-loop2.png` geprüft.
  Isolierte Fixtures, keine Aktionen an echten Konten.
- Produktionshelper ESLint sauber. E2E-Datei hat weiterhin12 bestehende
  `no-explicit-any`-Befunde außerhalb der neuen Fälle; nicht mitbereinigt.
- App-TypeScript weiterhin71 bestehende Diagnosen, keine im geänderten Helper.
- Boulder-Navigationssuite in den regulären Web-Release-Prüflauf aufgenommen,
  damit diese Regression vor künftigen Veröffentlichungen getestet wird.

Die produktive Veröffentlichung gilt erst nach erfolgreicher PR-/Main-CI und
exaktem öffentlichem App-/Landing-Revisionsnachweis als bestätigt.
