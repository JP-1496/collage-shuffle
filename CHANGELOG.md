# Changelog

## V1.4.24
- Fixed round progression after the final collage submission so the transition happens atomically and cannot be triggered twice.
- Added regression coverage for 2-player submission progression.
- Added explicit 3-player and 4-player submission-count coverage, verifying the round advances only after all players submit.
- Bumped the runtime, frontend, package and test version to V1.4.24.

# Changelog

## V1.4.21
- Fixed Image Pool ready-state counts by sending authoritative ready state to clients.
- Fixed the Prompt Submission count not rerendering after a player submits; the live count now shows 1/2, 2/2, etc.
- Prompt submission now advances correctly once every player has submitted.
- Simplified Join Game wording to remove the unnecessary profile-screen instruction.
- Host setup action buttons are kept within the main viewport on shorter desktop screens instead of requiring page scrolling.
- Image search now searches automatically while typing with a short debounce; the Search button remains available.
- Image search image fetching now runs in parallel when adding multiple selected images, reducing unnecessary waiting.
- Added automated coverage for prompt count updates and image-pool ready state.


## V1.4.20
- Added an automated two-player WebSocket multiplayer test harness.
- Reduced WebSocket state payloads to player-specific data instead of cloning and broadcasting the full game state.
- Creation rounds now expose only the current player's working pieces; travelling sets and previous/future collages stay server-side.
- Final Showcase now exposes only the current prompt's collages; future showcase images remain private until their turn.
- Canvas sync now sends the updated state only back to the editing player instead of broadcasting large image payloads to everyone.
- Locked Final Showcase voting after a player's first vote and validated vote targets against the current showcase.
- Updated build and Wikimedia User-Agent version strings to V1.4.20.

## V1.4.19
- Fixed live Prompt Submission count updates when another player submits.
- Fixed prompt-stage disconnects so a disconnected player's missing prompt is replaced with a placeholder and the game can continue.
- Fixed the server build/version mismatch; current runtime and API version strings are V1.4.19.
- Fixed image-set rotation so no set can ever return to its original owner.
- Round-to-round set assignments now use derangements and avoid repeating the exact previous assignment where possible.
- Clarified the rotation rule: with N rounds, sets cannot both visit every other player exactly once and never return to their owner; the no-owner-return rule takes priority.
- Host Approval retains the requirement for at least one image before continuing; the client handles the zero-image state clearly.

## V1.4.18
- Fixed the Prompt Submission screen not visibly updating after a prompt was submitted.
- Added immediate `✓ Prompt submitted!` feedback and prevents duplicate prompt submissions.
- Live prompt submission count now updates as players submit.
- Final prompt submission transitions directly into Round 1 without the prompt screen appearing stuck.

## V1.4.17
- Removed the fragile per-submission acknowledgement message.
- The server's normal `STATE` message is now the single authoritative source for submitted status.
- When the final player submits, the server transitions directly through the normal round-completion path without leaving the submitting client stuck on `Submitting…`.
- Timer expiry uses the same authoritative round-completion path.
- Updated build/User-Agent version strings to V1.4.17.

## V1.4.16
- Added explicit server acknowledgement for canvas submissions.
- The submitting client now receives an immediate accepted-submission state instead of relying only on the next general state update.
- Added a server-side expiry watchdog so an expired creation round is completed even if a browser timer/client message fails.
- Server expiry remains authoritative for creation, image-selection and final-showcase timers.
- Kept the other player's creation timer active while waiting for their submission.

## V1.4.15
- Fixed the canvas submission client state so a manual Submit click is tracked separately from timer auto-submit.
- Added an explicit submission-in-flight state so the same client cannot send duplicate canvas submissions.
- The submitting client now shows `Submitting…` until the server confirms the submission.
- Once confirmed, the button remains locked as `✓ Submitted X/X`.
- A player's submission no longer uses the timer auto-submit guard, so the remaining player's timer continues normally.
- Submission state resets cleanly when the game enters the next round.

## V1.4.14
- Fixed image-set rotation so a player's original set is never assigned back to that player.
- Each set visits every other player exactly once across the game rounds.
- Kept the live `✓ Submitted X/X` submission status behaviour.

## V1.4.13
- Submit button now changes to `✓ Submitted X/X` and shows the live number of submitted collages.
- Fixed round-to-round piece handling so the previous round's pieces are cleared before the new shuffled set is loaded.
- Round assignments pass each player's created piece set to a different player before it can return to its owner on a later round.

## V1.4.12
- Fixed multi-select image search adding only part of the selection or duplicating images.
- Search selections are now fetched first and sent to the server as one atomic batch.
- The server applies the batch against the remaining image limit and ignores exact duplicate images.
- Added an `Adding…` state to prevent double-clicking the Add button while images are being fetched.

## V1.4.11
- Image pool Ready button now shows the live ready count as `Ready! X/X`.
- Collage rounds now advance immediately when every player submits instead of waiting for the timer.
- When a round timer expires, each player's latest server-synced collage is automatically submitted before advancing.
- Timers now use the server's clock reference on clients and prevent duplicate browser intervals from making countdowns appear to restart.
- The latest collage edits are synced to the server so timeout auto-submit uses the current collage.

## V1.4.10
- Fixed image search cards overlapping vertically.
- Result rows now use fixed card heights so each row stays clearly separated while remaining five-wide on desktop.

## V1.4.9
- Changed the image search gallery to five cards across on desktop.
- Each card keeps a square layout and shows the complete image with contain-fit.
- Results remain vertically scrollable, with responsive 4/3/2-column layouts on smaller screens.

## V1.4.8
- Changed the image search results to a single vertical gallery.
- Each result now has its own full-height card instead of being compressed into stacked grid rows.
- The complete image remains visible with contain-fit, and the results area is scrolled vertically.

## V1.4.7
- Search result cards now show the complete image immediately using contain-fit.
- Removed hover enlargement and edge-shifting behaviour that could clip cards.
- Search results remain in a dedicated vertical scroll area for browsing large result sets.

## V1.4.5
- Search image hover previews no longer get clipped at the left/right edges of the results grid.
- Search results overflow is allowed so enlarged previews can rise above neighbouring cards.

## V1.4.3
- Reworked image-pool stage: players add the exact host-configured number of images, remove mistakes, and ready up.
- Image-pool timer automatically advances the game when time expires.
- Added Ready/Unready state during image selection.
- Added Find an Image search with selectable results and Surprise Me.
- Added Wikimedia Commons-backed image search/fetch endpoints for testing.
- Added Round 1 Images = All; this controls access to the complete shared pool, not submission count.
- Restored normal page scrolling temporarily so every screen remains accessible during testing.

# Changelog

## V1.4.2 — Gameplay viewport optimisation
- Reworked the gameplay editor layout to fit the full control stack within the viewport.
- Compact left sidebar with tighter source thumbnails and controls.
- Canvas remains the dominant workspace, with controls arranged in a compact grid.
- Removed the cause of the bottom toolbar being clipped on desktop-sized screens.
- Preserved no-scroll behaviour: gameplay is designed to fit rather than hide overflow.


## V1.4.1
- Rebuilt the Host Game settings screen into a compact, card-based Gartic Phone-style layout.
- Host settings now use compact controls arranged in a responsive grid instead of a long vertical list.
- Lobby name, player count, image pool, Round 1 images, creation time, voting time and image approval all fit into one viewport.
- Added clear icons, helper text, mode badge, build badge and a dedicated bottom action bar.
- Kept the no-scroll requirement: the host setup is designed to fit the available viewport rather than hiding overflow.


## V1.4.0
- Fixed viewport layout so screens are designed to fit within one browser page rather than simply hiding overflow.
- Removed all mid-game creation reveals: collages remain hidden through every creation round.
- Added a single Final Showcase phase where finished collages are shown prompt-by-prompt and voting happens.
- Final scores are calculated from Final Showcase votes only.
- Final results show each player’s highest-voted collage(s), including ties.
- Added `All` option for Images per player, allowing unlimited image submissions until the player presses Continue.

# Collage Changelog

## V1.4.6 — Image Search Results
- Increased in-game image search results from 24 to 100 images per search.
- Added a dedicated vertical scrollbar to the image results area so large result sets remain accessible.
- Added descriptive Wikimedia API User-Agent headers for image search/fetch requests.


## V1.3.5 — Editor Controls & Screen Fit
- All game screens are designed to fit within one viewport without page scrolling.
- Added cut-tool zoom controls for more precise freehand cuts.
- Layer Forward/Back now has a hard one-position stop and swaps adjacent pieces.
- Added object resize controls on the canvas.


## V1.3.3 — Lobby test fixes
- Enter submits the Join Game form.
- Ready button toggles Ready / Not Ready.
- Server and client use an explicit 2-player testing minimum.
- Start Game is enabled as soon as the host has the required 2 connected players.
- Lobby player-count/start controls update immediately when players join or disconnect.

## V1.3.2 — Deployment verification
- Visible build number on landing screen.
- Join screen nickname field.
- Cache-busting and deployment verification improvements.
