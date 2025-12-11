/**
 * Version bump script
 * Automatically increments version number before build
 * Usage: node scripts/version-bump.js [patch|minor|major]
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.resolve(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

const currentVersion = packageJson.version || '0.0.0';
const [major, minor, patch] = currentVersion.split('.').map(Number);

const bumpType = process.argv[2] || 'patch'; // default to patch

let newVersion;
switch (bumpType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
  default:
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

console.log(`✅ Version bumped: ${currentVersion} → ${newVersion}`);
console.log(`📦 New version: ${newVersion}`);

