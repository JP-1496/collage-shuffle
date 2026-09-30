# Collage Changelog

## V1.3.1 — Join Screen / Cache Fix
- Join Game now presents a large, explicit nickname field directly on the join screen.
- Added visible instruction that the profile screen is not required.
- Added cache-busting to the frontend script so deployed browsers do not keep an older join screen.
- Version label updated to V1.3.1.


## V1.3.0 — Verified Join, Upload & 2-Player Test Build
- Join Game now has a nickname field directly on the join screen.
- Testing minimum is 2 players throughout the host/start flow and server validation.
- Default test lobby capacity is 2, while the host can raise it to 16.
- File uploads use a real browser file picker with an explicit change handler.
- Drag-and-drop image upload remains supported.
- Clipboard image paste remains supported without rerendering the entire page on every server update.
- Server only sends each player their own submitted images during normal image submission, reducing unnecessary WebSocket traffic.
- Prompt text is not destroyed by routine multiplayer state updates.
- Round editor state is not rebuilt on every WebSocket update, reducing interaction lag.
- Freehand lasso cutting: draw any closed shape, not a circle.
- Cut pieces are extracted with transparency and removed from the player's working source image.
- Round 1 source images are shuffled independently for each player.
- V1 remains a browser-first online test build for Render.

## Known testing scope
- Copycat mode is not included.
- Active games are stored in server memory for testing; a server restart ends active games.
- Two-player minimum is a testing-only setting; the intended production minimum remains 3 players.
