# Öffentlicher Willkommensdialog und native Store-Screenshots

## Änderung

Commit `636c4ad` ersetzt im bestehenden Willkommensablauf den Hinweis auf eine unfertige Beta-Version durch eine Erklärung des Boulder-Begriffs und einen Hinweis auf die tatsächlich verfügbaren Hallenvideos. App-Name, Dialogstruktur und gemeinsames Design bleiben erhalten. Dies beseitigt einen widersprüchlichen Hinweis bei der beauftragten regulären Store-Veröffentlichung; es ist keine Behauptung einer vollständigen Geräteabnahme.

Der native UI-Test verarbeitet jetzt die fünf tatsächlichen Willkommensschritte und anschließend die öffentliche Gastansicht. Der vorherige Lauf `38248736258` startete die App erfolgreich auf iPhone 17 Pro und iPad Pro 13-inch M5 und zeigte 104 aktuelle Boulder; der Test scheiterte an seiner falschen Erwartung eines Login-Startbildschirms. Diagnostische Originalbilder/Accessibility-Bäume im lokalen Artefaktordner. Der Export verwendet nun das tatsächlich beobachtete Manifestfeld `exportedFileName`.

## Lokale Prüfung

- Vite-Hostinger-Build erfolgreich. Nur bestehende Hinweise zu Chunkgrößen, Browserlist, dynamischen Imports und Fontauflösung; kein nativer Upload aus dem lokalen Build.
- ESLint auf `Onboarding.tsx`: keine Fehler, ein bestehender Fast-Refresh-Hinweis zur gemeinsamen Context-/Komponenten-Datei.
- Loop 1: tatsächlichen geänderten Dialog bei 375, 768, 1280 und 1920 px gerendert, Original-Screenshots geprüft. Text vollständig, keine Überlagerungen und kein horizontaler Dokumentüberlauf. Mobil randbündiges Sheet, Tablet/Desktop zentrierter Dialog; Farb-/Typo-/Buttonstruktur unverändert. Größenwechsel-Animation vor abschließender Geometrieprüfung auslaufen lassen.
- Loop 2: Weiter-Navigation bis zur geänderten Seite, Tastaturfokus im Dialog, nächster Schritt Feedback & Support und Abschluss mit Los geht's geprüft. Nach Abschluss Dialog geschlossen, Gastnavigation wieder erreichbar. Prüfung an denselben vier Breiten, Abschluss mobil.
- Lokaler QA-Server hatte keinen funktionierenden Backendzugang; dieser Durchlauf prüft nur Onboarding/Layout, keine Live-Boulderfunktionen. Die sichtbare Fehlermeldung wurde nicht als leerer Datenbestand oder erfolgreiches Backend ausgegeben.
- Bilder unter `test-results/apple-onboarding-20261012/`; keine dieser Browseraufnahmen als native Store-Bilder verwenden.

## Laufende native Prüfungen

- Screenshotlauf: https://github.com/moonsightmedia/KWS-BETA-APP/actions/runs/38251816592
- Neuer TestFlight-Build nach Textänderung: https://github.com/moonsightmedia/KWS-BETA-APP/actions/runs/38252239773
- Ergebnisse beim Schreiben noch offen. App Store Connect weiterhin Version 1.0 Build 85, manuelle Veröffentlichung; noch keine öffentliche Einreichung.

Originale iPhone-/iPad-Bilder erst nach erfolgreichem Export, Größen-/Hashprüfung und visueller Prüfung hochladen. Neuen verarbeiteten Build erst nach erfolgreicher IPA-Prüfung auswählen. Firmenumstellung und zutreffende DSA-Angaben bleiben offen. Kamera, konkrete Hardware und vollständige Kontolöschprobe wurden nicht durch Simulator oder Layoutprüfung bestätigt.

Quelle: [Apple Review Guidelines, 2.2](https://developer.apple.com/app-store/review/guidelines/#software-requirements), tatsächlicher Quellcode und Runner-Artefakte.
