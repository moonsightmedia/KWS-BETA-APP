# V2 – Verifikation am 23.10.2026

## Grundlage und Abgrenzung

Branch `codex/setup-dashboard`, eigener Worktree `C:/Users/janos/Documents/Codex/worktrees/kws-setup-dashboard`. Vor dem Review frischer Fetch: zwei eigene Commits voraus, kein Rückstand, sauberer Arbeitsbaum. Basis unverändert `474fcdd`. Vorhandener Hauptcheckout bleibt unberührt.

V2-Komponente ausschließlich im lokalen QA-Einstieg. V1 als Vergleich erhalten; beide Vergleichslinks liefern denselben erweiterten synthetischen Datensatz. Normales App-Profil lädt keine V2-Komponente, QA-Aliase oder zusätzlichen Entwurfsstile. Gemeinsamer Lesehook ergänzt lediglich Anlagedatum, bekannte Bereiche und freigegebene Kommentartexte; keine Migration oder Datenänderung.

## Loop 1 – Layout

- Gerendert bei320/375/768/1280/1920px, kein horizontaler Dokumentüberlauf.
- Erste Sichtprüfung erkannte, dass der normale Tailwind-Scan die absichtlich außerhalb von src abgelegte V2 nicht erfasst hatte. Expliziten QA-Tailwind-Scan ergänzt, danach kompakte achtspaltige Gradverteilung, Desktopspalten und Zweispaltenlayout neu gerendert und angesehen. Release-Tailwind unverändert.
- Mobil stehen Prüfanlässe vor dem Bestandsdiagramm. Tablet berücksichtigt die Desktop-Sidebar; Kennzahlen bleiben zweispaltig. Desktop stellt Bestand und Prüfanlässe nebeneinander, danach Rückmeldungsdiagramme und vergleichbare Arbeitslistenspalten.
- Vorher korrigierte mobile Fünfernavigation bleibt erhalten. Keine leeren Fotoboxen in der Liste.
- Belege: `output/setter-dashboard/v2/loop1-fixed-*.png`, Kontaktbogen und `final-*.png`; finale Übersicht `desktop-overview.png`.

## Loop 2 – Verhalten und Zustände

- Bei375/768/1280/1920px: Komet-Hinweis geöffnet, Kommentartexte im Detail gelesen, Screenshot gespeichert, Escape und Fokusrückgabe zum auslösenden Hinweis bestätigt. Bereichsselect geöffnet und Bug ausgewählt; alle Breiten zeigen26Boulder,269Beiträge=167Sterne+94Einstufungen+8Kommentare,20von26mitFeedback.
- Gesamtstand118Boulder,1219Beiträge=760Sterne+419Einstufungen+40Kommentare,92von118mitFeedback. Zwei konkrete Prüfboulder; ein Boulder kann zwei Signale haben und zählt trotzdem einmal.26Boulder ohneFeedback, davon23seitmindestens7Tagen angelegt. Fehlendes Feedback wird nicht als Qualitätsabweichung zu den zwei Prüfbouldern addiert.
- Bereichsvergleich mit Mehrfachzuordnungen, Grad5=>28Treffer, unbekannterGrad=>3Treffer, Suche ohneTreffer mit Reset, Mindeststimmenranking und Auswahl ohneFeedback=>26Treffer getestet.
- Bekannter leerer Bereich KurzePlatte bleibt auswählbar. Bestätigte0Boulder/0Beiträge, Durchschnitt und Abdeckung als Gedankenstrich. Kein verschwundener Bereich und keine erfundene Quote0/0.
- Detail Plattenliebe zeigt unabhängig die Gradeinschätzung5von8zu leicht und die Sternebewertung2,3aus12Stimmen. DetailKomet enthält die zwei freigegebenen Kommentare. Regeln und Datenbasis über Infofenster erreichbar; Escape gibt Fokus an Infoaktion zurück.
- Mobiler Sortier-Select aus dem ersten V2-Lauf verlor durch die bestehende modale Scrollsperre den Seitenscroll und platzierte sein Menü außerhalb des sichtbaren Viewports. Für V2 auf bestehendes, nichtmodales DropdownMenu mit RadioGroup umgestellt. Sortiermenü anschließend im sichtbaren Bereich bedienbar, Bewertungssortierung und Suchleerzustand bestätigt. Keine globale Änderung am vorhandenen Select-Primitive.
- InitialLoading und absichtlicherREST503 zeigen keine Kennzahlen. Erfolgreich leerer Bestand zeigt0Bestände, Durchschnitt/Quote unbekannt. V1/V2-Vergleichslinks getestet; V1 erhält dabei ebenfalls760Bewertungen.
- Finale normale Ansicht ohne Browser-Konsolenfehler. Ein kurzer Verbindungsfehler während eines QA-Serverneustarts wurde mit frischem Tab nach bestätigtemHTTP200 behoben. Buildausgaben sind anschließend vom QA-Dateiwatcher ausgeschlossen.

Belege: `browser-checks.json`, `loop2-detail-*`, `loop2-select-*`, `sort-menu-fixed-375.png`, `search-empty-375.png`, `areas-375.png`, `known-empty-area-375.png`, `info-375.png`, `error-375.png`, `loading-375.png`, `empty-375.png` unter `output/setter-dashboard/v2/`.

## Technische Prüfungen

-12Node-Tests bestanden: ursprünglicheAggregation/Pagination plus neue Grenzfälle für Mindeststimmen,60%-Richtung,schlechtenSternedurchschnitt, fehlende/falsche/zukünftigeDaten, Datenlückeerstab7Tagen, Mindeststimmenranking, Suche/Grad/Ansicht und bekannte leere Bereiche.
- Gezieltes ESLint ohneFehler.
- TypeScript-Vergleich einschließlich explizit eingebundener V2-Datei:Basis61Diagnosen,aktuell61,keine neue Diagnose. Kein vollständiger grüner Projekt-Typecheck behauptet.
- Eigenständiger QA-Vorschaubuild und normaler App-Releasebuild erfolgreich. Bestehende Bundlegrößen-/dynamischeImportwarnungen bleiben. Logs `build-preview.log`, `build-app.log`; Vergleich `output/setter-dashboard/typecheck-v2-comparison.json`.
- Keine zusätzlichen Abhängigkeiten installiert. Keine Produktivdaten oder echten Konten benutzt. Keine Schreiboperation an Bouldern, keine Veröffentlichung, kein Push/PR/Merge.

## Offen vor Integration/Release

Fachliche Schwellen mit der Halle bestätigen; authentifizierten Datenabruf/RLS mit realem Bestand prüfen. Anlagedatum nicht als tatsächlichen Hängezeitpunkt ausgeben. Ziel-Gradmix, Historie und Stil-/Attributanalyse separat fachlich definieren. Native Geräteabnahme steht aus. Die nun isoliert verwendete nichtmodale Sortierung ist kein Beleg, dass der alte modale Select an allen anderen Appstellen korrigiert wäre.
