# V5 im normalen Mobile Player – 20. Oktober 2026

## Veröffentlichung über PR 57

Der Nutzer hat am 20.10.2026 die Veröffentlichung des bestätigten normalen
Players über den regulären PR-/CI-Weg freigegeben. Der bestehende PR 57 wird
dafür weiterverwendet. Die Veröffentlichung enthält keine Entwurfsdateien,
keine Feedänderungen und keine Änderungen an Onboarding oder nativen Releases.
Die bereits auf main vorhandenen Feedfunktionen und ihre CI-Schritte bleiben
unverändert. Der gemischte ursprüngliche Arbeitsbaum bleibt unangetastet.

Frischer Fetch: ursprünglicher lokaler main 0 voraus / 34 zurück gegenüber
4335418. Im isolierten Release-Worktree ist dieser main in den Player-Branch
integriert; gemeinsam geänderte Fixtures behalten die neuen main-Testhilfen.
Der CI-Konflikt wurde durch Erhalt aller bestehenden Suiten und Hinzufügen
der Playerprüfungen gelöst.

Auf diesem integrierten Stand bestanden 338 Node-Tests, 28 bestehende Player-/
Continuity-Browsertests und vier neue Detailsheet-Integrationstests. Letztere
prüfen Auf-/Zuziehen mit derselben pausierten Medieninstanz und erhaltenem
Tempo/Loop/Zeitpunkt, abgebrochene kurze Geste, unabhängige Zeitleiste,
ausblendbare Bedienung, Gast-Tabs, Escape/Fokus und Fehler-Rücknavigation.
Sie laufen künftig als eigener Schritt im normalen Web-production-Workflow.
Der lokale Produktionsbuild bestand in 14,84s. Lint: keine Fehler, vier bereits
bekannte Fast-Refresh-Warnungen. Keine Versions-/Abhängigkeitsänderung.
Release- und Produktions-CI sowie die exakten Live-Revisionen werden nach
Abschluss im gerätespezifischen Handoff festgehalten; die folgenden Abschnitte
dokumentieren die vorherige lokale Integration.

## Nachkorrektur: kein Vollbildbutton im mobilen Detail

Auf Nutzerwunsch ist der Vollbildbutton aus V5 und dem normalen mobilen
Detailplayer entfernt. Der produktive Button wird nur dann gerendert, wenn der
Player nicht mobil ist oder keine mobile Detailansicht darstellt. Desktop- und
eingebettete Player behalten die bisherige Vollbildbedienung. Feed unverändert.

Zwei erneute gerenderte QA-Loops bei 375/768/1280/1920px: im mobilen Detail kein
Button im DOM, in den drei breiten Ansichten jeweils einer; Panel und
Qualitätsmenüs bleiben bedienbar. V5 direkt mit null Vollbildbuttons bestätigt.
Die 28 Player-/Continuity-Regressionstests sind erneut grün, einschließlich
Fullscreen in eingebetteten mobilen Playern. Die Continuity-Suite prüft die
gezielte DOM-Präsenz je Ansicht. App-Build und Lint erfolgreich (nur die vier
vorhandenen Fast-Refresh-Hinweise); `git diff --check` erfolgreich.

Belege: `no-fullscreen-loop*.png`, `mobile-no-fullscreen-final.png`,
`draft-no-fullscreen.png`, `regression-no-detail-fullscreen.log`,
`app-build-no-detail-fullscreen.log`, `lint-no-detail-fullscreen.log` unter
`output/mobile-player-integration/`. Die nachfolgenden Vollbild-Detailbelege
beschreiben den Integrationsstand vor dieser gezielten Entfernung.

Der freigegebene Entwurf ist in der mobilen Boulder-Detailseite für direkte
Videos integriert. Der letzte Nutzerwunsch verlängert den oberen Verlauf auf
200px ab der Bildkante; unten bleiben 140px. Das Video bleibt vollständig und
exakt zentriert. Die tatsächlichen Videomaße und ein ResizeObserver bestimmen
die Restflächen. Keine globale Navigation auf mobilen Boulder-Detailrouten.

Die 56px-Bar enthält Play/Pause, breite Zeitleiste/Zeit und den Detailpfeil.
Geschwindigkeit und Loop stehen rechts darüber. Die zentrale Buttonfläche und
5-Sekunden-Buttons entfallen im normalen Mobile Player. Die Classic-Variante
bleibt für ältere isolierte Studien verfügbar. Desktop behält native Controls.

## Panel und Medienzustand

- Unten am Video oder Pfeil hochziehen öffnet das fingerfolgende Detailsheet;
  am Griff/Kopfbereich herunterziehen schließt es. Kurze Züge und Abbrüche
  kehren zurück, Controls/Zeitleiste sind von der Geste ausgenommen.
- Echte Info-, Track- und Beta-Komponenten, getrennt scrollbar. Tabwechsel
  setzen den Panelscroll zurück. Gäste erhalten nur Info und Beta.
- Verborgene/geschlossene Inhalte sind inert; Escape und Tastaturfokus sind
  berücksichtigt. Verschachtelte Session- und Meldedialoge behalten ihre
  eigene Escape-/Fokusbehandlung. Reduzierte Bewegung deaktiviert Übergänge.
- Der Viewport-Portalweg erhält im mobilen Detail-Vollbild dieselbe Medien-
  instanz und lässt übergeordnete Session-/Meldedialoge sichtbar. Ein Rücksprung
  aus dem offiziellen Beta-Tab schließt das Sheet und spielt genau dieses Video.
- Öffnen pausiert. Ein noch ausstehendes `canplay` darf nicht hinter dem
  geöffneten Panel neu starten. Quelle, Fallback, Retry und Monitoring bleiben
  in der vorhandenen Playerlogik. Zurück und Details bleiben auch bei Fehlern
  erreichbar.
- Die geschlossene, transformierte Sheetfläche ist mit `overflow: clip`
  begrenzt. Sie kann keine versteckte Scrollbewegung der Videofläche erzeugen.

## Verifikation

**28 Browser-Regressionstests bestanden**: neun Player-/Vollbildtests und
19 Detail-/Continuity-/Netzwerktests. Die bestehenden Fixtures wurden an das
Detailsheet und die echte AppNavigation angepasst. Die Community-Testattrappe
enthält die von bereits vorhandenen Feed-Imports benötigten Exporte; der
produktive Feed wurde nicht geändert oder umgestaltet.

Zwei gerenderte QA-Loops bei 375×812, 768×1024, 1280×900 und 1920×1080:
Layout sowie geöffnete Details/Qualitätsmenüs. Auf schmaler Ansicht eigene
Controls und `contain`; breite Mausansichten weiterhin native Controls und
bisheriger Desktopaufbau. Kein horizontaler Overflow. Zusätzlich im lokalen
Browser mit echten Pointer-Drags und den echten Detailkomponenten geprüft:

- Hoch-/Runterziehen mit festem Video-Rechteck und `scrollTop=0` der
  Playerfläche. Info/Track/Beta erreichbar; Sessiondialog auch im Vollbild.
- Escape schließt zuerst den verschachtelten Dialog, dann das Detailsheet.
  Geschwindigkeit 0,5×, Loop und pausierte Zeit 0,05s bleiben beim Qualitäts-
  und Vollbildwechsel erhalten; genau ein Video bleibt montiert.
- Gäste: kein Track-Tab, keine Navigation im Detail; Zurück führt zu `/guest`
  und zeigt die Navigation wieder. Erneutes Öffnen und Zurück funktionieren.
- Fehlende Videoquelle: Fehlermeldung, Retry, Details und Zurück erreichbar;
  Details öffnen und Rücknavigation nach `/boulders` geprüft.
- Abschließende Browserlogs des normalen Prüffalls ohne Fehler/Warnungen.

Die lokalen Fixtures verwenden die echten Player-/Detail-/Tab-Komponenten mit
isolierten Benutzer-/Community-Daten und ohne Live-Backend. Der visuelle
Prüffall nutzt das vorhandene öffentliche Referenzvideo; Regressionstests
verwenden das vorhandene lokale Testvideo. Keine echten Bewertungen,
Kommentare, Sessions oder Monitoringereignisse geschrieben.

Vollständiger App-Produktionsbuild erfolgreich, ohne Versionsbump und ohne
Schreibeffekt des Versionsplugins auf vorhandene Android-Assets. Lint der neuen
Player-/Seitenkomponenten: keine Fehler; vier bestehende Fast-Refresh-Hinweise
im Player wegen exportierter URL-Helfer. `git diff --check` erfolgreich.

Der vollständige TypeScript-Check bleibt aufgrund vorhandener Projektfehler
rot (unter anderem Admin-/Upload-Typen, Kalender und bisherige `colorHex`-
Zugriffe im Detail-Tab). Die neuen Playerkomponenten, AppNavigation und die
angepasste BoulderDetail-Seite erzeugen keine Diagnosen im abgeschlossenen
Check. Die bisherigen `colorHex`-Tabzugriffe sind auch in `HEAD` vorhanden.

Belege unter `output/mobile-player-integration/`: `regression.log`,
`app-build.log`, `lint.log`, `typecheck.log`, `loop1-*.png`, `loop2-*.png`,
`mobile-375-final.png`, `details-info-375.png`, `nested-session.png`,
`fullscreen-session.png`, `guest-details.png` und `video-error.png`.

Lokale Prüfvorschau:
http://127.0.0.1:5241/test/fixtures/mobile-player.html?visual

Keine Veröffentlichung und keine physische iOS-/Android-Abnahme. Vor der
Arbeit frisch gefetcht: lokaler `main` 0 voraus und 25 Commits hinter
`origin/main` (`f7bcb6a`). Vor Änderungen gemeldet; kein Pull/Merge/Reset.
Vorhandene Feed-, Onboarding- und andere fremde Arbeiten erhalten.
