# Kurze Statistikfreigabe und ehrliche Live-Zahlen

## Auftrag und Gestaltung

Nutzerentscheidung19.10.2026: Zustimmung behalten, Abfrage kurz und verständlich
machen, im Dashboard nur die tatsächlich teilnehmende Nutzergruppe ausweisen.
Bestehende helle KWS-Surfaces, Poppins, 4/8/12px-Radien und 44px-Aktionen bleiben.
Keine zusätzliche Dialogstufe, neue Kennzahl oder zusätzliche Datenerfassung.

- „Nutzungsstatistik erlauben?“ mit kurzem Zweck, App-/Boulder-/Videonutzung
  und Live-Zahlen ohne Namen. Freiwilligkeit, Gerätebezug und Abschalten im Profil
  bleiben sichtbar; Fehlerberichte sind ausdrücklich davon unabhängig.
- „Ohne Statistik“ und „Statistik erlauben“ bleiben unmittelbar erreichbar.
  Profiltext ebenfalls gekürzt; vollständige Datenschutzhinweise unverändert verlinkt.
- Übersicht und Aktivität: „Online mit Zustimmung“ plus vorangestellter Satz,
  dass nur Nutzer mit Statistikzustimmung und nicht alle App-Nutzer gezählt werden.
  Das gilt für beide Live-Zahlen und die Boulderansichten, auch bei Null/Fehler.
- Keine Änderung an Einwilligungsschlüsselv2, Nutzungsumfang, Transport,
  Aufbewahrung, Rechten oder Fehlerdiagnose. Bestehende Entscheidungen bleiben;
  kein erneutes Nachfragen allein wegen der gekürzten Texte.

## Abnahme

Gerenderte echte Komponenten in isolierten Fixtures, keine Produktivnutzer:

- Loop1: Abfrage, kompakte Übersicht und vollständige Aktivität bei
  375/768/1280/1920px. Hinweis vor Zahlen, Umbruch, Viewportgrenzen, Touchziele.
- Loop2: Ablehnen per Tastatur, Profil-Freigabe/Widerruf per Leertaste,
  bestätigte Null, HTTP-Fehler ohne falsche Null und Wiederherstellung.
  Beide Dashboardansichten behalten den Zustimmungs-Hinweis bei Fehlern.
- Screenshots lokal unter `test-results/launch-monitoring-consent-20261019/`.
- Erweiterte Privacytests prüfen vorhandenes v2-Erlauben und v2-Ablehnen,
  keine Nutzungsereignisse ohne Freigabe, erneuten Aufruf, Altfreigaben,
  echte Videoereignisse, StrictMode, Hintergrund und Widerruf.
- Vollständige Node-Suite:292bestanden,0Skips. Dashboard:24Browserfälle,
  Privacy:12Browserfälle. Fokussierter ESLint und `git diff --check` bestanden.
  Alle vier Breiten in beiden visuellen Loops angesehen; keine Überläufe oder
  verdeckten Entscheidungen. React-Prüfung: ausschließlich Textänderungen,
  unveränderte Hooks/Abos, keine neue Dependency oder zusätzliche Anfrage.

Ein erster paralleler lokaler Privacylauf traf im bestehenden Medientest eine
Wiederholung derselben Ereignis-ID beim Neuladen. Der vollständige zweite Lauf
war erfolgreich; der unveränderte Server dedupliziert anhand der Ereignis-ID.
Keine fachfremde Client-/Retryänderung in dieser Textpflege.

Die zusätzliche angemeldete Produktionssichtprüfung nach PR40 bestätigte neue
Texte und echten Live-Status auf Desktop und375px. In schmaler effektiver
Inhaltsbreite brach nur ein Kennzahllabel um; die Zahlen waren dadurch16px
versetzt. Reproduzierender335px-Test zunächst rot. Flexible Spalten richten
Zahlen jetzt unabhängig von der Labelhöhe unten aus, ohne feste Leerzeilen.
Dieser zusätzliche Fall wird vor dem korrigierten Release erneut geprüft.

Reguläre PR-/Main-CI, Web-/Landing-HTTPS-Revisionsbelege und native Artefaktprüfung
werden getrennt als Releasebeleg festgehalten. Fixtureprüfung ersetzt weder
angemeldete Live-Sichtprüfung noch physische Android-/iPhone-Abnahme.
Projektweiter Typecheck ist wegen bereits vorhandener Diagnosen kein grüner
Abnahmenachweis dieses Auftrags. Offizielle Storeimporte und externe Alarmfreigabe
werden hier nicht verändert.
