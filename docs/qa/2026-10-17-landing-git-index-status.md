# Landingpage: Git-Sicherung und erneute Google-Indexprüfung

Auftrag: vorhandene Änderungen in Git sichern und den aktuellen Indexstatus prüfen.

- 17.10.2026, ca.12:10Europe/Berlin: Remote frisch gefetcht. Bestehender Branch
  `codex/minimal-landing` zunächst0ahead/10behind gegenüber `origin/main`.
  Keine App-Commits gemergt, kein Reset, kein neuer Produktionsdeploy.
- Landingpage, Originalmarken, Konzept-/QA-Dokumentation, statische Rechtstexte,
  Deployoperator und geschützte Dashboard-Ergänzung als ein Sicherungsstand.
  Die benötigte öffentliche Rechtstextquelle
  `docs/design/landing/legal-source-2026-10-17.json` explizit aufgenommen; sie
  trifft sonst das allgemeine Ignoremuster `*-*.json`. Keine privaten Zugangsdaten.
  Temporäre Outputs, Profile, Logs und Releasearchive bleiben außerhalb von Git.
- Frischer statischer Build ergibt exakt das zuletzt veröffentlichte Release
  `1a54729d849fb473`:37Dateien/1.586.551Bytes. Paketintegrität und HTML-Verweise
  mit `verify-bundle.mjs` erfolgreich geprüft. Die Prüfung des gesamten neuen
  Stagingstands meldet einige bereits vorhandene leere Schlusszeilen und
  Whitespacezeilen in Dokumenten, Rechtsseiten und dem Logo-SVG. Diese wurden
  für die Sicherung des bestehenden veröffentlichten Stands beibehalten;
  es sind Formatierungshinweise, keine fehlgeschlagenen Funktionstests.
- Search Console im KWS-Profil, bestehendes Geschäftskonto: aktuelle URL-Prüfung
  für `https://beta.kletterwelt-sauerland.de/landingpage` meldet **„URL ist nicht
  auf Google“**, Detail **„URL ist Google nicht bekannt“**, kein letztes Crawling.
  Damit keine bestätigte Indexierung. Anders als bei der früheren Prüfung wird
  derzeit keine verweisende Sitemap in diesem URL-Bericht angezeigt. Diese
  aktuelle Aussage ersetzt den älteren Status „Gefunden – zurzeit nicht indexiert“.
  Aus dem Bericht allein lässt sich die Ursache nicht bestimmen.
- Keine erneute Indexierungsanfrage, keine CAPTCHA-Lösung oder Änderung an Google-
  Einstellungen im Rahmen dieses reinen Prüfauftrags. Frühere erfolgreiche
  Sitemap-/Live-Tests sind separat unter V28 dokumentiert.

Nachweise: `output/landing-git-backup-check/manifest.json` und
`output/landing-git-index-check/google-index-status.png` (lokale Arbeitsnachweise).
Commit und Remote-Branch werden im Geräte-Handoff mit ihren verifizierten IDs
festgehalten. Der Commit ist eine Sicherung; Integration in main bleibt separat.
