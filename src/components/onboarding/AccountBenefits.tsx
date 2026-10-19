import { Bookmark, Play, Star } from 'lucide-react';
import { StatisticsIcon } from '@/lib/appIcons';
export function AccountBenefits() {
    return <ul className="benefit-list">{[
            { Icon: Bookmark, title: 'Gespeicherte Boulder', text: 'Speichere Boulder für später oder markiere sie als Projekt.' },
            { Icon: Play, title: 'Tracking', text: 'Zähle Versuche und trage Tops oder Flashes ein.' },
            { Icon: StatisticsIcon, title: 'Statistik', text: 'Sieh nach, was du geschafft hast und wann du bouldern warst.' },
            { Icon: Star, title: 'Das Kommentieren', text: 'Schreib einen Tipp zum Boulder oder stell eine Frage.' },
        ].map(({ Icon, title, text }) => <li key={title}><Icon aria-hidden="true"/><div><strong>{title}</strong><span>{text}</span></div></li>)}</ul>;
}
