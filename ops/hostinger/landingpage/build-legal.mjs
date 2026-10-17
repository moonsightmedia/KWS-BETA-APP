import {readFileSync,writeFileSync} from 'node:fs';
const source=JSON.parse(readFileSync('docs/design/landing/legal-source-2026-10-17.json','utf8'));
const landing=readFileSync('public/landing/index.html','utf8');
const base='https://beta.kletterwelt-sauerland.de';
const icons=landing.match(/<svg class="icon-definitions"[\s\S]*?<\/svg>/)[0];
const titles={privacy:'Datenschutz',imprint:'Impressum','community-rules':'Community-Regeln'};
const links=html=>html.replace(/<a\b[^>]*>/g,tag=>tag.replace(/href="#([^"]*)"/g,`href="${base}/landingpage#$1"`));
const header=links(landing.match(/<header class="header">[\s\S]*?<\/header>/)[0]);
const footer=links(landing.match(/<footer[\s\S]*?<\/footer>/)[0]).replace(`class="back-top" href="${base}/landingpage#"`,'class="back-top" href="#"');
for(const [path,title] of Object.entries(titles)){
 const description=`${title} für die Beta App und die Landingpage der Kletterwelt Sauerland.`;
 if(!source.pages[path]?.length)throw Error('Missing legal source: '+path);
 let sections=source.pages[path].map(s=>`<section><h2>${s.title}</h2>${s.body}</section>`).join('\n');
 if(path==='privacy')sections=sections.replace('Eigene Nutzungs-Telemetrie und Sentry-Übermittlung','Eigene Nutzungs-Telemetrie der App und Sentry-Übermittlung');
 const landingPrivacy=path==='privacy'?`<section class="legal-summary"><h2>Landingpage und Aufrufzählung</h2><p>Diese Erklärung gilt für die Beta App und ihre Landingpage. Beim Besuch der Landingpage, des Impressums, dieser Datenschutzerklärung und der Community-Regeln werden keine Cookies oder Browserkennungen für eine Reichweitenmessung gesetzt und keine Analyse-Skripte anderer Anbieter geladen. Schriftarten und Bilder werden vom eigenen Server ausgeliefert.</p><p>Für die technische Auslieferung verarbeitet der Server deine IP-Adresse und Verbindungsdaten. Zusätzlich zählen wir erfolgreiche Seitenabrufe der Landingpage auf dem eigenen Server. Der Zähler speichert keine IP-Adressen, Browserkennungen, Referrer, URL-Parameter oder vollständigen aufgerufenen Adressen. Er erfasst ausschließlich den auf die Stunde gerundeten Zeitpunkt, den technischen Antwortstatus und die feste Seitenbezeichnung. Wiederholte Aufrufe, Bots und unsere eigenen Tests können mitzählen; es werden keine einzelnen Besucher erkannt.</p><p>Die geschützte Betriebsübersicht zeigt Tageswerte für die letzten 31 Tage. Die zugrunde liegenden Zähldateien werden größen- und zeitbegrenzt rotiert; daraus werden nur zusammengefasste Tageswerte angezeigt. Die Zählung dient dazu, die Nutzung der Landingpage einzuschätzen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO; unser berechtigtes Interesse ist eine datensparsame Beurteilung unseres eigenen Informationsangebots.</p><p>Die folgenden Angaben zu Konten, Aktivitäten, Mitteilungen und lokaler Speicherung betreffen die App. Diese Funktionen werden auf den statischen Informationsseiten nicht geladen. Die Store-Schaltflächen sind bis zur Veröffentlichung der Apps als Platzhalter gekennzeichnet.</p></section>`:'';
 const head=landing.match(/<head>([\s\S]*?)<\/head>/)[1]
  .replace(/<title>[\s\S]*?<\/title>/,`<title>${title} · Beta App · Kletterwelt Sauerland</title>`)
  .replace(/<meta name="description"[^>]*\/>/,`<meta name="description" content="${description}" />`)
  .replaceAll(`${base}/landingpage`,`${base}/${path}`)
  .replace(/<meta property="og:title"[^>]*\/>/,`<meta property="og:title" content="${title} · Beta App" />`)
  .replace(/<meta property="og:description"[^>]*\/>/,`<meta property="og:description" content="${description}" />`)
  .replace(/<script[^>]*>[\s\S]*?<\/script>/g,'');
 const html=`<!doctype html><html lang="de"><head>${head}<meta name="robots" content="noindex,follow" /><link rel="stylesheet" href="/landing/legal.css" /></head><body class="legal-page"><a class="skip-link" href="#inhalt">Zum Inhalt</a>${header}<main id="inhalt" class="legal-main"><a class="legal-back" href="${base}/landingpage">← Zur Landingpage</a><header class="legal-heading"><p class="eyebrow">Beta App · Kletterwelt Sauerland</p><h1>${title}</h1><p>Stand: 17. Oktober 2026</p></header>${landingPrivacy}${sections}<nav class="legal-links" aria-label="Rechtliche Informationen">${Object.entries(titles).map(([p,t])=>`<a href="${base}/${p}" ${path===p?'aria-current="page"':''}>${t}</a>`).join('')}<a href="${base}/guest">Zur App</a></nav></main>${footer}</body></html>`;
 writeFileSync(`public/landing/${path}.html`,html.replace('<body class="legal-page">','<body class="legal-page">'+icons));
}
writeFileSync('public/landing/robots.txt',`User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`);
writeFileSync('public/landing/sitemap.xml',`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${base}/landingpage</loc></url></urlset>\n`);
