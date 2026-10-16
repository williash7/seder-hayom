#!/usr/bin/env node
/**
 * מריצים אחרי `expo prebuild` ולפני `gradlew assembleRelease`.
 *
 * prebuild מייצר תיקיית android/ חדשה בכל פעם, וברירת המחדל שלה היא
 * לחתום גם את גרסת ה-release במפתח ה-debug. מפתח כזה נוצר מחדש בכל
 * מכונה — כלומר כל בנייה ב-CI הייתה מקבלת מפתח אחר, ואנדרואיד לא נותן
 * להתקין עדכון שנחתם במפתח שונה.
 *
 * הסקריפט מזריק signingConfig אמיתי שקורא את הסיסמאות מ-gradle.properties
 * (שמגיעות מ-GitHub Secrets), ומעדכן את versionCode כדי שכל בנייה תהיה חדשה.
 */

const fs = require('fs');
const path = require('path');

const GRADLE = path.join('android', 'app', 'build.gradle');

function fail(msg) {
  console.error('✗ ' + msg);
  process.exit(1);
}

if (!fs.existsSync(GRADLE)) fail(`לא נמצא ${GRADLE} — האם expo prebuild רץ?`);

let src = fs.readFileSync(GRADLE, 'utf8');

// ─── 1. הוספת signingConfig ל-release ────────────────────
if (src.includes('release {\n            storeFile')) {
  console.log('• signingConfig כבר קיים');
} else {
  const anchor = /signingConfigs\s*\{/;
  if (!anchor.test(src)) fail('לא נמצא בלוק signingConfigs ב-build.gradle');

  src = src.replace(anchor, `signingConfigs {
        release {
            storeFile file(findProperty('MYAPP_RELEASE_STORE_FILE') ?: 'release.keystore')
            storePassword findProperty('MYAPP_RELEASE_STORE_PASSWORD')
            keyAlias findProperty('MYAPP_RELEASE_KEY_ALIAS')
            keyPassword findProperty('MYAPP_RELEASE_KEY_PASSWORD')
        }`);
  console.log('✓ נוסף signingConfigs.release');
}

// ─── 2. release buildType ישתמש בו במקום ב-debug ─────────
const before = src;
src = src.replace(
  /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?signingConfig\s+)signingConfigs\.debug/,
  '$1signingConfigs.release'
);
if (src === before) {
  if (src.includes('signingConfig signingConfigs.release')) {
    console.log('• release כבר מצביע על signingConfigs.release');
  } else {
    fail('לא הצלחתי להחליף את signingConfig של release');
  }
} else {
  console.log('✓ release נחתם עכשיו במפתח שלך');
}

// ─── 3. versionCode לפי מספר הבנייה ──────────────────────
const run = parseInt(process.env.BUILD_NUMBER || '', 10);
if (run) {
  const updated = src.replace(/versionCode\s+\d+/, `versionCode ${run}`);
  if (updated !== src) {
    src = updated;
    console.log(`✓ versionCode = ${run}`);
  }
}

fs.writeFileSync(GRADLE, src);
console.log('✓ build.gradle עודכן');
