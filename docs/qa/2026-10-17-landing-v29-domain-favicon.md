# V29: Domain-Standardfavicon korrigiert

Nutzer beauftragt sofortigen Austausch des verbliebenen Lovable-Standardicons.
Live17.10.2026 um17:06:05Europe/Berlin, statisches Release `f1bc9f3fdb8f42ab`.

- `/favicon.ico` wird durch eine exakte Caddy-Route aus dem bestehenden
  unabhängigen Landing-Mount ausgeliefert: unverändertes, freigegebenes
  `beta-favicon.ico`, mit Revalidierung statt langfristiger Browsercachebindung.
- `public/favicon.ico` im Repository enthält dieselben Beta-Bytes, sodass ein
  späterer normaler Appbuild ebenfalls kein Lovable-Standardicon mehr enthält.
- Keine App-HTML-/JS-Datei auf dem Server ersetzt, keine fremden App-Commits
  gemergt. Der App-HTML-Iconverweis bleibt vorerst das bestehende KWS-PNG;
  hier wurde das konkret beanstandete Lovable-Standardfavicon entfernt.
- Beiderlei Deploy-Locks und frische Apprevision
  `387a0cbe758df426a0470a517313cb0615801715` geprüft. Echter Caddy-Kandidat,
  alle37Dateien und Root-Favicon geprüft; Root-/Auth-/Guest-App-HTML bytegleich,
  andere Container unverändert. Zählerfilter bleibt geprüft und funktionsfähig.
- Öffentliche URL: HTTP200, image/vnd.microsoft.icon; SHA256
  `08087b7b33a4b20736136abc32521c86984d7d7144a3d119f4d88c301903eda1`,
  identisch zum freigegebenen Beta-ICO und verschieden vom alten Lovable-ICO.
- Voriges Release `1a54729d849fb473` und before-Konfigurationen erhalten.
  Google kann die alte Domainmarke weiter zwischenspeichern; kein sofortiger
  Wechsel in Search Console oder Suchergebnissen versprochen.

Renderprüfung in zwei Schleifen bei375/768/1280/1920 mit tatsächlicher Live-ICO-
URL in16/32/48px; Screenshots und Ergebnis unter `output/landing-v29`.
Kein neuer Indexierungsantrag, keine Änderung an der Kletterwelt-Hauptwebsite.
