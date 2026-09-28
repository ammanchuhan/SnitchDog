#!/bin/sh
# Run the end-to-end flows against the dev client on a simulator, starting signed out.
#
#   sh e2e/run.sh                 # every flow, in order
#   sh e2e/run.sh 03-weigh-in.yaml  # one flow, continuing with the last sign-up's account
#
# Needs: the local server (server/: npm run dev), Metro (npx expo start --dev-client), the dev
# client installed (npm run ios:sim), and Maestro (https://maestro.dev).
set -e
cd "$(dirname "$0")"
DEVICE=${DEVICE:-$(xcrun simctl list devices booted | grep -m1 -o '[0-9A-F-]\{36\}')}
API=${API:-http://localhost:3111}
FLOWS=${*:-$(ls [0-9]*.yaml)}
# A new account when the run starts with sign-up; otherwise the one the last sign-up made.
case "$FLOWS" in
  01-signup.yaml*) EMAIL=${EMAIL:-"e2e+$(date +%s)@example.com"}; echo "$EMAIL" > .last-email ;;
  *) EMAIL=${EMAIL:-$(cat .last-email)} ;;
esac
PASSWORD=${PASSWORD:-"e2e-password-123"}

# The dev client's floating tools button sits over controls on the right (Send in the chat).
xcrun simctl spawn "$DEVICE" defaults write com.ammanchuhan.snitchdog EXDevMenuShowFloatingActionButton -bool false

for flow in $FLOWS; do
  if [ "$flow" = "01-signup.yaml" ]; then
    # The weigh-in flow picks this from the photo library (the simulator's camera takes nothing).
    xcrun simctl addmedia "$DEVICE" scale.jpg
    curl -sf "$API/api/auth/signup" -H 'content-type: application/json' \
      -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" >/dev/null
  fi
  ~/.maestro/bin/maestro --device "$DEVICE" test -e EMAIL="$EMAIL" -e PASSWORD="$PASSWORD" "$flow"

  # What happens on Telegram between screens.
  witness() { (cd ../server && node --env-file=.env.local scripts/e2e-witness.mjs "$EMAIL" "$@"); }
  case "$flow" in
    04-witnesses.yaml) witness accept 1 Alex ;;
    05-watching.yaml) witness accept 2 Jordan && witness stop 2 ;;
  esac
done
