# Collage — Shuffle V1.4.59

### V1.4.59
- Uses the 20 final cleaned avatar images in a 5×4 profile picker.
- Avatar artwork is shown beside player names and in the in-game HUD.


### V1.4.59
- Added 24 custom character avatars selectable from the player profile.
- Player characters now appear beside names and in the top-right in-game identity display.

### V1.4.55
- Added a persistent Leave Game button during active games.
- Leaving clears the saved session and returns the player to the home screen.

### V1.4.54
- Added WebSocket heartbeat/ping monitoring and automatic reconnect/resume for interrupted browser connections.
- Existing player sessions can resume after a refresh or transient connection loss without creating a duplicate player.

### V1.4.52
- Fixed the final collage submission hand-off so the server explicitly queues round completion after broadcasting the final submission count.

Browser-first multiplayer party game prototype.

### V1.4.52
- Reduced live collage editor WebSocket traffic by debouncing collage syncs and removing the server's full-state response to each sync.
- Submit now cancels any pending sync and sends the latest collage directly.

### V1.4.44
- Version bump for the current Render test build.

### V1.4.43
- Simplified canvas submission to use the same server-authoritative flow as prompt submission: record the submission, broadcast state, and advance when all connected players have submitted.
- Removed the separate `SUBMISSION_ACCEPTED` dependency and client-side submission state mutation.
- Kept duplicate submissions harmless and preserved timer-expiry handling.

## V1.4.42
- Hardened live collage submission delivery: the client sends the submission before rebuilding the UI, then immediately shows the agreed submitted state.
- The server now explicitly broadcasts the updated submission count after each accepted submission before advancing when all connected players are complete.
- Expanded the multiplayer test to verify that both players receive 1/2 after the first submission and 2/2 after the second, followed by a player-facing Round 2 state.

### V1.4.40
- Fixed round progression when the final connected player submits a collage.
- Round completion now uses the same server-side finish path as timer expiry, based on all connected players having submitted.

### V1.4.39
- Restored the agreed immediate collage submission UI: clicking Submit immediately shows the normal submitted state and count.
- Removed the visible `Submitting…` state and client-side in-flight submission lock.
- Kept the server-authoritative one-submit flow and server-side round progression from V1.4.37.
- Submission is still sent once to the server; a failed send restores the editable state and reports the connection error.

- Rebuilt collage submission from scratch: the client sends one submission and the server owns submission state and round progression.
- Removed client-side submission retries, ACK-style state, and client timer auto-submit logic.
- Server immediately advances when every player has submitted; timer expiry fills missing submissions and advances through the same round path.
- Lobby codes now use a restricted alphabet that excludes O, 0, I and 1.

## Tests
`npm test` runs the automated multiplayer/WebSocket flow, including submission progression and lobby-code validation.

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
