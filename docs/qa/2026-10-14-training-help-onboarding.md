# Training: Infozugang und erste Einführung

Nutzerauftrag: Bedienhinweise aus der laufenden Ansicht entfernen, oben unter „i“ erreichbar machen und beim ersten Betreten des Trainings kurz erklären, was „Zur Einheit hinzufügen“ bewirkt.

## Umsetzung

- `TrainingHelp` ersetzt die Textaktion „Vorschau“ im Training-Header. Dialog mit festem Kopf, scrollendem Inhalt und nativen aufklappbaren Abschnitten. Hinweise zur aktuellen Übung erscheinen zuerst. Quellen und die bestehenden Angaben zur Vorschau/fachlichen Freigabe bleiben dort erhalten.
- Zwei kurze Einführungsschritte zeigen Sammeln und Entwurf öffnen/Anpassen/Speichern. Der Beispielbutton ist als Beispiel beschriftet und startet kein Training. Überspringen, X und Escape schließen die Einführung. Wiederholung über Speicherung & Einführung im Infofenster.
- Eigener lokaler Schlüssel `kws-training-onboarding-v1:<accountId>`, nur `{version:1,dismissed:true}`. Keine Antworten, Gesundheitsangaben oder Übungsauswahl darin. Konto-ID stammt aus demselben Provider wie die Trainingsdaten. Dismissal in einem Tab schließt die automatische Einführung desselben Kontos im anderen Tab. Bewusst gestartete Wiederholungen werden nicht unterbrochen.
- Ohne Browserstorage arbeitet ein kontogebundener Speicher im laufenden Dokument; nach Neustart darf die Einführung wieder erscheinen. Einschränkung in der Hilfe benannt. Trainingsdatenreset lässt den Einführungsstatus bestehen.
- Wiederholte Texte in Bibliothek, Favoriten, Auswahlleiste und Einheiten entfernt; Übungsnotizen, Betreuung, Tipps und Quellen in den kontextbezogenen Infozugang verschoben. Anleitung, Vorbereitung, Dosis, Variationen, tatsächliches Hinzufügen/Ersetzen und aktuelle Fehlermeldungen bleiben nutzbar. Umfang und Planregeln wurden nicht geändert.
- Nur die Einführung erhält kompakte mobile Dialoghöhe. Andere Sheets und der Trainingsassistent behalten ihre Geometrie.

## Prüfung

- Neuer E2E-Vertrag für erste direkte Bibliotheksroute, beide Schritte, reale Auswahl/Einheit speichern, erneutes Laden ohne Wiederholung, manuelles Wiederöffnen, Escape und Fokusrückgabe; weitere Szenarien für Skip/X, Kontowechsel, zwei Tabs, blockiertes Storage und deaktiviertes Training.
- Gesamtlauf: 40 von41 bestanden; der letzte alte Quellen-Test suchte weiterhin den entfernten Seiten-Fold. Test auf den neuen Infozugang umgestellt. Nach finaler Reihenfolge im Infofenster alle11 betroffenen Szenarien bestanden. Damit sind alle41 Szenarien geprüft; dies sind zwei Läufe, kein behaupteter abschließender Komplettlauf.
- 24 Plan-/Inhalts-/Historytests bestanden. ScopedESLint ohne Fehler; eine vorhandene Fast-Refresh-Warnung am Provider mit Hookexport. Produktionsbuild mit Trainingsvorschau bestanden, Version1.0.230. App-TSC liefert76 bekannte Bestandsdiagnosen außerhalb der geänderten Trainingsdateien; keine neue Diagnose dort. Root-TSC allein prüft die referenzierten App-Dateien nicht und gilt nicht als Beleg.
- Zwei gerenderte Loops bei375/768/1280/1920px: Einführungsschritte1/2, Kraftbibliothek, Kraftdetail, kontextbezogene Hilfe. Je20 Screenshots, keine Laufzeitfehler oder Dokumentüberbreite. Nach Loop1: mobiles Fenster auf Inhaltshöhe begrenzt, Fokusring am initialen Schließen durch Fokus am Titel ersetzt, relevante Übungshinweise nach oben und allgemeine Hilfe standardmäßig zugeklappt. Abschließend kurzer Handyviewport separat kontrolliert.
- Artifacts lokal unter `test-results/training-help-loop1/`, `training-help-loop2/` und `training-intro-*`. Frühere erfolglose Prüfansätze lagen an falscher Testbezeichnung (Plural statt tatsächlichem „Erhöhter Liegestütz“) und am alten Quellenzugang; beides behoben.

## Grenzen und nächster Schritt

Lokale Vorschau auf `codex/training-ui`, kein Push oder Release. Speicherung und Einführung gelten je Konto je Browser/Gerät. Technische Prüfung ersetzt keinen Praxis- oder fachlichen Inhaltsreview. Auftraggeber öffnet das „i“, testet die Einführung über „Einführung erneut ansehen“ und erstellt anschließend eine eigene Einheit.
