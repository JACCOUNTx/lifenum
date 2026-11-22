#!/usr/bin/env node
/**
 * Toggles the App.entitlements wiring in the Xcode project.
 *
 *   node scripts/push-entitlements.mjs status
 *   node scripts/push-entitlements.mjs enable
 *   node scripts/push-entitlements.mjs disable
 *
 * `enable` is only valid once the App ID has the Push Notifications capability
 * and the App Store provisioning profile has been regenerated, otherwise the
 * archive step fails with an entitlements mismatch.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = path.join(ROOT, 'ios', 'App', 'App.xcodeproj', 'project.pbxproj');
const ENTITLEMENTS = path.join(ROOT, 'ios', 'App', 'App', 'App.entitlements');
const LINE = '\t\t\t\tCODE_SIGN_ENTITLEMENTS = App/App.entitlements;';

const command = process.argv[2] ?? 'status';
const project = fs.readFileSync(PROJECT, 'utf8');
const enabled = project.includes('CODE_SIGN_ENTITLEMENTS = App/App.entitlements;');

if (command === 'status') {
  console.log(`entitlements file: ${fs.existsSync(ENTITLEMENTS) ? 'present' : 'missing'}`);
  console.log(`pbxproj wiring:   ${enabled ? 'enabled (psuh will build)' : 'disabled (push off)'}`);
} else if (command === 'enable') {
  if (!fs.existsSync(ENTITLEMENTS)) {
    console.error('App.entitlements is missing, cannot enable push.');
    process.exit(1);
  }
  if (enabled) {
    console.log('Already enabled.');
  } else {
    const updated = project.replace(
      /(\t\t\t\tASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;\r?\n)/g,
      `$1${LINE}\n`,
    );
    if (updated === project) {
      console.error('Could not find ASSETCATALOG_COMPILER_APPICON_NAME in project.pbxproj.');
      process.exit(1);
    }
    fs.writeFileSync(PROJECT, updated);
    console.log('Push entitlement enabled. Rebuild with: npm run release:bump <version>');
  }
} else if (command === 'disable') {
  if (!enabled) {
    console.log('Already disabled.');
  } else {
    const updated = project.replace(/\t{4}CODE_SIGN_ENTITLEMENTS = App\/App\.entitlements;\r?\n/g, '');
    fs.writeFileSync(PROJECT, updated);
    console.log('Push entitlement disabled.');
  }
} else {
  console.error('Usage: node scripts/push-entitlements.mjs [status|enable|disable]');
  process.exit(1);
}
