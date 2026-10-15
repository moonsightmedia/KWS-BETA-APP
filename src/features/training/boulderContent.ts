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
      steps: ['Leichten, niedrigen Start mit guten Griffen und Rückweg wählen. Startregeln beachten.', 'Zwei mögliche Fußstellungen vom Boden überlegen.', 'Erste Stellung: nur den ersten Zug probieren und zurückkehren.', 'Nach Pause zweite Stellung probieren. Welche erleichtert den Start?'],
      cues: ['Nur den ersten Zug vergleichen.', 'Füße vor dem Start überlegen.'], mistakes: ['Unpassende Startkontakte für eine vermeintlich richtige Beta erzwingen.', 'Aus dem Start einen Sprungversuch machen.'], easier: 'Positionen vom Boden besprechen und nur eine erproben.', harder: 'An anderem geeigneten Start die eigene Entscheidung erneut prüfen.', selectionReason: 'Für einen schwierigen Einstieg: Du vergleichst den Start, ohne den ganzen Boulder zu klettern.',
    },
    {
      id: 'sidepull-lab', title: 'Seitgriff: Zugrichtung erkunden', topic: 'Grifftechnik', format: 'drill', illustrationId: 'sidepull-lab', requiresCoach: true,
      level: 'Nach Einführung · vertraute Wandpraxis', goal: 'Am Seitgriff einen passenden Stand finden.',
      steps: ['Coach wählt großen Seitgriff, gute Tritte und einen weiteren Handgriff.', 'Seitliche Griffkante fassen. Handgelenk bequem halten.', 'Füße umsetzen und zwei kleine Standwechsel probieren. Nicht maximal ziehen.', 'Kontrolliert zurückkehren: Welcher Stand macht den nächsten Zug leichter?'],
      cues: ['Seitlich ziehen, passenden Stand finden.', 'Nicht stärker ziehen, wenn die Position nicht passt.'], mistakes: ['Mehr ziehen, obwohl die Position nicht passt.', 'Handgelenk oder Schulter in eine erzwungene Richtung bringen.'], easier: 'Coach zeigt den Stand; vom Boden beschreiben.', harder: 'An einem anderen geeigneten Seitgriff vergleichen.', selectionReason: 'Du erkundest, wie Stand und Zugrichtung zusammenpassen. Kein einzelnes Fingerkrafttraining.',
    },
    {
      id: 'undercling-lab', title: 'Untergriff: Abstand und Fußdruck', topic: 'Grifftechnik', format: 'drill', illustrationId: 'undercling-lab', requiresCoach: true,
      level: 'Nach Einführung · vertraute Wandpraxis', goal: 'Am Untergriff einen passenden Stand finden.',
      steps: ['Coach wählt niedrigen Untergriff, gute Tritte und weiteren Handgriff.', 'Mit Handfläche nach oben unter den Griff fassen. Schulter und Handgelenk bleiben bequem.', 'Füße umsetzen und den Stand leicht ändern. Nur einen kurzen, ruhigen Zug machen.', 'Zurückkehren: Welcher Abstand zum Griff passte?'],
      cues: ['Unter den Griff fassen.', 'Füße bei einem Standwechsel umsetzen.'], mistakes: ['Griffhöhe unabhängig von Körpermaßen erzwingen.', 'Am Handgelenk ziehen oder an einem ungeklärten Untergriff hängen.'], easier: 'Position und Zugrichtung vom Boden kennenlernen.', harder: 'Mit Coach an einem anderen Untergriff vergleichen.', selectionReason: 'Du übst Stand und Zugrichtung. Daraus folgt keine passende Fingerbelastung für jede Person.',
    },
    {
      id: 'hand-match-order', title: 'Hände matchen: Reihenfolge planen', topic: 'Grifftechnik', format: 'drill', illustrationId: 'hand-match-order', spraywall: true,
      goal: 'Beide Hände auf einen Griff setzen.',
      steps: ['Breiten Griff mit Platz für beide Hände wählen. Gute Tritte und Rückweg prüfen.', 'Überlegen: Welche Hand kommt zuerst, welche zieht danach weiter?', 'Hände nacheinander nebeneinander setzen. Bei Platzmangel zurückkehren.', 'Nach Pause andere passende Reihenfolge probieren. Den nächsten Zug vergleichen.'],
      cues: ['Matchen = beide Hände an einem Griff.', 'Erst Platz und Halt prüfen.'], mistakes: ['Beide Hände gleichzeitig ohne passende Unterstützung lösen.', 'Auf engem Griff eine verpflichtende Matchlösung erzwingen.'], easier: 'Sehr breiten Griff wählen oder nur die Reihenfolge zeigen.', harder: 'Reihenfolge an einer anderen kurzen passenden Sequenz planen.', selectionReason: 'Du planst die Handfolge auf einem gemeinsamen Griff. Die Tritte bleiben als Halt erhalten.',
    },
    {
      id: 'flagging-basics', title: 'Freies Bein als Positionshilfe', topic: 'Körperposition', format: 'drill', illustrationId: 'flagging-basics', requiresCoach: true, spraywall: true,
      goal: 'Ein freies Bein als Gegengewicht ausprobieren.',
      steps: ['Coach wählt niedrigen Stand mit guten Händen, Standfuß und Rückweg.', 'Bewegung zuerst mit beiden Füßen auf Tritten probieren.', 'Coach prüft den Aufbau. Ein Bein seitlich strecken; nicht pendeln oder absichtlich wegkippen.', 'Zurückkehren: War der nächste Griff mit freiem Bein leichter erreichbar?'],
      cues: ['Flagging: freies Bein seitlich als Gegengewicht.', 'Der Standfuß und die Hände tragen.'], mistakes: ['Ein Bein unabhängig von der Aufgabe zwanghaft lösen.', 'Wegkippen als Spielregel zulassen.'], easier: 'Vorzeigen lassen; beide Füße auf Tritten lassen.', harder: 'Mit Coach an einem anderen kurzen Zug vergleichen.', selectionReason: 'Einführung in Flagging. Ein freies Bein hilft nicht bei jedem Seitenzug.',
    },
    {
      id: 'foot-unloading', title: 'Einen Fuß kontrolliert entlasten', topic: 'Fußtechnik', format: 'drill', illustrationId: 'quiet-feet', spraywall: true,
      goal: 'Einen Fuß vor dem Umsetzen entlasten.',
      steps: ['Niedrigen Stand mit guten Händen und zwei großen Tritten wählen.', 'Den nächsten Fuß auswählen. Andere Griffe und Tritte halten dich.', 'Gewicht verlagern, dann den freien Fuß umsetzen.', 'Zurückkehren: Woran hast du gemerkt, dass der Fuß frei war?'],
      cues: ['Erst entlasten, dann umsetzen.', 'Nicht beide Füße gleichzeitig lösen.'], mistakes: ['Am belasteten Schuh gegen den Tritt drehen.', 'Für den Test beide Füße gleichzeitig wegnehmen.'], easier: 'Nur Gewicht verlagern; Fuß auf dem Tritt lassen.', harder: 'Den Lastwechsel vor einem anderen bekannten Zug prüfen.', selectionReason: 'Vor dem Umsetzen verlagert sich dein Gewicht. So musst du den Schuh nicht auf einem belasteten Tritt verdrehen.',
    },
    {
      id: 'downclimb-path', title: 'Rückweg bewusst abklettern', topic: 'Abklettern', format: 'drill', illustrationId: 'controlled-move', spraywall: true,
      goal: 'Den Rückweg planen und kontrolliert abklettern.',
      steps: ['Hallenpersonal wählt niedrige Passage und passende Abklettergriffe.', 'Hand- und Fußfolge für den Rückweg vom Boden zeigen.', 'Bis zum vereinbarten Punkt klettern, dann Griff für Griff zurückkehren.', 'Unklare Stelle am Boden besprechen. Lieber vereinfachen als höher klettern.'],
      cues: ['Rückweg vor dem Start kennen.', 'Abklettergriffe dürfen helfen.'], mistakes: ['Erst oben nach einer Rücklösung suchen.', 'Abspringen zum Spielziel oder Zeitgewinn machen.'], easier: 'Nur einen niedrigen Schritt hin und zurück.', harder: 'Andere bekannte niedrige Passage mit gutem Rückweg prüfen.', selectionReason: 'Du übst einen bekannten Rückweg. Keine Fallschulung oder Freigabe zum Abspringen.',
    },
    {
      id: 'pause-point-choice', title: 'Passende Zwischenposition finden', topic: 'Körperposition', format: 'drill', illustrationId: 'hip-position', spraywall: true,
      goal: 'Eine passende Position zum kurzen Orientieren finden.',
      steps: ['Leichte bekannte Passage mit guten Griffen, Tritten und Rückweg wählen.', 'Zwei mögliche Zwischenpositionen vom Boden zeigen.', 'In der ersten kurz orientieren. Weiterklettern oder zurückkehren; keine feste Haltezeit.', 'Nach Pause zweite Position probieren. Wo ließ sich der nächste Zug besser planen?'],
      cues: ['Nur so lange stoppen, wie du es brauchst.', 'Kein Wettkampf im langen Hängen.'], mistakes: ['Eine Griffkraftprüfung aus dem Orientieren machen.', 'Jeden Stopp als schlechten Bewegungsfluss bewerten.'], easier: 'Nur eine geeignete Zwischenposition besprechen.', harder: 'Positionen an anderer leichter Sequenz auswählen.', selectionReason: 'Du suchst sinnvolle kurze Pausen. Stopps sind erlaubt; langes Hängen ist kein Ziel.',
    },
    {
      id: 'movement-chunking', title: 'Teilsequenz statt ganzer Boulder', topic: 'Koordination', format: 'drill', illustrationId: 'controlled-move', spraywall: true,
      goal: 'Eine unklare Bewegung einzeln üben.',
      steps: ['In einer leichten Passage einen unklaren Übergang wählen.', 'Coach oder Hallenpersonal prüft Einstieg und Rückweg dieses Abschnitts.', 'Nur zwei bis drei Bewegungen probieren und zurückkehren.', 'Nach Pause entscheiden: wiederholen oder einen passenden Anschluss ergänzen.'],
      cues: ['Ein Übergang auf einmal.', 'Den Teilabschnitt kontrolliert erreichen und verlassen.'], mistakes: ['Zum Üben der Mitte ungeplant jedes Mal den ganzen Boulder klettern.', 'Eine unerreichbare Zwischenposition improvisieren.'], easier: 'Nur einen Übergang vom Boden besprechen und probieren.', harder: 'Einmal einen passenden Anschluss ergänzen. Anzahl vorher festlegen.', selectionReason: 'Du übst einen kurzen Abschnitt. Die Lernwirkung dieses Ablaufs ist nicht geprüft.',
    },
    {
      id: 'transfer-check', title: 'Einen Hinweis an neuer Passage testen', topic: 'Koordination', format: 'drill', illustrationId: 'controlled-move', spraywall: true,
      goal: 'Einen bekannten Hinweis an einem anderen Boulder testen.',
      steps: ['Einen Hinweis wählen, etwa: erst Fuß setzen, dann belasten.', 'Andere kurze leichte Passage mit guten Griffen, Tritten und Rückweg wählen.', 'Hinweis ausprobieren. Die alte Hand- und Fußfolge muss hier nicht passen.', 'Am Boden nennen: Was half, was musstest du ändern?'],
      cues: ['Gleicher Hinweis, neue Aufgabe.', 'Eine andere Lösung ist erlaubt.'], mistakes: ['Nur denselben Boulder wiederholen und daraus allgemeine Fortschritte ableiten.', 'Einen vertrauten Weg trotz unpassender Griffe und Tritte kopieren.'], easier: 'Sehr ähnliche kurze Passage wählen.', harder: 'Später an einer weiteren leichten Passage prüfen; keine Zusatzversuche anhängen.', selectionReason: 'Du prüfst einen Hinweis an einer neuen Aufgabe. Das ist keine gemessene Verbesserung deiner Technik.',
    },
    {
      id: 'beta-model-compare', title: 'Eine Beta sehen, einen Hinweis wählen', topic: 'Boulder lesen', format: 'drill', illustrationId: 'read-boulder', spraywall: true,
      goal: 'Einen Hinweis aus einer vorgeführten Lösung ausprobieren.', sources: [previewSource, ...motorSources],
      steps: ['Für leichte Passage eigene Idee überlegen. Rückweg prüfen.', 'Vorführung oder Beta-Video ansehen. Einen Hinweis zu Hand, Fuß oder Körper auswählen.', 'Hinweis probieren und an deine Reichweite anpassen.', 'Nach Pause vergleichen: Hat er hier geholfen?'],
      cues: ['Beta heißt: eine mögliche Lösung.', 'Nur einen Hinweis auf einmal prüfen.'], mistakes: ['Die gesamte Beta unabhängig von eigenen Voraussetzungen kopieren.', 'Eine erfolgreiche Ausführung als bewiesene Videowirkung zählen.'], easier: 'Coach zeigt nur den ersten passenden Übergang.', harder: 'Zwei Lösungen vom Boden vergleichen; einen Hinweis ausprobieren.', selectionReason: 'Eine Beta kann dir eine Idee geben. Die begrenzte Forschung belegt weder diesen Ablauf noch seine Dosierung.',
    },
    {
      id: 'video-cue-check', title: 'Eigene Bewegung: eine Stelle ansehen', topic: 'Boulder lesen', format: 'drill', illustrationId: 'read-boulder', spraywall: true,
      goal: 'Eine Stelle in deiner Bewegung genauer ansehen.',
      steps: ['An leichter Passage eine Frage wählen: Wann belaste ich den Fuß?', 'Eigenes Video nutzen oder außerhalb des Fallbereichs beobachten lassen.', 'Am Boden beschreiben: Was machen Fuß und Hand? Verdeckte Kontakte nicht erraten.', 'Nach Pause einen Hinweis im zweiten Versuch ausprobieren.'],
      cues: ['Erst beschreiben, dann eine Sache ändern.', 'Ein Video zeigt keine Schmerz- oder Kraftdiagnose.'], mistakes: ['Aus einem Video eine Verletzungs- oder Kraftdiagnose ableiten.', 'Viele Fehler gleichzeitig korrigieren wollen.'], easier: 'Mit Beobachter nur den ersten Schritt besprechen.', harder: 'Später aus anderer Richtung ansehen; keine automatische Techniknote.', selectionReason: 'Hilft beim Beobachten und Besprechen. Kein geprüfter automatischer Technik- oder Verletzungscheck.',
    },
    {
      id: 'slab-weight-shift', title: 'Platte: zwischen Standpositionen wechseln', topic: 'Fußtechnik', format: 'drill', illustrationId: 'smearing', requiresCoach: true,
      goal: 'An der Platte das Gewicht zwischen zwei Tritten verlagern.',
      steps: ['Coach wählt leichte Platte, zwei Tritte, gute Hände und niedrigen Rückweg.', 'Beide Füße genau aufsetzen.', 'Gewicht langsam zu einem Fuß bringen; einen kurzen Handzug probieren.', 'Zurückkehren. Nach Pause anderen Stand vergleichen; nicht absichtlich abrutschen.'],
      cues: ['Kontakt langsam belasten.', 'Eine passende Platte ist nötig.'], mistakes: ['Beliebige Spraywall als passende Reibungsplatte behandeln.', 'Abrutschen zum Test oder Spielziel machen.'], easier: 'Große gut greifende Tritte; Gewicht nur wenig verlagern.', harder: 'Coach wählt eine andere passende Trittfolge.', selectionReason: 'Für passende Platten. Fersenhöhe und Wandabstand hängen von der jeweiligen Bewegung ab.',
    },
    {
      id: 'heel-hook-release', title: 'Heelhook: Unterstützung wechseln und lösen', topic: 'Hooks', format: 'drill', illustrationId: 'heel-hook', requiresCoach: true,
      level: 'Nach Hook-Einführung · vertraute Wandpraxis', goal: 'Vom Heelhook auf andere Griffe und Tritte wechseln.',
      steps: ['Coach wählt bekannten niedrigen Heelhook und Rückweg.', 'Vom Boden zeigen: Welche Griffe und Tritte halten dich danach?', 'Erst diese belasten, dann die Ferse lösen.', 'Zurückkehren und Reihenfolge besprechen. Keine neue Hookart oder maximale Zugkraft testen.'],
      cues: ['Erst anderen Halt finden, dann Ferse lösen.', 'Toe Hook ist eine eigene Technik.'], mistakes: ['Hook lösen, bevor andere Kontakte tragen.', 'In rutschendem Hook stärker ziehen oder Knieposition erzwingen.'], easier: 'Coach zeigt den Wechsel; nur mit zusätzlichem Halt probieren.', harder: 'Coach prüft eine andere Anordnung desselben bekannten Wechsels.', selectionReason: 'Du übst das Lösen eines bekannten Heelhooks. Andere Griffe und Tritte übernehmen vorher dein Gewicht.',
    },
    {
      id: 'game-beta-detective', title: 'Beta-Detektiv', topic: 'Boulder lesen', format: 'game', illustrationId: 'read-boulder', spraywall: true,
      goal: 'Erraten und prüfen, welcher Fuß den nächsten Zug erleichtert.',
      steps: ['Allein oder zu zweit leichte Passage wählen. Eine unklare Bewegung benennen.', 'Vermuten: Welcher Fuß macht den nächsten Handzug leichter?', 'Nacheinander probieren. Wartende bleiben außerhalb des Fallbereichs.', 'Ein Punkt für Bestätigung oder erklärte Änderung. Nach Pause zweite Runde; Tempo und Tops zählen nicht.'],
      cues: ['Eine begründete Änderung zählt auch.', 'Nur eine Person an der Passage.'], mistakes: ['Vermutung trotz unpassender Position erzwingen.', 'Punkte an Höhe oder Top knüpfen.'], easier: 'Nur den ersten Übergang untersuchen.', harder: 'Eine weniger offensichtliche Stelle an einer weiterhin leichten Passage auswählen.', selectionReason: 'Spiel zum Überlegen und Vergleichen. Die Wirkung des Punktesystems ist nicht untersucht.',
    },
    {
      id: 'game-foot-memory', title: 'Tritt-Memory mit offenen Augen', topic: 'Fußtechnik', format: 'game', illustrationId: 'quiet-feet', spraywall: true,
      goal: 'Eine kurze Fußfolge merken und ausprobieren.',
      steps: ['Bis zu drei erreichbare Tritte an leichter Passage und Rückweg wählen.', 'Fußfolge vom Boden nennen. Gute Hände und zusätzliche Tritte bleiben erlaubt.', 'Mit offenen Augen probieren. Bei unpassender Folge ändern oder zurückkehren.', 'Am Boden vergleichen: Punkt für Treffer oder hilfreiche Korrektur. Nach Pause zweite Runde.'],
      cues: ['Merken und Hinschauen gehören zusammen.', 'Keinen unpassenden Plan erzwingen.'], mistakes: ['Augen schließen oder Tritte absichtlich verdecken.', 'Unpassende Fußfolge für einen Memorypunkt durchziehen.'], easier: 'Nur zwei Kontakte merken.', harder: 'Drei passende Kontakte an anderer leichter Passage wählen.', selectionReason: 'Kurze Fußfolge merken und weiter hinschauen. Es werden keine Augen verbunden oder Zusatzversuche verlangt.',
    },
    {
      id: 'game-two-solutions', title: 'Zwei Lösungen gewinnen', topic: 'Körperposition', format: 'game', illustrationId: 'hip-position', spraywall: true,
      goal: 'Gemeinsam zwei passende Lösungen für eine Bewegung finden.',
      steps: ['Leichten Zug mit mehreren guten Griffen, Tritten und Rückweg wählen.', 'Ersten Weg probieren und vollständig zurückkehren.', 'Nach Pause andere passende Hand- oder Fußfolge probieren. Nötigen Halt nicht verbieten.', 'Gewonnen: zwei Wege und ein erklärter Unterschied. Bei Abbruch keine zweite Lösung erzwingen.'],
      cues: ['Verschiedene Lösungen dürfen beide passen.', 'Unterschiede besprechen statt Rangliste.'], mistakes: ['Für die zweite Lösung gute Griffe künstlich verbieten.', 'Eine Lösung für alle Körpergrößen zum Sieger erklären.'], easier: 'Zwei Ideen vom Boden besprechen, nur eine ausprobieren.', harder: 'Zwei Wege an einer anderen leichten Passage vergleichen.', selectionReason: 'Gemeinsam verschiedene Wege finden. Die Wirkung dieses Spiels ist nicht geprüft.',
    },
    {
      id: 'game-cue-bingo', title: 'Beobachtungs-Bingo', topic: 'Fußtechnik', format: 'game', illustrationId: 'controlled-move', spraywall: true,
      goal: 'Tritt ansehen, Fuß setzen und Rückweg beobachten.',
      steps: ['Zu zweit drei Bingo-Felder wählen: Tritt ansehen, Fuß setzen, Rückweg nutzen.', 'Leichte Passage wählen. Beim eigenen Versuch auf nur ein Feld achten.', 'Nacheinander probieren; Wartende bleiben außerhalb des Fallbereichs.', 'Am Boden Beobachtungen nennen. Nach Pause zweite Runde; keine Extra-Versuche für ein volles Bingo.'],
      cues: ['Ein persönlicher Fokus reicht.', 'Nicht klar gesehen darf offen bleiben.'], mistakes: ['Für ein vollständiges Bingo ungeplante Zusatzversuche sammeln.', 'Beobachtung mit einer objektiven Techniknote verwechseln.'], easier: 'Zwei Felder und sehr kurze Passage.', harder: 'Ein Feld durch eine andere klar erkennbare Handlung ersetzen.', selectionReason: 'Beobachtungsspiel mit begrenzter Versuchszahl. Bingo ist keine objektive Techniknote.',
    },
    {
      id: 'game-mini-addon', title: 'Mini-Add-on: höchstens vier Bewegungen', topic: 'Koordination', format: 'game', illustrationId: 'controlled-move', equipment: 'Spraywall',
      goal: 'Eine kurze Folge gemeinsam um eine Bewegung erweitern.',
      steps: ['Coach prüft niedrigen Spraywallstart und Rückweg. Höchstens vier Bewegungen.', 'A wählt zwei Bewegungen. B ergänzt vom Boden eine passende dritte.', 'Nacheinander probieren. Unpassende Ergänzung ändern; zusätzliche Griffe und Tritte sind erlaubt.', 'Nach Pause eine passende vierte Bewegung ergänzen. Dann endet die Folge.'],
      cues: ['Zwei → drei → höchstens vier Bewegungen.', 'Eine unpassende Ergänzung ersetzen.'], mistakes: ['Die Kette bis zur Erschöpfung verlängern.', 'Eine Partnerbewegung unabhängig von eigener Reichweite kopieren.'], easier: 'Zwei Bewegungen beibehalten.', harder: 'Andere kurze bekannte Folge planen; nicht mehr Bewegungen.', requiresCoach: true, selectionReason: 'Kurzes gemeinsames Add-on. Kein Ausdauer- oder Maximaltest und kein Wettkampf.',
    },
    {
      id: 'game-spraywall-designer', title: 'Spraywall-Werkstatt', topic: 'Boulder lesen', format: 'game', illustrationId: 'read-boulder', equipment: 'Spraywall',
      goal: 'Eine kurze Folge für die andere Person entwerfen.',
      steps: ['Nach Halleneinweisung niedrigen Start, gute Griffe, Tritte und Rückweg prüfen. Keine Griffe versetzen.', 'Zwei bis vier erreichbare Bewegungen vom Boden vorschlagen. Partner darf ändern.', 'Nacheinander probieren und zurückkehren. Zusätzliche Griffe und Tritte bleiben erlaubt.', 'Eine hilfreiche Änderung nennen; Rollen wechseln. Höchstens zwei eigene Versuche je Person.'],
      cues: ['Für die andere Reichweite planen.', 'Ideen ändern, keine Griffe schrauben.'], mistakes: ['Eigene Reichweite zum verpflichtenden Maß machen.', 'Griffe verändern oder andere Boulderbereiche blockieren.'], easier: 'Nur zwei Bewegungen mit sehr guten Kontakten.', harder: 'Andere Bewegungsidee wählen; Folge kurz und leicht halten.', selectionReason: 'Du planst eine kurze Folge für eine andere Person. Keine Ausbildung zum Routenbau und keine geprüfte Schwierigkeitseinstufung.',
    },
    {
      id: 'game-observer-interview', title: 'Eine Frage nach dem Versuch', topic: 'Boulder lesen', format: 'game', illustrationId: 'read-boulder', spraywall: true,
      goal: 'Nach einem Versuch eine freundliche Frage stellen.',
      steps: ['Zu zweit leichte Passage wählen. Beobachtende warten außerhalb des Fallbereichs.', 'Eine Person klettert; die andere merkt sich eine Frage zur Bewegung.', 'Erst am Boden fragen, etwa: Wie hast du den nächsten Tritt gefunden?', 'Besprechen und Rollen wechseln. Nach Pause ist ein zweiter eigener Versuch möglich.'],
      cues: ['Eine Frage statt einer Fehlerliste.', 'Erst am Boden sprechen.'], mistakes: ['Während unsicherer Bewegung Anweisungen hineinrufen.', 'Aus einer Antwort eine Diagnose ableiten.'], easier: 'Frage nur zum ersten Fußkontakt stellen.', harder: 'Eine Entscheidung an einer anderen leichten Passage besprechen.', selectionReason: 'Eine Frage nach dem Versuch statt ständiger Zurufe. Dieses Spielformat ist nicht untersucht.',
    },
    {
      id: 'game-colour-journey', title: 'Farbreise an der Spraywall', topic: 'Koordination', format: 'game', illustrationId: 'read-boulder', equipment: 'Spraywall',
      goal: 'Zwei Farbgriffe als Ziele auswählen und besuchen.',
      steps: ['Kurze leichte Spraywallpassage und Rückweg prüfen.', 'Zwei große erreichbare Farbgriffe als Ziele wählen. Andere hilfreiche Griffe und Tritte sind erlaubt.', 'Nacheinander probieren. Unpassende Farbfolge ändern; nicht zu entfernten Griffen springen.', 'Am Boden eine Änderung erklären. Nach Pause zweite Runde; Farbe verlangt weder Höhe noch Tempo.'],
      cues: ['Farben sind Ziele, keine Griffverbote.', 'Weg vor dem Start prüfen.'], mistakes: ['Notwendige Unterstützung für eine Farbregel weglassen.', 'Entfernten Griff nur wegen seiner Farbe erreichen wollen.'], easier: 'Nur einen Zielkontakt vereinbaren.', harder: 'Zwei andere passende Zielkontakte wählen, keine längere Farbfolge.', selectionReason: 'Farben geben Ziele vor. Kein Tempo-, Reaktions- oder Höhenwettbewerb.',
    },
    {
      id: 'game-observation-guess', title: 'Welchen Hinweis habe ich gewählt?', topic: 'Fußtechnik', format: 'game', illustrationId: 'quiet-feet', spraywall: true,
      goal: 'Den Bewegungshinweis der anderen Person erraten.',
      steps: ['Zu zweit zwei Hinweise wählen: Tritt ansehen oder Fuß vor dem Handzug belasten.', 'Eine Person wählt einen Hinweis für eine leichte bekannte Passage.', 'Andere Person beobachtet außerhalb des Fallbereichs. Bewegung nicht absichtlich übertreiben.', 'Am Boden raten und erklären. Nach Pause Rollen wechseln; höchstens zwei eigene Versuche.'],
      cues: ['Erklären ist wichtiger als richtig raten.', 'Keine versteckten Risikoaufgaben.'], mistakes: ['Bewegung übertreiben oder Kontrolle verlieren, um das Raten zu erleichtern.', 'Die Beobachtung als genaue Technikmessung behandeln.'], easier: 'Hinweis vorher nennen.', harder: 'Anderen klar erkennbaren Hinweis wählen; keine versteckte Risikoaufgabe.', selectionReason: 'Spiel zum aufmerksamen Beobachten. Daraus folgt keine Diagnose oder Technikmessung.',
    },
    {
      id: 'game-beta-exchange', title: 'Beta-Tausch mit eigener Anpassung', topic: 'Körperposition', format: 'game', illustrationId: 'hip-position', spraywall: true,
      goal: 'Eine Partneridee ausprobieren und an dich anpassen.',
      steps: ['Zu zweit kurze leichte Passage mit guten Griffen, Tritten und Rückweg wählen.', 'Beide beschreiben vom Boden einen möglichen Weg.', 'Nacheinander einen Partnerhinweis probieren. Eigene Griffe, Tritte und Reichweite beachten.', 'Am Boden nennen: Was übernommen, was geändert? Nach Pause höchstens zweiter eigener Versuch.'],
      cues: ['Einen Hinweis übernehmen, nicht alles kopieren.', 'Anpassungen gehören zum Spiel.'], mistakes: ['Partnerbewegung trotz unpassender Reichweite erzwingen.', 'Körperunterschiede als Leistungsdefizit bewerten.'], easier: 'Nur eine Fußidee austauschen und vom Boden besprechen.', harder: 'An anderer leichter Passage prüfen, welche Idee erneut passt.', selectionReason: 'Ihr vergleicht unterschiedliche Wege. Kein Weg passt allen; ein Trainingseffekt des Spiels ist nicht nachgewiesen.',
    },
  ];
  return recipes.map(({ spraywall, ...recipe }) => ({
    ...recipe, area: 'boulder', equipment: recipe.equipment ?? 'Boulderwand', level: recipe.level ?? 'Einsteiger bis Fortgeschrittene · passende leichte Passage',
    alternativeEquipment: spraywall && recipe.equipment !== 'Spraywall' ? ['Spraywall'] : undefined,
    minutes: 0, defaultDose: { ...learningDose, secondsPerRepetition: recipe.format === 'game' ? 120 : 90 },
    dose: recipe.format === 'game' ? 'Beispiel: 2 kurze eigene Spielzüge je Person. Ein Spielzug zählt als ein Versuch. Kein Pflicht-Top; gemeinsame Aufbau- und Wartezeit kommt hinzu.' : 'Beispiel: 2 kurze Versuche an einer passenden Passage. Je Versuch nur einen Punkt üben.',
    rest: 'Etwa 90 Sekunden zwischen eigenen Versuchen. Bei Bedarf länger erholen.',
    note: 'Auch leichte Aufgaben belasten die Finger. Bei neuem oder zunehmendem Schmerz, ungewohntem Kraft- oder Bewegungsverlust oder fehlender Kontrolle aufhören.',
    setupRequirements: ['Kurze leichte Passage; gute Griffe und Tritte, niedriger Start und bekannter Rückweg', 'Fallbereich frei halten; nötige Halleneinweisung klären', ...(recipe.requiresCoach ? ['Coach prüft den Aufbau vor dem Start'] : [])],
    keywords: [recipe.title, recipe.topic, recipe.format === 'game' ? 'Spiel spielerisch kooperativ' : 'Übung Lernaufgabe', 'bouldern', ...(spraywall ? ['spraywall'] : [])],
    sources: recipe.sources ?? motorSources, contentKind: 'exercise', planEligible: false,
  }));
}
