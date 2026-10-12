# Training-UI – lokale Vorschau und Abnahme

## Ergebnis

Branch `codex/training-ui`, Basis `origin/codex/hostinger-migration` / `68b7d78`.
Der Remote wurde am 12.10.2026 vor der Umsetzung frisch gefetcht. Der ursprüngliche
Main-Checkout lag 19 Commits hinter `origin/main` und wurde nicht verändert.

Die Vorschau enthält drei Bibliotheken, fünf Brust- und fünf Fußtechnikbeispiele,
weitere Kraft-/Boulderbeispiele sowie vier reine Reha-Musterkarten. Suche, Thema,
Equipment, Favoriten, eigene gemischte Einheiten, Bearbeitung, Reihenfolge und
Übungsersatz funktionieren. Der sechsteilige Fragebogen führt zu einer Beispielwoche
mit festen Terminen, Verschieben auf freie Tage und Erledigt-Markierungen.

## Start und Abgrenzung

```powershell
npm run dev:training
# http://127.0.0.1:5184/training
npm run test:training-ui
```

Die separate `vite.training-preview.config.ts` ist ausschließlich für `serve`
zulässig. Sie lädt echte Training-/KWS-Oberflächen mit synthetischen Auth-/Rollenhooks
und ohne Supabase-Client. Andere Appbereiche sind darin ausdrücklich Platzhalter.
Sie ist kein Ersatz für eine angemeldete Produktions-App oder eine Berechtigungsprüfung.

Im normalen App-Build bleibt die Training-UI standardmäßig aus. Nur
`VITE_TRAINING_UI_PREVIEW=true` ergänzt die geschützte `/training/*`-Route, die
Navigation und die Hauptseiten-Swipe-Reihenfolge. `RequireAuth` bleibt erhalten.
Training-State lebt oberhalb des Outlets und wird mit der Konto-ID gekeyt, sodass
Routenwechsel ihn erhalten und Kontowechsel ihn zurücksetzen. Es gibt keine
Trainings-Datenbank, kein serverseitiges Speichern und keine Cloud-Synchronisierung.

Antworten, Favoriten, Einheiten und Planänderungen sind vorläufig und gehen beim
Neuladen verloren. Kein Gesundheitsfreitext wird erhoben oder an einen Dienst
gesendet. Reha-Karten enthalten weder Therapiedosen noch eine Hinzufügen-Aktion.
Fragebogenwerte steuern nur die Demoauswahl, keine wissenschaftlich validierte
individuelle Trainingsverschreibung. Die Auswahl von Tagen bewertet keine Erholung.
Einzelne Trainingsdosen und Videos sind noch nicht fachlich freigegeben; Quellen
erklären ihren tatsächlichen allgemeinen Kontext unter dem aufklappbaren Hintergrund.

## QA-Inventar und Belege

12 Training-Playwright-Szenarien bestanden:

- Layout-/Zustandsprüfungen bei 375, 768, 1280 und 1920 px, mit Start, beiden
  Suchbeispielen, Reha, Detail, Fragebogen, leerer Favoritenliste, Woche und Einheit.
- Brustsuche mit fünf Treffern, Kurzhantelfilter mit zwei, Leerzustand und Reset,
  Nachladen weiterer Einträge und Favoritensammlung.
- Kraft und Technik kombinieren, Duplikate verhindern, umsortieren, Dosis bearbeiten,
  Einheit übernehmen und gezielt eine Übung ersetzen.
- Fragebogen validieren, Antworten beim Zurückgehen erhalten, Woche anzeigen,
  abhaken und auf einen freien Tag verschieben; belegte Tage gesperrt.
- Reha ohne Therapievorgaben, unbekannte Übung, Datenverlust beim Neuladen und
  aktiver Training-Haupttab auf Unterseiten.
- Tastaturbedienung der Auswahl, reduzierte Bewegung und Quellen auf-/zuklappen.
- Feste Termine zählen mit und besitzen keine Verschieben-Aktion.
- Synthetischer Kontowechsel löscht Favoriten und den privaten Einheitenentwurf.
- Hauptseiten-Swipe funktioniert vom Trainingstart, Formulare fangen ihn ab.

Zusätzlich acht bestehende `header-stability.spec.ts`-Regressionstests bestanden:
Headerausrichtung, Safe Areas, Scrollen, Menüs und Datenzustände in allen vier Breiten.
Externe Netzwerkzugriffe waren in den Training-Tests gesperrt. Keine Browser-Pageerrors
oder horizontalen Überläufe in den geprüften Training-Ansichten.

Loop 1: gerenderte Hierarchie/Layout, KWS-Farben, Abstände, Typografie und Radien
geprüft. Eine zu lange Wochenüberschrift und abgeschnittene Durchgangsangaben
gekürzt. Loop 2: offene Auswahlmenüs, Tastaturfokus, Filter, Leerzustände,
Formularvalidierung, Verschieben, Konto-/Neuladen und Swipe geprüft.
Screenshots lokal unter `test-results/training-ui/`; absichtlich nicht committed.
Ein anfänglich rennender Tastaturtest wartet jetzt auf den tatsächlichen Menüfokus;
abschließender Gesamtlauf: 12/12 bestanden.

## Technische Prüfung und verbleibende Grenzen

- Normaler Vite-Produktionsbuild mit aktivierter Training-Vorschau bestanden,
  ohne Versionsbump oder Abhängigkeitsänderung. Vorhandene Bundle-/Browserslist-
  Hinweise bleiben; keine Produktionsveröffentlichung.
- Scoped ESLint ohne Fehler; zwei Fast-Refresh-Warnungen in Context/Preview-Entry.
- TypeScript meldet keine Fehler in den neuen Training-Dateien. Der globale
  `tsconfig.app.json`-Check ist weiterhin rot wegen vorhandener Fehler, u.a.
  QueryClient-`onError`, Admin-Bouldertypen und bestehender Diagramm-/Bouldertypen.
  Die ursprüngliche Release-Arbeitskopie zeigt dieselben genannten Fehler.
- `git diff --check` bestanden. Der Hauptcheckout und die Release-Branch wurden
  nicht bearbeitet; Tests/Builds betreffen den Training-Worktree.

Keine physische iPhone-/Android-Abnahme, kein echter persistenter Wochenplan,
keine Medizin-/Coachfreigabe und keine Aussage zur Wirksamkeit des Programms.
Nächster Schritt: Nutzerfeedback zur Oberfläche einarbeiten; anschließend den
fachlich freigegebenen Katalog und die kontogebundene Speicherung anbinden.
