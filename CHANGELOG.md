# Collage Changelog

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


## V1.2.1 — Input & Editor Reliability
- Added nickname entry directly to Join Game.
- Added explicit Continue/Submit Images action after required uploads are present.
- Fixed file picker upload path.
- Kept Ctrl+V and drag/drop image import.
- Reworked editor rendering so timer updates do not rebuild the editor.
- Reworked piece dragging to update the DOM directly while dragging.
- Added freehand lasso cutting: draw any closed shape and extract only that shape as a transparent piece.
- Removed the selected area from the player's local working copy of the source image.
- Testing minimum remains 2 players.
