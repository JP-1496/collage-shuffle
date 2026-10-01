# Collage — Shuffle V1.4.36

Browser-first multiplayer party game prototype.

### V1.4.36
- Hardened round completion so the server cancels the active round timer when finishing and immediately advances once all submissions are received.
- Added client-side timer-expiry submission as a fallback so an unanswered player is submitted automatically when the creation timer reaches zero.
- Added automated tests for full submission, timer-only expiry, and partial submission followed by timer expiry.

## Tests
`npm test` runs the automated two-player multiplayer/WebSocket flow.

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


### V1.4.23
- Fixed live image-pool ready counts and prompt submission counts.
- Simplified Join Game wording.
- Kept Host Game actions inside the main viewport on shorter desktop screens.
- Added live-as-you-type image search and faster parallel image fetching.
- Expanded automated multiplayer coverage for these flows.

### V1.4.20
- Added the automated multiplayer test harness and tightened state privacy/performance.

### V1.4.19
- Fixed live prompt counts, prompt-stage disconnect handling, image-set rotation, and version consistency.

### V1.4.18
- Fixed prompt submission feedback and live submission-state updates.

### V1.4.17
- Fixed the final-player submission transition so the submitting client does not remain stuck on `Submitting…`.
- Submission confirmation now comes from the authoritative server state, with timer expiry using the same round-completion path.

### V1.4.16
- Added a server-side timer expiry watchdog.

### V1.4.15
- Fixed the canvas submission handshake and separated manual submission from timer auto-submit state.
- Added submission-in-flight protection and server-confirmed submitted state.

### V1.4.14
- Search result gallery now shows five cards across on desktop, with complete images visible using contain-fit. Fixed card heights keep each row separated without vertical overlap.
- Ready counts, round advancement and server-synchronised timers were tightened for multiplayer testing.
- Fixed multi-image search selection submission so selected images are added together as one server-side batch.
- Added live collage submission counts and fixed inherited image-set rotation between rounds.
- Image-set rotation now guarantees that no set ever returns to its original creator.
- Removed hover enlargement and edge-shifting behaviour that could clip cards.
- Search results remain in a dedicated vertical scroll area for browsing large result sets.

### V1.4.6
- Image-pool stage with timer, ready/unready and removal.
- Find an image search panel using Wikimedia Commons results.
- Surprise Me search shortcut.
- Round 1 image access now supports All.
- Restored page scrolling temporarily for accessibility.
