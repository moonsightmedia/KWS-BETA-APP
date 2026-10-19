# Admin-Übersicht und Nutzerzuordnung – 19.10.2026

## Ergebnis und Veröffentlichungsgrenze

Implementiert, lokal geprüft, noch nicht produktiv freigeschaltet. Die neuen
RPCs benötigen eine gesonderte geschützte Datenbankmigration. Der reguläre
Web-Autodeployer führt sie nicht aus. Vor deren Verifikation nicht nach main
übernehmen und die UI nicht als live behaupten.

- Admin startet mit Übersicht. Desktop acht direkte Ziele; mobil Übersicht,
  Benutzer, Halle, Moderation und Mehr mit Feedback und Betriebsansichten.
- Live-Zahlen bleiben mit Zustimmungshinweis namenlos. Priorisierte Aufgaben
  führen direkt in den passenden Bereich; weitere Aufgaben bewusst aufklappbar.
- Sechs kompakte Bereiche: Konten, Halle, Rückmeldungen/Moderation,
  Fehler/Uploads, Mitteilungen und Datenquellen. Bestände und24Std. getrennt;
  Registrierungen sind keine Downloads, Versandschritte keine Mitteilungen und
  Push-Annahme keine Zustellung.
- Fehlerdetails lösen nur die ursprüngliche Konto-ID jeder Einzelmeldung auf.
  Name/E-Mail stammen aus dem vorhandenen App-Profil, nicht aus Sentry oder
  späteren Sitzungen. Gast, nicht zugeordnet, fehlende Serverunterstützung und
  Abfragefehler bleiben unterscheidbar. Anonyme Altberichte erhalten keine
  nachträglich geratenen Namen.
- Profil-Direktlinks lesen serverseitig exakt die validierte UUID. Neuer Tab
  erhält ungespeicherte Fehlerbearbeitung. Ungültige/fehlende Konten zeigen nie
  einen anderen Nutzer. Rollen- und Passwortaktionen bleiben in der vollständigen
  Nutzerverwaltung, nicht in der gezielten Supportansicht.
- Namen und E-Mail-Adressen werden nicht in kopierte Technikberichte,
  Nutzungsstatistik, Live-Boulderlisten oder Sentry übernommen. Die App- und
  Landing-Datenschutzhinweise beschreiben die serverseitige Supportzuordnung.

## Verifikation

- Alle319 Node-Tests bestanden, ohne Skip. Darin PGlite-Migration wiederholbar,
  Admin-/Nicht-Admin-/Anon-/Service-Prüfungen, mehr als1000 echte Aggregatzeilen,
  exakte ursprüngliche Identität, Kontolöschung und zweimaliger Rollback.
  Bestehende Monitoring-Funktionssignaturen unverändert.
- 36 Monitoring-Browserfälle bestanden, darunter7 neue Übersicht-/Nutzerfälle.
  Nach abschließender Mitteilungs-Beschriftung die7 neuen Fälle erneut grün.
- 12 Privacy-Browserfälle bestanden. Nach Integration von main zusätzlich16
  gezielte Navigation-/Admin-Integration-/Moderationsfälle bestanden.
- Zwei gerenderte Schleifen für Übersicht und Fehlerdetails bei375/768/1280/1920:
  bestätigte Werte/Konto, alter Stand/Nullwerte/Gast/nicht zugeordnet. Screenshots
  unter `test-results/launch-monitoring-admin-overview-20261019/` angesehen.
  Keine horizontale Überbreite, erreichbare feste Dialogaktionen, mobile
  Mehr-Navigation per Tastatur und Profileinstieg ohne Verlust des Fehlerentwurfs.
- Quell- und Rechteausfälle liefern keine erfundenen Nullwerte. Fehlgeschlagene
  Aktualisierung kennzeichnet den letzten bestätigten Stand. Externe Fehler
  erhalten keine geratenen Profilverknüpfungen. Technikexport bleibt kontaktfrei.
- Fokussiertes ESLint und Diff-Prüfung grün. Globaler Typecheck weiterhin71
  bestehende Fehler, keine neuen in den geänderten Produktionsmodulen.
- Kombinierter App-/Landing-Produktionsbuild mit synthetischer öffentlicher
  Konfiguration erfolgreich; kein Upload oder produktiver Versionsnachweis.
- 40 Provider-,15 Autodeploy- und3 Landing-Zählertests unter gebündeltem Python
  grün. Web-Deployment-Suite lokal16/17: vorhandener Linux-Pfadtest scheitert mit
  Windows-Backslashes. Nicht umgangen oder fachfremd geändert; Linux-CI bleibt
  verbindlich. Zwei alte Admin-Foundation-Monitoringfälle erwarten das abgelöste
 8-REST-Abfragen-Dashboard und bleiben außerhalb der gezielten Navigationstests
  veraltet; aktuelle Monitoring-Suite ist vollständig grün.

## Backend und nächster Schritt

Neue Migration: `20261019110000_admin_overview_and_issue_actors.sql`.
Git-Blob-SHA256 bei LF-Zeilenenden:
`bdae4fd463a989cdd57bcfd43aa156970583d10360ecb26382ae543427a3d933`.
Binär übertragene Dateien am tatsächlichen Ziel erneut hashen; ein Windows-Checkout
mit CRLF hat andere Bytes. Betrieb, Datenbegriffe und Rollback:
`ops/hostinger/admin-overview/README.md`.

KWS-Ziel ist ausschließlich `srv2044594`,187.7.70.230, Container `supabase-db`.
Der verifizierte SSH-Zugang antwortet mit Timeout. Die vorhandenen drei
Browser-Anmeldungen zeigen keinen VPS; beide gespeicherten Hostinger-API-Referenzen
sehen nur den separaten Hub187.124.182.245. Dieser wurde nicht als KWS behandelt.
Der direkte Einstieg in die geschützte Supabase-Verwaltung wurde vom Browser
blockiert; keine Schutzumgehung. Keine Firewall, Passwörter oder Ports verändert.
Die E-Mail des tatsächlich berechtigten KWS-Hostinger-Kontos ist beim Nutzer
angefragt; keine Passwörter angefordert.

Die zeitgleich veröffentlichte PR43 wurde aus main integriert, inklusive
umbruchfähiger/kopierbarer Verwaltungs-E-Mails. Deren Änderungen bleiben erhalten.
Letzter gelesener öffentlicher App-/Landing-Stand:
`8c86264d98a8f43a78c19bfe5678f5406baba4af`, nicht diese Admin-Erweiterung.

Nächster Schritt: bestehenden KWS-Serverzugang herstellen, geprüfte Migration
nach Runbook samt Admin-/Negativtests anwenden, anschließend regulären
PR-/CI-/Main-Webrelease durchführen und angemeldete Produktionsansicht prüfen.
Keine neue native Veröffentlichung, kein neuer kostenpflichtiger Dienst und
keine Änderung bestehender Store-/Alarm-/Shadow-Monitor-Grenzen.
