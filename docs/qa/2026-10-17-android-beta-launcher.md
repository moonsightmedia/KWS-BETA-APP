# Android Beta-App-Icon – 17.10.2026

Nutzerauftrag: Das native Android-App-Icon durch das gewaehlte Beta-Zeichen ersetzen und das Update erneut auf dem eigenen Galaxy S25 installieren.

## Umsetzung

Weisses Beta-Zeichen auf KWS-Gruen #36B531, entsprechend dem freigegebenen Android-Motiv im Logo-Paket Variante03 vom16.10. Die Kontur wird unveraendert aus public/brand/beta-icon.svg exportiert. Normales und rundes adaptives Icon teilen dieselben vektoriellen Vorder-/Hintergrundebenen. Ab API33 verwenden Themen-Icons dieselbe Kontur als monochrome Ebene. Fuenf Legacy-Dichten enthalten normale und runde PNGs.

Alte KWS-Rasterebenen und die ungenutzten Android-Vorlagen sind entfernt. scripts/generate-android-icons.cjs exportiert jetzt die Beta-Assets mit der bereits vorhandenen sharp-Abhaengigkeit; kein ImageMagick, Download oder KI-Neuentwurf noetig. Damit kann der alte Generator keine KWS-Icons zurueckschreiben. Android-Version65/1.0.65; eingebetteter Webstand bleibt1.0.242. Keine App-ID-, Signatur-, Konto- oder Berechtigungswechsel.

## Icon-Pruefung

- Originalkontur im VectorDrawable exakt gegen die SVG-Quelle abgeglichen.
- Alle zehn Legacy-PNGs haben die korrekten48/72/96/144/192px.
- Beide adaptiven Namen auf API26 und33 auf identische Beta-Ebenen geprueft; monochrome Ebene ab33 vorhanden.
- Vordergrund auf108dp gerendert: aeusserster deckender Pixel30.086dp vom Mittelpunkt entfernt, innerhalb des33dp-Radius der sicheren Zone.
- Normale, kreisfoermige und abgerundete Masken visuell auf vollstaendige Kontur, Farbe, Randabstand und Proportion geprueft. Keine vorgerundeten adaptiven Ebenen oder Schatten.
- Die geaenderte Oberflaeche ist das native Launcher-Icon; es werden keine App-Seitenlayouts oder responsiven Web-Komponenten geaendert. Icongroessen und native Masken sind daher die relevanten Darstellungsfaelle.

Quelle: https://developer.android.com/develop/ui/compose/system/icon_design_adaptive (am17.10.2026 geprueft). Das bereits freigegebene lokale Logo-Paket liefert dieselbe Android-Geometrie; die kanonische Buildquelle bleibt die versionierte SVG.

Build-, APK-, Signatur- und Geraetenachweise werden unter output/android-65 abgelegt. Ein fertiger Build allein ist kein Nachweis fuer die Installation. Der Geraetestand wird gesondert ueber INSTALL-VERIFIED.json bestaetigt.
