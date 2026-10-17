# Beta-Logo auf der Landingpage

V21: Nutzer wählt Favicon3/C. SVG,16/32/48px-ICO und180px-Touchicon ersetzen
die bisherigen Icons; daher gelten deren ältere Hashes nur historisch.
Header und Footer behalten die ausgewählte DM-Sans-Marke aus V20.
Details navigation-v21.md und output/landing-v21/export-favicon.cjs.

## Aktuell: V20 – ausgewählte DM-Sans-Marke

Aktuell V27: Bis960px zeigt die Navbar nur das originale grüne Beta-Symbol aus
dem ausgewählten Paket, ohne Wortmarke/KWS-Logo. Auf Desktop weiterhin beide
Marken; Partnerbereich unverändert. Datei public/landing/beta-symbol-green.svg
bytegleich aus svg/beta-symbol-green.svg; SHA256:
d8c60ebfa9f9a7b5bcf153c415d2f8283aedf53e482aee7b6f6808461c129cc3.
Keine Neuinterpretation oder Bildbeschneidung, Favicon unverändert.

Nutzerauftrag16.10.2026: überarbeitetes Logo austauschen. Maßgeblich ist jetzt
C:/Users/Janosch/KWS BETA APP/KWS-BETA-APP/brand-assets/beta/beta-dm-sans-selected-2026-10-16.
README, verification.json und Vorschau geprüft. Dieses ausdrücklich ausgewählte
Paket ersetzt die nachstehend historisch dokumentierte V2.

Primary unverändert im Header, originale weiße Fassung im Footer. Originales
KWS-Logo bleibt zusätzlich im Header und Partnerbereich. Displaybreiten bleiben
160/140/128px und200px; neues intrinsisches Seitenverhältnis349.5283:112.
Favicon und180px-Touchicon sind im neuen Paket bytegleich zu den bisherigen.
DM-Sans-Lizenz mitgeliefert als public/landing/beta-logo-font-LICENSE.txt;
SVG enthält Konturen, daher keine zusätzliche geladene Webschrift.

SHA-256 primary:a65f640a361407ed6ed54d45db4cfcce27a6f5325e863230b7f2195210abcc0b;
weiß:4987342686afd932be3a0bfacf90100ea106414b5c321fce3331f01e54414457.
Alle fünf Dateien bytegleich gegen Quellpaket geprüft. Zwei QA-Loops bei
320/375/768/985/1280/1920px; keine Verzerrung, Überschneidung oder Überläufe.
Belege:output/landing-v20/qa-results.json und Header-/Footer-Screenshots.

## Historie V14/V15

Stand16.10.2026, V14. Nutzerauftrag: vorhandenes Beta-App-Logo einarbeiten.
Verwendet wird die jüngste verfeinerte V2 aus dem lokalen Markenpaket:
C:/Users/Janosch/KWS BETA APP/KWS-BETA-APP/brand-assets/beta/logo-c-refined-v2-2026-10-16

README.md und CHANGES.md sowie logo-preview.png des Pakets wurden geprüft.
Primary im Header160px (unter360px140px), unveränderte inverse Fassung im
Footer200px. Hallenname separat im Desktopheader; originales KWS-Logo im
Partnerbereich erhalten. Originales Favicon und180px-Touchicon nur für die
Landingpage eingebunden; gemeinsame App-Icons bleiben unberührt.

Keine Pfad-, Farb- oder Formänderung; keine Schatten oder Animation auf dem
Logo selbst. Farben#36B531/#20241F bzw.Weiß bleiben original. Logo-Seitenverhältnis
1104.52:316, umliegender Schutzraum und zugänglicher Linkname erhalten.

Alle vier Dateien bytegleich gegen die Quelle geprüft:

| Datei in public/landing | SHA-256 |
|---|---|
| beta-logo-primary.svg | 58ea4971ddb222d7123c8570409ed754b553346e23942a96b71fe489b5ce86b2 |
| beta-logo-inverse.svg | 99a39062c37d1901924345d88c443139cf89fee418a79f8f40f353a29f8b7b7d |
| beta-favicon.ico | 554c6fed5dde94359298263e07c4811790edfa37e31b3ba09cb37d22ce054de2 |
| beta-apple-touch-icon.png | 2c65e8856e37c9df3993e400f391593e395cb7b43331b0f6f913a6c88096052d |

Prüfbericht: docs/qa/2026-10-16-landing-brand.md.

## V15 – beide Logos im Header

Nutzerkorrektur16.10.2026: das originale schwarz-grüne KWS-Logo muss zusätzlich
zur Beta-Marke sichtbar sein. Separate Logoelemente mit Trennlinie, auch mobil.
Desktop Beta160px/KWS104px; mobil140/80px, unter360px128/76px.
Unter600px ist App entdecken ein44px-Pfeilbutton mit zugänglichem Namen und
Tooltip. Footer/Favicon/Partnerlogo bleiben unverändert. Zwei Render-/Bedienloops
bei320/375/768/985/1280/1920px; kein Überlauf oder Überschneiden, beide Logos
geladen/sichtbar, Fokus und Entdecken-Sprungziel geprüft. Belege output/landing-v15.
