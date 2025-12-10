/**
 * Android Icon Generation Script
 * 
 * Generiert Android-App-Icons in allen benötigten Größen aus dem Logo
 * 
 * Voraussetzungen:
 * - ImageMagick muss installiert sein (https://imagemagick.org/)
 * - Oder verwenden Sie ein Online-Tool wie https://icon.kitchen/ oder https://www.appicon.co/
 * 
 * Usage:
 * node scripts/generate-android-icons.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const SOURCE_LOGO = path.join(__dirname, '../public/080616_Kletterwelt-Sauerland_Logo_ohne_Hintergrund_ohne_Schrift.png');
const ANDROID_RES_DIR = path.join(__dirname, '../android/app/src/main/res');

// Android Icon-Größen für verschiedene Dichten
const ANDROID_ICON_SIZES = {
  'mipmap-mdpi': 48,      // 1x
  'mipmap-hdpi': 72,      // 1.5x
  'mipmap-xhdpi': 96,     // 2x
  'mipmap-xxhdpi': 144,   // 3x
  'mipmap-xxxhdpi': 192,  // 4x
};

// Foreground Icon (für Adaptive Icons) - sollte zentriert sein
const FOREGROUND_SIZE = 108; // Standard für adaptive icons

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

function generateForegroundIcon(outputPath) {
  // Foreground sollte 108x108 sein, zentriert auf transparentem Hintergrund
  // Das Logo wird auf 80% der Größe skaliert, damit es nicht zu nah am Rand ist
  const logoSize = Math.floor(FOREGROUND_SIZE * 0.8);
  
  try {
    execSync(
      `magick "${SOURCE_LOGO}" -resize ${logoSize}x${logoSize} -background transparent -gravity center -extent ${FOREGROUND_SIZE}x${FOREGROUND_SIZE} "${outputPath}"`,
      { stdio: 'inherit' }
    );
    console.log(`✅ Generated foreground: ${outputPath} (${FOREGROUND_SIZE}x${FOREGROUND_SIZE})`);
  } catch (error) {
    console.error(`❌ Error generating foreground ${outputPath}:`, error.message);
  }
}

function main() {
  console.log('🎨 Android Icon Generation Script\n');
  
  // Prüfe ob ImageMagick installiert ist
  if (!checkImageMagick()) {
    console.error('❌ ImageMagick ist nicht installiert!');
    console.log('\nBitte installieren Sie ImageMagick:');
    console.log('  Windows: https://imagemagick.org/script/download.php#windows');
    console.log('  macOS: brew install imagemagick');
    console.log('  Linux: sudo apt-get install imagemagick');
    console.log('\nAlternativ verwenden Sie ein Online-Tool:');
    console.log('  https://icon.kitchen/ (empfohlen für Adaptive Icons)');
    console.log('  https://www.appicon.co/');
    console.log('  https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html');
    process.exit(1);
  }
  
  // Prüfe ob Logo existiert
  if (!fs.existsSync(SOURCE_LOGO)) {
    console.error(`❌ Logo nicht gefunden: ${SOURCE_LOGO}`);
    process.exit(1);
  }
  
  // Prüfe ob Android-Verzeichnis existiert
  if (!fs.existsSync(ANDROID_RES_DIR)) {
    console.error(`❌ Android res-Verzeichnis nicht gefunden: ${ANDROID_RES_DIR}`);
    console.log('Bitte führen Sie zuerst "npx cap add android" aus');
    process.exit(1);
  }
  
  console.log('📁 Generiere Android Icons...\n');
  
  // Generiere Icons für jede Dichte
  Object.entries(ANDROID_ICON_SIZES).forEach(([density, size]) => {
    const mipmapDir = path.join(ANDROID_RES_DIR, density);
    
    // Erstelle Verzeichnis falls nicht vorhanden
    if (!fs.existsSync(mipmapDir)) {
      fs.mkdirSync(mipmapDir, { recursive: true });
    }
    
    // Standard Icon
    const iconPath = path.join(mipmapDir, 'ic_launcher.png');
    generateIcon(size, iconPath, 'white');
    
    // Round Icon (gleiche Größe)
    const roundIconPath = path.join(mipmapDir, 'ic_launcher_round.png');
    generateIcon(size, roundIconPath, 'white');
    
    // Foreground Icon für Adaptive Icons
    const foregroundPath = path.join(mipmapDir, 'ic_launcher_foreground.png');
    generateForegroundIcon(foregroundPath);
  });
  
  console.log('\n✅ Android Icon-Generierung abgeschlossen!');
  console.log(`\n📂 Icons gespeichert in: ${ANDROID_RES_DIR}/mipmap-*`);
  console.log('\nNächste Schritte:');
  console.log('1. Prüfen Sie die generierten Icons');
  console.log('2. APK neu bauen: npm run cap:build:android');
  console.log('3. App installieren und Icon prüfen');
}

if (require.main === module) {
  main();
}

module.exports = { generateIcon, generateForegroundIcon };

