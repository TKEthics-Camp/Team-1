# Push server

Sends the real, outside-the-app phone banners: 30 minutes before each hobby's
usual time, at the time itself, a 7pm warning if today's streak hasn't been
logged yet, and an 8am follow-up the next day if it still hasn't. Talks to
the frontend over a tiny HTTP API and holds only what it needs to schedule
those sends — hobby names, usual times, and the last day each was logged.
Never sees photos or journal text.

## Run it

```
cd server
npm install
npm run generate-vapid       # one-time; paste the two keys it prints into .env
cp .env.example .env         # then fill in the VAPID keys
npm start
```

Point the frontend at it by setting `VITE_PUSH_SERVER_URL` (see the repo
root's `.env.example`) — defaults to `http://localhost:8787` for local dev.

## Deploying

This needs to run continuously (it checks every minute, independent of
whether anyone has the app open), so it has to live somewhere other than a
laptop that sleeps — any small always-on Node host works (Render, Railway,
Fly.io, a VPS...). `data/devices.json` is the entire database; back it up or
swap `server/src/store.js` for a real DB if this grows past a few users.

## Note on permissions

Push only works once the browser grants Notification permission for an
installed/allowed origin. On iOS specifically, Safari only delivers push to
a PWA added to the home screen (Settings → Share → Add to Home Screen),
even with everything here working correctly.
