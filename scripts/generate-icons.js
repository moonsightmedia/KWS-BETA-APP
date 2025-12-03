/**
 * Icon Generation Script
 * 
 * Generiert verschiedene Icon-Größen aus dem Hauptlogo für PWA und App Stores
 * 
 * Voraussetzungen:
 * - ImageMagick muss installiert sein (https://imagemagick.org/)
 * - Oder verwenden Sie ein Online-Tool wie https://www.appicon.co/
 * 
 * Usage:
 * node scripts/generate-icons.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SOURCE_LOGO = path.join(__dirname, '../public/080616_Kletterwelt-Sauerland_Logo_ohne_Hintergrund_ohne_Schrift.png');
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

// Icon-Größen für verschiedene Zwecke
const ICON_SIZES = {
  pwa: [192, 512],
  android: [512],
  ios: [1024],
};

// Feature Graphic für Play Store
const FEATURE_GRAPHIC = {
  width: 1024,
  height: 500,
};

function checkImageMagick() {
  try {
    execSync('magick -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function generateIcon(size, outputPath, background = null) {
  const bgOption = background ? `-background ${background} -gravity center -extent ${size}x${size}` : '';
  
  try {
    execSync(
      `magick "${SOURCE_LOGO}" -resize ${size}x${size} ${bgOption} "${outputPath}"`,
      { stdio: 'inherit' }
    );
    console.log(`✅ Generated: ${outputPath} (${size}x${size})`);
  } catch (error) {
    console.error(`❌ Error generating ${outputPath}:`, error.message);
  }
}

function generateFeatureGraphic(outputPath) {
  try {
    execSync(
      `magick "${SOURCE_LOGO}" -resize 800x400 -background white -gravity center -extent ${FEATURE_GRAPHIC.width}x${FEATURE_GRAPHIC.height} "${outputPath}"`,
      { stdio: 'inherit' }
    );
    console.log(`✅ Generated: ${outputPath} (${FEATURE_GRAPHIC.width}x${FEATURE_GRAPHIC.height})`);
  } catch (error) {
    console.error(`❌ Error generating feature graphic:`, error.message);
  }
}

function main() {
  console.log('🎨 Icon Generation Script\n');
  
  // Prüfe ob ImageMagick installiert ist
  if (!checkImageMagick()) {
    console.error('❌ ImageMagick ist nicht installiert!');
    console.log('\nBitte installieren Sie ImageMagick:');
    console.log('  Windows: https://imagemagick.org/script/download.php#windows');
    console.log('  macOS: brew install imagemagick');
    console.log('  Linux: sudo apt-get install imagemagick');
    console.log('\nAlternativ verwenden Sie ein Online-Tool:');
    console.log('  https://www.appicon.co/');
    console.log('  https://icon.kitchen/');
    process.exit(1);
  }
  
  // Prüfe ob Logo existiert
  if (!fs.existsSync(SOURCE_LOGO)) {
    console.error(`❌ Logo nicht gefunden: ${SOURCE_LOGO}`);
    process.exit(1);
  }
  
  // Erstelle Ausgabe-Verzeichnisse
  const dirs = [
    path.join(OUTPUT_DIR, 'pwa'),
    path.join(OUTPUT_DIR, 'android'),
    path.join(OUTPUT_DIR, 'ios'),
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  console.log('📁 Generiere Icons...\n');
  
  // PWA Icons
  console.log('📱 PWA Icons:');
  ICON_SIZES.pwa.forEach(size => {
    const outputPath = path.join(OUTPUT_DIR, 'pwa', `icon-${size}.png`);
    generateIcon(size, outputPath);
  });
  
  // Android Icons
  console.log('\n🤖 Android Icons:');
  ICON_SIZES.android.forEach(size => {
    const outputPath = path.join(OUTPUT_DIR, 'android', `icon-${size}.png`);
    generateIcon(size, outputPath, 'white');
  });
  
  // Feature Graphic
  const featureGraphicPath = path.join(OUTPUT_DIR, 'android', 'feature-graphic.png');
  generateFeatureGraphic(featureGraphicPath);
  
  // iOS Icons
  console.log('\n🍎 iOS Icons:');
  ICON_SIZES.ios.forEach(size => {
    const outputPath = path.join(OUTPUT_DIR, 'ios', `AppIcon-${size}.png`);
    generateIcon(size, outputPath, 'white'); // iOS benötigt Hintergrund
  });
  
  console.log('\n✅ Icon-Generierung abgeschlossen!');
  console.log(`\n📂 Icons gespeichert in: ${OUTPUT_DIR}`);
  console.log('\nNächste Schritte:');
  console.log('1. Überprüfen Sie die generierten Icons');
  console.log('2. Aktualisieren Sie das Manifest mit den neuen Icon-Pfaden (falls nötig)');
  console.log('3. Verwenden Sie die Icons für PWABuilder/Capacitor');
}

if (require.main === module) {
  main();
}

module.exports = { generateIcon, generateFeatureGraphic };

