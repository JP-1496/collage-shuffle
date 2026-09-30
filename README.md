# Collage — Shuffle V1.1.2

Browser-first multiplayer party game prototype.

## Local development
Requires Node.js for local development only:

```bash
npm install
npm start
```

Open http://localhost:10000

## Render deployment
Use a Render Web Service connected to this repository.
- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Plan: Free
- No environment variables required

The server listens on `0.0.0.0` and uses Render's `PORT` environment variable automatically.

## Testing notes
V1.1.2 specifically fixes prompt input resets, image traffic during submission, editor drag lag, and Round 1 circular cutting.
