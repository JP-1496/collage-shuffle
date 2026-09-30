# Collage Changelog

## V1.2.0 — Testing Mode & Freehand Cutting
- Added a 2-player minimum for testing builds so two PCs can run a complete Shuffle game.
- Final/public rule remains a 3-player minimum; this is controlled by `COLLAGE_TEST_MODE` and can be disabled for production.
- Replaced circular cutting with a freehand lasso: players draw any closed shape around the material they want.
- The cut piece preserves the irregular shape with transparency.
- The selected material is removed from the player's working source image.
- Added a live freehand cut-path preview.
- Updated the editor instructions to describe freehand cutting.

## V1.1.3 — Gameplay Interaction Fixes
- Join Lobby nickname field.
- Local image upload fixes.
- Editor timer no longer rebuilds the page repeatedly.
- Cutting interaction rewritten.

## V1.1.2 — Editor & Performance Fix
- Fixed prompt input resets.
- Reduced editor re-rendering and unnecessary state traffic.
- Added circular cutting prototype.

## V1.1.1 — Online Deployment Fix
- Fixed production static serving and Render port handling.
- Added health endpoint and deployment robustness.

## V1.1.0 — Online Test Build
- First Render-ready browser multiplayer build.

## V1.0.0 — Initial Prototype
- Initial Shuffle lobby, prompts, rounds, voting and scoring prototype.
