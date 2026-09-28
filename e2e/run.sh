#!/bin/sh
# Run the end-to-end flows against the dev client on a simulator, starting signed out.
#
#   sh e2e/run.sh                 # every flow, in order
#   sh e2e/run.sh 03-plan.yaml    # one flow (flows after 01 continue from the previous state)
#
# Needs: the local server (server/: npm run dev), Metro (npx expo start --dev-client), the dev
# client installed (npm run ios:sim), and Maestro (https://maestro.dev).
set -e
cd "$(dirname "$0")"
DEVICE=${DEVICE:-$(xcrun simctl list devices booted | grep -m1 -o '[0-9A-F-]\{36\}')}
API=${API:-http://localhost:3111}
EMAIL=${EMAIL:-"e2e+$(date +%s)@example.com"}
PASSWORD=${PASSWORD:-"e2e-password-123"}
echo "$EMAIL" > .last-email
FLOWS=${*:-$(ls [0-9]*.yaml)}

for flow in $FLOWS; do
  if [ "$flow" = "01-signup.yaml" ]; then
    # The weigh-in flow picks this from the photo library (the simulator's camera takes nothing).
    xcrun simctl addmedia "$DEVICE" scale.jpg
    curl -sf "$API/api/auth/signup" -H 'content-type: application/json' \
      -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" >/dev/null
  fi
  ~/.maestro/bin/maestro --device "$DEVICE" test -e EMAIL="$EMAIL" -e PASSWORD="$PASSWORD" "$flow"
done
