# Collage — Shuffle

Browser-first multiplayer party game prototype.

## V1.2.0 testing
This build allows **2 players** so gameplay can be tested with two PCs. The final game rule remains a minimum of 3 players. Set `COLLAGE_TEST_MODE=false` on the server to restore the 3-player minimum.

### Local
```bash
npm install
npm start
```

Open http://localhost:10000

### Render
- Build command: `npm install`
- Start command: `npm start`
- Free Web Service is sufficient for prototype testing.

The app serves the browser client and WebSocket multiplayer server from the same service.
