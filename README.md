# Collage — Shuffle V1.4.3

Browser-first multiplayer party game prototype.

## Local
npm install
npm start
Open http://localhost:10000

## Render
Build: `npm install`
Start: `npm start`
Plan: Free Web Service

The app listens on `0.0.0.0` and uses Render's `PORT` environment variable.

## Test flow
1. Create a lobby with the host.
2. Join from a second PC using the lobby code and enter the nickname on the Join Game screen.
3. Start with exactly 2 players for testing.
4. Upload images using Choose Images, drag/drop, or Ctrl+V.
5. Submit prompts.
6. In Round 1, select a source image, press Cut freehand, draw any closed shape, and cut it out.


### V1.4.3
- Image-pool stage with timer, ready/unready and removal.
- Find an image search panel using Wikimedia Commons results.
- Surprise Me search shortcut.
- Round 1 image access now supports All.
- Restored page scrolling temporarily for accessibility.
