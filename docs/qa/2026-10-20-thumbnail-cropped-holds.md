# Sechs offene Griffe und Login-Rückweg

Der echte UI-Export wurde vor den Änderungen gesichert:97 bestätigte Bilder,
ein übersprungenes Bild und zwei unbestätigte Entwürfe, zusammen100 Einträge.
Sechs von104 Bildern sind offen. Foto-Hashes der gespeicherten Masken stimmen
mit den lokalen Originaldateien überein. Die Exporte liegen nicht im Git.

| Foto | Am realen Foto beobachtete Ursache |
| --- | --- |
| Schwarzer Geheimer Eichhörnchen | SAM findet53% Bildfläche mit zwei berührten Rändern; beides wurde bisher verworfen. |
| Weißer Spannender Klang | Gekreideter Körper wird nur teilweise erkannt; andere Punkte verbinden teilweise das Papier. |
| Roter Anspruchsvoller Stein | Großer roter Körper hat24% Fläche, berührt aber zwei Bildränder und wird deshalb verworfen. |
| Grüner Frischer Steigender Fels | Zwei nur etwa30px große Griffe; knapp danebenliegende Tipps liefern die Wand. Korrekte Tipps liefern kleine vollständige Flächen; Schildzuordnung bleibt unsicher. |
| Schwarzer Windiger Wasserfall |41% sichtbare Grifffläche scheitern an der27%-Schranke. |
| Schwarzer Mystischer Komet | Angeschnittene reflektierende Volumen; Punkte liefern Reflexionen oder verbinden Nachbarvolumen. |

Version3.2 ändert ausschließlich den manuellen Pfad: große Flächen bis92% und
mehrere Ränder erlaubt, ganze Bild-/offensichtliche Wandmasken weiterhin gesperrt.
Die automatische Erkennung bleibt konservativ. Ihre Cacheidentität3.1 bleibt
stabil; alle104 vorhandenen Cache-/Prüfschlüssel wurden unabhängig verifiziert.
Foto-Hash und Abmessungen, nicht identische manuelle Modellrevisionen, bestimmen
die Kompatibilität beim Ergänzen alter bestätigter Masken.

„Kontur nachzeichnen“ bietet den Ausweichweg bei Teilflächen/verbundenen Griffen:
mindestens drei sichtbare Randpunkte, keine echte Selbstkreuzung/ganze Bildfläche,
Punkt zurück, Abbrechen und Rückgängig. Unvollständige Konturen sperren Bestätigen.
Die Bitmap erscheint im Editmodus größer. Manuelle Konturen sind als solche
gekennzeichnet. Gegensinnige/überlappende Konturen erzeugen keine Löcher oder
inneren weißen Nähte. Unsichtbare Teile außerhalb des Fotos werden nicht erfunden.

Auth löschte das bisher benutzte `preserveRoute` beim Öffnen und Absenden. Der
explizite Kontext `/app/login?from=thumbnail-review` wählt jetzt nur ein festes
erlaubtes Prüfziel, erklärt den Anlass und bietet lokal Rückkehr ohne Anmeldung.
Nach Anmeldung geht es zur Prüfung zurück. Andere Loginwege bleiben unverändert.

Verifiziert:

- Alle sechs realen Fälle in isoliertem Chromium aus einer Kopie des Nutzerexports
  per Tipp/Kontur korrigiert;97 alte Bestätigungen und Skip exakt unverändert.
  Die sechs neuen Testbestätigungen sind ausdrücklich **keine Nutzerfreigaben**.
- Zwei QA-Loops im Tipp-/Zeichenmodus bei375/768/1280/1920px: kein Überlauf,
  keine JS-Fehler, keine externen Schreibversuche. Undo, Kontursperre, Anmeldehinweis
  und Rückweg getestet. Pixeltest für echte Vereinigung verschiedener Laufrichtungen.
- Echter Nutzerbrowser danach nochmals über den sichtbaren UI-Export gesichert:
  alle100 gespeicherten Einträge gegenüber der Sicherung vor dem Update exakt gleich.
- Polygon-/Bildraum-/Loginziel- und Publikationstests, Python-Service-/Randtests,
  neuer Mock-Login-Rücksprung und fünf bestehende Auth-Layouttests bestanden.
  Releasebuild erfolgreich; bestehende TypeScript-Ausgangsdiagnosen unverändert.

Diagnosekoordinaten existieren nur in lokalen Tests, nicht im Algorithmus.
Keine unabhängig annotierte Kontur-Grundwahrheit/Accuracy behauptet. Lokale Exporte,
Diagnosebilder und synthetische QA-Ergebnisse bleiben klar getrennt unter
`outputs/thumbnail-review` beziehungsweise `.thumbnail-data/rand-qa`.
Keine produktiven Thumbnails übertragen und keine der sechs Nutzerentscheidungen
automatisch bestätigt. Die97 Bestätigungen müssen nicht wiederholt werden.
