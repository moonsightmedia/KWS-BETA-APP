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
- Build 86 erfolgreich signiert und zu Apple hochgeladen. IPA: 30 Assets geprüft, keine tatsächlichen geschützten Zugangsdaten gefunden; Hostinger-API, Video-Endpunkt und Recovery vorhanden. Kopie auf dem Kunden-NAS unter `Releases/iOS/86` mit identischer SHA256 `5538933B7932AC3C1109E9C824689937FB4989FD22074A3DB682284F7819F852` verifiziert.
- Apple hat Build 86 verarbeitet; Version 1.0 mit Build 86 gespeichert, interne TestFlight-Gruppe KWS Team zugeordnet. Manuelle Veröffentlichung bleibt ausgewählt; keine öffentliche Einreichung. Nachweis `test-results/apple-store-2026-10-12/build-86-selected.jpg`.
- Lauf `38251816592`: iPhone hat alle fünf Willkommensschritte absolviert, 104 echte Boulder samt Bildern geladen. Fehler im Test: Kartenlabels enthalten konkrete Namen, `Grad` und `Farbe`, nicht den Oberbegriff `Boulder`. Karte wurde deshalb nicht gefunden. Keine erfolgreichen drei Store-Bilder aus diesem Lauf behauptet; iPad-Job des überholten Laufs abgebrochen.
- Korrektur `5884e22`: Suche nach tatsächlich beobachteten Kartenmerkmalen und nur aktive Simulatorarchitektur kompilieren. Neuer Lauf https://github.com/moonsightmedia/KWS-BETA-APP/actions/runs/38254354855 noch offen.
- Noch vorhandenes iOS-Platzhalter-Icon entdeckt. Auftraggeber bestätigt Original-Kletterwelt-Logo per Bildskript. `b0bdd46`: Originalproportionen erhalten, weißer Rand, 1024x1024 RGB ohne Alpha, visuell geprüft; SHA256 `f31d33d02f5196ce013bb54b23a6ad69eec9f3ba548eb2e5868ea0010dbad27d`. Neuer signierter Uploadlauf https://github.com/moonsightmedia/KWS-BETA-APP/actions/runs/38254807083 gestartet.

Originale iPhone-/iPad-Bilder erst nach erfolgreichem Export, Größen-/Hashprüfung und visueller Prüfung hochladen. Neuen verarbeiteten Build erst nach erfolgreicher IPA-Prüfung auswählen. Firmenumstellung und zutreffende DSA-Angaben bleiben offen. Kamera, konkrete Hardware und vollständige Kontolöschprobe wurden nicht durch Simulator oder Layoutprüfung bestätigt.

Quelle: [Apple Review Guidelines, 2.2](https://developer.apple.com/app-store/review/guidelines/#software-requirements), tatsächlicher Quellcode und Runner-Artefakte.
