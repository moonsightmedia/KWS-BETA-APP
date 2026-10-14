# Einheiten benennen und an mehreren Tagen verwenden

Nutzerauftrag: Einheiten benennen und die optionale Wochenplanung für mehrere Tage ermöglichen.

Umsetzung:

- Gespeicherte Einheiten, auch automatisch erstellte reguläre Trainingssessions, zeigen eine Stiftaktion am Namen. Inline-Formular mit Speichern/Abbrechen,80Zeichen, Leerzeichenbereinigung und Validierung im Provider. Feste reservierte Termine behalten ihre bisherigen Änderungsgrenzen. Namen umbrechen auch als lange Wörter.
- Eigene gespeicherte Einheiten können mehrere freie Wochentage gleichzeitig auswählen und später zusätzliche Tage belegen. Vorhandene eigene Zuordnungen werden benannt und im Tagesraster als eingeplant gezeigt. Andere belegte Tage bleiben gesperrt. Eine Auswahl wird als ganze Gruppe validiert; IDs entstehen getrennt pro Tag. Bereits vorhandene Termine verhindern doppelte Einträge, auch bei erneutem State-Updater.
- Kein Schemawechsel: Speicherungv2 erlaubt mehrere Einträge mit gleicher sessionId bereits, verlangt weiterhin eindeutige Tage. Höchstens sieben Tage, ein Termin je Tag. Allgemeine Belastungs-/Planberechnung nicht geändert. Unbekannte Dauer, leere Einheit und needs-review bleiben Sperren.
- Wochenplanlink führt mit `?entry=<Termin-ID>` zur Einheit. Bei mehreren geplanten Terminen wählt man in der Sammlung den betreffenden Trainingstag. Completion und Undo bleiben terminbezogen; ohne Auswahl kein Abschließen/Undo eines stillschweigend gewählten ersten Tages. Ein ungültiger Terminlink darf keine andere Completion erfassen.
- Namens-/Übungsänderungen aktualisieren die gemeinsame gespeicherte Einheit, nicht vergangene Verlaufssnapshots. Bedienerklärung dazu im oberen Infozugang ergänzt.

Prüfung:

- Neuer integrierter E2E-Fall: eigene Einheit speichern, leeren Namen verhindern, Umbenennen/Trimmen/Abbrechen, mehrere Tage auswählen/abwählen, Reload mit getrennten IDs und gemeinsamer Session, Montag und Mittwoch separat abschließen, Mittwoch rückgängig ohne Montagänderung, weiteren Freitag ergänzen, Namen in Planung ändern ohne vergangene Snapshotänderung, Wochenplanlink mit korrektem ausgewähltem Tag und veralteter Entry-Link gesperrt.
- Voller UI-Lauf45/45PASS. Nach finaler Wortumbruch-/Infoanpassung Kernszenario erneut bestanden.24Plan-/Inhalts-/Historytests bestanden. ScopedESLint keine Fehler, vorhandene Provider-FastRefresh-Warnung. Produktionsbuild mit Trainingsvorschau bestanden, Version1.0.230. AppTSC76 bekannte Bestandsdiagnosen außerhalb der geänderten Trainingsdateien.
- Zwei Sichtloops375/768/1280/1920: Loop1 Umbenennen, eingeplante Tage, Wochenplan mit gleicher Einheit an zwei Tagen (12Screenshots); Loop2 dritte Zuordnung, konkreter Trainingstag und80Zeichen ohne Leerzeichen (8Screenshots). Keine Dokumentüberbreite oder Laufzeitfehler. Lokale Nachweise unter `test-results/training-help-loop1/multi-days/`, `training-help-loop2/multi-days/` und `training-intro-multi-day-*`.

Nur lokale Trainingsbranch, kein Push/Release. Nächster Schritt: Auftraggeber öffnet „Einheit anpassen“, benennt sie am Stift und wählt mehrere freie Tage für dieselbe Einheit.
