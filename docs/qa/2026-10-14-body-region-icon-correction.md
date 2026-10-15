# Körpersymbole: Ellenbogen und Knie korrigiert

14.10.2026, `codex/training-ui`. Die vorherigen abstrakten Winkel waren auch in der vergrößerten Vorschau nicht ausreichend als Körperregion erkennbar. Ellenbogen zeigt jetzt einen gebeugten Arm mit Hand, Knie ein gebeugtes Bein mit Fuß. Ein kleiner Punkt markiert das Gelenk; die geschlossene Kontur erhält einen dezenten Tint. Schulter und Hand behalten ihre bisherigen Formen.

Die neuen Silhouetten verwenden intern ein32px-Koordinatensystem. Strichstärke wird gegenüber den vorhandenen24px-Symbolen normalisiert; Karten bleiben bei28CSS-px, Farbe aus dem bestehenden `currentColor`. Kein neues Iconpaket, keine Änderung von Kartenbedienung oder Trainingstexten.

Zwei gerenderte Durchgänge bei375/768/1280/1920px: normal und als Favorit gemerkt. Alle vier Karten vollständig, keine horizontale Überbreite, keine PageErrors. Finale Bilder visuell angesehen, zusätzlich isolierte Vorschau mit72px- und28px-Darstellung der Original-SVGs. Vier vorhandene Browserprüfungen für ganze Karten, unabhängige Tasten und Tastaturöffnung PASS; ScopedESLint PASS.

Ein manueller QA-Locator erwartete im zweiten Durchgang noch „als Favorit merken“, obwohl der Zustand bereits gespeichert war. Zustandsabhängige Beschriftung berücksichtigt, vollständigen zweiten Durchgang wiederholt. Kein Appfehler daraus abgeleitet.

Lokale Belege: `test-results/training-raster-audit-20261014/body-region-icons-corrected.png` und `corrected-icons-loop{1,2}-{375,768,1280,1920}.png`. Nächster Schritt: Janosch beurteilt die korrigierte Bildform in der laufenden Vorschau und im Chat. Die Erkennbarkeit ist damit noch kein empirisch geprüfter Nutzerbefund.
