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
      goal: 'Zwei Startpositionen vergleichen.',
      steps: ['Leichten niedrigen Start mit guten Griffen und Rückweg wählen. Startregeln beachten.', 'Vom Boden zwei mögliche Fußstellungen überlegen.', 'Mit der ersten Stellung nur den ersten Zug probieren und zurückkehren.', 'Nach Pause die zweite Stellung probieren: Welche erleichtert den Start?'],
      cues: ['Nur den ersten Zug vergleichen.', 'Passende Kontakte vor dem Start wählen.'], mistakes: ['Unpassende Startkontakte für eine vermeintlich richtige Beta erzwingen.', 'Aus dem Start einen Sprungversuch machen.'], easier: 'Positionen vom Boden besprechen und nur eine erproben.', harder: 'An anderem geeigneten Start die eigene Entscheidung erneut prüfen.', selectionReason: 'Für Schwierigkeiten direkt am Einstieg; trennt Startentscheidung vom übrigen Boulder.',
    },
    {
      id: 'sidepull-lab', title: 'Seitgriff: Zugrichtung erkunden', topic: 'Grifftechnik', format: 'drill', illustrationId: 'sidepull-lab', requiresCoach: true,
      level: 'Nach Einführung · vertraute Wandpraxis', goal: 'Seitgriff und Körperposition aufeinander abstimmen.',
      steps: ['Coach wählt einen großen Seitgriff, gute Tritte und zusätzliche Handunterstützung.', 'Seitliche Griffkante fassen. Handgelenk bequem halten.', 'Mit umgesetzten Füßen zwei kleine Standpositionen probieren. Nicht maximal ziehen.', 'Kontrolliert zurückkehren: Welche Position erleichtert den nächsten Zug?'],
      cues: ['Seitlich ziehen, passenden Stand finden.', 'Nicht stärker ziehen, wenn die Position nicht passt.'], mistakes: ['Mehr ziehen, obwohl die Position nicht passt.', 'Handgelenk oder Schulter in eine erzwungene Richtung bringen.'], easier: 'Coach demonstriert; Position nur vom Boden beschreiben.', harder: 'Anderen geeigneten Seitgriff mit gleicher Fragestellung wählen.', selectionReason: 'Grifforientierung statt pauschaler Wandnähe; kein isoliertes Fingerkraftrezept.',
    },
    {
      id: 'undercling-lab', title: 'Untergriff: Abstand und Fußdruck', topic: 'Grifftechnik', format: 'drill', illustrationId: 'undercling-lab', requiresCoach: true,
      level: 'Nach Einführung · vertraute Wandpraxis', goal: 'Bei einem Untergriff eine passende Standposition finden.',
      steps: ['Coach wählt niedrigen Untergriff, gute Tritte und Handunterstützung.', 'Mit nach oben gerichteter Handfläche unter den Griff fassen. Schulter und Handgelenk bleiben bequem.', 'Füße umsetzen und einen kleinen Standwechsel probieren. Nur einen kurzen kontrollierten Zug machen.', 'Zurückkehren und vergleichen: Welcher Abstand zum Griff hat gepasst?'],
      cues: ['Unter den Griff fassen.', 'Füße bei einem Standwechsel umsetzen.'], mistakes: ['Griffhöhe unabhängig von Körpermaßen erzwingen.', 'Am Handgelenk ziehen oder an einem ungeklärten Untergriff hängen.'], easier: 'Position und Zugrichtung vom Boden kennenlernen.', harder: 'An anderem coachgeprüften Untergriff übertragen.', selectionReason: 'Spezifische Griffrichtung und Standwahl; ersetzt keine allgemeine Fingerlaststeuerung.',
    },
    {
      id: 'hand-match-order', title: 'Hände matchen: Reihenfolge planen', topic: 'Grifftechnik', format: 'drill', illustrationId: 'hand-match-order', spraywall: true,
      goal: 'Beide Hände auf einen Griff setzen und den nächsten Zug vorbereiten.',
      steps: ['Breiten Griff wählen, der Platz für beide Hände bietet. Gute Fußkontakte und Rückweg prüfen.', 'Überlegen: Welche Hand kommt zuerst auf den Griff, welche zieht danach weiter?', 'Hände nacheinander nebeneinander setzen. Bei Platzmangel zurückkehren.', 'Nach Pause eine andere passende Reihenfolge probieren und den Folgezug vergleichen.'],
      cues: ['Matchen heißt: beide Hände an einem Griff.', 'Erst Platz und Unterstützung prüfen.'], mistakes: ['Beide Hände gleichzeitig ohne passende Unterstützung lösen.', 'Auf engem Griff eine verpflichtende Matchlösung erzwingen.'], easier: 'Sehr breiten Griff wählen oder nur die Reihenfolge zeigen.', harder: 'Reihenfolge an einer anderen kurzen passenden Sequenz planen.', selectionReason: 'Handorganisation an einem gemeinsamen Griff; anderer Fokus als Fußwechsel.',
    },
    {
      id: 'flagging-basics', title: 'Freies Bein als Positionshilfe', topic: 'Körperposition', format: 'drill', illustrationId: 'flagging-basics', requiresCoach: true, spraywall: true,
      goal: 'Ein freies Bein als Hilfe für die Körperposition ausprobieren.',
      steps: ['Coach wählt niedrige Position mit guten Händen, tragendem Standfuß und Rückweg.', 'Die Bewegung zuerst mit beiden Füßen auf Tritten probieren.', 'Nach Aufbauprüfung ein Bein ruhig seitlich ausstrecken. Nicht pendeln oder absichtlich wegkippen.', 'Zurückkehren: War der nächste Griff mit dem freien Bein leichter erreichbar?'],
      cues: ['Flagging: freies Bein seitlich als Gegengewicht.', 'Der Standfuß und die Hände tragen.'], mistakes: ['Ein Bein unabhängig von der Aufgabe zwanghaft lösen.', 'Wegkippen als Spielregel zulassen.'], easier: 'Bewegung demonstrieren lassen, beide Füße auf Tritten behalten.', harder: 'Anderen kurzen Zug unter gleicher Aufbauprüfung vergleichen.', selectionReason: 'Einführung in eine freie Beinposition; keine universelle Lösung für Seitenzüge.',
    },
    {
      id: 'foot-unloading', title: 'Einen Fuß kontrolliert entlasten', topic: 'Fußtechnik', format: 'drill', illustrationId: 'quiet-feet', spraywall: true,
      goal: 'Einen Fuß vor dem Umsetzen entlasten.',
      steps: ['Niedrige Position mit guten Händen und zwei großen Tritten wählen.', 'Entscheiden, welcher Fuß weitergehen soll. Andere Kontakte bleiben tragend.', 'Gewicht verlagern, dann den entlasteten Fuß umsetzen.', 'Zurückkehren: Woran hast du gemerkt, dass der Fuß frei war?'],
      cues: ['Erst entlasten, dann umsetzen.', 'Nicht beide Füße gleichzeitig lösen.'], mistakes: ['Am belasteten Schuh gegen den Tritt drehen.', 'Für den Test beide Füße gleichzeitig wegnehmen.'], easier: 'Nur Lastwechsel ohne Fußlösen beobachten.', harder: 'Den Lastwechsel vor einem anderen bekannten Zug prüfen.', selectionReason: 'Gezielte Vorbereitung eines Schritts; ergänzt Platzierung um das kontrollierte Entlasten.',
    },
    {
      id: 'downclimb-path', title: 'Rückweg bewusst abklettern', topic: 'Abklettern', format: 'drill', illustrationId: 'controlled-move', spraywall: true,
      goal: 'Den Rückweg planen und kontrolliert abklettern.',
      steps: ['Mit Hallenpersonal eine niedrige Passage und passende Abklettergriffe wählen.', 'Vom Boden die Hand- und Fußkontakte für den Rückweg zeigen.', 'Nur bis zum vereinbarten Punkt klettern und Kontakt für Kontakt zurückkehren.', 'Unklare Stelle am Boden besprechen. Lieber den Weg vereinfachen als höher klettern.'],
      cues: ['Rückweg vor dem Start kennen.', 'Abklettergriffe dürfen helfen.'], mistakes: ['Erst oben nach einer Rücklösung suchen.', 'Abspringen zum Spielziel oder Zeitgewinn machen.'], easier: 'Nur einen niedrigen Schritt hin und zurück.', harder: 'Andere bekannte niedrige Passage mit gutem Rückweg prüfen.', selectionReason: 'Übt Rückwegplanung und kontrolliertes Zurückkehren; keine Fallschulung oder Landungsfreigabe.',
    },
    {
      id: 'pause-point-choice', title: 'Passende Zwischenposition finden', topic: 'Körperposition', format: 'drill', illustrationId: 'hip-position', spraywall: true,
      goal: 'Eine passende kurze Zwischenposition zum Orientieren finden.',
      steps: ['Leichte bekannte Passage mit guten Kontakten und Rückweg wählen.', 'Zwei mögliche Zwischenpositionen vom Boden zeigen.', 'In der ersten Position kurz orientieren, dann weiterklettern oder zurückkehren. Keine feste Haltezeit.', 'Nach Pause die zweite Position vergleichen: Wo ließ sich der nächste Zug besser planen?'],
      cues: ['Nur so lange stoppen, wie du es brauchst.', 'Kein Wettkampf im langen Hängen.'], mistakes: ['Eine Griffkraftprüfung aus dem Orientieren machen.', 'Jeden Stopp als schlechten Bewegungsfluss bewerten.'], easier: 'Nur eine geeignete Zwischenposition besprechen.', harder: 'Positionen an anderer leichter Sequenz auswählen.', selectionReason: 'Entscheidung über sinnvolle Pausen statt generellem Verbot aller Stopps.',
    },
    {
      id: 'movement-chunking', title: 'Teilsequenz statt ganzer Boulder', topic: 'Koordination', format: 'drill', illustrationId: 'controlled-move', spraywall: true,
      goal: 'Eine unklare Bewegung einzeln üben.',
      steps: ['In einer leichten Passage genau einen unklaren Übergang auswählen.', 'Coach oder Hallenpersonal prüft erreichbaren Einstieg und Rückweg für diesen Abschnitt.', 'Nur zwei bis drei Bewegungen des Abschnitts probieren und zurückkehren.', 'Nach Pause entscheiden: Abschnitt wiederholen oder einen passenden Anschluss ergänzen.'],
      cues: ['Ein Übergang auf einmal.', 'Den Teilabschnitt kontrolliert erreichen und verlassen.'], mistakes: ['Zum Üben der Mitte ungeplant jedes Mal den ganzen Boulder klettern.', 'Eine unerreichbare Zwischenposition improvisieren.'], easier: 'Nur einen Übergang vom Boden erklären und probieren.', harder: 'Einmal mit einem passenden Anschluss verbinden, Umfang vorher festlegen.', selectionReason: 'Teilpraxis mit begrenztem Umfang; konkrete Lernwirkung dieses Rezepts ist nicht geprüft.',
    },
    {
      id: 'transfer-check', title: 'Einen Hinweis an neuer Passage testen', topic: 'Koordination', format: 'drill', illustrationId: 'controlled-move', spraywall: true,
      goal: 'Prüfen, ob ein bekannter Bewegungshinweis auch anderswo hilft.',
      steps: ['Einen Hinweis wählen, etwa: erst Fuß setzen, dann belasten.', 'Andere kurze leichte Passage mit guten Kontakten und Rückweg prüfen.', 'Den Hinweis ausprobieren. Die alte Hand- und Fußfolge muss nicht passen.', 'Am Boden nennen: Was hat geholfen, was musste anders sein?'],
      cues: ['Gleicher Hinweis, neue Aufgabe.', 'Eine andere Lösung ist erlaubt.'], mistakes: ['Besseres Wiederholen am selben Boulder als Transfer zählen.', 'Eine vertraute Beta trotz unpassender Kontakte kopieren.'], easier: 'Sehr ähnliche kurze Passage wählen.', harder: 'Eine weitere passende Aufgabenvariation später prüfen, nicht sofort mehr Volumen anhängen.', selectionReason: 'Unterscheidet Wiederholung und neue Aufgabe; die App behauptet daraus keine gemessene motorische Verbesserung.',
    },
    {
      id: 'beta-model-compare', title: 'Eine Beta sehen, einen Hinweis wählen', topic: 'Boulder lesen', format: 'drill', illustrationId: 'read-boulder', spraywall: true,
      goal: 'Aus einer vorgeführten Lösung einen hilfreichen Hinweis auswählen.', sources: [previewSource, ...motorSources],
      steps: ['Für eine leichte Passage zuerst eine eigene Idee überlegen. Rückweg prüfen.', 'Demonstration oder Beta-Video ansehen. Nur einen Hinweis zu Händen, Füßen oder Körperposition wählen.', 'Den Hinweis probieren und an deine Reichweite anpassen.', 'Nach Pause vergleichen: Hat der Hinweis hier geholfen?'],
      cues: ['Beta heißt: eine mögliche Lösung.', 'Nur einen Hinweis auf einmal prüfen.'], mistakes: ['Die gesamte Beta unabhängig von eigenen Voraussetzungen kopieren.', 'Eine erfolgreiche Ausführung als bewiesene Videowirkung zählen.'], easier: 'Coach demonstriert nur den ersten passenden Übergang.', harder: 'Zwei passende Modelle vom Boden vergleichen, dann einen Hinweis prüfen.', selectionReason: 'Nutzt die Beta-Funktion als konkrete Lernhilfe; begrenzte Previewforschung validiert dieses Apprezept nicht.',
    },
    {
      id: 'video-cue-check', title: 'Eigene Bewegung: eine Stelle ansehen', topic: 'Boulder lesen', format: 'drill', illustrationId: 'read-boulder', spraywall: true,
      goal: 'In deiner Bewegung eine konkrete Stelle ansehen.',
      steps: ['An einer leichten Passage eine Frage wählen, etwa: Wann belaste ich den Fuß?', 'Eigenes vorhandenes Video nutzen oder von außerhalb des Fallbereichs beobachten lassen.', 'Am Boden eine Stelle beschreiben: Was machen Fuß und Hand? Verdeckte Kontakte nicht erraten.', 'Nach Pause einen passenden Hinweis in einem zweiten Versuch ausprobieren.'],
      cues: ['Erst beschreiben, dann eine Sache ändern.', 'Ein Video zeigt keine Schmerz- oder Kraftdiagnose.'], mistakes: ['Aus einem Video eine Verletzungs- oder Kraftdiagnose ableiten.', 'Viele Fehler gleichzeitig korrigieren wollen.'], easier: 'Mit Beobachter nur den ersten Schritt besprechen.', harder: 'Eine zweite passende Perspektive später ergänzen; keine automatischen Techniknoten.', selectionReason: 'Strukturiert eigene Beobachtung und Gespräch; keine validierte automatische Bewegungsdiagnostik.',
    },
    {
      id: 'slab-weight-shift', title: 'Platte: zwischen Standpositionen wechseln', topic: 'Fußtechnik', format: 'drill', illustrationId: 'smearing', requiresCoach: true,
      goal: 'An einer Platte das Gewicht zwischen zwei Tritten verlagern.',
      steps: ['Coach wählt leichte Platte, zwei passende Tritte, gute Hände und niedrigen Rückweg.', 'Beide Füße gezielt aufsetzen.', 'Gewicht langsam zu einem Fuß verlagern und einen passenden kurzen Handzug probieren.', 'Zurückkehren und nach Pause die andere Standposition vergleichen. Nicht absichtlich abrutschen.'],
      cues: ['Kontakt langsam belasten.', 'Eine passende Platte ist nötig.'], mistakes: ['Beliebige Spraywall als passende Reibungsplatte behandeln.', 'Abrutschen zum Test oder Spielziel machen.'], easier: 'Große positive Tritte und nur kleiner Lastwechsel.', harder: 'Andere coachgeprüfte Trittanordnung bei gleicher kurzen Fragestellung.', selectionReason: 'Plattenspezifischer Wechsel zwischen Kontakten; keine universelle Vorgabe zu Fersenhöhe oder Wandnähe.',
    },
    {
      id: 'heel-hook-release', title: 'Heelhook: Unterstützung wechseln und lösen', topic: 'Hooks', format: 'drill', illustrationId: 'heel-hook', requiresCoach: true,
      level: 'Nach Hook-Einführung · vertraute Wandpraxis', goal: 'Vom Heelhook kontrolliert auf andere Kontakte wechseln.',
      steps: ['Coach wählt einen bereits bekannten niedrigen Heelhook und den Rückweg.', 'Vom Boden zeigen, welcher Kontakt vor dem Lösen übernehmen soll.', 'Nächste tragende Kontakte herstellen, erst danach die Ferse lösen.', 'Zurückkehren und die Reihenfolge besprechen. Keine andere Hookart oder maximale Zugkraft testen.'],
      cues: ['Andere Unterstützung vor dem Lösen.', 'Toe Hook ist eine eigene Technik.'], mistakes: ['Hook lösen, bevor andere Kontakte tragen.', 'In rutschendem Hook stärker ziehen oder Knieposition erzwingen.'], easier: 'Coach zeigt den Übergang; nur aus unterstützter Position kennenlernen.', harder: 'Bekannten Übergang an anderer coachgeprüfter Anordnung betrachten.', selectionReason: 'Fokus auf den Ausstieg aus einer vertrauten Hookart; ergänzt das Setzen um geordneten Lastwechsel.',
    },
    {
      id: 'game-beta-detective', title: 'Beta-Detektiv', topic: 'Boulder lesen', format: 'game', illustrationId: 'read-boulder', spraywall: true,
      goal: 'Eine Vermutung über die nächste Bewegung überprüfen.',
      steps: ['Allein oder zu zweit eine leichte Passage wählen. Eine unklare Bewegung benennen.', 'Vorhersagen, welcher Fuß den nächsten Handzug erleichtert.', 'Nacheinander probieren. Beobachtende warten außerhalb des Fallbereichs.', 'Ein Punkt für eine erklärte Bestätigung oder Änderung. Nach Pause zweite Runde; Tempo und Tops zählen nicht.'],
      cues: ['Eine begründete Änderung zählt auch.', 'Nur eine Person an der Passage.'], mistakes: ['Vermutung trotz unpassender Position erzwingen.', 'Punkte an Höhe oder Top knüpfen.'], easier: 'Nur den ersten Übergang untersuchen.', harder: 'Eine weniger offensichtliche Stelle an einer weiterhin leichten Passage auswählen.', selectionReason: 'Spielrahmen für Hypothesen und Reflexion; kein Wirksamkeitsnachweis eines Punktesystems.',
    },
    {
      id: 'game-foot-memory', title: 'Tritt-Memory mit offenen Augen', topic: 'Fußtechnik', format: 'game', illustrationId: 'quiet-feet', spraywall: true,
      goal: 'Eine kurze Fußfolge merken und ausprobieren.',
      steps: ['An einer leichten Passage bis zu drei erreichbare Tritte und Rückweg wählen.', 'Trittreihenfolge vom Boden nennen. Gute Hand- und Zusatzkontakte bleiben erlaubt.', 'Mit offenen Augen probieren. Bei unpassender Folge korrigieren oder zurückkehren.', 'Am Boden vergleichen: ein Punkt für eine erklärte Übereinstimmung oder hilfreiche Korrektur. Nach Pause zweite Runde.'],
      cues: ['Merken und Hinschauen gehören zusammen.', 'Keinen unpassenden Plan erzwingen.'], mistakes: ['Augen schließen oder Tritte absichtlich verdecken.', 'Unpassende Fußfolge für einen Memorypunkt durchziehen.'], easier: 'Nur zwei Kontakte merken.', harder: 'Drei passende Kontakte an anderer leichter Passage wählen.', selectionReason: 'Kurze Vorschau und Erinnerung, ohne visuelle Kontrolle zu entfernen oder Übungsvolumen stetig zu erhöhen.',
    },
    {
      id: 'game-two-solutions', title: 'Zwei Lösungen gewinnen', topic: 'Körperposition', format: 'game', illustrationId: 'hip-position', spraywall: true,
      goal: 'Gemeinsam zwei passende Lösungen für eine Bewegung finden.',
      steps: ['Leichten Übergang mit mehreren guten Kontakten und Rückweg wählen.', 'Erste Lösung probieren und vollständig zurückkehren.', 'Nach Pause eine andere passende Fuß- oder Handfolge probieren. Keine nötigen Kontakte verbieten.', 'Gemeinsam gewonnen: zwei Lösungen und ein erklärter Unterschied. Bei Abbruch gibt es keinen Lösungszwang.'],
      cues: ['Verschiedene Lösungen dürfen beide passen.', 'Unterschiede besprechen statt Rangliste.'], mistakes: ['Für die zweite Lösung gute Griffe künstlich verbieten.', 'Eine Lösung für alle Körpergrößen zum Sieger erklären.'], easier: 'Zwei Ideen vom Boden besprechen, nur eine ausprobieren.', harder: 'An anderer leichter Passage die Vielfalt der Optionen vergleichen.', selectionReason: 'Eigene Lösungsvielfalt statt Wettbewerb um Schwierigkeitsgrad; konkrete Spielwirkung nicht geprüft.',
    },
    {
      id: 'game-cue-bingo', title: 'Beobachtungs-Bingo', topic: 'Fußtechnik', format: 'game', illustrationId: 'controlled-move', spraywall: true,
      goal: 'Drei klare Handlungen beobachten.',
      steps: ['Zu zweit drei Felder wählen: Tritt ansehen, Fuß setzen, Rückweg nutzen.', 'Leichte Passage wählen. Für den eigenen Versuch nur auf eines der Felder achten.', 'Nacheinander probieren; Beobachtende bleiben außerhalb des Fallbereichs.', 'Am Boden gesehene Felder nennen. Nach Pause zweite Runde; kein Zusatzversuch für ein volles Bingo.'],
      cues: ['Ein persönlicher Fokus reicht.', 'Nicht klar gesehen darf offen bleiben.'], mistakes: ['Für ein vollständiges Bingo ungeplante Zusatzversuche sammeln.', 'Beobachtung mit einer objektiven Techniknote verwechseln.'], easier: 'Zwei Felder und sehr kurze Passage.', harder: 'Ein eigenes gut beobachtbares Feld ersetzen, nicht mehr Felder stapeln.', selectionReason: 'Spielerische Beobachterrolle mit begrenztem Umfang, keine automatische Bewertung der Bewegung.',
    },
    {
      id: 'game-mini-addon', title: 'Mini-Add-on: höchstens vier Bewegungen', topic: 'Koordination', format: 'game', illustrationId: 'controlled-move', equipment: 'Spraywall',
      goal: 'Eine kurze Folge gemeinsam um eine Bewegung erweitern.',
      steps: ['Coach prüft niedrigen Spraywallstart und Rückweg. Die Folge endet spätestens bei vier Bewegungen.', 'Person A wählt zwei Bewegungen; B ergänzt vom Boden eine passende dritte.', 'Nacheinander probieren. Unpassende Ergänzung ersetzen; hilfreiche Zusatzkontakte sind erlaubt.', 'Nach Pause zweite Runde: eine passende vierte Bewegung ergänzen. Danach endet die Folge.'],
      cues: ['Zwei → drei → höchstens vier Bewegungen.', 'Eine unpassende Ergänzung ersetzen.'], mistakes: ['Die Kette bis zur Erschöpfung verlängern.', 'Eine Partnerbewegung unabhängig von eigener Reichweite kopieren.'], easier: 'Zwei Bewegungen beibehalten.', harder: 'Andere kurze bekannte Folge entwerfen; keine größere Kette.', requiresCoach: true, selectionReason: 'Begrenzte kooperative Add-on-Variante; kein Ausdauer-, Maximal- oder Wettkampfspiel.',
    },
    {
      id: 'game-spraywall-designer', title: 'Spraywall-Werkstatt', topic: 'Boulder lesen', format: 'game', illustrationId: 'read-boulder', equipment: 'Spraywall',
      goal: 'Eine kurze Folge für die andere Person entwerfen.',
      steps: ['Mit Halleneinweisung niedrigen Start, gute Kontakte und Rückweg prüfen. Keine Griffe versetzen.', 'Vom Boden zwei bis vier erreichbare Bewegungen vorschlagen. Die andere Person darf ändern.', 'Nacheinander probieren und kontrolliert zurückkehren. Zusatzkontakte bleiben erlaubt.', 'Eine hilfreiche Änderung nennen und Rollen wechseln. Höchstens zwei eigene Versuche je Person.'],
      cues: ['Für die andere Reichweite planen.', 'Ideen ändern, keine Griffe schrauben.'], mistakes: ['Eigene Reichweite zum verpflichtenden Maß machen.', 'Griffe verändern oder andere Boulderbereiche blockieren.'], easier: 'Nur zwei Bewegungen mit sehr guten Kontakten.', harder: 'Ein neues Bewegungsproblem wählen, weiterhin kurz und kontrollierbar.', selectionReason: 'Lernt Aufgabenaufbau und Perspektivwechsel an vorhandenen Griffen; keine Routenbau- oder Schwierigkeitsgradvalidierung.',
    },
    {
      id: 'game-observer-interview', title: 'Eine Frage nach dem Versuch', topic: 'Boulder lesen', format: 'game', illustrationId: 'read-boulder', spraywall: true,
      goal: 'Nach einem Versuch eine freundliche Frage stellen.',
      steps: ['Zu zweit leichte Passage wählen. Beobachtende bleiben außerhalb des Fallbereichs.', 'Eine Person klettert; die andere merkt sich eine Frage zu einer Bewegung.', 'Erst am Boden fragen, etwa: Woran hast du den nächsten Tritt erkannt?', 'Antwort besprechen und Rollen wechseln. Nach Pause ist ein zweiter eigener Versuch möglich.'],
      cues: ['Eine Frage statt einer Fehlerliste.', 'Erst am Boden sprechen.'], mistakes: ['Während unsicherer Bewegung Anweisungen hineinrufen.', 'Aus einer Antwort eine Diagnose ableiten.'], easier: 'Frage nur zum ersten Fußkontakt stellen.', harder: 'Eine Entscheidung an einer anderen leichten Passage besprechen.', selectionReason: 'Kooperativer Gesprächsrahmen statt fortlaufender Technikkommandos; keine Studie dieses Formats.',
    },
    {
      id: 'game-colour-journey', title: 'Farbreise an der Spraywall', topic: 'Koordination', format: 'game', illustrationId: 'read-boulder', equipment: 'Spraywall',
      goal: 'Eine kurze Farbreise mit hilfreichen Kontakten planen.',
      steps: ['An der Spraywall eine kurze leichte Passage und Rückweg prüfen.', 'Vom Boden zwei große erreichbare Zielgriffe als Farbreise wählen. Andere hilfreiche Kontakte bleiben erlaubt.', 'Nacheinander probieren. Eine unpassende Farbfolge ändern; keinen entfernten Griff durch Springen erreichen.', 'Am Boden eine Änderung erklären. Nach Pause zweite Runde; Farbe verlangt weder Höhe noch Tempo.'],
      cues: ['Farben sind Zielideen, keine Kontaktverbote.', 'Passende Folge vor dem Start prüfen.'], mistakes: ['Notwendige Unterstützung für eine Farbregel weglassen.', 'Entfernten Griff nur wegen seiner Farbe erreichen wollen.'], easier: 'Nur einen Zielkontakt vereinbaren.', harder: 'Zwei andere passende Zielkontakte wählen, keine längere Farbfolge.', selectionReason: 'Positives Kontaktziel an der Spraywall statt Griffverboten; keine Reaktions- oder Schnelligkeitsprüfung.',
    },
    {
      id: 'game-observation-guess', title: 'Welchen Hinweis habe ich gewählt?', topic: 'Fußtechnik', format: 'game', illustrationId: 'quiet-feet', spraywall: true,
      goal: 'Einen Bewegungshinweis durch Beobachten erraten.',
      steps: ['Zu zweit zwei Hinweise vereinbaren: Tritt ansehen oder Fuß vor dem Handzug belasten.', 'Eine Person wählt vor dem Versuch einen Hinweis für eine leichte bekannte Passage.', 'Die andere beobachtet außerhalb des Fallbereichs. Nicht übertrieben bewegen, um das Raten zu erleichtern.', 'Am Boden raten und eine Beobachtung erklären. Nach Pause Rollen wechseln; höchstens zwei eigene Versuche.'],
      cues: ['Erklären ist wichtiger als richtig raten.', 'Keine versteckten Risikoaufgaben.'], mistakes: ['Bewegung überzeichnen oder Kontrolle aufgeben, damit der Cue erraten wird.', 'Wahrnehmung der anderen Person als Technikmessung behandeln.'], easier: 'Cue vorher offen sagen.', harder: 'Einen anderen klar beobachtbaren Cue wählen, keine versteckten Risikoaufgaben.', selectionReason: 'Spielerische Aufmerksamkeits- und Beobachteraufgabe mit offener Kontrolle; kein diagnostisches Verfahren.',
    },
    {
      id: 'game-beta-exchange', title: 'Beta-Tausch mit eigener Anpassung', topic: 'Körperposition', format: 'game', illustrationId: 'hip-position', spraywall: true,
      goal: 'Eine Partneridee ausprobieren und an dich anpassen.',
      steps: ['Zu zweit kurze leichte Passage mit guten Kontakten und Rückweg wählen.', 'Beide beschreiben vom Boden eine eigene mögliche Lösung.', 'Nacheinander einen Hinweis der anderen Person ausprobieren. Eigene Kontakte und Reichweiten berücksichtigen.', 'Am Boden je eine übernommene und veränderte Idee nennen. Nach Pause höchstens zweiter eigener Versuch.'],
      cues: ['Einen Hinweis übernehmen, nicht alles kopieren.', 'Anpassungen gehören zum Spiel.'], mistakes: ['Partnerbewegung trotz unpassender Reichweite erzwingen.', 'Körperunterschiede als Leistungsdefizit bewerten.'], easier: 'Nur eine Fußidee austauschen und vom Boden besprechen.', harder: 'An anderer leichter Passage prüfen, welche Idee erneut passt.', selectionReason: 'Perspektivwechsel zwischen unterschiedlichen Lösungen; keine universelle Beta und kein bewiesener Trainingseffekt des Spiels.',
    },
  ];
  return recipes.map(({ spraywall, ...recipe }) => ({
    ...recipe, area: 'boulder', equipment: recipe.equipment ?? 'Boulderwand', level: recipe.level ?? 'Einsteiger bis Fortgeschrittene · passende leichte Passage',
    alternativeEquipment: spraywall && recipe.equipment !== 'Spraywall' ? ['Spraywall'] : undefined,
    minutes: 0, defaultDose: { ...learningDose, secondsPerRepetition: recipe.format === 'game' ? 120 : 90 },
    dose: recipe.format === 'game' ? 'Beispiel: 2 kurze eigene Spielzüge je Person. Ein Spielzug zählt als ein Versuch. Kein Pflicht-Top; gemeinsame Aufbau- und Wartezeit kommt hinzu.' : 'Beispiel: 2 kurze Versuche an einer passenden Passage. Je Versuch nur einen Punkt üben.',
    rest: 'Etwa 90 Sekunden zwischen eigenen Versuchen. Bei Bedarf länger erholen.',
    note: `${recipe.format === 'game' ? 'Nacheinander spielen; Beobachtende bleiben außerhalb des Fallbereichs. ' : ''}Auch leichte Aufgaben können die Finger belasten. Bei neuem oder zunehmendem Schmerz, Funktions- oder Kontrollverlust aufhören.`,
    setupRequirements: ['Leichte kurze Passage mit guten Kontakten, niedrigem Einstieg und bekanntem Rückweg wählen', 'Fallbereich frei halten und nötige Halleneinweisung klären', ...(recipe.requiresCoach ? ['Coach prüft den Aufbau vor dem ersten Versuch'] : [])],
    keywords: [recipe.title, recipe.topic, recipe.format === 'game' ? 'Spiel spielerisch kooperativ' : 'Übung Lernaufgabe', 'bouldern', ...(spraywall ? ['spraywall'] : [])],
    sources: recipe.sources ?? motorSources, contentKind: 'exercise', planEligible: false,
  }));
}
