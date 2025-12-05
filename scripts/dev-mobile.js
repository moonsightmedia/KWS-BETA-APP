/**
 * Development Script für Mobile Testing
 * 
 * Zeigt einen QR-Code mit der lokalen IP-Adresse
 * für die manuelle Konfiguration der Android App
 * 
 * Usage: npm run dev:mobile
 */

import { execSync } from 'child_process';
import os from 'os';
import qrcode from 'qrcode-terminal';

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return 'localhost';
}

function main() {
  const localIP = getLocalIP();
  const port = 8080;
  const url = `http://${localIP}:${port}`;
  
  console.log('\n🚀 Mobile Development Server');
  console.log('═══════════════════════════════════════\n');
  console.log(`📱 Lokale IP: ${localIP}`);
  console.log(`🌐 URL: ${url}\n`);
  
  // QR-Code anzeigen
  console.log('📱 QR-Code für Mobile Testing:\n');
  qrcode.generate(url, { small: true });
  console.log('\n');
  
  console.log('📋 Anleitung:');
  console.log('1. Starten Sie die Android App einmal (APK installieren)');
  console.log('2. Die App muss auf diese URL konfiguriert werden');
  console.log('3. Sie können die URL manuell in capacitor.config.ts eintragen');
  console.log('4. Oder verwenden Sie: npm run dev:android\n');
  
  console.log('💡 Tipp: Für automatisches Live Reload:');
  console.log('   npm run dev:android\n');
  
  console.log('═══════════════════════════════════════\n');
  console.log('🔄 Starte Vite Dev Server...\n');
  
  // Vite Dev Server starten
  try {
    execSync('npm run dev', { stdio: 'inherit' });
  } catch (error) {
    console.error('Fehler beim Starten des Dev Servers:', error.message);
    process.exit(1);
  }
}

main();

