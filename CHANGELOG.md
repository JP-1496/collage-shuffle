# Collage Changelog

## V1.1.1 — Deployment Fix
- Fixed production static-file path handling for Render.
- Added a health endpoint and Render-safe `0.0.0.0:$PORT` binding.
- Added browser cache-busting for the frontend script.
- Added a visible frontend error screen instead of failing to a blank page.
- Made local profile storage tolerant of browser storage restrictions.
- Kept the V1.1.0 online multiplayer architecture and colourful UI.


## V1.1.0 — Online test build
- Reworked into a single browser-first Node/Express/WebSocket app.
- Added Render-ready deployment configuration.
- Added public WebSocket path and health endpoint.
- Rebuilt UI with colourful, playful visual language.
- Added persistent local nickname/avatar.
- Added upload, drag/drop and Ctrl+V image paste.
- Added automatic image-submission progression.
- Added random Round 1 source subsets.
- Added travelling piece sets between rounds.
- Added server-controlled creation/voting timers.
- Retained anonymous voting, reveal and final scoring.
- Added this changelog.

## V1.0.0 — Initial prototype
- Initial Shuffle multiplayer skeleton.
- Host/join lobby.
- Prompt submission.
- Image submission.
- Round/voting state machine.
- Basic canvas editor shell.
- Voting and final scores.
