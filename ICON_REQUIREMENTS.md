# Icon-Anforderungen für App Stores

## Aktuelles Logo

**Datei**: `/public/080616_Kletterwelt-Sauerland_Logo_ohne_Hintergrund_ohne_Schrift.png`

## Benötigte Icon-Größen

### PWA Icons (bereits im Manifest)
- ✅ 192x192px
- ✅ 512x512px

### Android (Play Store)

#### App Icon
- **Größe**: 512x512px
- **Format**: PNG (32-bit)
- **Hintergrund**: Kann transparent sein, wird aber auf weißem Hintergrund angezeigt
- **Dateiname**: `icon-512.png`

#### Feature Graphic
- **Größe**: 1024x500px
- **Format**: PNG oder JPG
- **Verwendung**: Wird im Play Store oben angezeigt
- **Dateiname**: `feature-graphic.png`

#### Screenshots
- **Mindestens**: 2 Screenshots
- **Empfohlene Größen**:
  - Phone: 1080x1920px (Portrait) oder 1920x1080px (Landscape)
  - 7" Tablet: 1200x1920px
  - 10" Tablet: 1600x2560px
- **Format**: PNG oder JPG

### iOS (App Store)

#### App Icon
- **Größe**: 1024x1024px
- **Format**: PNG (keine Transparenz!)
- **Hintergrund**: Muss sichtbar sein (kein transparenter Hintergrund)
- **Dateiname**: `AppIcon-1024.png`

#### Screenshots
- **iPhone 6.7" Display (iPhone 14 Pro Max)**:
  - Portrait: 1290x2796px
  - Landscape: 2796x1290px
- **iPhone 6.5" Display (iPhone 11 Pro Max)**:
  - Portrait: 1242x2688px
  - Landscape: 2688x1242px
- **iPhone 5.5" Display (iPhone 8 Plus)**:
  - Portrait: 1242x2208px
  - Landscape: 2208x1242px
- **iPad Pro 12.9"**:
  - Portrait: 2048x2732px
  - Landscape: 2732x2048px
- **iPad Pro 11"**:
  - Portrait: 1668x2388px
  - Landscape: 2388x1668px

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
│   ├── android/
│   │   ├── icon-512.png
│   │   └── feature-graphic.png
│   ├── ios/
│   │   └── AppIcon-1024.png
│   └── pwa/
│       ├── icon-192.png
│       └── icon-512.png
└── screenshots/
    ├── android/
    │   ├── screenshot-1.png
    │   ├── screenshot-2.png
    │   └── ...
    └── ios/
        ├── screenshot-1.png
        ├── screenshot-2.png
        └── ...
```

## Design-Richtlinien

### Android
- **Abgerundete Ecken**: Play Store rundet Icons automatisch ab
- **Sicherheitsbereich**: Wichtige Inhalte sollten im inneren 80% des Icons bleiben
- **Kein Text**: Vermeiden Sie Text im Icon (wird zu klein)

### iOS
- **Keine Transparenz**: iOS Icons müssen einen sichtbaren Hintergrund haben
- **Abgerundete Ecken**: iOS rundet Icons automatisch ab
- **Sicherheitsbereich**: Wichtige Inhalte sollten im inneren 80% des Icons bleiben

## Nächste Schritte

1. Icons in den benötigten Größen generieren
2. Icons im Manifest aktualisieren (falls nötig)
3. Icons für PWABuilder/Capacitor vorbereiten
4. Screenshots der App erstellen

