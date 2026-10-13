import type { TrainingExercise } from './types';

const DAV_INDOOR = { label: 'DAV: Sicher Bouldern indoor', url: 'https://www.alpenverein.de/artikel/bouldern-indoor-5-dav-empfehlungen_402d77e9-ab58-4992-a11c-01ad237601d7', context: 'Verbandsgrundlage zu Aufsicht, freiem Sturzraum, individuell gewählter Höhe und Abklettern. Keine Prüfung dieser einzelnen Spielregeln oder der KWS-Ausstattung.' };
const DAV_CHILDREN = { label: 'DAV: Klettern mit Kindern', url: 'https://www.alpenverein.de/artikel/klettern-mit-kindern_e9975fcb-305b-4aa0-ae4d-2f217d98bc38', context: 'Spielerischer Einstieg und Schulkindalter als Orientierung. Die Alterslabels dieser Karten sind redaktionell; kein wissenschaftlich validierter Eignungstest.' };
const DGUV = { label: 'DGUV Information 202-018', url: 'https://publikationen.dguv.de/widgets/pdf/download/article/9', context: 'S.21–22: Aufsichtsform nach Fähigkeiten und Rahmenbedingungen, kein allgemeiner Alters-/Zeitcutoff. Schul-/Kita-Kontext; keine pauschale Betriebsfreigabe für KWS oder diese Spiele.' };
const DAV_SETTING = { label: 'DAV: Kindgerechtes Klettersetting', url: 'https://www.alpenverein.de/artikel/klettern-mit-kindern-technik_2fe49ac6-69ae-428d-be23-74af50fa7289', context: 'Verbandsartikel 2026: verständliche Regeln und zum Kind passender Aufbau. Kein Nachweis eines Lern- oder Trainingseffekts dieser Spielvarianten.' };

type KidsRecipe = Pick<TrainingExercise, 'id' | 'title' | 'topic' | 'goal' | 'steps' | 'cues' | 'mistakes' | 'easier' | 'harder' | 'selectionReason'> & {
  older?: boolean;
  players: string;
  supervision: string;
};
const PRESCHOOL_VARIANTS: Record<string, string> = {
  'kids-colour-post': 'Betreuung zeigt einen einzigen großen erreichbaren Farbgriff. Das Kind berührt ihn aus einem direkt begleiteten unterstützten Stand; die Fantasienachricht wird am Boden erzählt. Alternativ nur vom Boden auf die Farbe zeigen, ohne Wandbewegung.',
  'kids-animal-path': 'Eine einzige Tieridee wählen: Die neugierige Katze schaut auf einen von der Betreuung gezeigten Tritt. Dazu bleibt das Kind im direkt begleiteten unterstützten Stand. Als Bodenvariante wird die Katze am Erzählplatz gespielt; kein Tier verlangt Springen oder Hängen.',
  'kids-footprint-map': 'Betreuung zeigt nur einen passenden Fußplatz. Das Kind setzt aus direkt begleitetem unterstütztem Stand einen Fuß darauf und nimmt ihn wieder zurück. Als Bodenalternative zeigt sie am Erzählplatz einen gedachten Fußplatz; keine Folge merken lassen.',
  'kids-shape-detectives': 'Ein großer Griff ist aus direkt begleitetem unterstütztem Stand erreichbar. Das Kind schaut oder berührt ihn und nennt auf Wunsch ein Merkmal. Es bleibt unterstützt und hängt nicht daran; reine Betrachtung vom Boden ist gleichwertig.',
  'kids-story-stations': 'Nur eine gedachte Station wählen. Das Kind besucht einen direkt erreichbaren Kontakt aus begleitetem unterstütztem Stand; die Geschichte endet anschließend am Boden. Die Betreuung kann die ganze Geschichte ohne Wandbewegung am Erzählplatz spielen lassen.',
  'kids-homeward-mission': 'Eine winzige Hin-und-zurück-Handlung: aus direkt begleitetem unterstütztem Stand einen erreichbaren Handkontakt aufnehmen und wieder lösen. Füße bleiben unterstützt. Als Bodenvariante zeigt und erzählt die Betreuung den Heimweg, das Kind muss ihn nicht beklettern.',
};

/** Supervised play ideas, separate from the adult training/duration model. */
export function additionalKidsContent(): TrainingExercise[] {
  const recipes: KidsRecipe[] = [
    {
      id: 'kids-colour-post', title: 'Farbenpost', topic: 'Farben & Entdecken', goal: 'Eine Fantasienachricht zu einem erreichbaren Farbgriff bringen.', players: 'Ein Kind spielt; weitere Kinder kommen nacheinander dran.',
      steps: ['Die Betreuung sucht im Kinderbereich zwei große erreichbare Zielgriffe und zeigt den kurzen Hin- und Rückweg.', 'Das Kind wählt vom Warteplatz einen Zielgriff und denkt sich eine Nachricht aus: „Hallo, blaue Post!“ Es trägt keinen Gegenstand mit.', 'Nach dem Startzeichen bewegt es sich mit beliebigen hilfreichen Griffen und Tritten zum Ziel und kehrt mit der Betreuung zurück.', 'Am Erzählplatz wird die Nachricht laut vorgelesen. Danach darf ein anderes Kind seine eigene Farbenpost wählen; es gibt keine Schnellsten.'],
      cues: ['Die Post reist nur im Kopf.', 'Alle hilfreichen Kontakte dürfen mitspielen.'], mistakes: ['Brief, Tasche oder Spielzeug mit an die Wand nehmen.', 'Eine Farbe verfolgen, deren Griff nicht passend erreichbar ist.'],
      easier: 'Nur einen gut erreichbaren Zielgriff zeigen; Nachricht bereits am Boden sagen.', harder: 'Zwei kurze Nachrichten an zwei vorher geprüfte Zielkontakte planen, ohne den Weg höher zu legen.', selectionReason: 'Einfache Wahl und Fantasiegeschichte für einen ersten betreuten Wandkontakt.',
      supervision: 'Betreuung zeigt die Zielkontakte, gibt jeweils einem Kind den Start frei und begleitet den eingeübten Rückweg. Wartende bleiben am festgelegten Platz außerhalb des Fallbereichs.',
    },
    {
      id: 'kids-animal-path', title: 'Schildkröte oder neugierige Katze?', topic: 'Bewegung & Fantasie', goal: 'Eine kurze bekannte Bewegung mit einem Tierbild beschreiben.', players: 'Ein Kind aktiv; kleine Gruppe nacheinander.',
      steps: ['Betreuung wählt zwei bis drei einfache Bewegungen im Kinderbereich und zeigt Einstieg und Rückweg.', 'Das Kind wählt: Die Schildkröte setzt einen Fuß bedacht; die neugierige Katze schaut ihren nächsten Tritt an.', 'Es probiert den Tierhinweis an der kurzen Passage. Es muss weder auf allen vieren laufen noch springen, schleichen oder besonders langsam hängen.', 'Am Erzählplatz erzählt es, welcher Tierhinweis gepasst hat. Ein anderes Tier darf erfunden werden, wenn die Betreuung die Bewegung vorher prüft.'],
      cues: ['Tierbild statt Mutprobe.', 'Die Katze schaut mit offenen Augen.'], mistakes: ['Froschsprünge oder andere riskante Tierbewegungen daraus machen.', 'Langsames Hängen oder perfekte Lautlosigkeit verlangen.'],
      easier: 'Tieridee vom Boden zeigen und nur eine passende Bewegung ausprobieren.', harder: 'Ein eigenes Tierbild zu einer bereits bekannten Bewegung erklären.', selectionReason: 'Spielerischer Fokus auf Hinschauen oder Setzen, ohne Tempo- oder Ausdauerziel.',
      supervision: 'Betreuung übersetzt die Tieridee in eine konkrete beherrschte Handlung. Sie beendet oder vereinfacht das Spiel, wenn das Kind die Fantasierolle als Sprung- oder Balanceauftrag versteht.',
    },
    {
      id: 'kids-treasure-clues', title: 'Schatzsuche mit zwei Hinweisen', topic: 'Farben & Entdecken', goal: 'Mit einer Beschreibung einen vorher passenden Zielkontakt entdecken.', players: 'Ein Kind sucht; andere Kinder raten vom Warteplatz mit.',
      steps: ['Betreuung wählt einen großen gut erreichbaren Griff an einer kurzen bekannten Passage als unsichtbaren Schatz.', 'Vom Erzählplatz gibt sie zwei Hinweise, etwa Farbe und Lage neben einem anderen Griff. Alle suchen zunächst nur mit den Augen.', 'Das Kind zeigt den vermuteten Griff; die Betreuung bestätigt den Aufbau vor dem Wandversuch. Der Schatz ist gedacht, nichts wird versteckt oder befestigt.', 'Das Kind besucht den Kontakt, kehrt zurück und erklärt seine Lösung. Bei falscher Vermutung gibt es einen neuen Hinweis statt einer Strafe oder eines Zusatzversuchs.'],
      cues: ['Erst entdecken, dann starten.', 'Ein neuer Hinweis hilft beim Rätsel.'], mistakes: ['Gegenstände in Griffen oder im Fallbereich verstecken.', 'Kinder während des Kletterns auf Zuruf zu ungeprüften Zielen schicken.'],
      easier: 'Nur einen sehr deutlichen Farbhinweis geben.', harder: 'Das Kind formuliert vom Boden selbst zwei Hinweise zu einem von der Betreuung geprüften Kontakt.', selectionReason: 'Rätsel und sprachliches Beschreiben; keine Jagd nach Höhe oder verstreuten Gegenständen.',
      supervision: 'Betreuung prüft das tatsächlich erratene Ziel erneut, bevor sie den Start erlaubt. Hinweise entstehen am Erzählplatz, nicht als überraschende Kommandos an der Wand.',
    },
    {
      id: 'kids-footprint-map', title: 'Fußabdrücke auf der Gedankenkarte', topic: 'Füße & Wege', goal: 'Zwei passende Fußplätze ansehen, zeigen und bewusst nutzen.', players: 'Ein Kind aktiv mit Betreuung; andere beobachten nacheinander.',
      steps: ['Betreuung zeigt zwei große erreichbare Tritte und die unterstützenden Handkontakte im Kinderbereich.', 'Das Kind zeichnet die beiden Fußplätze mit dem Finger in die Luft. Es wird nichts auf Matten oder Griffe gemalt.', 'Es schaut den ersten Tritt an, setzt seinen Fuß und probiert dann den zweiten passenden Fußplatz; Umsetzen und Zurückkehren sind erlaubt.', 'Am Erzählplatz sagt es, welcher Fußplatz gut zu sehen war. Die gedachte Karte darf für das nächste Kind angepasst werden.'],
      cues: ['Anschauen, setzen, weitersehen.', 'Die Karte darf sich ändern.'], mistakes: ['Markierungen oder lose Karten in den Fallbereich legen.', 'Eine Fußfolge erzwingen, die für das nächste Kind nicht passt.'],
      easier: 'Nur einen Fußplatz am niedrigen Einstieg zeigen und kennenlernen.', harder: 'Zwei andere gut erreichbare Fußplätze auswählen und die Unterschiede beschreiben.', selectionReason: 'Konkrete Fußorientierung mit einer gedachten Karte, ohne feste Route oder Kontaktverbote.',
      supervision: 'Betreuung zeigt passende Fußplätze für dieses Kind und verfolgt das Umsetzen aus der nötigen Nähe. Sie lässt den Weg verkürzen, wenn die Karte oder der nächste Schritt unklar bleibt.',
    },
    {
      id: 'kids-shape-detectives', title: 'Griff-Detektive', topic: 'Farben & Entdecken', goal: 'Einen gut erreichbaren Griff mit offenen Augen beschreiben.', players: 'Ein Kind untersucht; kleine Gruppe hört am Warteplatz zu.',
      steps: ['Betreuung wählt einen großen gut erreichbaren Griff am niedrigen Einstieg und eine einfache passende Handposition.', 'Das Kind schaut ihn an und beschreibt ein Merkmal, etwa rund, länglich oder mit einer Mulde. Die Augen bleiben offen.', 'Es darf den Griff aus der geprüften unterstützten Position kennenlernen; es muss nicht besonders fest drücken oder sich daran aushängen.', 'Zurück am Erzählplatz erklärt es sein Merkmal. Die Gruppe sucht anschließend vom Boden einen ähnlichen Griff; dessen Benutzung wird separat geprüft.'],
      cues: ['Ein Merkmal reicht für den Fall.', 'Schauen bleibt erlaubt.'], mistakes: ['Blind ertasten lassen oder einen Krafttest veranstalten.', 'Ähnliche Form mit gleicher Erreichbarkeit gleichsetzen.'],
      easier: 'Griffform nur vom Boden ansehen und benennen.', harder: 'Zwei passende Griffe vergleichen und einen Unterschied erzählen.', selectionReason: 'Beschreiben und Wahrnehmen als Spiel, ohne Fingerkraftmessung oder blindes Ertasten.',
      supervision: 'Betreuung wählt Griff und unterstützte Position selbst. Sie achtet darauf, dass aus dem Erforschen kein langes Hängen oder möglichst starkes Zudrücken wird.',
    },
    {
      id: 'kids-story-stations', title: 'Eine Geschichte mit zwei Stationen', topic: 'Bewegung & Fantasie', goal: 'Eine eigene kleine Geschichte mit einer vorher geprüften Passage verbinden.', players: 'Ein erzählendes Kind aktiv; weitere Kinder nacheinander.',
      steps: ['Betreuung wählt zwei gut erreichbare Stationen und den Rückweg im Kinderbereich. Das Kind nennt sie etwa Baumhaus und Wolkenfenster.', 'Am Erzählplatz wird die Geschichte vereinbart: eine Figur besucht eine oder beide Stationen und kommt zurück.', 'Das Kind spielt den kurzen Weg mit normaler Unterstützung. Der Boden darf jederzeit benutzt werden; Aussteigen verändert einfach die Geschichte.', 'Wieder am Erzählplatz erzählt es das Ende. Andere Kinder können die Geschichte mit eigenen passenden Stationen weitererzählen.'],
      cues: ['Die Geschichte darf am Boden weitergehen.', 'Das Kind entscheidet, wann die Figur heimkehrt.'], mistakes: ['Den Boden als verbotene Lava oder Aussteigen als Niederlage darstellen.', 'Während der Bewegung neue ungeprüfte Stationen erfinden lassen.'],
      easier: 'Eine Station besuchen und die Geschichte am Boden erzählen.', harder: 'Das Kind entwirft vorab zwei kurze Stationen; Betreuung bestätigt beide.', selectionReason: 'Selbst gewählte Fantasiehandlung mit einem freiwilligen Ende statt Leistungsdruck.',
      supervision: 'Betreuung hält die vorab vereinbarten Stationen im Blick und respektiert eine frühere Rückkehr. Erzählrunde und wartende Kinder bleiben außerhalb des Fallbereichs.',
    },
    {
      id: 'kids-friendly-mirror', title: 'Freundlicher Spiegel', topic: 'Miteinander', goal: 'Eine beobachtete Idee nacheinander ausprobieren und passend verändern.', players: 'Zwei Kinder nacheinander mit Betreuung.',
      steps: ['Betreuung wählt eine kurze einfache Passage und vereinbart einen klaren Beobachterplatz außerhalb des Fallbereichs.', 'Ein Kind zeigt eine bekannte kleine Idee, etwa auf den nächsten Tritt schauen, und kehrt zurück.', 'Erst danach probiert das andere Kind die Idee. Es darf eigene Tritte und andere hilfreiche Kontakte wählen; niemand muss dieselbe Reichweite haben.', 'Am Erzählplatz nennen beide eine Ähnlichkeit und eine eigene Änderung. Danach können die Rollen wechseln, wenn beide Lust haben.'],
      cues: ['Der Spiegel wartet, bis die Wand frei ist.', 'Ähnlich darf trotzdem anders aussehen.'], mistakes: ['Beide Kinder gleichzeitig nebeneinander nachmachen lassen.', 'Eine größere Person zum verpflichtenden Bewegungsmaß machen.'],
      easier: 'Betreuung zeigt die Idee vom Boden; nur ein Kind probiert sie.', harder: 'Kinder erklären eine eigene passende Änderung, bevor sie starten.', selectionReason: 'Nacheinander beobachten und anpassen statt gleichzeitiger Verfolgung an der Wand.',
      supervision: 'Betreuung organisiert den Rollenwechsel erst nach vollständiger Rückkehr und prüft den Aufbau für jedes Kind. Sie korrigiert nicht jede Abweichung von der ersten Lösung.',
    },
    {
      id: 'kids-route-builders', title: 'Kleine Wegbaumeister', topic: 'Füße & Wege', older: true, goal: 'Eine sehr kurze Passage gemeinsam vom Boden entwerfen.', players: 'Zwei Kinder entwerfen nacheinander; Betreuung bestätigt jede Idee.',
      steps: ['Betreuung zeigt einen passenden niedrigen Start und mögliche gute Kontakte im Kinderbereich; Griffe werden nicht versetzt.', 'Ein Kind schlägt vom Erzählplatz zwei kleine Bewegungen vor. Die Betreuung prüft Reichweite, Unterstützung und Rückweg.', 'Das andere Kind darf eine passende Idee ergänzen oder verändern. Die Geschichte bleibt bei höchstens drei Bewegungen; niemand muss Kontakte weglassen.', 'Ein Kind probiert den bestätigten Weg, kehrt zurück und sagt, was passend war. Das nächste Kind bekommt einen für sich geprüften Weg statt einer immer längeren Kette.'],
      cues: ['Gebaut wird mit Ideen, nicht mit Schrauben.', 'Drei Bewegungen reichen für ein kleines Bauwerk.'], mistakes: ['Eine wachsende Kette bis zur Erschöpfung sammeln.', 'Vorschläge ohne Betreuungsprüfung sofort beklettern.'],
      easier: 'Betreuung bietet zwei passende Wege an; Kind wählt einen.', harder: 'Kind erklärt einen eigenen passenden Weg für eine andere Person; Betreuung passt ihn vor dem Start an.', selectionReason: 'Kurzes gemeinsames Gestalten; keine Anwendung unverändert übernommener Add-on-Regeln.',
      supervision: 'Betreuung prüft jeden Vorschlag und begrenzt die Folge auf die vereinbarte kurze Passage. Nur ein Kind klettert; andere planen am Erzählplatz und verändern keine Wandgriffe.',
    },
    {
      id: 'kids-move-memory', title: 'Zwei Bewegungen merken', topic: 'Füße & Wege', goal: 'Eine kleine bekannte Folge erinnern und beim Anschauen wiedererkennen.', players: 'Ein Kind aktiv; ein anderes Kind kann am Warteplatz miterzählen.',
      steps: ['Betreuung zeigt eine bekannte passende Folge aus zwei Bewegungen samt Rückweg.', 'Das Kind beschreibt beide Bewegungen vom Erzählplatz, etwa „Fuß auf den großen Tritt, Hand zum runden Griff“.', 'Es probiert die Folge mit offenen Augen. Es darf korrigieren, zusätzliche Kontakte nutzen oder zum Boden zurückkehren.', 'Danach vergleicht es seine Erinnerung mit dem Weg. Eine hilfreiche Korrektur gilt als Entdeckung; es gibt keinen Fehlerpunkt oder erzwungenen Wiederholungsversuch.'],
      cues: ['Merken und Hinschauen spielen zusammen.', 'Eine Korrektur ist eine Entdeckung.'], mistakes: ['Augen schließen oder Kontakte verdecken.', 'Unpassende Reihenfolge wegen des Memoryspiels erzwingen.'],
      easier: 'Nur eine Bewegung erinnern; Betreuung sagt die Idee vor dem Start erneut.', harder: 'Eine bekannte Folge mit einer zweiten passenden Idee vergleichen; nicht einfach mehr Bewegungen sammeln.', selectionReason: 'Kurze Erinnerung mit voller visueller Kontrolle und erlaubter Anpassung.',
      supervision: 'Betreuung zeigt nur bereits passende Bewegungen und lässt die Folge verkürzen. Sie wartet mit der Besprechung bis zur Rückkehr und gibt keine überraschenden Ziele vor.',
    },
    {
      id: 'kids-choice-lab', title: 'Mein Weg, dein Weg', topic: 'Miteinander', older: true, goal: 'Zwei passende Ideen für einen kurzen Übergang kennenlernen, ohne sie zu bewerten.', players: 'Zwei Kinder nacheinander; auch allein mit Betreuung spielbar.',
      steps: ['Betreuung wählt einen einfachen Übergang mit mehreren passenden großen Kontaktmöglichkeiten und Rückweg.', 'Beide Kinder nennen vom Erzählplatz eine Idee. Die Betreuung prüft sie für das jeweils kletternde Kind.', 'Nacheinander wird eine passende eigene Idee ausprobiert; fremde Griffe oder zusätzliche Tritte bleiben erlaubt.', 'Zurück am Erzählplatz findet die Gruppe einen Unterschied. Beide Wege dürfen gut sein; es gibt kein Duell um Tempo, Höhe oder Schwierigkeit.'],
      cues: ['Zwei passende Wege dürfen gewinnen.', 'Unterschiede sind interessant, keine Fehler.'], mistakes: ['Alle Kinder auf dieselbe Hand-/Fußfolge festlegen.', 'Für einen zweiten Weg nötige Unterstützung verbieten.'],
      easier: 'Betreuung zeigt zwei Möglichkeiten vom Boden und lässt das Kind wählen.', harder: 'Ein Kind erklärt, warum es seine Idee verändert hat.', selectionReason: 'Gemeinsames Vergleichen ohne Rangliste oder verpflichtende Partnerbeta.',
      supervision: 'Betreuung bestätigt jeden persönlichen Aufbau vor dem Start und behandelt Änderungen als zulässige Lösung. Der Gesprächsplatz bleibt von der aktiven Passage getrennt.',
    },
    {
      id: 'kids-helper-interview', title: 'Eine Frage an den Kletterfreund', topic: 'Miteinander', older: true, goal: 'Eine Beobachtung in eine freundliche Frage verwandeln.', players: 'Zwei Kinder mit Betreuung, Rollen nacheinander.',
      steps: ['Betreuung wählt bekannte leichte Passage und zeigt dem fragenden Kind einen Warteplatz außerhalb des Fallbereichs.', 'Ein Kind probiert den kurzen Weg, das andere merkt sich eine freundliche Frage, etwa „Welcher Tritt war gut zu sehen?“', 'Erst am Erzählplatz stellt es die Frage. Das kletternde Kind darf antworten, zeigen oder einfach passen.', 'Betreuung hilft beim Verstehen; danach können die Rollen wechseln. Helfen heißt zuhören, nicht das andere Kind während des Kletterns anfassen oder kommandieren.'],
      cues: ['Eine Frage, keine Fehlerliste.', 'Passen ist eine erlaubte Antwort.'], mistakes: ['Während der Bewegung Anweisungen oder Kritik zurufen.', 'Kinder zum gegenseitigen Stützen oder Auffangen einsetzen.'],
      easier: 'Betreuung bietet eine fertige Frage an.', harder: 'Kind formuliert eine eigene konkrete Beobachtungsfrage.', selectionReason: 'Freundliches Gespräch und Rollenwechsel; keine Techniknote oder therapeutische Auswertung.',
      supervision: 'Betreuung hört das kurze Gespräch mit an, unterstützt respektvolle Fragen und übernimmt jede nötige körperliche Hilfestellung selbst nach Einweisung. Kinder übernehmen keine Sicherungsaufgabe.',
    },
    {
      id: 'kids-homeward-mission', title: 'Die Heimweg-Mission', topic: 'Füße & Wege', goal: 'Für einen kurzen Besuch an der Wand den passenden Rückweg kennenlernen.', players: 'Ein Kind aktiv mit Betreuung; andere Kinder warten außerhalb des Fallbereichs.',
      steps: ['Betreuung zeigt niedrigen Start, einen gut erreichbaren Besuchspunkt und geeignete Rückwegkontakte im Kinderbereich.', 'Das Kind erzählt vom Boden: „Da besuche ich meine Figur, so komme ich wieder heim.“ Betreuung klärt unklare Schritte vor dem Start.', 'Es geht nur bis zum vereinbarten Punkt und kehrt kontrolliert zurück. Zur Heimweg-Mission gehören hilfreiche Zusatzkontakte und ein früheres Ende.', 'Am Erzählplatz benennt es einen hilfreichen Rückwegkontakt. Die Mission endet mit der Rückkehr, nicht mit einem Absprung, Rutschen oder immer höherem Besuchspunkt.'],
      cues: ['Hinweg und Heimweg gehören zusammen.', 'Früher heimkehren ist erlaubt.'], mistakes: ['Erst oben nach einem Rückweg suchen lassen.', 'Abspringen oder eine nicht zugesicherte Rutsche zum Spielabschluss machen.'],
      easier: 'Nur eine kleine Bewegung hin und zurück mit direkter Begleitung.', harder: 'Ein Kind beschreibt einen weiteren passenden Rückwegkontakt; Betreuung prüft den kurzen Aufbau erneut.', selectionReason: 'Rückweg als Teil einer Geschichte, ohne Fall-, Sprung- oder Mutprobe.',
      supervision: 'Betreuung kennt den gesamten persönlichen Rückweg und begleitet nach Fähigkeit aus passender Nähe. Sie lässt keinen ungeklärten höheren Besuchspunkt oder Sprungabschluss entstehen.',
    },
  ];
  return recipes.map(({ older, players, supervision, ...recipe }) => ({
    ...recipe, area: 'kids', format: 'game', equipment: 'Boulderwand', contentKind: 'exercise', planEligible: false, kwsAvailable: true,
    level: 'Mit Betreuung im KWS-Kinderboulderbereich', minutes: 0,
    kidsGuide: {
      audience: PRESCHOOL_VARIANTS[recipe.id] ? 'both' : 'school',
      preschoolVariant: PRESCHOOL_VARIANTS[recipe.id],
      ageLabel: PRESCHOOL_VARIANTS[recipe.id] ? 'Kita & Schule · Orientierung' : 'Schulalter · Orientierung',
      durationLabel: 'Etwa 5–10 Min.',
      playersLabel: 'Ein Kind aktiv',
      ages: PRESCHOOL_VARIANTS[recipe.id] ? 'Kita- und Schulkinder nach individueller Einschätzung: eine verständliche Handlung, passende direkte Begleitung und örtliche Hausregeln entscheiden. Für Kita-Kinder die eigene vereinfachte Variante nutzen; kein fester Geburtstag als Freigabe.' : older ? 'Schulkinder, die kurze Absprachen, Rollenwechsel und persönliche Anpassungen verstehen. Fähigkeit, Einweisung und Hausregeln entscheiden; kein starrer Alterscutoff.' : 'Schulkinder, die eine kurze Spielregel verstehen und die eigene passende Bewegung mit Betreuung ausführen können. Einweisung und Hausregeln entscheiden, nicht ein fester Geburtstag.',
      players,
      duration: 'Grob 5–10 Minuten mit Erklären, Warten und Pausen; keine Pflichtzeit oder Trainingsdosis.',
      supervision,
    },
    dose: 'Betreute Spielidee ohne Satz-, Wiederholungs- oder Kraftvorgabe. Das Kind darf früher aufhören.',
    rest: 'Am Erzählplatz ausruhen; nur freiwillig weiterspielen, wenn Kind und Betreuung wieder bereit sind.',
    setupRequirements: ['Hausregeln und eine Einweisung durch eine für Kinderbouldern fachkundige Person klären; Betreuung kennt Aufsicht, Begleitung und Rückweg', 'Betreuung wählt für dieses Kind große passende Kontakte, einen kurzen niedrigen Weg und den Rückweg', 'Warte-/Erzählplatz außerhalb des Fallbereichs festlegen; Gegenstände bleiben dort', 'Aufsichtsform und Gruppengröße vor Ort festlegen; neue oder hilfebedürftige Kinder körpernah und eingriffsbereit begleiten'],
    note: `${PRESCHOOL_VARIANTS[recipe.id] ? 'Für Kita-Kinder gilt die eigene vereinfachte Einzelhandlung mit direkter Begleitung oder Bodenalternative; die längere Grundfolge ist keine Pflicht. ' : ''}Eigene redaktionelle Spielvariante, noch nicht fachlich freigegeben. Alter und Rundendauer sind nur Orientierung; keine wissenschaftlich validierten Eignungsgrenzen. Betreuung entscheidet nach Kind, Aufbau und Hausregeln. Diese Karte prüft weder die KWS-Ausstattung noch die Eignung eines Kindes. Bei Schmerz oder Unwohlsein beenden. Bei Angst, Müdigkeit oder fehlender Lust darf das Kind zuschauen oder aufhören; kein Überreden.`,
    keywords: [recipe.title, recipe.topic, 'kinder', 'kinderspiel', 'betreuung', 'kinderbouldern', 'spiel'],
    sources: [DAV_INDOOR, DAV_CHILDREN, DGUV, DAV_SETTING],
  }));
}
