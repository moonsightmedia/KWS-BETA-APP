# Live-Audit: Cookies, Tracking, SEO und Rechtstextseiten

Nutzerfrage nach bestehender Einrichtung,kein Auftrag zum Aktivieren von
Analytics oder zur Änderung der Indexierung. Read-only geprüft16.10.2026,
Browsertest ab23:51:19Europe/Berlin. Keine Produktionsänderung.

## Direkt beobachtet

- /landingpage:HTTP200,keine Set-Cookie-Header,keine Cookies,leerer Local-/
  SessionStorage im frischen Browserkontext.19Requests ausschließlich an
  beta.kletterwelt-sauerland.de. Keine externen Analytics-/Werbe-/Fontdienste
  im geprüften Seitenaufruf. Keine Analytics-Integration im Landingcode.
- SEO-Basis:de-Sprache,passender Titel/Description,eineH1,Abschnittsüberschriften,
  Canonical ohne Vorschauquery,OG/Twitter-Tags und lokale Favicons vorhanden.
  Kein noindex-Meta und kein X-Robots-Tag auf /landingpage. KeinJSON-LD;
  strukturierteDaten sind hier optional,kein automatischerLaunchfehler.
- robots.txt:HTTP200,text/plain,erlaubtCrawlerzugriff auf alleRouten. Kein
  Sitemap-Verweis. /sitemap.xml und /sitemap_index.xml liefern200 text/html mit
  App-SPA-Root statt XML. Keine funktionsfähige Sitemap an diesen Standardpfaden.
- SearchConsole/echterIndexierungsstatus nicht verifiziert. Fehlendes HTML-
  Verifikationstag beweist keine fehlende Property;DNS-Verifikation möglich.
- LandingOG-Bild ist das180px-Touchicon,kein eigenes großes Socialmotiv.
- Impressum/Datenschutz verlinkt und öffentlich200. Texte beziehen sich auf
  App/Betreiber,Hosting,Anmeldung undGerätespeicherung. Keine juristische
  Inhaltsfreigabe oder Prüfung von AV-Verträgen/Log-Aufbewahrung vorgenommen.
- /privacy und /imprint:je frischerBrowserkontext,keine Cookies,aber App-JS
  erzeugt LocalStorage-Schlüssel kws-training-v2:guest ohneBenutzeraktion.
  Je9Requests anWebdomain und4anbeta-api.kletterwelt-sauerland.de;keine
  externenAnalytics/SentryRequests im Test. Nur Schlüsselnamen,keine Werte erfasst.
  BeideSeiten haben generischen Dashboard-Titel und altes Lovable-OG-Bild.
- Browserruntimefehler in allen drei getesteten Seiten:0.

## Einordnung und nächste sinnvolle Schritte

1. Für reine statischeLanding sind aktuell keine einwilligungspflichtigen
   Browserzugriffe erkennbar. Kein pauschalerBanner als kosmetischeErgänzung.
   Die Rechtstextseiten sollten ohne unnötigeAppinitialisierung/Trainingsspeicher
   auskommen;keine rechtliche Bewertung dieses Einzelzugriffs behauptet.
2. Tracking ist noch keine eingerichteteBesucher-/Storeklickauswertung. Erst
   Messziele,Anbieter und Datenschutzmodell festlegen. Cookieless allein ist
   keine pauschaleEinwilligungsfreiheit. KeineAnalytics eigenmächtig aktiviert.
3. Sitemap und gezielteCrawler-/Indexierungsstrategie fürLanding undAppbereiche
   ergänzen;SearchConsole-Eigentum/Indexierung mit berechtigtemZugang prüfen.
   Sitemap ist für eine kleineSeite nicht zwingend,hilft aber beiEntdeckung.
4. EigenesSocialmotiv und Metadaten fürRechtstextseiten bereinigen.
5. Datenschutzhinweise mit tatsächlicherLanding-/Hosting-/gegebenenfallsAnalyse-
   Verarbeitung abgleichen. Serverlogauswertung,Monitoring undVertragslage waren
   nicht Gegenstand des browserseitigenTests. Keine Compliance-Vollfreigabe.

Belege:output/landing-readiness-audit/live.json und audit.cjs. FrischerGitfetch:
codex/minimal-landing0ahead/9behind origin/main d0e5a6e wie zuvor dokumentiert;
Source-Landing unverändert. Audit erzeugt nur diesenBericht und lokaleBelege.

## Primärquellen

LfDIBaden-Württemberg,Tätigkeitsbericht2025 (veröffentlicht2026),Abschnitt5.6.9,
gedruckteSeite138:ohne einwilligungsbedürftigeVerarbeitung keinBanner. Abschnitt
5.6.7:Cookieless-Tracking braucht eineRechtsgrundlage.
https://www.baden-wuerttemberg.datenschutz.de/wp-content/uploads/2026/03/LfDI-TB25-DATENSCHUTZ.pdf

GoogleSearchCentral,Sitemapübersicht:Entdeckungshilfe,keineIndexierungsgarantie;
kleine gutverlinkteWebsites brauchen nichtzwingend eineSitemap.
https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview

GoogleSearchConsole,URL-Prüfung zur tatsächlichenIndexierung:
https://support.google.com/webmasters/answer/9012289
