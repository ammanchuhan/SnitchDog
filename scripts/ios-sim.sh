#!/bin/sh
# Build the dev client for the iOS simulator and install it.
#
#   npm run ios:sim              # the booted simulator
#   npm run ios:sim -- <udid>    # a specific one
#
# `expo run:ios` wants a signing team even for the simulator. This signs ad hoc instead ("Sign to
# Run Locally"), which needs no Apple account. It has to be signed: an unsigned build has no
# keychain access, so saving the session token fails right after signing in.
set -e
cd "$(dirname "$0")/.."
DEVICE=${1:-$(xcrun simctl list devices booted | grep -m1 -o '[0-9A-F-]\{36\}')}
[ -n "$DEVICE" ] || { echo "No booted simulator"; exit 1; }

[ -d ios ] || npx expo prebuild --platform ios --no-install
(cd ios && pod install >/dev/null)  # quick when nothing changed; links new native packages
(cd ios && xcodebuild -workspace SnitchDog.xcworkspace -scheme SnitchDog -configuration Debug \
  -destination "id=$DEVICE" -derivedDataPath build \
  CODE_SIGN_IDENTITY=- CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM= PROVISIONING_PROFILE_SPECIFIER= \
  -quiet)
xcrun simctl install "$DEVICE" ios/build/Build/Products/Debug-iphonesimulator/SnitchDog.app
xcrun simctl launch "$DEVICE" com.ammanchuhan.snitchdog >/dev/null
echo "Installed on $DEVICE. Start Metro with: npx expo start --dev-client"
