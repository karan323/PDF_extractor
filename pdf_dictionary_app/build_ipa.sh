#!/bin/bash
#
# build_ipa.sh – Build and export an iOS IPA from the PDFDictionaryApp project.
#
# This script is a convenience wrapper around Xcode’s command-line tools.  It
# assumes that you have installed Xcode and are logged in with your Apple
# developer account.  You must also provide a provisioning profile and
# distribution certificate appropriate for your build (development, ad-hoc or
# App Store).  The script does not handle code signing automatically – you
# should edit the ExportOptions.plist to specify your method.

set -euo pipefail

PROJECT_NAME="PDFDictionaryApp"
SCHEME="PDFDictionaryAppApp"
ARCHIVE_PATH="build/$PROJECT_NAME.xcarchive"
EXPORT_PATH="build/ipa"
EXPORT_OPTIONS_PLIST="ExportOptions.plist"

echo "==> Cleaning previous build"
rm -rf build
mkdir -p build

echo "==> Archiving the project"
xcodebuild -workspace "$PROJECT_NAME.xcodeproj/project.xcworkspace" \
           -scheme "$SCHEME" \
           -configuration Release \
           -destination 'generic/platform=iOS' \
           archive \
           -archivePath "$ARCHIVE_PATH"

echo "==> Exporting the archive to an IPA"
xcodebuild -exportArchive \
           -archivePath "$ARCHIVE_PATH" \
           -exportOptionsPlist "$EXPORT_OPTIONS_PLIST" \
           -exportPath "$EXPORT_PATH"

echo "IPA file generated at $EXPORT_PATH"
