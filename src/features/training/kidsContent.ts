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
  'kids-colour-post': 'Betreuung zeigt einen erreichbaren Farbgriff. Kind berührt ihn im direkt begleiteten, unterstützten Stand. Nachricht am Boden erzählen. Alternative: vom Boden auf die Farbe zeigen.',
  'kids-animal-path': 'Eine Tieridee: Die Katze schaut einen gezeigten Tritt an. Kind bleibt im direkt begleiteten, unterstützten Stand. Alternative: Katze am Erzählplatz spielen, ohne Wandbewegung.',
  'kids-footprint-map': 'Einen gezeigten Tritt aus direkt begleitetem, unterstütztem Stand mit einem Fuß berühren und zurücknehmen. Alternative: Fußplatz vom Boden zeigen. Keine Folge merken lassen.',
  'kids-shape-detectives': 'Einen erreichbaren Griff aus direkt begleitetem, unterstütztem Stand anschauen oder berühren. Ein Merkmal nennen. Alternative: nur vom Boden betrachten; nicht daran hängen.',
  'kids-story-stations': 'Eine erreichbare Station aus direkt begleitetem, unterstütztem Stand besuchen; Geschichte am Boden beenden. Alternative: ganze Geschichte ohne Wandbewegung am Erzählplatz spielen.',
  'kids-homeward-mission': 'Aus direkt begleitetem, unterstütztem Stand einen erreichbaren Handgriff berühren und wieder lösen. Füße bleiben unterstützt. Alternative: Heimweg vom Boden zeigen und erzählen.',
};

/** Supervised play ideas, separate from the adult training/duration model. */
export function additionalKidsContent(): TrainingExercise[] {
  const recipes: KidsRecipe[] = [
    {
      id: 'kids-colour-post', title: 'Farbenpost', topic: 'Farben & Entdecken', goal: 'Eine gedachte Nachricht zu einem Farbgriff bringen.', players: 'Ein Kind spielt; weitere Kinder kommen nacheinander dran.',
      steps: ['Betreuung zeigt zwei passende Farbgriffe und den kurzen Hin- und Rückweg.', 'Kind wählt eine Farbe und denkt sich eine Nachricht aus. Keine Gegenstände mitnehmen.', 'Nach dem Startzeichen den Griff besuchen und begleitet zurückkehren. Alle hilfreichen Kontakte sind erlaubt.', 'Am Erzählplatz die Nachricht sagen. Danach ist das nächste Kind dran; kein Wettrennen.'],
      cues: ['Die Post reist nur im Kopf.', 'Alle hilfreichen Kontakte dürfen mitspielen.'], mistakes: ['Brief, Tasche oder Spielzeug mit an die Wand nehmen.', 'Eine Farbe verfolgen, deren Griff nicht passend erreichbar ist.'],
      easier: 'Nur einen gut erreichbaren Zielgriff zeigen; Nachricht bereits am Boden sagen.', harder: 'Zwei kurze Nachrichten an zwei vorher geprüfte Zielkontakte planen, ohne den Weg höher zu legen.', selectionReason: 'Einfache Wahl und Fantasiegeschichte für einen ersten betreuten Wandkontakt.',
      supervision: 'Ziel und Rückweg vorzeigen. Ein Kind starten lassen und direkt begleiten; Wartende bleiben außerhalb des Fallbereichs.',
    },
    {
      id: 'kids-animal-path', title: 'Schildkröte oder neugierige Katze?', topic: 'Bewegung & Fantasie', goal: 'Mit einer Tieridee gezielt schauen oder einen Fuß setzen.', players: 'Ein Kind aktiv; kleine Gruppe nacheinander.',
      steps: ['Betreuung zeigt einen kurzen passenden Weg und den Rückweg.', 'Kind wählt: Schildkröte setzt den Fuß bedacht; Katze schaut den nächsten Tritt an.', 'Eine Bewegung mit diesem Hinweis probieren und begleitet zurückkehren. Kein Springen oder langes Hängen.', 'Am Erzählplatz erzählen, welche Tieridee geholfen hat. Andere Tiere vorab mit der Betreuung besprechen.'],
      cues: ['Tierbild statt Mutprobe.', 'Die Katze schaut mit offenen Augen.'], mistakes: ['Froschsprünge oder andere riskante Tierbewegungen daraus machen.', 'Langsames Hängen oder perfekte Lautlosigkeit verlangen.'],
      easier: 'Tieridee vom Boden zeigen und nur eine passende Bewegung ausprobieren.', harder: 'Ein eigenes Tierbild zu einer bereits bekannten Bewegung erklären.', selectionReason: 'Spielerischer Fokus auf Hinschauen oder Setzen, ohne Tempo- oder Ausdauerziel.',
      supervision: 'Tieridee als kleine Bewegung erklären. Bei Sprung- oder Balanceideen vereinfachen; keine Mutprobe.',
    },
    {
      id: 'kids-treasure-clues', title: 'Schatzsuche mit zwei Hinweisen', topic: 'Farben & Entdecken', goal: 'Einen gedachten Schatzgriff durch zwei Hinweise finden.', players: 'Ein Kind sucht; andere Kinder raten vom Warteplatz mit.',
      steps: ['Betreuung wählt einen erreichbaren Griff als gedachten Schatz. Nichts verstecken.', 'Am Erzählplatz zwei Hinweise geben, etwa Farbe und Form. Erst mit den Augen suchen.', 'Kind zeigt den vermuteten Griff. Betreuung prüft Ziel und Rückweg, bevor es startet.', 'Griff besuchen, begleitet zurückkehren und Lösung erklären. Bei falschem Raten einen neuen Hinweis geben.'],
      cues: ['Erst entdecken, dann starten.', 'Ein neuer Hinweis hilft beim Rätsel.'], mistakes: ['Gegenstände in Griffen oder im Fallbereich verstecken.', 'Kinder während des Kletterns auf Zuruf zu ungeprüften Zielen schicken.'],
      easier: 'Nur einen sehr deutlichen Farbhinweis geben.', harder: 'Das Kind formuliert vom Boden selbst zwei Hinweise zu einem von der Betreuung geprüften Kontakt.', selectionReason: 'Rätsel und sprachliches Beschreiben; keine Jagd nach Höhe oder verstreuten Gegenständen.',
      supervision: 'Das erratene Ziel vor dem Start bestätigen. Keine überraschenden Ziele während des Kletterns zurufen.',
    },
    {
      id: 'kids-footprint-map', title: 'Meine zwei Fußplätze', topic: 'Füße & Wege', goal: 'Zwei Tritte anschauen und gezielt nutzen.', players: 'Ein Kind aktiv mit Betreuung; andere beobachten nacheinander.',
      steps: ['Betreuung zeigt zwei passende Tritte, Handgriffe und Rückweg.', 'Kind zeigt mit dem Finger, wo seine Füße landen sollen. Keine Markierungen auf Matten oder Griffen.', 'Ersten Tritt anschauen, Fuß setzen und dann den zweiten probieren. Korrigieren oder zurückkehren ist erlaubt.', 'Am Erzählplatz sagen, welcher Tritt gut sichtbar war. Für das nächste Kind die Plätze neu prüfen.'],
      cues: ['Anschauen, setzen, weitersehen.', 'Die Karte darf sich ändern.'], mistakes: ['Markierungen oder lose Karten in den Fallbereich legen.', 'Eine Fußfolge erzwingen, die für das nächste Kind nicht passt.'],
      easier: 'Nur einen Fußplatz am niedrigen Einstieg zeigen und kennenlernen.', harder: 'Zwei andere gut erreichbare Fußplätze auswählen und die Unterschiede beschreiben.', selectionReason: 'Konkrete Fußorientierung mit einer gedachten Karte, ohne feste Route oder Kontaktverbote.',
      supervision: 'Passende Tritte zeigen und aus nötiger Nähe begleiten. Bei unklarem Schritt den Weg verkürzen.',
    },
    {
      id: 'kids-shape-detectives', title: 'Griff-Detektive', topic: 'Farben & Entdecken', goal: 'Eine Griffform entdecken und beschreiben.', players: 'Ein Kind untersucht; kleine Gruppe hört am Warteplatz zu.',
      steps: ['Betreuung wählt einen großen erreichbaren Griff und zeigt einen unterstützten Stand.', 'Kind nennt ein Merkmal: rund, lang oder mit einer Mulde. Augen bleiben offen.', 'Aus unterstütztem Stand anschauen oder berühren. Nicht fest zudrücken oder daran hängen.', 'Am Erzählplatz das Merkmal erzählen. Die Gruppe sucht vom Boden einen ähnlichen Griff.'],
      cues: ['Ein Merkmal reicht für den Fall.', 'Schauen bleibt erlaubt.'], mistakes: ['Blind ertasten lassen oder einen Krafttest veranstalten.', 'Ähnliche Form mit gleicher Erreichbarkeit gleichsetzen.'],
      easier: 'Griffform nur vom Boden ansehen und benennen.', harder: 'Zwei passende Griffe vergleichen und einen Unterschied erzählen.', selectionReason: 'Beschreiben und Wahrnehmen als Spiel, ohne Fingerkraftmessung oder blindes Ertasten.',
      supervision: 'Griff und unterstützten Stand wählen. Entdecken bedeutet anschauen oder berühren, keinen Krafttest.',
    },
    {
      id: 'kids-story-stations', title: 'Eine Geschichte mit zwei Stationen', topic: 'Bewegung & Fantasie', goal: 'Eine kleine Geschichte an zwei erreichbaren Stationen spielen.', players: 'Ein erzählendes Kind aktiv; weitere Kinder nacheinander.',
      steps: ['Betreuung zeigt zwei passende Stationen und Rückweg. Kind gibt ihnen Namen, etwa Baumhaus und Fenster.', 'Am Erzählplatz eine kurze Geschichte ausdenken: Figur besucht eine Station und kommt heim.', 'Den vereinbarten Weg begleitet spielen. Der Boden darf jederzeit benutzt werden.', 'Am Erzählplatz das Ende erzählen. Für das nächste Kind die Stationen passend wählen.'],
      cues: ['Die Geschichte darf am Boden weitergehen.', 'Das Kind entscheidet, wann die Figur heimkehrt.'], mistakes: ['Den Boden als verbotene Lava oder Aussteigen als Niederlage darstellen.', 'Während der Bewegung neue ungeprüfte Stationen erfinden lassen.'],
      easier: 'Eine Station besuchen und die Geschichte am Boden erzählen.', harder: 'Das Kind entwirft vorab zwei kurze Stationen; Betreuung bestätigt beide.', selectionReason: 'Selbst gewählte Fantasiehandlung mit einem freiwilligen Ende statt Leistungsdruck.',
      supervision: 'Stationen vor dem Start bestätigen. Frühere Rückkehr respektieren; Erzählrunde bleibt außerhalb des Fallbereichs.',
    },
    {
      id: 'kids-friendly-mirror', title: 'Freundlicher Spiegel', topic: 'Miteinander', goal: 'Eine kleine Bewegungsidee nacheinander nachmachen.', players: 'Zwei Kinder nacheinander mit Betreuung.',
      steps: ['Betreuung zeigt eine passende kleine Bewegung; Beobachtungsplatz außerhalb des Fallbereichs festlegen.', 'Ein Kind zeigt eine bekannte Idee, etwa einen Griff aus unterstütztem Stand berühren, und kehrt zurück.', 'Erst danach probiert das andere Kind die Idee. Eigene Tritte und passende Reichweite sind erlaubt.', 'Am Erzählplatz eine Ähnlichkeit nennen. Rollen wechseln, wenn beide möchten.'],
      cues: ['Der Spiegel wartet, bis die Wand frei ist.', 'Ähnlich darf trotzdem anders aussehen.'], mistakes: ['Beide Kinder gleichzeitig nebeneinander nachmachen lassen.', 'Eine größere Person zum verpflichtenden Bewegungsmaß machen.'],
      easier: 'Betreuung zeigt die Idee vom Boden; nur ein Kind probiert sie.', harder: 'Kinder erklären eine eigene passende Änderung, bevor sie starten.', selectionReason: 'Nacheinander beobachten und anpassen statt gleichzeitiger Verfolgung an der Wand.',
      supervision: 'Immer nacheinander spielen. Erst nach vollständiger Rückkehr wechseln; die Bewegung für jedes Kind prüfen.',
    },
    {
      id: 'kids-route-builders', title: 'Kleine Wegbaumeister', topic: 'Füße & Wege', older: true, goal: 'Gemeinsam einen Weg mit höchstens drei Bewegungen planen.', players: 'Zwei Kinder entwerfen nacheinander; Betreuung bestätigt jede Idee.',
      steps: ['Betreuung zeigt niedrigen Start, gute Kontakte und Rückweg. Keine Griffe versetzen.', 'Ein Kind schlägt vom Boden zwei Bewegungen vor. Betreuung prüft sie für das kletternde Kind.', 'Das andere Kind darf eine passende dritte Bewegung ergänzen. Alle hilfreichen Kontakte bleiben erlaubt.', 'Bestätigten Weg ausprobieren und begleitet zurückkehren. Für das nächste Kind neu prüfen; Kette nicht weiter verlängern.'],
      cues: ['Gebaut wird mit Ideen, nicht mit Schrauben.', 'Drei Bewegungen reichen für ein kleines Bauwerk.'], mistakes: ['Eine wachsende Kette bis zur Erschöpfung sammeln.', 'Vorschläge ohne Betreuungsprüfung sofort beklettern.'],
      easier: 'Betreuung bietet zwei passende Wege an; Kind wählt einen.', harder: 'Kind erklärt einen eigenen passenden Weg für eine andere Person; Betreuung passt ihn vor dem Start an.', selectionReason: 'Kurzes gemeinsames Gestalten; keine Anwendung unverändert übernommener Add-on-Regeln.',
      supervision: 'Jede Idee vor dem Start prüfen. Ein Kind klettert, andere planen am Erzählplatz außerhalb des Fallbereichs.',
    },
    {
      id: 'kids-move-memory', title: 'Zwei Bewegungen merken', topic: 'Füße & Wege', goal: 'Zwei bekannte Bewegungen merken und ausprobieren.', players: 'Ein Kind aktiv; ein anderes Kind kann am Warteplatz miterzählen.',
      steps: ['Betreuung zeigt zwei passende Bewegungen und Rückweg.', 'Kind nennt sie vom Erzählplatz, etwa: Fuß zum großen Tritt, Hand zum runden Griff.', 'Mit offenen Augen probieren. Zusatzkontakte, Korrekturen und Rückkehr zum Boden sind erlaubt.', 'Am Erzählplatz Erinnerung und Bewegung vergleichen. Kein Fehlerpunkt und kein erzwungener Wiederholungsversuch.'],
      cues: ['Merken und Hinschauen spielen zusammen.', 'Eine Korrektur ist eine Entdeckung.'], mistakes: ['Augen schließen oder Kontakte verdecken.', 'Unpassende Reihenfolge wegen des Memoryspiels erzwingen.'],
      easier: 'Nur eine Bewegung erinnern; Betreuung sagt die Idee vor dem Start erneut.', harder: 'Eine bekannte Folge mit einer zweiten passenden Idee vergleichen; nicht einfach mehr Bewegungen sammeln.', selectionReason: 'Kurze Erinnerung mit voller visueller Kontrolle und erlaubter Anpassung.',
      supervision: 'Nur passende bekannte Bewegungen zeigen. Bei Bedarf auf eine verkürzen; erst nach der Rückkehr besprechen.',
    },
    {
      id: 'kids-choice-lab', title: 'Mein Weg, dein Weg', topic: 'Miteinander', older: true, goal: 'Zwei eigene Wege vergleichen.', players: 'Zwei Kinder nacheinander; auch allein mit Betreuung spielbar.',
      steps: ['Betreuung wählt einfachen Übergang mit mehreren guten Kontakten und Rückweg.', 'Beide Kinder nennen vom Erzählplatz eine Idee. Betreuung prüft jede für das jeweilige Kind.', 'Nacheinander die eigene Idee probieren und begleitet zurückkehren. Zusätzliche hilfreiche Kontakte sind erlaubt.', 'Am Erzählplatz einen Unterschied finden. Beide Wege dürfen gut sein; kein Duell um Tempo oder Höhe.'],
      cues: ['Zwei passende Wege dürfen gewinnen.', 'Unterschiede sind interessant, keine Fehler.'], mistakes: ['Alle Kinder auf dieselbe Hand-/Fußfolge festlegen.', 'Für einen zweiten Weg nötige Unterstützung verbieten.'],
      easier: 'Betreuung zeigt zwei Möglichkeiten vom Boden und lässt das Kind wählen.', harder: 'Ein Kind erklärt, warum es seine Idee verändert hat.', selectionReason: 'Gemeinsames Vergleichen ohne Rangliste oder verpflichtende Partnerbeta.',
      supervision: 'Jeden persönlichen Weg vor dem Start bestätigen. Änderungen sind erlaubt; Gesprächsplatz bleibt außerhalb des Fallbereichs.',
    },
    {
      id: 'kids-helper-interview', title: 'Eine Frage an den Kletterfreund', topic: 'Miteinander', older: true, goal: 'Nach dem Klettern eine freundliche Frage stellen.', players: 'Zwei Kinder mit Betreuung, Rollen nacheinander.',
      steps: ['Betreuung zeigt leichte Passage und Beobachtungsplatz außerhalb des Fallbereichs.', 'Ein Kind klettert den kurzen Weg. Das andere merkt sich eine Frage, etwa: Welcher Tritt war gut zu sehen?', 'Erst am Erzählplatz fragen. Antworten, zeigen oder passen ist erlaubt.', 'Betreuung hilft beim Verstehen; Rollen wechseln. Kinder übernehmen keine Stütz- oder Auffangaufgabe.'],
      cues: ['Eine Frage, keine Fehlerliste.', 'Passen ist eine erlaubte Antwort.'], mistakes: ['Während der Bewegung Anweisungen oder Kritik zurufen.', 'Kinder zum gegenseitigen Stützen oder Auffangen einsetzen.'],
      easier: 'Betreuung bietet eine fertige Frage an.', harder: 'Kind formuliert eine eigene konkrete Beobachtungsfrage.', selectionReason: 'Freundliches Gespräch und Rollenwechsel; keine Techniknote oder therapeutische Auswertung.',
      supervision: 'Gespräch begleiten. Körperliche Hilfestellung übernimmt die eingewiesene Betreuung, keine anderen Kinder.',
    },
    {
      id: 'kids-homeward-mission', title: 'Die Heimweg-Mission', topic: 'Füße & Wege', goal: 'Eine Figur besuchen und kontrolliert heimkehren.', players: 'Ein Kind aktiv mit Betreuung; andere Kinder warten außerhalb des Fallbereichs.',
      steps: ['Betreuung zeigt niedrigen Start, erreichbaren Besuchspunkt und Rückwegkontakte.', 'Kind zeigt vom Boden: Dort besuche ich meine Figur, so komme ich heim. Unklaren Rückweg vorher klären.', 'Nur bis zum vereinbarten Punkt gehen und begleitet zurückkehren. Früher heimkehren ist erlaubt.', 'Am Erzählplatz einen hilfreichen Rückweggriff nennen. Abschluss ist die Rückkehr, kein Absprung oder Rutschen.'],
      cues: ['Hinweg und Heimweg gehören zusammen.', 'Früher heimkehren ist erlaubt.'], mistakes: ['Erst oben nach einem Rückweg suchen lassen.', 'Abspringen oder eine nicht zugesicherte Rutsche zum Spielabschluss machen.'],
      easier: 'Nur eine kleine Bewegung hin und zurück mit direkter Begleitung.', harder: 'Ein Kind beschreibt einen weiteren passenden Rückwegkontakt; Betreuung prüft den kurzen Aufbau erneut.', selectionReason: 'Rückweg als Teil einer Geschichte, ohne Fall-, Sprung- oder Mutprobe.',
      supervision: 'Den persönlichen Rückweg kennen und passend nah begleiten. Kein ungeklärter höherer Besuchspunkt und kein Sprungabschluss.',
    },
  ];
  return recipes.map(({ older, players, supervision, ...recipe }) => ({
    ...recipe, area: 'kids', format: 'game', equipment: 'Boulderwand', contentKind: 'exercise', planEligible: false, kwsAvailable: true,
    level: 'Mit Betreuung im KWS-Kinderboulderbereich', minutes: 0,
    kidsGuide: {
      audience: PRESCHOOL_VARIANTS[recipe.id] ? 'both' : 'school',
      preschoolVariant: PRESCHOOL_VARIANTS[recipe.id],
      ageLabel: PRESCHOOL_VARIANTS[recipe.id] ? 'Kita & Schule' : 'Schulalter',
      durationLabel: 'Etwa 5–10 Min.',
      playersLabel: 'Ein Kind aktiv',
      ages: PRESCHOOL_VARIANTS[recipe.id] ? 'Kita: die vereinfachte Einzelhandlung oder Bodenidee nutzen. Schule: kurze Spielregel verständlich erklären. Fähigkeit, Begleitung und Hausregeln entscheiden, nicht der Geburtstag.' : older ? 'Für Schulkinder, die kurze Absprachen und Rollenwechsel verstehen. Fähigkeit, Begleitung und Hausregeln vor Ort prüfen.' : 'Für Schulkinder, die die Regel verstehen und die Bewegung begleitet ausführen können. Fähigkeit und Hausregeln vor Ort prüfen.',
      players,
      duration: 'Grob 5–10 Minuten mit Erklären, Warten und Pausen; keine Pflichtzeit oder Trainingsdosis.',
      supervision,
    },
    dose: 'Betreute Spielidee ohne Satz-, Wiederholungs- oder Kraftvorgabe. Das Kind darf früher aufhören.',
    rest: 'Am Erzählplatz ausruhen; nur freiwillig weiterspielen, wenn Kind und Betreuung wieder bereit sind.',
    setupRequirements: ['Hausregeln und Aufsicht mit einer fachkundigen Person klären; neue oder hilfebedürftige Kinder körpernah begleiten', 'Große erreichbare Kontakte, kurzen niedrigen Weg und Rückweg für dieses Kind prüfen', 'Warte- und Erzählplatz außerhalb des Fallbereichs; Gegenstände bleiben dort'],
    note: 'Bei Schmerz oder Unwohlsein beenden. Bei Angst, Müdigkeit oder fehlender Lust darf das Kind zuschauen oder aufhören. Kein Überreden.',
    keywords: [recipe.title, recipe.topic, 'kinder', 'kinderspiel', 'betreuung', 'kinderbouldern', 'spiel'],
    sources: [DAV_INDOOR, DAV_CHILDREN, DGUV, DAV_SETTING],
  }));
}
