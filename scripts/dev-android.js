/**
 * Development Script für Android mit Live Reload
 * 
 * Startet Vite Dev Server und konfiguriert Android App für Live Reload
 * Änderungen werden automatisch auf dem Gerät angezeigt
 * 
 * Usage: npm run dev:android
 */

import { execSync, spawn } from 'child_process';
import os from 'os';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function updateCapacitorConfig(ip, port = 8080) {
  const configPath = path.join(__dirname, '..', 'capacitor.config.ts');
  
  let config = fs.readFileSync(configPath, 'utf8');
  
  // Aktiviere Development Server URL
  // Ersetze sowohl localhost als auch bereits konfigurierte IPs
  config = config.replace(
    /url: 'http:\/\/[\d\.]+:\d+',/g,
    `url: 'http://${ip}:${port}',`
  );
  config = config.replace(
    /\/\/ url: 'http:\/\/localhost:\d+',/g,
    `url: 'http://${ip}:${port}',`
  );
  if (!config.includes(`url: 'http://${ip}:${port}'`)) {
    config = config.replace(
      /server: \{/g,
      `server: {\n    url: 'http://${ip}:${port}',`
    );
  }
  config = config.replace(
    /\/\/ cleartext: true,/g,
    'cleartext: true,'
  );
  
  fs.writeFileSync(configPath, config, 'utf8');
  console.log(`✅ Capacitor Config aktualisiert: http://${ip}:${port}`);
}

function restoreCapacitorConfig() {
  const configPath = path.join(__dirname, '..', 'capacitor.config.ts');
  
  let config = fs.readFileSync(configPath, 'utf8');
  
  // Deaktiviere Development Server URL (alle Ports)
  config = config.replace(
    /url: 'http:\/\/\d+\.\d+\.\d+\.\d+:\d+',/g,
    "// url: 'http://localhost:8080',"
  );
  config = config.replace(
    /cleartext: true,/g,
    '// cleartext: true,'
  );
  
  fs.writeFileSync(configPath, config, 'utf8');
  console.log('✅ Capacitor Config zurückgesetzt');
}

function main() {
  const localIP = getLocalIP();
  // Port kann sich ändern wenn 8080 belegt ist - wird dynamisch erkannt
  const port = process.env.PORT || 8080;
  const url = `http://${localIP}:${port}`;
  
  console.log('\n🚀 Android Development mit Live Reload');
  console.log('═══════════════════════════════════════\n');
  console.log(`📱 Lokale IP: ${localIP}`);
  console.log(`🌐 URL: ${url}`);
  console.log(`⚠️  Wichtig: Prüfen Sie den Port nach dem Start des Servers!`);
  console.log(`   Falls Vite einen anderen Port verwendet, aktualisieren Sie capacitor.config.ts\n`);
  
  // QR-Code anzeigen
  console.log('📱 QR-Code für Referenz:\n');
  qrcode.generate(url, { small: true });
  console.log('\n');
  
  // Capacitor Config aktualisieren
  updateCapacitorConfig(localIP, port);
  
  // Cleanup Handler
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stoppe Server...');
    restoreCapacitorConfig();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    restoreCapacitorConfig();
    process.exit(0);
  });
  
  console.log('📋 Nächste Schritte:');
  console.log('1. Warten Sie, bis der Vite Server gestartet ist');
  console.log('2. Prüfen Sie den Port in der Vite-Ausgabe (kann 8081 sein wenn 8080 belegt ist)');
  console.log('3. Falls Port != 8080: Aktualisieren Sie capacitor.config.ts mit dem richtigen Port');
  console.log('4. Die Android App wird automatisch geöffnet');
  console.log('5. Änderungen werden live auf dem Gerät angezeigt\n');
  console.log('═══════════════════════════════════════\n');
  
  // Capacitor sync ausführen
  console.log('🔄 Synchronisiere Capacitor...\n');
  try {
    execSync('npx cap sync android', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Fehler beim Synchronisieren:', error.message);
    restoreCapacitorConfig();
    process.exit(1);
  }
  
  // Vite Dev Server im Hintergrund starten
  console.log('\n🔄 Starte Vite Dev Server...\n');
  const viteProcess = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
  });
  
  // Warte kurz, dann starte Android App
  setTimeout(() => {
    console.log('\n📱 Starte Android App mit Live Reload...\n');
    try {
      execSync('npx cap run android --live-reload --external', { stdio: 'inherit' });
    } catch (error) {
      console.error('❌ Fehler beim Starten der Android App:', error.message);
      console.log('\n💡 Alternative: Öffnen Sie Android Studio manuell');
      console.log('   npm run cap:open:android\n');
    }
  }, 3000);
  
  viteProcess.on('close', (code) => {
    restoreCapacitorConfig();
    process.exit(code);
  });
}

main();

