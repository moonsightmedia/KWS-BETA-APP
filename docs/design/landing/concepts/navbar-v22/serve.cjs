const http=require('http'),fs=require('fs'),path=require('path');
const root=__dirname,publicRoot=path.resolve(process.cwd(),'public');
const names={a:'Direkt',b:'Floating Dock',c:'Visuelles Menü'};
function page(variant){
 let html=fs.readFileSync(path.join(root,'base/index.html'),'utf8');
 html=html.replace('<html lang="de">',`<html lang="de" data-nav-variant="${variant}">`).replace('src="/landing/landing.js"','src="/demo.js?v='+variant+'"').replace('</head>','<link rel="stylesheet" href="/concepts.css" /></head>');
 html=html.replace('<title>Beta App · Kletterwelt Sauerland</title>',`<title>Navbar ${variant.toUpperCase()} · ${names[variant]}</title>`);
 if(variant==='a'){
  html=html.replace(/<span class="header-hall-mark">[\s\S]*?<\/span>/,'');
  html=html.replace(/(<a class="header-cta"[\s\S]*?<\/a>)/,'$1<a class="hall-signature" href="#gemeinsam" aria-label="Kletterwelt Sauerland – zum gemeinsamen Projekt"><img src="/landing/kws-logo.svg" width="104" height="47" alt="Kletterwelt Sauerland" /></a>');
 }
 if(variant==='b'){
  html=html.replace('<symbol id="arrow"','<symbol id="team" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3m2-16a3 3 0 0 1 0 6m4 10v-3a6 6 0 0 0-3-5"/></symbol><symbol id="arrow"');
  let iconIndex=0;const icons=['search','progress','team'];
  html=html.replace(/(<nav id="primary-navigation"[\s\S]*?<\/nav>)/,nav=>nav.replace(/<use href="#arrow" \/>/g,()=>`<use href="#${icons[iconIndex++]}" />`));
 }
 if(variant==='c'){
  html=html.replace('<span class="nav-toggle-lines"','<span class="menu-word" aria-hidden="true">Menü</span><span class="nav-toggle-lines"');
  html=html.replace(/<a class="header-cta"[\s\S]*?<\/a>/,'');
  const images=['app-native-boulders.webp','roadmap-app-training.webp',null];let index=0;
  html=html.replace(/(<a href="#(?:funktionen|ausblick|gemeinsam)">)(<span>)/g,(_,start,span)=>{const image=images[index++];return start+(image?`<div class="nav-preview"><img src="/landing/${image}" alt="" /></div>`:'<div class="nav-preview nav-partners"><img src="/landing/moonsight-color.svg" alt="" /><img src="/landing/kws-logo.svg" alt="" /></div>')+span;});
 }
 return html;
}
http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');const route=decodeURIComponent(url.pathname);res.setHeader('Cache-Control','no-store');
 if(/^\/[abc]\/?$/.test(route)){res.setHeader('Content-Type','text/html; charset=utf-8');return res.end(page(route[1]));}
 if(route==='/demo.js'){let js=fs.readFileSync(path.join(root,'base/landing.js'),'utf8');if(url.searchParams.get('v')==='c')js=js.replace("matchMedia('(max-width: 960px)')","matchMedia('(min-width: 0px)')");res.setHeader('Content-Type','text/javascript; charset=utf-8');return res.end(js);}
 if(route==='/landing/landing.css'){res.setHeader('Content-Type','text/css; charset=utf-8');return res.end(fs.readFileSync(path.join(root,'base/landing.css')));}
 let base=root,file;
 if(route.startsWith('/landing/')||route.startsWith('/fonts/'))base=publicRoot;
 file=path.resolve(base,'.'+(route==='/'?'/index.html':route));if(!file.startsWith(base+path.sep)){res.writeHead(404);return res.end();}
 fs.readFile(file,(error,data)=>{const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.ico':'image/x-icon'};res.writeHead(error?404:200,{'Content-Type':mime[path.extname(file)]||'text/plain'});res.end(error?'Not found':data)});
}).listen(4189,'127.0.0.1',()=>console.log('Navbar comparisons http://127.0.0.1:4189/'));
