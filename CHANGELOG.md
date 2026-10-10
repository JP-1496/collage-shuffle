## V1.6.21
- Added a Delete button for the selected piece and removed redundant rotate/size toolbar buttons; per-piece handles remain the way to rotate and resize.
- Added a warning that pieces fully outside the canvas are deleted when submitted.
- Filtered pieces by rotated bounds at submission and on server-side round transitions so fully off-canvas pieces cannot be passed to the next player.

## V1.6.20
- Removed canvas-edge clamping when dragging pieces, allowing pieces to be positioned freely beyond the canvas boundaries.
- Kept resizing, rotation, submission and gameplay behaviour unchanged.

## V1.6.19
- Removed the 100% maximum size limit for canvas pieces; pieces can now extend beyond the canvas.
- Reduced the minimum width and height for direct resizing to 0.1% of the canvas.
- Corner resizing now scales proportionally from the piece’s current dimensions without being blocked by a width/height cap.
- Updated the left-side width adjustment to use the same 0.1% minimum and no maximum.

## V1.6.18
- Fixed finished masterpiece rendering so saved stretched piece heights are preserved in the slideshow, voting cards and final-results gallery.
- Pieces without a saved custom height retain their original image proportions.

## V1.6.17
- Renamed the cutting button to “Cut”.
- Added direct movement, proportional corner resizing, side stretching and rotation handles for canvas pieces.
- Retained the left-hand editing buttons as a backup.

## V1.6.16
- Added Freehand, Circle and Square selection tools to the image cutting editor.
- Circle and Square selections can be moved, stretched from side handles, scaled proportionally from corner handles using their current aspect ratio, and rotated directly.
- Kept the canvas-piece size/rotate controls unchanged for this release.

## V1.6.12
- Anchored lobby player cards to the top instead of vertically distributing the first row.
- Locked the running server/build version to V1.6.12 so the CMD startup message and splash build badge stay in sync.

## V1.6.11
- Moved lobby controls into the left sidebar and lobby name above the player list.
- Removed the Final Showcase sidebar timer during the slideshow.
- Simplified slideshow advancement so the host can reliably progress through masterpieces.

## V1.6.10
- Final Results gallery auto-scrolls through masterpieces.
- Final Results collage canvases preserve the original square 1:1 format without stretching/cropping.

# Changelog

## V1.6.9
- Redesigned Final Results to show player scores on the left and a scrollable gallery of every finished collage on the right, ordered by votes without displaying vote totals.
- Added host-only New Players and Same Players controls to restart from the final screen.
- New Players returns the host to the lobby and removes everyone else.
- Same Players preserves the current player roster and starts a fresh Image Submission phase.
- Removed the dotted image-pool empty-state outline.
- Fixed image-pool cards being clipped at the bottom of the stage.
- Disabled GIF uploads and GIF paste handling, and filtered GIFs out of image search results.
- Added server-side GIF rejection as a second line of protection.

## V1.6.8
- Fixed Join Game right-edge containment.
- Prevented Lobby button hover movement from clipping at the left edge.
- Removed the redundant dashed pool/footer divider when the image pool is empty or populated.
- Changed Canvas source selection to a green highlight without the redundant selected-image preview.
- Added queued rapid-click handling for the Host showcase Next button to speed up testing.
- Tightened Voting mode vertical spacing and bottom containment.
- Redesigned Final Results into a compact ranked list showing every player's standout collages as thumbnails with hover enlargement.
- Updated the displayed build version to V1.6.8.

## V1.6.7
- Reworked viewport containment rules as an authoritative full-screen pass for every V1.6 main-area page.
- Added explicit width, min-width, max-width and flex/grid containment for image pools, approval cards, prompts, lobbies, editor, voting, showcase and final results.
- Added internal overflow handling where content can legitimately exceed the available page area instead of allowing the page itself to overflow.
- Preserved the existing sidebar and Host Game visual design.
- Updated the displayed build version to V1.6.7.

## V1.6.6
- Performed a global viewport containment pass across the V1.6 main-area screens.
- Added consistent right-side breathing room for borders, shadows, grids, cards and flex layouts.
- Prevented nested page content from forcing the main area wider than its available viewport.
- Fixed Host Approval image deletion refresh so deleted images disappear immediately after the server confirms the change.
- Updated the displayed build version to V1.6.6.

## V1.6.5
- Tidied the persistent sidebar into a deliberate top-to-bottom structure.
- Anchored the build badge and Back button as a fixed bottom block.
- Kept the main Host Game layout unchanged.
- Updated the displayed build version to V1.6.5.

## V1.6.4
- Moved Shuffle Mode and build version badges into the persistent left sidebar.
- Removed those badges from the Host Game main content area.
- Kept the larger Host Settings layout intact.
- Updated the displayed build version to V1.6.4.

## V1.6.3
- Added a visual right-side gutter to keep card borders and shadows fully inside the viewport.
- Applied the same containment treatment to Host Settings and footer controls.
- Updated the displayed build version to V1.6.3.

## V1.6.2
- Fixed viewport containment rules to prevent the main play area from being clipped at the right edge.
- Enlarged the Host Game settings cards while keeping the 2×4 layout inside the available viewport.
- Updated the displayed build version to V1.6.2.

## V1.6.1
- Reworked the V1.6 persistent sidebar so host setup fields live in the sidebar and gameplay timers stay there throughout timed phases.
- Changed Host Game settings to a 2-column by 4-row layout and removed the shuffle tip.
- Rebuilt Server Settings as a popup that mirrors the host setup cards and remains within the sidebar-based layout.
- Kept the sidebar visible when image search opens and moved the search panel clear of it.
- Tightened the gameplay editor spacing so the canvas uses the available play area more effectively.

## V1.6.0 — Layout foundation
- Rebuilt the game around a consistent left-hand sidebar and viewport-contained main play area.
- Removed the floating in-game player badge and Leave Game control in favour of persistent sidebar information.
- Added lobby Server Settings: everyone can view them and the host can edit them before the game starts.
- Increased player-name support to 30 characters across the server and client.
- Prompt submission now automatically focuses the text box when the phase opens.
- Reworked Surprise Me to use short 1–3 word-style concepts instead of long four-part sentences.
- Established a no-page-scroll desktop layout foundation for the game screens.

## V1.5.18
- Fixed lobby controls and player cards so waiting text and longer player names fit cleanly.
- Moved the in-game Leave Game control away from the gameplay sidebar and stopped bot-added confirmation text from carrying into gameplay rounds.
- Added a small image-search reminder explaining that changing search terms clears the current selection.

## V1.5.17
- Moved the fixed Leave Game and player identity controls to the lower corners so they no longer overlap gameplay headers and prompt text.
- Fixed the Final Showcase Next masterpiece action firing twice from duplicate click handlers, which could skip from one masterpiece to the third.
- Tightened the Final Showcase voting grid so the existing responsive viewport sizing can use the available height and centre the voting cards instead of leaving them stuck at the bottom.

## V1.5.16
- Round 1 still allows players to use their own submitted image pool.
- Added creator tracking to submitted pieces so a cut piece can never return to the player who created it in a later Canvas round.
- Reworked later-round set assignment to enforce the no-self rule across the actual piece creators.
- Hardened the Final Showcase advance action and added a direct client handler for Next masterpiece / Finish slideshow.
- Fixed the Final Showcase fixed HUD overlapping the prompt area while keeping the responsive showcase sizing.

## V1.5.15
- Fixed the Final Showcase Next masterpiece / Finish slideshow control using a dedicated click handler and server action.
- Final Showcase and voting are now sized to fit within the viewport without page scrolling.
- Fixed the lobby player counter updating after the first bot is added.
- Restored the lobby minimum to 3 players and the default lobby capacity to 8 players.

## V1.5.13
- Fixed Final Showcase so every prompt reliably begins in slideshow mode before voting.
- The slideshow is anonymous: it no longer reveals which player created each masterpiece.
- The host still controls advancing through the masterpieces.
- Voting only becomes available after the host finishes the slideshow.

## V1.5.12
- Reworked Final Showcase into a host-controlled slideshow followed by voting.
- Each prompt now shows every player's finished masterpiece one at a time to everyone.
- The host controls the slideshow with Next masterpiece / Finish slideshow.
- Once the slideshow finishes, all players receive thumbnail-style voting cards.
- Bots now wait until the voting stage before submitting their votes.
- Updated the client and package build to V1.5.12.

## V1.5.11
- Fixed the remaining lobby name truncation rule overriding the previous wrapping fix.
- Player and bot names now wrap instead of showing ellipses.

## V1.5.10
- Fixed lobby player names being truncated by the compact three-column cards.
- Names now wrap within the identity area instead of being replaced with ellipses.

## V1.5.9
- Fixed compact lobby player cards so player and bot names are visible again.
- Reworked lobby cards to show avatar, name and status in a dedicated identity area.
- Kept host kick controls compact and aligned on the right.
- Updated the visible client fallback and package version to V1.5.9.

## V1.5.8
- Fixed the V1.5.7 JavaScript syntax error that caused the entire UI to render as a blank page.

# V1.5.4 — Bot flow diagnostics and confirmation
- Fixed the lobby bot button to use a single delegated click handler instead of two duplicate handlers.
- Added an explicit server confirmation when a bot is created.
- Added server-side bot creation logging so the Node console shows whether `ADD_BOT` was received and which bot was created.
- Added client-side diagnostics for the button click and WebSocket action send.
- Kept the normal authoritative lobby state broadcast; this release is designed to identify the exact point where the bot flow fails if the lobby still does not update.

## V1.5.3 — remove client-side bot disable
- The host **+ Bot** control is no longer disabled by potentially stale client lobby state.
- The server remains authoritative for capacity and host checks.
- Lobby errors are now displayed directly in the lobby.

## V1.5.2 — bot button interaction fix
- Replaced the lobby **+ Bot** inline click handler with a delegated browser click handler.
- The control continues to work when the lobby UI is refreshed or rebuilt dynamically.
- A disconnected WebSocket now produces a visible client error instead of silently doing nothing.

## V1.5.1 — bot lobby fix
- Fixed silent failures when the host clicks **+ Bot**.
- Bot creation is enabled for the development build without an environment-variable dependency.
- Invalid bot actions now return a visible error instead of appearing to do nothing.

## V1.5.0 — automated bot players
- Added a host-only **+ Bot** control in the lobby.
- Bots use the normal server-authoritative player pipeline and count towards the configured player capacity.
- Bots automatically submit image pools, prompts and collages across every creation round, including piece movement/rotation/flip/resize changes.
- Bots automatically vote in the Final Showcase.
- Added bot add/remove lobby actions and a full multiplayer regression test covering the two-round bot flow.
- Updated the build to V1.5.0.

## V1.4.98 — centralised build version
- Made `package.json` the single source of truth for the Collage build version.
- Runtime `/health`, browser build display and sprite cache-busting now derive from the same version.
- Removed the obsolete root-level copies of the live client files so they cannot drift from `public/` again.
- Current build: V1.4.98.

## V1.4.82 — fix Bing result scoping
- Restrict Bing image parsing to the actual image-result grid so unrelated/recommended tiles cannot leak into searches.
- Added a regression search for “joe rogan” to the automated image-search coverage.
- Bumped runtime, client, package and cache-busting versions to 1.4.82.

## V1.4.80 — avatar search means Avatar / Na'vi
- Corrected the special `avatar` search to target James Cameron's Avatar franchise and Na'vi characters.
- Searches Wikimedia Commons Na'vi, Jake Sully, Neytiri and Avatar film categories plus targeted title searches.
- Ranks Na'vi/character results above logos, posters, attractions and unrelated Avatar media.
- Bumped runtime, client, package and cache-busting versions to V1.4.80.

## V1.4.79 — avatar search targets actual profile/avatar graphics
- Reworked the special `avatar` search to pull from Wikimedia Commons' person-avatar and blank-profile categories instead of generic full-text avatar matches.
- Added ranking for profile/avatar/placeholder-style titles and square-ish profile images.
- De-prioritised obvious photo/Second Life-style results so the first results are much closer to generic human profile avatars.
- Kept normal searches unchanged.
- Bumped runtime, client, package and cache-busting versions to V1.4.79.

## V1.4.78 — avatar search uses actual avatar categories
- Reworked the `avatar` search to prioritize Wikimedia Commons avatar/profile-avatar categories instead of generic images merely containing the word “avatar”.
- Prioritizes male/female avatars, Chromium profile avatars, Gravatars and identicons before the broader avatar category.
- Avatar category results are allowed through without the old title-only filter.
- Bumped client/server version and cache bust to 1.4.78.

## V1.4.77
- Made the ambiguous `avatar` search person-focused by prioritising Wikimedia structured-data results that depict humans, with portrait/headshot/face fallbacks.
- Kept the strict title relevance guard so unrelated file-title matches are excluded.
- Added an automated regression test requiring person-oriented avatar results near the top of the returned set.

## V1.4.76
- Reworked image search around Wikimedia Commons title-targeted search instead of generic content search, preventing unrelated page-content matches.
- Search previews now use 600px thumbnails; full-resolution images are fetched only when selected.
- Added lazy thumbnail loading and cancellation of stale in-flight searches so typing does not cause overlapping searches or repeated gallery refreshes.
- Added server-side image reference tokens so full-resolution fetching does not accept arbitrary remote URLs.
- Updated automated image-search coverage for relevance, thumbnails, result limits and build version.

## V1.4.75 — Broader title-filtered search
- Keeps Wikimedia's relevance ranking but searches a few closely related query variants so broad terms such as "ocean" can fill the 100-result pool.
- Every candidate is still checked against the original search term in the image title, preventing the unrelated avatar results seen earlier.
- Search remains capped at 100 images and the existing image limits.

## V1.4.74 — Single-call title-constrained image search
- Reworked image search again to avoid the multi-request failure from V1.4.72/1.4.73.
- Uses Wikimedia's search generator with an explicit `intitle:` constraint, so arbitrary page-content matches cannot become results.
- Keeps the 100-result cap and existing image size limits.
- Avatar regression test now checks that every returned title contains the requested term.

## V1.4.73 — Reliable title-focused image search
- Reworked image search to use Wikimedia's title-only search mode instead of the heavier MediaSearch result retrieval.
- This avoids the intermittent "cannot search right now" failure caused by multiple search/info API requests while keeping avatar searches genuinely relevant.
- Avatar regression now requires every returned result to contain "avatar" as a whole word in the image title.
- Search remains capped at 100 images and the existing image dimension/pixel limits.

## V1.4.72 — Switch to Wikimedia MediaSearch ranking
- Replaced the unreliable Wikimedia generator search with Wikimedia's MediaSearch search profile.
- MediaSearch uses image-focused ranking built from titles, captions, categories, structured data and Wikidata rather than arbitrary page-content matches.
- Search results are still capped at 100 images and limited to the game's 3840×2160 / 8.3MP image limits.
- Added regression coverage for the avatar search relevance problem.

# Collage Changelog

## V1.4.71 — Stricter image relevance
- Search results must now have the user's search terms in the image title before they can enter the result pool.
- Prevents broad Wikimedia content matches from producing visually unrelated images.
- Preserves the expanded multi-page retrieval and 100-result cap.


## V1.4.70 — Expanded image search retrieval
- Reworked Wikimedia image search to paginate through multiple result pages instead of relying on one 500-result batch.
- Added query expansion for broad searches, including plural and photo/photograph variants.
- Increased the search candidate pool substantially while keeping the final result set capped at 100.
- Deduplicates results across all search passes and keeps the strongest relevance score for each image.
- Preserved the existing 3840×2160 / 8,294,400-pixel image limit.
- Added server-side search failure logging for easier deployment diagnostics.

## V1.4.69
- Expanded image search results from 36 to 100 results.
- Relaxed the custom relevance gate so useful snippet-only Wikimedia matches are retained for broad searches.
- Kept the 3840×2160 and 8.29MP maximum image dimensions.
- Updated Wikimedia search/fetch User-Agent version strings.

## V1.4.68
- Fixed image search returning only a handful of results for broad searches such as "ocean".
- Search now considers up to 500 Wikimedia candidates before selecting the best 36.
- Large source images are represented by Wikimedia thumbnails constrained to the game's 3840×2160 / 8.3MP maximum, so oversized originals no longer remove otherwise useful search results.

## V1.4.68
- Improved Wikimedia image search relevance by scoring title, category and description matches instead of relying only on broad search ordering.
- Search results are limited to images no larger than 3840px on either dimension and no more than 8.3 megapixels (4K-class maximum).
- Search now returns the most relevant 36 usable images.

## V1.4.68
- Fixed character selection for avatars 21–24.

## V1.4.68
- Replaced the avatar artwork with the 24 newly supplied character images.
- Upscaled the 24-avatar roster and added it to the game as a shared sprite asset with black backgrounds.
- Fixed the build version/cache label to V1.4.68.

## V1.4.64
- Added a black circular buffer behind all 24 avatar images.
- Clipped avatar images to the circular badge so the white outer padding on avatars 21–24 is hidden.
- Removed the previous special scaling workaround for avatars 21–24.

## V1.4.64
- Standardized player character displays across the game.
- Lobby, player HUD and final-results avatars are now large circular portraits using the same crop rules.
- Increased mobile identity avatars to remain clearly visible.
- Added automated coverage for the lobby avatar sizing rules.

## V1.4.57
- Replaced the temporary SVG avatar artwork with the 20 cleaned custom avatar images.
- Changed the profile picker to a 5×4 desktop layout with larger character artwork.
- Kept character identity visible in the lobby, in-game HUD and final results.
- Server validation now accepts avatar IDs 1–20.

## V1.4.57
- Replaced emoji profile choices with 24 custom cartoon character avatars.
- Added character selection to the profile screen and persistent character identity during games.
- Added player character display beside names and in the in-game top-right HUD.
- Added validation so only character IDs 1–24 are accepted by the server.

## V1.4.55
- Added a persistent Leave Game button during active games.
- Leave Game intentionally closes the connection, clears the saved session and returns to the home screen.
- Added Playwright coverage confirming Leave Game returns to the landing screen.

## V1.4.54
- Added WebSocket heartbeat monitoring so stale connections are detected instead of remaining apparently connected.
- Added automatic reconnect/resume using the existing player and lobby session.
- Added regression coverage for reconnecting a player and completing collage submission afterwards.

## V1.4.53
- Fixed Final Showcase clients getting stuck on an earlier voting prompt when `finalIndex` changed without a phase change.
- Clients now rerender when either the showcase index or their vote state changes.

## V1.4.52
- Fixed Final Showcase rendering: the client was calling an undefined `canvasHTML()` helper after Round 2 completed.
- Extended Playwright coverage through Round 2, Final Showcase, both voting prompts and Final Results.
- Updated runtime and visible build/cache versions to V1.4.52.

## V1.4.51
- Added an explicit server submission acknowledgement so the submitting client immediately receives accepted state before the normal state broadcast.
- Updated the visible build/cache version to V1.4.51.

# Changelog

## V1.4.50
- Fixed Round 2 rendering: the client was calling an undefined `scatter()` function when receiving server-provided Round 2 pieces.
- Client now uses the server-provided piece positions directly.


## V1.4.50
- Added temporary test-mode diagnostics to trace the Round 1 → Round 2 transition in CI.


## V1.4.50
- Made the server advance to the next round immediately after broadcasting the final submission count.
- Removes the 50ms delayed round transition that was leaving automated two-player games stuck on Round 1.


## V1.4.47
- Added automated Playwright two-player end-to-end coverage for the Round 1 submission → Round 2 transition.
- Added GitHub Actions CI to run Chromium tests on pushes and pull requests.
- Added failure screenshots, video, traces, and HTML reports for investigation.
- Added `npm run test:e2e` for local Playwright runs.
- Gameplay logic unchanged from V1.4.46.

## V1.4.46 — Final submission round transition fix
- Fixed the final collage submission hand-off by explicitly queuing round completion after the accepted submission count is broadcast.
- Added a short transition delay so both clients can receive the final 2/2 state before the server advances to the next round.
- Preserved the reduced live collage sync traffic from V1.4.45.

## V1.4.46 — Reduced live collage sync traffic
- Debounced live collage synchronisation so edits do not continually send large piece payloads.
- Removed the server's full STATE response to every `SYNC_COLLAGE` message.
- Submit now cancels any pending sync and sends the latest collage immediately.
- Server-authoritative submission and round progression remain unchanged.

## V1.4.44 — Version bump for live Render testing
- Updated the application version to V1.4.44 across the runtime, client, package metadata, visible build badge, HTML cache-busting and documentation.
- This build number is intended to make Render deployment verification immediately visible during live testing.

## V1.4.43 — Round transition deployment hotfix
- Confirmed the server correctly advances from Round 1 to Round 2 after all connected players submit.
- Confirmed the frontend must rerender when the `round` changes even though the WebSocket phase remains `ROUND`.
- Cache-busted the deployed frontend entry point so the corrected Round 1 → Round 2 client logic is definitely loaded after deployment.

## V1.4.35
- Simplified collage submission to mirror the working prompt-submission model.
- Removed the visible `Submitting…` state and separate submission acknowledgement flow.
- Submission immediately locks the player's collage and shows the live X/X count.
- Added silent bounded retries for transient connection/state delivery issues.
- Final submission immediately advances the round; duplicate submissions are safely ignored.

## V1.4.34
- Hardened collage submission with explicit server acknowledgement and bounded retry handling.
- Fixed prompt input focus/cursor preservation when another player submits.
- Bumped server, client and package versions to 1.4.34.

## V1.4.31

- Corrective release: synchronised the live server runtime with the V1.4.30 submission-acknowledgement client changes.
- Bumped the server, frontend, package and cache-busting version to V1.4.31 so deployment can be verified through /health.
- Updated Wikimedia image-search/fetch User-Agent version strings to V1.4.31.

## V1.4.30

- Made collage submission acknowledgement robust to delayed or missed state updates by accepting the server ACK locally and retrying the idempotent submission up to three times when confirmation is delayed.
- Clears pending submission retries as soon as authoritative submitted state arrives or the round changes.
- Added direct client-side handling for rejected submission acknowledgements.
- Bumped runtime, frontend, package and cache-busting version to V1.4.30.

## V1.4.29

- Expanded automated multiplayer coverage to 2, 3, 4 and 8 players, including per-player submission counts.
- Added a server-authoritative timer-expiry regression test using a test-only 1-second creation timer.
- Preserved unsent prompt text when another player submits, preventing live state updates from clearing the draft.
- Removed client-side round auto-submission so the server remains authoritative for timer expiry.
- Prevented the submit button from becoming stuck when the WebSocket is unavailable.
- Bumped runtime, frontend, package and cache-busting version to V1.4.29.

## V1.4.28

- Fixed image search adding so a failed full-resolution image download falls back to the search thumbnail instead of silently dropping the selected image.
- Shows an error when fewer images could be loaded than were selected.
- Bumped runtime, frontend, package and cache-busting version to V1.4.28.

## V1.4.27

- Hardened collage submission acknowledgement so every submission receives an explicit accepted/count response, including repeat/idempotent submits.
- Added a multiplayer regression assertion that the first collage submission is explicitly acknowledged before the second player submits.
- Bumped runtime, frontend, package and cache-busting version to V1.4.27.

# Changelog

## V1.4.26
- Added explicit collage submission acknowledgement so the submitting player receives immediate accepted-submission feedback.
- Fixed freehand cut pointer handling so drawing continues outside the image area while the cut path is clamped to the image boundary.
- Bumped the runtime, frontend, package and cache-busting version to V1.4.26.

# Changelog

## V1.4.25
- Fixed the multi-round submission lock by resetting the round-finish guard when a new round begins, allowing the final round to transition into Final Showcase after all players submit.
- Bumped the runtime, frontend, package and cache-busting version to V1.4.25.


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


## V1.6.13
- Fixed lobby/game WebSocket performance by removing redundant full-state broadcasts during collage syncing and round submission.
- Fixed duplicate broadcasts around slideshow advancement and final voting transitions.
- Fixed Final Results gallery auto-scroll by restoring its missing gallery element ID.
- Optimised masterpiece image decoding/loading to reduce browser rendering work.


## V1.6.14
- Render lobby sidebar controls immediately on first lobby render, rather than waiting for a later live state update.
- Keep player count, host start/waiting status, bot control, and ready button synchronised with subsequent lobby updates.


## V1.6.15
- Made each Final Results masterpiece card and canvas square at all supported screen sizes.
- Hid the Final Results gallery scrollbar while preserving manual and automatic scrolling.
