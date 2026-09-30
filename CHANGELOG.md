# Collage Changelog

## V1.1.2 — Editor & Performance Fix
- Fixed prompt text being repeatedly reset while typing when multiplayer state updates arrive.
- Reduced image-submission WebSocket payloads so ordinary players only receive their own submitted images; the host still receives the full pool for approval.
- Reworked Round 1 cutting: selecting an image and pressing **Cut** now opens a responsive image cutting area.
- Added click-drag circular selection for cutting a piece from a source image.
- Cut pieces are transparent circular PNGs and appear immediately on the canvas.
- The selected area is removed from the player's local working copy of the source image so further cuts can be made from the remaining material.
- Piece dragging no longer rebuilds the entire DOM on every pointer movement, reducing severe interaction lag.
- Transform buttons update the selected piece without unnecessary full-page redraws.
- Updated production health/version reporting to 1.1.2.

## V1.1.1 — Online Test Fix
- Fixed Render/Express production serving and PORT handling.
- Added health endpoint and cache busting.
- Added visible error handling.
- Prepared the browser multiplayer build for Render deployment.

## V1.1.0 — Online Test Build
- First Render-ready browser multiplayer prototype.
- Colourful Collage UI direction.
- Lobby, image submission, prompt submission, rounds, voting and scoring skeleton.
- Image upload, drag/drop and Ctrl+V paste support.
- WebSocket multiplayer server.
