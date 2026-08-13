#!/usr/bin/env bash
# Open the live site as an app window — no tabs, no omnibox, no title bar.
# --app gives Chromium's chromeless window; anything heavier (kiosk) takes
# the whole screen, which is more than "no title bar" asked for.
exec brave-browser --app=https://raptor3000.pages.dev "$@"
