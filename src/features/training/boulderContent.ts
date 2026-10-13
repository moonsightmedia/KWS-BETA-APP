import type { TrainingDose, TrainingExercise } from './types';

type BoulderRecipe = Pick<TrainingExercise, 'id' | 'title' | 'topic' | 'goal' | 'steps' | 'cues' | 'mistakes' | 'easier' | 'harder' | 'selectionReason'> & {
  format: 'drill' | 'game';
  illustrationId: string;
  level?: string;
  requiresCoach?: boolean;
  spraywall?: boolean;
  equipment?: 'Boulderwand' | 'Spraywall';
  sources?: TrainingExercise['sources'];
};
const learningDose: TrainingDose = { sets: 1, repetitions: '2', repetitionUnit: 'Versuche', restSeconds: 90, restScope: 'repetitions', secondsPerRepetition: 90, setupMinutes: 2 };
const previewSource = { label: 'Morenas et al. 2021: Modellpreview', url: 'https://doi.org/10.3390/ijerph182312594', context: 'Akuter Previewvergleich bei 21 fortgeschrittenen Seilkletternden; kein Langzeitnachweis dieser Boulderaufgabe, Spielregeln oder Dosierung.' };

/** Authored learning tasks and games; every exact recipe remains an editorial draft. */
export function additionalBoulderContent(motorSources: TrainingExercise['sources']): TrainingExercise[] {
  const recipes: BoulderRecipe[] = [
    {
      id: 'start-position-lab', title: 'Startpositionen-Labor', topic: 'Körperposition', format: 'drill', illustrationId: 'hip-position', spraywall: true,
      goal: 'Vor dem ersten Zug eine passende Hand-/Fußposition finden.',
      steps: ['Erreichbaren niedrigen Start mit guten Griffen, mehreren Tritten und Rückweg prüfen.', 'Vom Boden zwei mögliche Startpositionen beschreiben; vorgeschriebene Startregeln beachten.', 'Eine Position und nur den ersten kontrollierbaren Zug probieren, dann zurückkehren.', 'Nach Pause die zweite passende Position prüfen und Unterschiede beim Losbewegen nennen.'],
      cues: ['Startkontakte vor dem Zug klären.', 'Individuell passend statt möglichst eng.'], mistakes: ['Unpassende Startkontakte für eine vermeintlich richtige Beta erzwingen.', 'Aus dem Start einen Sprungversuch machen.'], easier: 'Positionen vom Boden besprechen und nur eine erproben.', harder: 'An anderem geeigneten Start die eigene Entscheidung erneut prüfen.', selectionReason: 'Für Schwierigkeiten direkt am Einstieg; trennt Startentscheidung vom übrigen Boulder.',
    },
    {
      id: 'sidepull-lab', title: 'Seitgriff: Zugrichtung erkunden', topic: 'Grifftechnik', format: 'drill', illustrationId: 'hip-position', requiresCoach: true,
      level: 'Nach Einführung · vertraute Wandpraxis', goal: 'Die Richtung eines großen seitlichen Griffangebots mit der Körperposition abstimmen.',
      steps: ['Coach wählt großen erreichbaren Seitgriff mit guten zusätzlichen Kontakten.', 'Griffrichtung vom Boden beschreiben; Hand-/Handgelenksposition angenehm einrichten.', 'Aus unterstützter Position zwei kleine passende Stand-/Hüftvarianten vergleichen; kein maximaler Griffzug.', 'Zurückkehren und erklären, welche Position den nächsten kurzen Zug erlaubte.'],
      cues: ['Griffrichtung und Stand zusammen betrachten.', 'Großer Griff ist keine Lastmessung.'], mistakes: ['Mehr ziehen, obwohl die Position nicht passt.', 'Handgelenk oder Schulter in eine erzwungene Richtung bringen.'], easier: 'Coach demonstriert; Position nur vom Boden beschreiben.', harder: 'Anderen geeigneten Seitgriff mit gleicher Fragestellung wählen.', selectionReason: 'Grifforientierung statt pauschaler Wandnähe; kein isoliertes Fingerkraftrezept.',
    },
    {
      id: 'undercling-lab', title: 'Untergriff: Abstand und Fußdruck', topic: 'Grifftechnik', format: 'drill', illustrationId: 'hip-position', requiresCoach: true,
      level: 'Nach Einführung · vertraute Wandpraxis', goal: 'Bei einem passenden Untergriff den erreichbaren Stand und die Bewegung vergleichen.',
      steps: ['Coach prüft großen niedrigen Untergriff, Fußkontakte und angenehmen Hand-/Schulterweg.', 'Eine passende Ausgangsposition einnehmen; Hände nicht in einen Maximalzug bringen.', 'Einen kleinen Stand-/Abstandswechsel mit umgesetzten Füßen prüfen und nur einen kurzen Zug ausführen.', 'Geordnet zurückkehren und den Unterschied zwischen Griffhöhe, Stand und Zugweg besprechen.'],
      cues: ['Füße dürfen umgesetzt werden.', 'Ein passender Untergriff ist Voraussetzung.'], mistakes: ['Griffhöhe unabhängig von Körpermaßen erzwingen.', 'Am Handgelenk ziehen oder an einem ungeklärten Untergriff hängen.'], easier: 'Position und Zugrichtung vom Boden kennenlernen.', harder: 'An anderem coachgeprüften Untergriff übertragen.', selectionReason: 'Spezifische Griffrichtung und Standwahl; ersetzt keine allgemeine Fingerlaststeuerung.',
    },
    {
      id: 'hand-match-order', title: 'Hände matchen: Reihenfolge planen', topic: 'Grifftechnik', format: 'drill', illustrationId: 'read-boulder', spraywall: true,
      goal: 'Bei einem breiten geeigneten Griff Handplätze und nächsten Zug vorbereiten.',
      steps: ['Breiten gut greifbaren Griff mit stabilen Fußkontakten und kurzem Rückweg wählen.', 'Vom Boden festlegen, welche Hand zuerst welchen Platz nutzt und welche danach weiterzieht.', 'Hände kontrolliert nacheinander platzieren; bei Platzmangel zurückkehren statt quetschen.', 'Nach Pause eine andere geeignete Reihenfolge prüfen und den Folgezug vergleichen.'],
      cues: ['Platz für beide Hände vorab prüfen.', 'Nacheinander bleibt kontrollierbar.'], mistakes: ['Beide Hände gleichzeitig ohne passende Unterstützung lösen.', 'Auf engem Griff eine verpflichtende Matchlösung erzwingen.'], easier: 'Sehr breiten Griff wählen oder nur die Reihenfolge zeigen.', harder: 'Reihenfolge an einer anderen kurzen passenden Sequenz planen.', selectionReason: 'Handorganisation an einem gemeinsamen Griff; anderer Fokus als Fußwechsel.',
    },
    {
      id: 'flagging-basics', title: 'Freies Bein als Positionshilfe', topic: 'Körperposition', format: 'drill', illustrationId: 'hip-position', requiresCoach: true, spraywall: true,
      goal: 'Eine kleine Flagging-Variante mit einem betreut geprüften Stand vergleichen.',
      steps: ['Coach wählt niedrige unterstützte Position mit guten Händen, belastbarem Standfuß und Rückweg.', 'Zunächst eine bekannte Lösung mit beiden Füßen auf Tritten probieren.', 'Nur nach Aufbauprüfung das freie Bein passend seitlich positionieren; nicht pendeln oder absichtlich wegkippen.', 'Zurückkehren und Reichweite/Kontrolle vergleichen; beide Lösungen dürfen passend sein.'],
      cues: ['Unterstützung zuerst klären.', 'Kleine Beinposition statt Balanceexperiment.'], mistakes: ['Ein Bein unabhängig von der Aufgabe zwanghaft lösen.', 'Wegkippen als Spielregel zulassen.'], easier: 'Bewegung demonstrieren lassen, beide Füße auf Tritten behalten.', harder: 'Anderen kurzen Zug unter gleicher Aufbauprüfung vergleichen.', selectionReason: 'Einführung in eine freie Beinposition; keine universelle Lösung für Seitenzüge.',
    },
    {
      id: 'foot-unloading', title: 'Einen Fuß kontrolliert entlasten', topic: 'Fußtechnik', format: 'drill', illustrationId: 'quiet-feet', spraywall: true,
      goal: 'Vor einem Schritt erkennen, welcher Kontakt gerade Last trägt.',
      steps: ['Niedrige Position mit guten Händen und zwei gut belastbaren Tritten wählen.', 'Vor dem Schritt benennen, welcher Fuß weiter soll und welche Kontakte unterstützen.', 'Gewicht passend verlagern und den gewählten Fuß nur bei kontrollierter Unterstützung umsetzen.', 'Zurückkehren und schildern, woran die Entlastung erkennbar war; nicht beide Füße lösen.'],
      cues: ['Entlasten vor dem Umsetzen.', 'Andere Kontakte bleiben verlässlich.'], mistakes: ['Am belasteten Schuh gegen den Tritt drehen.', 'Für den Test beide Füße gleichzeitig wegnehmen.'], easier: 'Nur Lastwechsel ohne Fußlösen beobachten.', harder: 'Den Lastwechsel vor einem anderen bekannten Zug prüfen.', selectionReason: 'Gezielte Vorbereitung eines Schritts; ergänzt Platzierung um das kontrollierte Entlasten.',
    },
    {
      id: 'downclimb-path', title: 'Rückweg bewusst abklettern', topic: 'Abklettern', format: 'drill', illustrationId: 'controlled-move', spraywall: true,
      goal: 'Für eine kurze Passage einen erreichbaren Rückweg vorhersehen und nutzen.',
      steps: ['Mit Hallenpersonal niedrige bekannte Passage und ausgewiesene Abklettergriffe prüfen.', 'Vom Boden Hand-/Fußkontakte für den Rückweg zeigen; vor dem Aufstieg klären.', 'Nur bis zum vereinbarten niedrigen Punkt klettern, dann kontrolliert Kontakt für Kontakt zurück.', 'Am Boden eine unklare Stelle besprechen und den Aufbau vereinfachen statt höher zu steigen.'],
      cues: ['Rückweg ist Teil der Aufgabe.', 'Zusätzliche Abklettergriffe dürfen helfen.'], mistakes: ['Erst oben nach einer Rücklösung suchen.', 'Abspringen zum Spielziel oder Zeitgewinn machen.'], easier: 'Nur einen niedrigen Schritt hin und zurück.', harder: 'Andere bekannte niedrige Passage mit gutem Rückweg prüfen.', selectionReason: 'Übt Rückwegplanung und kontrolliertes Zurückkehren; keine Fallschulung oder Landungsfreigabe.',
    },
    {
      id: 'pause-point-choice', title: 'Passende Zwischenposition finden', topic: 'Körperposition', format: 'drill', illustrationId: 'hip-position', spraywall: true,
      goal: 'Eine kurze passende Position zum Orientieren auswählen.',
      steps: ['Kurze vertraute Passage mit guten Kontakten und Rückweg wählen.', 'Vom Boden zwei mögliche Zwischenpositionen markieren.', 'Eine Position kurz zum Orientieren nutzen und weitergehen oder zurückkehren; keine Pflicht-Haltezeit.', 'Nach Pause die andere geeignete Position prüfen und den folgenden Zug vergleichen.'],
      cues: ['Pause hat einen Zweck.', 'Nicht länger halten, um zu gewinnen.'], mistakes: ['Eine Griffkraftprüfung aus dem Orientieren machen.', 'Jeden Stopp als schlechten Bewegungsfluss bewerten.'], easier: 'Nur eine geeignete Zwischenposition besprechen.', harder: 'Positionen an anderer leichter Sequenz auswählen.', selectionReason: 'Entscheidung über sinnvolle Pausen statt generellem Verbot aller Stopps.',
    },
    {
      id: 'movement-chunking', title: 'Teilsequenz statt ganzer Boulder', topic: 'Koordination', format: 'drill', illustrationId: 'controlled-move', spraywall: true,
      goal: 'Eine unklare Stelle in einen kurzen erreichbaren Bewegungsabschnitt zerlegen.',
      steps: ['Bekannte leichte Passage wählen und genau einen unklaren Übergang benennen.', 'Coach oder Hallenpersonal prüft direkt erreichbaren Einstieg und Rückweg für diesen Abschnitt.', 'Nur zwei bis drei kontrollierbare Bewegungen des Abschnitts ausführen; kein ungezähltes Projekten danach.', 'Am Boden den Übergang besprechen; nach Pause einen passenden Anschluss ergänzen oder den Abschnitt beibehalten.'],
      cues: ['Ein Übergang pro Lernblock.', 'Teilsequenz braucht einen eigenen Einstieg.'], mistakes: ['Zum Üben der Mitte ungeplant jedes Mal den ganzen Boulder klettern.', 'Eine unerreichbare Zwischenposition improvisieren.'], easier: 'Nur einen Übergang vom Boden erklären und probieren.', harder: 'Einmal mit einem passenden Anschluss verbinden, Umfang vorher festlegen.', selectionReason: 'Teilpraxis mit begrenztem Umfang; konkrete Lernwirkung dieses Rezepts ist nicht geprüft.',
    },
    {
      id: 'transfer-check', title: 'Ein Cue an einer neuen Passage', topic: 'Koordination', format: 'drill', illustrationId: 'controlled-move', spraywall: true,
      goal: 'Beobachten, ob ein zuvor verwendeter Hinweis bei einer neuen Aufgabe noch passt.',
      steps: ['Aus einer bekannten Aufgabe einen konkreten Cue auswählen, etwa Fuß setzen vor Lastwechsel.', 'Andere leichte kurze Passage mit passenden Kontakten und Rückweg prüfen.', 'Cue einmal erproben, ohne die alte Hand-/Fußfolge erzwingen zu müssen.', 'Beschreiben, was übernommen werden konnte und was die neue Passage anders verlangte.'],
      cues: ['Eine neue Aufgabe darf eine andere Lösung brauchen.', 'Beobachtung ist noch kein Transfernachweis.'], mistakes: ['Besseres Wiederholen am selben Boulder als Transfer zählen.', 'Eine vertraute Beta trotz unpassender Kontakte kopieren.'], easier: 'Sehr ähnliche kurze Passage wählen.', harder: 'Eine weitere passende Aufgabenvariation später prüfen, nicht sofort mehr Volumen anhängen.', selectionReason: 'Unterscheidet Wiederholung und neue Aufgabe; die App behauptet daraus keine gemessene motorische Verbesserung.',
    },
    {
      id: 'beta-model-compare', title: 'Eine Beta sehen, einen Hinweis wählen', topic: 'Boulder lesen', format: 'drill', illustrationId: 'read-boulder', spraywall: true,
      goal: 'Aus einer passenden Demonstration einen prüfbaren Hinweis für die eigene Lösung auswählen.', sources: [previewSource, ...motorSources],
      steps: ['Eigene Idee für eine bekannte leichte Passage mit Rückweg benennen.', 'Passende Demonstration oder Beta-Video ansehen; nur einen Hand-/Fuß-/Positionshinweis wählen.', 'Den Hinweis in einem kontrollierbaren Versuch prüfen und bei Bedarf an eigene Reichweite anpassen.', 'Nach Pause einen eigenen Vergleichsversuch planen; beschreiben, ob der Hinweis hier hilfreich war.'],
      cues: ['Eine Demonstration ist ein Vorschlag.', 'Nur ein Hinweis pro Vergleich.'], mistakes: ['Die gesamte Beta unabhängig von eigenen Voraussetzungen kopieren.', 'Eine erfolgreiche Ausführung als bewiesene Videowirkung zählen.'], easier: 'Coach demonstriert nur den ersten passenden Übergang.', harder: 'Zwei passende Modelle vom Boden vergleichen, dann einen Hinweis prüfen.', selectionReason: 'Nutzt die Beta-Funktion als konkrete Lernhilfe; begrenzte Previewforschung validiert dieses Apprezept nicht.',
    },
    {
      id: 'video-cue-check', title: 'Eigene Bewegung: eine Stelle ansehen', topic: 'Boulder lesen', format: 'drill', illustrationId: 'read-boulder', spraywall: true,
      goal: 'Eine eigene beobachtbare Bewegung beschreiben, bevor ein nächster Cue gewählt wird.',
      steps: ['Bekannte leichte kurze Passage und eine Frage festlegen, etwa wann ein Fuß belastet wird.', 'Eigenes vorhandenes Video nutzen oder von außerhalb des Kletter-/Landebereichs beobachten lassen.', 'Am Boden genau eine Stelle ansehen und sachlich beschreiben, ohne aus dem Bild Schmerz oder Defizite zu diagnostizieren.', 'Nach Pause einen passenden Cue in einem weiteren Versuch prüfen; zwei eigene Versuche genügen für diesen Block.'],
      cues: ['Beschreiben vor Bewerten.', 'Ein Bildwinkel kann Kontakte verdecken.'], mistakes: ['Aus einem Video eine Verletzungs- oder Kraftdiagnose ableiten.', 'Viele Fehler gleichzeitig korrigieren wollen.'], easier: 'Mit Beobachter nur den ersten Schritt besprechen.', harder: 'Eine zweite passende Perspektive später ergänzen; keine automatischen Techniknoten.', selectionReason: 'Strukturiert eigene Beobachtung und Gespräch; keine validierte automatische Bewegungsdiagnostik.',
    },
    {
      id: 'slab-weight-shift', title: 'Platte: zwischen Standpositionen wechseln', topic: 'Fußtechnik', format: 'drill', illustrationId: 'smearing', requiresCoach: true,
      goal: 'An geeigneter leichter Platte einen kontrollierten Gewichtswechsel zwischen zwei Tritten beobachten.',
      steps: ['Coach prüft leichte Platte, zwei passende Tritte, gute Hände und niedrigen Rückweg.', 'Beide Füße gezielt platzieren und eine beherrschte Ausgangsposition finden.', 'Gewicht schrittweise zu einem Fuß verlagern und die passende Handbewegung prüfen; kein absichtliches Abrutschen.', 'Zurückkehren und nach Pause die andere passende Standlösung vergleichen; kein maximal hoher Tritt.'],
      cues: ['Kontakt schrittweise belasten.', 'Wandwinkel und Trittform zählen zum Aufbau.'], mistakes: ['Beliebige Spraywall als passende Reibungsplatte behandeln.', 'Abrutschen zum Test oder Spielziel machen.'], easier: 'Große positive Tritte und nur kleiner Lastwechsel.', harder: 'Andere coachgeprüfte Trittanordnung bei gleicher kurzen Fragestellung.', selectionReason: 'Plattenspezifischer Wechsel zwischen Kontakten; keine universelle Vorgabe zu Fersenhöhe oder Wandnähe.',
    },
    {
      id: 'heel-hook-release', title: 'Heelhook: Unterstützung wechseln und lösen', topic: 'Hooks', format: 'drill', illustrationId: 'heel-hook', requiresCoach: true,
      level: 'Nach Hook-Einführung · vertraute Wandpraxis', goal: 'Den Übergang aus einem eingeführten Heelhook zu anderen tragenden Kontakten planen.',
      steps: ['Coach wählt bekannten niedrigen Heelhook mit angenehmer Knieposition, anderen Kontakten und Rückweg.', 'Vom Boden erklären, welcher Kontakt vor dem Lösen übernehmen soll.', 'Hook nur kontrolliert nutzen, nächste Unterstützung herstellen und erst dann die Ferse lösen.', 'Zurückkehren und die Übergangsreihenfolge besprechen; keine maximale Zugkraft oder veränderte Hookart testen.'],
      cues: ['Übernahme vor Lösen.', 'Toe Hook ist eine andere Einführung.'], mistakes: ['Hook lösen, bevor andere Kontakte tragen.', 'In rutschendem Hook stärker ziehen oder Knieposition erzwingen.'], easier: 'Coach zeigt den Übergang; nur aus unterstützter Position kennenlernen.', harder: 'Bekannten Übergang an anderer coachgeprüfter Anordnung betrachten.', selectionReason: 'Fokus auf den Ausstieg aus einer vertrauten Hookart; ergänzt das Setzen um geordneten Lastwechsel.',
    },
    {
      id: 'game-beta-detective', title: 'Beta-Detektiv', topic: 'Boulder lesen', format: 'game', illustrationId: 'read-boulder', spraywall: true,
      goal: 'Eine unsichere Bewegungsannahme finden und nach einem Versuch überprüfen.',
      steps: ['Allein oder zu zweit eine leichte kurze Passage mit Rückweg ansehen; jeweils eine unsichere Stelle nennen.', 'Vor dem eigenen Zug eine Vermutung formulieren, etwa welcher Fuß den nächsten Handzug vorbereitet.', 'Nacheinander kontrolliert ausprobieren; Beobachter bleibt außerhalb des Kletter-/Landebereichs.', 'Ein Detektivpunkt zählt für eine erklärte Bestätigung ODER begründete Änderung der Vermutung. Nach Pause ein zweiter eigener Zug; Tops und Tempo bringen keine Punkte.'],
      cues: ['Eine gute Korrektur zählt genauso.', 'Nur eine Person an der Passage.'], mistakes: ['Vermutung trotz unpassender Position erzwingen.', 'Punkte an Höhe oder Top knüpfen.'], easier: 'Nur den ersten Übergang untersuchen.', harder: 'Eine weniger offensichtliche Stelle an einer weiterhin leichten Passage auswählen.', selectionReason: 'Spielrahmen für Hypothesen und Reflexion; kein Wirksamkeitsnachweis eines Punktesystems.',
    },
    {
      id: 'game-foot-memory', title: 'Tritt-Memory mit offenen Augen', topic: 'Fußtechnik', format: 'game', illustrationId: 'quiet-feet', spraywall: true,
      goal: 'Eine kurze geplante Fußfolge erinnern und an reale Kontakte anpassen.',
      steps: ['Bis zu drei gut erreichbare Fußkontakte einer bekannten leichten Passage vom Boden auswählen.', 'Die Reihenfolge benennen; Hände, Zusatzkontakte und Rückweg bleiben verfügbar.', 'Mit offenen Augen klettern. Bei unpassender Folge darf korrigiert oder zurückgekehrt werden.', 'Am Boden geplante und tatsächliche Folge vergleichen: ein Punkt für einen erklärten Unterschied, nicht für blindes Festhalten am Plan. Nach Pause zweite eigene Runde.'],
      cues: ['Erinnern ergänzt Hinschauen.', 'Korrigieren gehört zum Spiel.'], mistakes: ['Augen schließen oder Tritte absichtlich verdecken.', 'Unpassende Fußfolge für einen Memorypunkt durchziehen.'], easier: 'Nur zwei Kontakte merken.', harder: 'Drei passende Kontakte an anderer leichter Passage wählen.', selectionReason: 'Kurze Vorschau und Erinnerung, ohne visuelle Kontrolle zu entfernen oder Übungsvolumen stetig zu erhöhen.',
    },
    {
      id: 'game-two-solutions', title: 'Zwei Lösungen gewinnen', topic: 'Körperposition', format: 'game', illustrationId: 'edge-choice', spraywall: true,
      goal: 'Für einen kurzen erreichbaren Übergang zwei unterschiedliche passende Lösungen beschreiben.',
      steps: ['Einen leichten Übergang mit mehreren guten Kontaktmöglichkeiten und Rückweg prüfen.', 'Erste eigene Lösung kontrolliert ausprobieren, dann vollständig zurückkehren.', 'Nach Pause eine wirklich andere passende Fuß-/Handfolge wählen; keine Pflicht zum Kontaktverzicht.', 'Gemeinsam gewonnen wird mit zwei beschriebenen Lösungen und einer beobachteten Unterschiedlichkeit. Ein Abbruch darf als Erkenntnis zählen; kein Lösungszwang.'],
      cues: ['Verschieden heißt nicht automatisch besser.', 'Alle nötigen Kontakte bleiben erlaubt.'], mistakes: ['Für die zweite Lösung gute Griffe künstlich verbieten.', 'Eine Lösung für alle Körpergrößen zum Sieger erklären.'], easier: 'Zwei Ideen vom Boden besprechen, nur eine ausprobieren.', harder: 'An anderer leichter Passage die Vielfalt der Optionen vergleichen.', selectionReason: 'Eigene Lösungsvielfalt statt Wettbewerb um Schwierigkeitsgrad; konkrete Spielwirkung nicht geprüft.',
    },
    {
      id: 'game-cue-bingo', title: 'Beobachtungs-Bingo', topic: 'Fußtechnik', format: 'game', illustrationId: 'controlled-move', spraywall: true,
      goal: 'Wenige konkret beobachtbare Handlungen gemeinsam erkennen.',
      steps: ['Zu zweit drei Bingo-Felder vereinbaren: Zieltritt ansehen, Fuß bewusst setzen, Rückweg nutzen.', 'Bekannte kurze leichte Passage und nur EIN Feld als persönlichen Hauptcue wählen.', 'Nacheinander je einen kontrollierten Versuch durchführen; Beobachter bleibt außerhalb des Landebereichs.', 'Am Boden beobachtete Felder abhaken und eine Beobachtung begründen. Nach Pause zweiter eigener Versuch; kein dritter Versuch nötig, um das Blatt vollzumachen.'],
      cues: ['Ein Hauptcue trotz drei Feldern.', 'Unklar gesehen ist ein gültiges Ergebnis.'], mistakes: ['Für ein vollständiges Bingo ungeplante Zusatzversuche sammeln.', 'Beobachtung mit einer objektiven Techniknote verwechseln.'], easier: 'Zwei Felder und sehr kurze Passage.', harder: 'Ein eigenes gut beobachtbares Feld ersetzen, nicht mehr Felder stapeln.', selectionReason: 'Spielerische Beobachterrolle mit begrenztem Umfang, keine automatische Bewertung der Bewegung.',
    },
    {
      id: 'game-mini-addon', title: 'Mini-Add-on: höchstens vier Bewegungen', topic: 'Koordination', format: 'game', illustrationId: 'controlled-move', equipment: 'Spraywall',
      goal: 'Eine gemeinsam gebaute kurze Bewegungsfolge nachvollziehen.',
      steps: ['Coach prüft niedrigen Spraywallstart, gute Kontakte und Rückweg; zwei Personen vereinbaren maximal vier Bewegungen.', 'Person A wählt zwei kontrollierbare Bewegungen, Person B ergänzt vom Boden genau eine passende Bewegung.', 'Nacheinander klettern; unpassende Ergänzung wird ersetzt, alle nötigen Zusatzkontakte bleiben erlaubt.', 'Nach Pause höchstens einen zweiten eigenen Spielzug mit maximal vier Bewegungen. Dann endet die Runde, auch wenn weitere Züge möglich wären.'],
      cues: ['Wachsen bis vier, dann Schluss.', 'Eine Ergänzung darf abgelehnt werden.'], mistakes: ['Die Kette bis zur Erschöpfung verlängern.', 'Eine Partnerbewegung unabhängig von eigener Reichweite kopieren.'], easier: 'Zwei Bewegungen beibehalten.', harder: 'Andere kurze bekannte Folge entwerfen; keine größere Kette.', requiresCoach: true, selectionReason: 'Begrenzte kooperative Add-on-Variante; kein Ausdauer-, Maximal- oder Wettkampfspiel.',
    },
    {
      id: 'game-spraywall-designer', title: 'Spraywall-Werkstatt', topic: 'Boulder lesen', format: 'game', illustrationId: 'read-boulder', equipment: 'Spraywall',
      goal: 'Eine kurze passende Passage für eine andere Person entwerfen und gemeinsam anpassen.',
      steps: ['Zu zweit mit Halleneinweisung einen niedrigen Start, gute Hand-/Fußkontakte und Rückweg prüfen; Griffe nicht versetzen.', 'Designer zeigt vom Boden zwei bis vier erreichbare Bewegungen und fragt nach passenden Reichweiten.', 'Partner probiert kontrolliert; Zusatzkontakte, Änderungen und Zurückkehren sind erlaubt.', 'Am Boden eine hilfreiche Änderung erklären. Rollen wechseln; maximal zwei eigene kurze Versuche pro Person, Aufbauzeit kann die gemeinsame Runde verlängern.'],
      cues: ['Passend für die andere Person entwerfen.', 'Gezeigt, nicht neu geschraubt.'], mistakes: ['Eigene Reichweite zum verpflichtenden Maß machen.', 'Griffe verändern oder andere Boulderbereiche blockieren.'], easier: 'Nur zwei Bewegungen mit sehr guten Kontakten.', harder: 'Ein neues Bewegungsproblem wählen, weiterhin kurz und kontrollierbar.', selectionReason: 'Lernt Aufgabenaufbau und Perspektivwechsel an vorhandenen Griffen; keine Routenbau- oder Schwierigkeitsgradvalidierung.',
    },
    {
      id: 'game-observer-interview', title: 'Eine Frage nach dem Versuch', topic: 'Boulder lesen', format: 'game', illustrationId: 'read-boulder', spraywall: true,
      goal: 'Eine beobachtete Entscheidung durch eine offene Frage verstehen.',
      steps: ['Zu zweit bekannte leichte Passage wählen; Beobachterposition außerhalb von Wand-/Landebereich festlegen.', 'Kletternde Person wählt einen kontrollierbaren kurzen Versuch, Beobachter sammelt genau eine sachliche Frage.', 'Erst am Boden fragen, etwa „Woran hast du den nächsten Tritt erkannt?“; nicht während des Zugs Kommandos geben.', 'Antwort gemeinsam klären und Rollen wechseln. Je Person nach Pause ein zweiter eigener Versuch möglich; das Ziel ist eine verständliche Entscheidung, kein Top.'],
      cues: ['Frage statt ungefragter Fehlerliste.', 'Erst am Boden sprechen.'], mistakes: ['Während unsicherer Bewegung Anweisungen hineinrufen.', 'Aus einer Antwort eine Diagnose ableiten.'], easier: 'Frage nur zum ersten Fußkontakt stellen.', harder: 'Eine Entscheidung an einer anderen leichten Passage besprechen.', selectionReason: 'Kooperativer Gesprächsrahmen statt fortlaufender Technikkommandos; keine Studie dieses Formats.',
    },
    {
      id: 'game-colour-journey', title: 'Farbreise an der Spraywall', topic: 'Koordination', format: 'game', illustrationId: 'read-boulder', equipment: 'Spraywall',
      goal: 'Eine sichtbare Kontaktfolge lesen und sinnvoll verbinden.',
      steps: ['Zwei gut erreichbare große Handgriffe unterschiedlicher Farben in niedriger kurzer Passage auswählen; Fußkontakte und Rückweg prüfen.', 'Eine kurze Farbreihenfolge vereinbaren; es bleiben alle nötigen Zusatzgriffe und Tritte erlaubt.', 'Kontrolliert zu den Zielkontakten gehen, ohne einen fehlenden Kontakt zu überspringen oder zu springen.', 'Am Boden eine passende Verbindung erklären. Nach Pause Farben oder Reihenfolge nur ändern, wenn der neue Aufbau wieder passt; zwei eigene Spielzüge genügen.'],
      cues: ['Zielkontakte ergänzen, Unterstützung nicht verbieten.', 'Keine Jagd nach allen Farben.'], mistakes: ['Notwendige Unterstützung für eine Farbregel weglassen.', 'Entfernten Griff nur wegen seiner Farbe erreichen wollen.'], easier: 'Nur einen Zielkontakt vereinbaren.', harder: 'Zwei andere passende Zielkontakte wählen, keine längere Farbfolge.', selectionReason: 'Positives Kontaktziel an der Spraywall statt Griffverboten; keine Reaktions- oder Schnelligkeitsprüfung.',
    },
    {
      id: 'game-observation-guess', title: 'Welchen Cue habe ich gewählt?', topic: 'Fußtechnik', format: 'game', illustrationId: 'quiet-feet', spraywall: true,
      goal: 'Einen bewusst gewählten sichtbaren Fokus beobachten und anschließend besprechen.',
      steps: ['Zu zweit bekannte kurze leichte Passage prüfen und zwei sichtbare Cues vereinbaren: Zieltritt ansehen oder Fuß bewusst setzen.', 'Kletternde Person wählt vor dem Versuch einen Cue; Blick und normale Unterstützung bleiben uneingeschränkt.', 'Beobachter sieht von außerhalb des Landebereichs zu; keine überraschenden Aufgaben während des Kletterns.', 'Am Boden den vermuteten Cue nennen und eine Beobachtung erklären; richtiges Raten ist optional. Nach Pause Rollen wechseln und maximal zwei eigene Versuche pro Person.'],
      cues: ['Erklären zählt mehr als richtig raten.', 'Unklar gesehen darf gesagt werden.'], mistakes: ['Bewegung überzeichnen oder Kontrolle aufgeben, damit der Cue erraten wird.', 'Wahrnehmung der anderen Person als Technikmessung behandeln.'], easier: 'Cue vorher offen sagen.', harder: 'Einen anderen klar beobachtbaren Cue wählen, keine versteckten Risikoaufgaben.', selectionReason: 'Spielerische Aufmerksamkeits- und Beobachteraufgabe mit offener Kontrolle; kein diagnostisches Verfahren.',
    },
    {
      id: 'game-beta-exchange', title: 'Beta-Tausch mit eigener Anpassung', topic: 'Körperposition', format: 'game', illustrationId: 'hip-position', spraywall: true,
      goal: 'Eine Partneridee verstehen und für die eigene Reichweite anpassen.',
      steps: ['Zwei Personen wählen bekannte leichte kurze Passage mit mehreren guten Optionen und Rückweg.', 'Beide erklären vom Boden eine passende eigene Lösung; Unterschiede der Reichweite dürfen benannt werden.', 'Nacheinander einen hilfreichen Hinweis der anderen Person ausprobieren, ohne deren gesamte Kontaktfolge kopieren zu müssen.', 'Am Boden je eine beibehaltene und eine angepasste Idee nennen. Nach Pause höchstens ein zweiter eigener Versuch; gewonnen wird gemeinsam mit verständlichen Anpassungen.'],
      cues: ['Ein Hinweis kann passen, die ganze Beta nicht.', 'Anpassen gehört zum Gewinn.'], mistakes: ['Partnerbewegung trotz unpassender Reichweite erzwingen.', 'Körperunterschiede als Leistungsdefizit bewerten.'], easier: 'Nur eine Fußidee austauschen und vom Boden besprechen.', harder: 'An anderer leichter Passage prüfen, welche Idee erneut passt.', selectionReason: 'Perspektivwechsel zwischen unterschiedlichen Lösungen; keine universelle Beta und kein bewiesener Trainingseffekt des Spiels.',
    },
  ];
  return recipes.map(({ spraywall, ...recipe }) => ({
    ...recipe, area: 'boulder', equipment: recipe.equipment ?? 'Boulderwand', level: recipe.level ?? 'Einsteiger bis Fortgeschrittene · passende leichte Passage',
    alternativeEquipment: spraywall && recipe.equipment !== 'Spraywall' ? ['Spraywall'] : undefined,
    minutes: 0, defaultDose: { ...learningDose, secondsPerRepetition: recipe.format === 'game' ? 120 : 90 },
    dose: recipe.format === 'game' ? 'Redaktioneller Spielblock: 1 Block · 2 eigene kurze Spielzüge pro Person. Ein eigener Spielzug zählt als ein Versuch; kein Pflicht-Top. Gruppen-/Aufbauzeit kann länger sein.' : 'Redaktioneller Lernblock: 1 Block · 2 eigene kurze Versuche an passender Passage; ein Hauptcue.',
    rest: 'Etwa 90 Sekunden zwischen eigenen Versuchen; länger, wenn Kontrolle oder Bereitschaft noch nicht zurückkehrt.',
    note: `Regeln und Dosierung sind redaktionelle Entwürfe und noch nicht fachlich freigegeben. Die Motorikforschung validiert nicht dieses einzelne Rezept. ${recipe.format === 'game' ? 'Nur eine Person an der Passage; Beobachter außerhalb von Kletter- und Landebereich. Zeitwert gilt pro trainierende Person, zusätzliche Gruppenwartezeit bleibt offen. ' : ''}Passage, Kontakthöhe und Rückweg vor Ort prüfen; Lernaufgabe bedeutet keine geringe Fingerlast. Bei neuem oder zunehmendem Schmerz, Funktions- oder Kontrollverlust beenden.`,
    setupRequirements: ['Geeignete Hallen-/Bewegungseinweisung; kurze kontrollierbare Passage mit guten Kontakten', 'Niedriger erreichbarer Einstieg, geklärter Rückweg und freier Kletter-/Landebereich', ...(recipe.requiresCoach ? ['Coach prüft den spezifischen Aufbau vor dem ersten Versuch'] : [])],
    keywords: [recipe.title, recipe.topic, recipe.format === 'game' ? 'Spiel spielerisch kooperativ' : 'Übung Lernaufgabe', 'bouldern', ...(spraywall ? ['spraywall'] : [])],
    sources: recipe.sources ?? motorSources, contentKind: 'exercise', planEligible: false,
  }));
}
