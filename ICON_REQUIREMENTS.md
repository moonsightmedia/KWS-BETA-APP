# Icon-Anforderungen für App Stores

## Aktuelles Logo

**Datei**: `/public/080616_Kletterwelt-Sauerland_Logo_ohne_Hintergrund_ohne_Schrift.png`

## Benötigte Icon-Größen

### PWA Icons (bereits im Manifest)
- ✅ 192x192px
- ✅ 512x512px


## Icon-Generierung

### Option 1: Online-Tools
- **PWA Asset Generator**: https://github.com/onderceylan/pwa-asset-generator
- **App Icon Generator**: https://www.appicon.co/
- **Icon Kitchen**: https://icon.kitchen/

### Option 2: Manuell mit Image-Editor
1. Öffnen Sie das Logo in einem Image-Editor (Photoshop, GIMP, etc.)
2. Erstellen Sie ein neues Bild mit der gewünschten Größe
3. Platzieren Sie das Logo zentriert
4. Für iOS: Fügen Sie einen Hintergrund hinzu (keine Transparenz)
5. Exportieren Sie als PNG

### Option 3: Automatisch mit Script
```bash
# Mit ImageMagick (falls installiert)
convert 080616_Kletterwelt-Sauerland_Logo_ohne_Hintergrund_ohne_Schrift.png \
  -resize 512x512 \
  -background white \
  -gravity center \
  -extent 512x512 \
  icon-512.png
```

## Empfohlene Icon-Struktur

```
public/
├── icons/
│   └── pwa/
│       ├── icon-192.png
│       └── icon-512.png
```

## Design-Richtlinien

### PWA Icons
- **Abgerundete Ecken**: Browser können Icons automatisch abrunden
- **Sicherheitsbereich**: Wichtige Inhalte sollten im inneren 80% des Icons bleiben
- **Kein Text**: Vermeiden Sie Text im Icon (wird zu klein)

## Nächste Schritte

1. Icons in den benötigten Größen generieren
2. Icons im Manifest aktualisieren (falls nötig)

