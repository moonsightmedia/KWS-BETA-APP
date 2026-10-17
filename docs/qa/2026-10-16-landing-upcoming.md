# V16 – Ausblick

Auftrag: kommende Appbereiche ankündigen. Nutzer nennt Training/Kletterhalle
und bittet um Prüfung der vorhandenen Planung. Die Februar-Roadmap ist historisch;
keine ihrer bereits erledigten Punkte als neue Versprechen übernommen.

Quellen: docs/DESIGN.md (aktuelle Training-/Kinderbereichsregeln),
docs/qa/2026-10-15-training-release-gate.md (nicht freigegeben),
docs/design/training-exercise-detail-concept.md und KWS Training Produktkonzept
vom12.10.2026, Abschnitt15/16 (spätere eigene Disziplin Seilklettern).

Umsetzung: zwischen Featuretour und Partnerbereich, Titel „Das ist geplant.“.
Trainingsbereich mit Übungsbibliothek/Einheiten/Wochenplanung; Kinderbouldern mit
Kita-/Schulideen und Betreuungshinweisen jeweils „In Entwicklung“. Kletterhalle
als spätere Seilkletter-Erweiterung „Geplant“. Deutlicher Hinweis auf fehlende
Verfügbarkeit und noch offene Termine. Keine Vorschauroute verlinkt/aktiviert.
Native Details/Summary, Training zunächst offen, je ein Bereich geöffnet.
Header- und Footeranker „Ausblick“ ergänzt; keine neuen Assets/Dependencies.

Zwei gerenderte Root-QA-Loops bei375/768/1280/1920, zusätzlich320/985.
Kein horizontaler Überlauf, keine Header-Kollision. Alle drei Details per Maus,
Space/Tastatur, sichtbarer Fokus, Text/Status und native Exklusivität geprüft.
No-JS und Reduced Motion funktionieren. Footer-Anker landet am neuen Abschnitt.
Erste Bedienprüfung fand den fehlenden Footeranker; ergänzt. Zweite Sichtprüfung
fand den Tastatur-Fokusrahmen zu nah am Text;12px oberer Bodyabstand ergänzt
und bei allen vier Pflichtbreiten nachgeprüft. Keine Laufzeitfehler.

Quell-JS unverändert; App-Releasesperre bleibt bestehen. Neue Source und
vorbereitetes statisches Paket über build.mjs/verify-bundle.mjs geprüft.
Aktuell output/landing-v16/release-final und kws-landingpage-release-v16-final.zip
statt des vorigen Launchpakets verwenden. Nach finaler Logoübergabe erneut bauen.
Keine Veröffentlichung, SSH-Problem nicht erneut geprüft/geändert.
Lokale Screenshots und Scripts output/landing-v16. Keine neue unabhängige Jury.
