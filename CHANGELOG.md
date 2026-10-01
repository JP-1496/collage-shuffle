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
