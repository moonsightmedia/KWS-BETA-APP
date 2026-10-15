import {useState} from 'react';
import {Link} from 'react-router-dom';
import {Button} from '@/components/ui/button';

export function ExternalBetaVideo({src,provider,visible=true}:{src:string;provider:'YouTube'|'Vimeo';visible?:boolean}) {
 const [permittedSource,setPermittedSource]=useState<string|null>(null);
 const allowed=permittedSource===src;
 return allowed&&visible ? <iframe src={src} className="h-full w-full" title={`${provider} Beta-Video`} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen referrerPolicy="no-referrer"/> : <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-5 text-center"><h3 className="font-semibold">Externes Video von {provider}</h3><p className="text-sm text-muted-foreground">Wenn du das Video lädst, erhält {provider} deine IP-Adresse und technische Geräteinformationen. Dabei kann eine Verarbeitung außerhalb der EU stattfinden.</p><Link className="text-sm text-primary-ink underline" to="/privacy">Datenschutz ansehen</Link><Button disabled={!visible} onClick={()=>setPermittedSource(src)}>{provider}-Video laden</Button></div>;
}
