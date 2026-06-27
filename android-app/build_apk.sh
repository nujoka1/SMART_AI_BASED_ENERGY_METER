#!/usr/bin/env bash
set -e

APP_ROOT="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$APP_ROOT/.." && pwd)"
OUTPUT_DIR="$HOME/Desktop/SmartEnergy_APK"

cd "$APP_ROOT"

echo "Building dashboard..."
npm run prepare:web

echo "Syncing Android..."
npx cap sync android

echo "Building APK..."
cd android
./gradlew assembleDebug

mkdir -p "$OUTPUT_DIR"
cp app/build/outputs/apk/debug/app-debug.apk "$OUTPUT_DIR/SmartEnergy-debug.apk"

echo ""
echo "APK ready:"
ls -lh "$OUTPUT_DIR/SmartEnergy-debug.apk"
