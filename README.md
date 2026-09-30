# Collage — Shuffle V1.1.0

A browser-first multiplayer party game prototype. The server is Node.js + Express + WebSocket; the client is plain browser HTML/CSS/JS so it can be deployed directly as one Render Web Service.

## Run locally (optional)
Requires Node.js 18+.

```bash
npm install
npm start
```
Open http://localhost:10000 in multiple browser windows/devices on the same machine.

## Deploy online for free with Render
Render supports free Node.js web services and inbound WebSockets. Free services can spin down after 15 minutes of inactivity; the next connection can take about a minute to wake them. Uploaded files and in-memory game state are also lost when the free service restarts, which is acceptable for this test build.

1. Create a free GitHub account at https://github.com/ if you do not already have one.
2. Create a new repository called `collage-shuffle`.
3. Upload the contents of this folder to the repository (not the outer folder itself).
4. Create a free Render account at https://render.com/ and connect GitHub.
5. Render Dashboard → New → Web Service → select your `collage-shuffle` repository.
6. Choose Free.
7. Build Command: `npm install`
8. Start Command: `npm start`
9. Click Create Web Service.
10. When deployment finishes, open the generated `https://YOUR-NAME.onrender.com` URL.

The app uses the browser's WebSocket connection automatically. Do not use `localhost` in the deployed version.

## Test with friends
Host a lobby, send them the Render URL, and tell them the 4-letter lobby code. Everyone opens the same URL in their own browser/device.

## Changelog
### V1.1.0 — Online test build
- Browser-first Node/Express/WebSocket server.
- Render deployment configuration included.
- Public WebSocket path `/ws` and health endpoint `/health`.
- New colourful, playful UI replacing the dashboard-like prototype.
- Local nickname/avatar profile persistence.
- Image submission screen now has upload, drag/drop and Ctrl+V image paste.
- Image submission automatically advances once everyone has supplied the required number.
- Host approval flow retained.
- Prompt submission retained.
- Round 1 source-image subsets are randomly assigned per player.
- Rounds circulate travelling piece sets between players.
- Creation and voting timers are server controlled.
- Anonymous voting and round reveal retained.
- Final leaderboard retained.
- Version shown as V1.1.0.

### Known limitations
- The cut tool currently creates a circular-style piece from a click rather than true pixel-accurate circular extraction; this is the next editor refinement.
- Transform controls are functional but still being polished.
- Images are held in memory for this test build; Render restarts can clear a game.
- Free Render services sleep after inactivity.
