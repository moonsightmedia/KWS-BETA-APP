# V18 – umschaltbare echte App-Vorschau

Nutzerwahl: „Echte App-Vorschau mit Mockup und umschaltbaren Themen“.
Eine gemeinsame helle Fläche mit drei Tabs, Erklärung links, gerade stehendes
Originalgerät rechts, mobil unter der Erklärung. Training/Kinderbouldern sind
echte lokale Entwicklungsscreens, die Kletterhalle ausdrücklich nur Planung.
Keine Freigabe des gesperrten App-Trainings, keine neuen Termine oder Storelinks.

Zwei gerenderte Root-Loops bei320/375/768/985/1280/1920px, je drei Zustände.
Finale Ansichten bei375/768/1280/1920px tatsächlich visuell angesehen.
Alle Panels je Breakpoint gleich hoch; Gerätproportionen, Bildladung und kein
horizontaler Überlauf geprüft. Aktiver Tab/Panel synchron, Touch/Klick,
Pfeiltasten, Home/End, mindestens44px Ziele. Ohne JavaScript alle drei Inhalte
lesbar und unbrauchbare Tabs verborgen. Schnelle Gegenwahl sowie live wechselnde
Reduced-Motion-Präferenz bestanden. Keine JS-Laufzeitfehler.
Ausgabe: output/landing-v18/qa-results.json und loop2-*.png.

Design-Loop Runde1 mit drei frischen unabhängigen Kritikern, ausschließlich
gerenderte Bilder: Brief PASS, System PASS, Craft PASS. Craft nennt als größte
verbleibende Lücke das relativ kleine Gerät mobil: Inhalte sind weniger gut
lesbar als im Referenzhero. Das Gerät bleibt vollständig sichtbar; die Erklärung
steht separat in normaler Textgröße. Maßstab: docs/design/landing/upcoming/bar.md.
Die Screenshotkritik behauptet keine Tastatur-/Laufzeitprüfung; diese wurde
separat vom Root durchgeführt. Keine neue Abhängigkeit oder Bildgenerierung.

Zusätzlicher Smoke-Test: Footeranker, Partnerwahl in beide Richtungen und bei blockierten Vorschaubildern erhaltene Texte/Status bestanden. Paket f5ec8a60bdd41f46:24Dateien,971544Bytes, Integritätsprüfung bestanden, ZIP unter output/landing-v18. Lokal vorbereitet, keine Veröffentlichung.
