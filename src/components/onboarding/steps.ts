import type { TourStep } from './Coachmark';
export const steps: TourStep[] = [
    { id: 'discover', selector: '[data-onboarding=discover]', title: 'Schau dich erst mal um', text: 'Hier stehen die aktuellen Boulder der Halle. Foto, Grad und Bereich helfen dir, sie an der Wand zu finden. Öffne mal einen.', action: 'Boulder öffnen' },
    { id: 'beta', selector: '[data-onboarding="media"]', title: 'Wie geht der nächste Zug?', text: 'Bei diesem Boulder gibt es ein Video mit einer möglichen Lösung. Das nennen wir Beta. Die Videos kannst du auch ohne Konto ansehen.', action: 'Weiter zu den Filtern' },
    { id: 'filter', selector: '[data-onboarding=filter-trigger]', title: 'Welche Boulder suchst du?', text: 'Du kannst nach Grad, Grifffarbe und Bereich filtern. Wir schauen uns das kurz zusammen an.', action: 'Filter öffnen' },
    { id: 'save', selector: '[data-onboarding="bookmarks"]', title: 'Boulder für später merken', text: 'Mit einem Konto kannst du Boulder speichern. An einem willst du länger tüfteln? Markiere ihn als Projekt.', action: 'Weiter zum Tracken', account: true },
    { id: 'track', selector: '[data-onboarding="tracking"]', title: 'Geschafft? Trag’s ein.', text: 'Hier zählst du deine Versuche oder trägst einen Top ein. Im ersten Versuch geschafft? Dann ist es ein Flash. Probier die Buttons ruhig aus.', action: 'Statistik ansehen', account: true },
    { id: 'progress', selector: '[data-onboarding="progress"]', title: 'So lief deine Woche', text: 'Mit Konto siehst du hier, was du geschafft hast und an welchen Tagen du bouldern warst. Das hier sind Beispieldaten.', action: 'Konto erstellen', account: true },
];
export const filterSteps: TourStep[] = [
    { id: 'filter-grade', selector: '[data-onboarding=filter-grade]', title: 'Welche Grade passen für dich?', text: 'Tippe die Grade an, die du sehen möchtest. Du kannst mehrere wählen. Ohne Auswahl bleiben alle dabei.', action: 'Weiter zur Farbe' },
    { id: 'filter-color', selector: '[data-onboarding=filter-color]', title: 'Eine bestimmte Grifffarbe?', text: 'Wähle hier die Farbe der Griffe. Auch mehrere Farben sind möglich. Deine Grade bleiben ausgewählt.', action: 'Weiter zum Bereich' },
    { id: 'filter-area', selector: '[data-onboarding=filter-area]', title: 'Wo willst du bouldern?', text: 'Hier kannst du einzelne Teilbereiche wählen. Lässt du alles frei, suchst du in der ganzen Halle.', action: 'Auswahl ansehen' },
    { id: 'filter-show', selector: '[data-onboarding=filter-show]', title: 'Zurück zu deinen Bouldern', text: 'Die Zahl zeigt, wie viele Boulder zu deiner Auswahl passen. Mit diesem Button kommst du zur Liste.', action: 'Boulder anzeigen' },
];
export const filterResultStep: TourStep = { id: 'filter-results', selector: '[data-onboarding=filter-results]', title: 'Das ist deine Auswahl', text: 'Hier steht, wie viele Boulder passen. Gewählte Filter erscheinen oben und lassen sich dort wieder entfernen. Ohne Filter siehst du die ganze Halle.', action: 'Was geht mit Konto?' };
