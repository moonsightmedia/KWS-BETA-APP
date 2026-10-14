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
  'kids-colour-post': 'Betreuung sichert direkt den Stand. Kind berührt einen gezeigten Farbgriff; erzählt die Nachricht am Boden. Ohne Klettern: vom Boden auf die Farbe zeigen.',
  'kids-animal-path': 'Betreuung sichert direkt den Stand. Die Katze schaut einen gezeigten Tritt an. Ohne Klettern: Katze am Erzählplatz spielen.',
  'kids-footprint-map': 'Betreuung sichert direkt den Stand. Einen Tritt mit dem Fuß berühren und zurücknehmen. Ohne Klettern: Fußplatz vom Boden zeigen. Keine Folge merken lassen.',
  'kids-shape-detectives': 'Betreuung sichert direkt den Stand. Erreichbaren Griff anschauen oder berühren, ein Merkmal nennen. Nicht daran hängen. Ohne Klettern: vom Boden ansehen.',
  'kids-story-stations': 'Betreuung sichert direkt den Stand. Eine erreichbare Station besuchen; Geschichte am Boden beenden. Ohne Klettern: Geschichte am Erzählplatz spielen.',
  'kids-homeward-mission': 'Betreuung sichert direkt den Stand; Füße bleiben unterstützt. Einen erreichbaren Griff berühren und lösen. Ohne Klettern: Heimweg vom Boden zeigen und erzählen.',
};

/** Supervised play ideas, separate from the adult training/duration model. */
export function additionalKidsContent(): TrainingExercise[] {
  const recipes: KidsRecipe[] = [
    {
      id: 'kids-colour-post', title: 'Farbenpost', topic: 'Farben & Entdecken', goal: 'Eine Nachricht zu einem Farbgriff bringen.', players: 'Ein Kind spielt; weitere Kinder kommen nacheinander dran.',
      steps: ['Betreuung zeigt zwei erreichbare Farbgriffe und den kurzen Rückweg.', 'Kind wählt eine Farbe und denkt sich eine Nachricht aus. Nichts mitnehmen.', 'Nach Startzeichen den Griff besuchen und begleitet zurückkehren. Andere Griffe und Tritte sind erlaubt.', 'Am Erzählplatz Nachricht sagen. Nächstes Kind ist dran; kein Wettrennen.'],
      cues: ['Die Post reist nur im Kopf.', 'Alle hilfreichen Kontakte dürfen mitspielen.'], mistakes: ['Brief, Tasche oder Spielzeug mit an die Wand nehmen.', 'Eine Farbe verfolgen, deren Griff nicht passend erreichbar ist.'],
      easier: 'Nur einen gut erreichbaren Zielgriff zeigen; Nachricht bereits am Boden sagen.', harder: 'Zwei Nachrichten für zwei geprüfte Zielgriffe planen. Nicht höher gehen.', selectionReason: 'Eine Farbwahl und kleine Geschichte für den ersten betreuten Wandkontakt.',
      supervision: 'Ziel und Rückweg vorzeigen. Ein Kind starten lassen und direkt begleiten; Wartende bleiben außerhalb des Fallbereichs.',
    },
    {
      id: 'kids-animal-path', title: 'Schildkröte oder neugierige Katze?', topic: 'Bewegung & Fantasie', goal: 'Als Katze hinschauen oder als Schildkröte den Fuß setzen.', players: 'Ein Kind aktiv; kleine Gruppe nacheinander.',
      steps: ['Betreuung zeigt kurzen passenden Weg und Rückweg.', 'Kind wählt: Schildkröte setzt den Fuß ruhig; Katze schaut den nächsten Tritt an.', 'Eine Bewegung probieren und begleitet zurückkehren. Nicht springen oder lange hängen.', 'Am Erzählplatz Tieridee erzählen. Neue Tierbewegungen vorher mit Betreuung prüfen.'],
      cues: ['Tieridee statt Mutprobe.', 'Die Katze schaut mit offenen Augen.'], mistakes: ['Froschsprünge oder andere riskante Tierbewegungen daraus machen.', 'Langsames Hängen oder perfekte Lautlosigkeit verlangen.'],
      easier: 'Tieridee vom Boden zeigen und nur eine passende Bewegung ausprobieren.', harder: 'Ein eigenes Tierbild zu einer bereits bekannten Bewegung erklären.', selectionReason: 'Spielerischer Fokus auf Hinschauen oder Setzen, ohne Tempo- oder Ausdauerziel.',
      supervision: 'Nur eine kleine bekannte Bewegung spielen. Sprung- und Balanceideen vereinfachen.',
    },
    {
      id: 'kids-treasure-clues', title: 'Schatzsuche mit zwei Hinweisen', topic: 'Farben & Entdecken', goal: 'Einen Schatzgriff mit Farbe und Form erraten.', players: 'Ein Kind sucht; andere Kinder raten vom Warteplatz mit.',
      steps: ['Betreuung wählt erreichbaren Griff als gedachten Schatz. Nichts verstecken.', 'Zwei Hinweise geben: Farbe und Form. Kind sucht mit den Augen vom Erzählplatz.', 'Kind zeigt den Griff. Betreuung prüft Ziel und Rückweg vor dem Start.', 'Griff besuchen, begleitet zurückkehren und Lösung erzählen. Falls nötig neuen Hinweis geben.'],
      cues: ['Erst entdecken, dann starten.', 'Ein neuer Hinweis hilft beim Rätsel.'], mistakes: ['Gegenstände in Griffen oder im Fallbereich verstecken.', 'Kinder während des Kletterns auf Zuruf zu ungeprüften Zielen schicken.'],
      easier: 'Nur einen sehr deutlichen Farbhinweis geben.', harder: 'Kind gibt selbst zwei Hinweise zu einem von der Betreuung geprüften Griff.', selectionReason: 'Ein Rätsel vom Boden lösen, dann den geprüften Griff besuchen. Keine Höhenjagd.',
      supervision: 'Das erratene Ziel vor dem Start bestätigen. Keine überraschenden Ziele während des Kletterns zurufen.',
    },
    {
      id: 'kids-footprint-map', title: 'Meine zwei Fußplätze', topic: 'Füße & Wege', goal: 'Zwei Tritte anschauen und gezielt nutzen.', players: 'Ein Kind aktiv mit Betreuung; andere beobachten nacheinander.',
      steps: ['Betreuung zeigt zwei passende Tritte, Handgriffe und Rückweg.', 'Kind zeigt: Hier sollen meine Füße hin. Matten und Griffe nicht markieren.', 'Ersten Tritt anschauen und Fuß setzen, dann zweiten probieren. Ändern oder zurückkehren ist erlaubt.', 'Am Erzählplatz sagen: Welcher Tritt war gut sichtbar? Für jedes Kind neu prüfen.'],
      cues: ['Anschauen, setzen, weitersehen.', 'Die Karte darf sich ändern.'], mistakes: ['Markierungen oder lose Karten in den Fallbereich legen.', 'Eine Fußfolge erzwingen, die für das nächste Kind nicht passt.'],
      easier: 'Nur einen Fußplatz am niedrigen Einstieg zeigen und kennenlernen.', harder: 'Zwei andere erreichbare Tritte wählen und vergleichen.', selectionReason: 'Zwei Fußplätze anschauen und ausprobieren. Zusätzliche Griffe und Tritte bleiben erlaubt.',
      supervision: 'Passende Tritte zeigen und aus nötiger Nähe begleiten. Bei unklarem Schritt den Weg verkürzen.',
    },
    {
      id: 'kids-shape-detectives', title: 'Griff-Detektive', topic: 'Farben & Entdecken', goal: 'Eine Griffform entdecken und beschreiben.', players: 'Ein Kind untersucht; kleine Gruppe hört am Warteplatz zu.',
      steps: ['Betreuung wählt großen erreichbaren Griff und zeigt einen unterstützten Stand.', 'Kind nennt: rund, lang oder mit Mulde. Augen bleiben offen.', 'Im unterstützten Stand anschauen oder berühren. Nicht fest zudrücken oder hängen.', 'Am Erzählplatz Merkmal erzählen. Gruppe sucht vom Boden einen ähnlichen Griff.'],
      cues: ['Ein Merkmal reicht.', 'Hinschauen ist erlaubt.'], mistakes: ['Blind ertasten lassen oder einen Krafttest veranstalten.', 'Ähnliche Form mit gleicher Erreichbarkeit gleichsetzen.'],
      easier: 'Griffform nur vom Boden ansehen und benennen.', harder: 'Zwei passende Griffe vergleichen und einen Unterschied erzählen.', selectionReason: 'Griffe anschauen und beschreiben. Kein Krafttest und kein blindes Ertasten.',
      supervision: 'Griff und unterstützten Stand wählen. Entdecken bedeutet anschauen oder berühren, keinen Krafttest.',
    },
    {
      id: 'kids-story-stations', title: 'Eine Geschichte mit zwei Stationen', topic: 'Bewegung & Fantasie', goal: 'Eine Geschichte mit zwei Stationen spielen.', players: 'Ein erzählendes Kind aktiv; weitere Kinder nacheinander.',
      steps: ['Betreuung zeigt zwei erreichbare Stationen und Rückweg. Kind nennt sie etwa Baumhaus und Fenster.', 'Am Erzählplatz Geschichte überlegen: Figur besucht eine Station und kommt heim.', 'Vereinbarten Weg begleitet spielen. Boden ist jederzeit erlaubt.', 'Am Erzählplatz Ende erzählen. Stationen für das nächste Kind prüfen.'],
      cues: ['Die Geschichte darf am Boden weitergehen.', 'Das Kind entscheidet, wann die Figur heimkehrt.'], mistakes: ['Den Boden als verbotene Lava oder Aussteigen als Niederlage darstellen.', 'Während der Bewegung neue ungeprüfte Stationen erfinden lassen.'],
      easier: 'Eine Station besuchen und die Geschichte am Boden erzählen.', harder: 'Das Kind entwirft vorab zwei kurze Stationen; Betreuung bestätigt beide.', selectionReason: 'Das Kind erfindet eine Geschichte und darf jederzeit zurückkehren.',
      supervision: 'Stationen vor dem Start bestätigen. Frühere Rückkehr respektieren; Erzählrunde bleibt außerhalb des Fallbereichs.',
    },
    {
      id: 'kids-friendly-mirror', title: 'Freundlicher Spiegel', topic: 'Miteinander', goal: 'Eine Bewegung nacheinander nachmachen.', players: 'Zwei Kinder nacheinander mit Betreuung.',
      steps: ['Betreuung zeigt kleine passende Bewegung. Beobachtungsplatz liegt außerhalb des Fallbereichs.', 'Ein Kind zeigt die Idee, etwa einen Griff im unterstützten Stand berühren. Es kehrt zurück.', 'Erst dann probiert das andere Kind. Eigene Tritte und passende Reichweite sind erlaubt.', 'Am Erzählplatz eine Ähnlichkeit nennen. Rollen freiwillig wechseln.'],
      cues: ['Der Spiegel wartet, bis die Wand frei ist.', 'Ähnlich darf trotzdem anders aussehen.'], mistakes: ['Beide Kinder gleichzeitig nebeneinander nachmachen lassen.', 'Eine größere Person zum verpflichtenden Bewegungsmaß machen.'],
      easier: 'Betreuung zeigt die Idee vom Boden; nur ein Kind probiert sie.', harder: 'Kinder erklären eine eigene passende Änderung, bevor sie starten.', selectionReason: 'Erst beobachten, dann selbst probieren. Die Bewegung darf für jedes Kind anders aussehen.',
      supervision: 'Nacheinander spielen; erst nach vollständiger Rückkehr wechseln. Bewegung für jedes Kind prüfen.',
    },
    {
      id: 'kids-route-builders', title: 'Kleine Wegbaumeister', topic: 'Füße & Wege', older: true, goal: 'Zusammen einen Weg mit höchstens drei Bewegungen planen.', players: 'Zwei Kinder entwerfen nacheinander; Betreuung bestätigt jede Idee.',
      steps: ['Betreuung zeigt niedrigen Start, gute Griffe, Tritte und Rückweg. Keine Griffe versetzen.', 'Ein Kind schlägt zwei Bewegungen vom Boden vor. Betreuung prüft sie für das kletternde Kind.', 'Anderes Kind ergänzt eine passende dritte Bewegung. Zusätzliche Griffe und Tritte bleiben erlaubt.', 'Geprüften Weg probieren und begleitet zurückkehren. Für jedes Kind neu prüfen; nicht weiter verlängern.'],
      cues: ['Ideen bauen, keine Griffe schrauben.', 'Höchstens drei Bewegungen.'], mistakes: ['Eine wachsende Kette bis zur Erschöpfung sammeln.', 'Vorschläge ohne Betreuungsprüfung sofort beklettern.'],
      easier: 'Betreuung bietet zwei passende Wege an; Kind wählt einen.', harder: 'Weg für ein anderes Kind erklären. Betreuung prüft ihn vor dem Start.', selectionReason: 'Gemeinsam einen kurzen Weg erfinden. Keine immer längere Kletterkette.',
      supervision: 'Jede Idee vor dem Start prüfen. Ein Kind klettert, andere planen am Erzählplatz außerhalb des Fallbereichs.',
    },
    {
      id: 'kids-move-memory', title: 'Zwei Bewegungen merken', topic: 'Füße & Wege', goal: 'Zwei Bewegungen merken und ausprobieren.', players: 'Ein Kind aktiv; ein anderes Kind kann am Warteplatz miterzählen.',
      steps: ['Betreuung zeigt zwei passende Bewegungen und Rückweg.', 'Kind nennt sie vom Erzählplatz: Fuß zum großen Tritt, Hand zum runden Griff.', 'Mit offenen Augen probieren. Zusätzlicher Halt, Änderungen und Rückkehr sind erlaubt.', 'Am Erzählplatz vergleichen. Keine Fehlerpunkte und kein erzwungener neuer Versuch.'],
      cues: ['Merken und Hinschauen spielen zusammen.', 'Eine Korrektur ist eine Entdeckung.'], mistakes: ['Augen schließen oder Kontakte verdecken.', 'Unpassende Reihenfolge wegen des Memoryspiels erzwingen.'],
      easier: 'Nur eine Bewegung merken; Betreuung nennt sie vor dem Start erneut.', harder: 'Zwei bekannte passende Folgen vergleichen; keine längere Kette.', selectionReason: 'Zwei Bewegungen merken und dabei weiter hinschauen. Ändern ist erlaubt.',
      supervision: 'Nur passende bekannte Bewegungen zeigen. Bei Bedarf auf eine verkürzen; erst nach der Rückkehr besprechen.',
    },
    {
      id: 'kids-choice-lab', title: 'Mein Weg, dein Weg', topic: 'Miteinander', older: true, goal: 'Zwei eigene Wege vergleichen.', players: 'Zwei Kinder nacheinander; auch allein mit Betreuung spielbar.',
      steps: ['Betreuung wählt leichten Übergang mit guten Griffen, Tritten und Rückweg.', 'Beide Kinder nennen vom Erzählplatz eine Idee. Betreuung prüft jede für das jeweilige Kind.', 'Nacheinander eigene Idee probieren und begleitet zurückkehren. Zusätzlicher Halt ist erlaubt.', 'Am Erzählplatz Unterschied nennen. Beide Wege dürfen passen; Tempo und Höhe zählen nicht.'],
      cues: ['Zwei passende Wege dürfen gewinnen.', 'Unterschiede sind interessant, keine Fehler.'], mistakes: ['Alle Kinder auf dieselbe Hand-/Fußfolge festlegen.', 'Für einen zweiten Weg nötige Unterstützung verbieten.'],
      easier: 'Betreuung zeigt zwei Möglichkeiten vom Boden und lässt das Kind wählen.', harder: 'Ein Kind erklärt, warum es seine Idee verändert hat.', selectionReason: 'Zwei eigene Wege vergleichen, ohne Sieger oder verpflichtende Partnerlösung.',
      supervision: 'Jeden persönlichen Weg vor dem Start bestätigen. Änderungen sind erlaubt; Gesprächsplatz bleibt außerhalb des Fallbereichs.',
    },
    {
      id: 'kids-helper-interview', title: 'Eine Frage an den Kletterfreund', topic: 'Miteinander', older: true, goal: 'Nach dem Klettern eine freundliche Frage stellen.', players: 'Zwei Kinder mit Betreuung, Rollen nacheinander.',
      steps: ['Betreuung zeigt leichte Passage und Beobachtungsplatz außerhalb des Fallbereichs.', 'Ein Kind klettert. Das andere merkt sich eine Frage: Welchen Tritt konntest du gut sehen?', 'Erst am Erzählplatz fragen. Antworten, zeigen oder passen ist erlaubt.', 'Betreuung hilft; Rollen wechseln. Kinder stützen oder fangen einander nicht auf.'],
      cues: ['Eine Frage, keine Fehlerliste.', 'Passen ist eine erlaubte Antwort.'], mistakes: ['Während der Bewegung Anweisungen oder Kritik zurufen.', 'Kinder zum gegenseitigen Stützen oder Auffangen einsetzen.'],
      easier: 'Betreuung bietet eine fertige Frage an.', harder: 'Kind stellt eine eigene Frage zu einer beobachteten Bewegung.', selectionReason: 'Freundlich fragen und zuhören. Keine Techniknote oder therapeutische Auswertung.',
      supervision: 'Gespräch begleiten. Körperliche Hilfestellung übernimmt die eingewiesene Betreuung, keine anderen Kinder.',
    },
    {
      id: 'kids-homeward-mission', title: 'Die Heimweg-Mission', topic: 'Füße & Wege', goal: 'Eine gedachte Figur besuchen und wieder heimkehren.', players: 'Ein Kind aktiv mit Betreuung; andere Kinder warten außerhalb des Fallbereichs.',
      steps: ['Betreuung zeigt niedrigen Start, erreichbaren Besuchsgriff und Rückweg.', 'Kind zeigt vom Boden: So besuche ich meine Figur und komme heim. Unklaren Rückweg vorher klären.', 'Bis zum vereinbarten Punkt gehen und begleitet zurückkehren. Früher umkehren ist erlaubt.', 'Am Erzählplatz hilfreichen Rückweggriff nennen. Ende ist die Rückkehr; kein Absprung oder Rutschen.'],
      cues: ['Hinweg und Heimweg gehören zusammen.', 'Früher heimkehren ist erlaubt.'], mistakes: ['Erst oben nach einem Rückweg suchen lassen.', 'Abspringen oder eine nicht zugesicherte Rutsche zum Spielabschluss machen.'],
      easier: 'Eine kleine Bewegung hin und zurück, direkt begleitet.', harder: 'Einen weiteren Rückweggriff beschreiben. Betreuung prüft den kurzen Weg erneut.', selectionReason: 'Der Rückweg gehört zum Spiel. Keine Fall-, Sprung- oder Mutprobe.',
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
      ages: PRESCHOOL_VARIANTS[recipe.id] ? 'Kita: vereinfachte Variante oder Bodenidee. Schule: kurze Spielregel. Betreuung prüft Fähigkeiten und Hausregeln; das Alter allein reicht nicht.' : older ? 'Schulkinder, die kurze Absprachen und Rollenwechsel verstehen. Fähigkeiten, Betreuung und Hausregeln vor Ort prüfen.' : 'Schulkinder, die Regel und Bewegung mit Betreuung verstehen. Fähigkeiten und Hausregeln vor Ort prüfen.',
      players,
      duration: 'Grob 5–10 Minuten mit Erklären, Warten und Pausen; keine Pflichtzeit oder Trainingsdosis.',
      supervision,
    },
    dose: 'Betreute Spielidee ohne Satz-, Wiederholungs- oder Kraftvorgabe. Das Kind darf früher aufhören.',
    rest: 'Am Erzählplatz ausruhen. Freiwillig weiterspielen, wenn Kind und Betreuung bereit sind.',
    setupRequirements: ['Hausregeln und Aufsicht fachkundig klären; neue oder hilfebedürftige Kinder körpernah begleiten', 'Große erreichbare Griffe und Tritte; kurzen niedrigen Hin- und Rückweg prüfen', 'Warte- und Erzählplatz außerhalb des Fallbereichs; Gegenstände bleiben dort'],
    note: 'Bei Schmerz oder Unwohlsein beenden. Bei Angst, Müdigkeit oder fehlender Lust zuschauen oder aufhören. Kein Überreden.',
    keywords: [recipe.title, recipe.topic, 'kinder', 'kinderspiel', 'betreuung', 'kinderbouldern', 'spiel'],
    sources: [DAV_INDOOR, DAV_CHILDREN, DGUV, DAV_SETTING],
  }));
}
