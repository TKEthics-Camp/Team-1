import "dotenv/config";
import express from "express";
import cors from "cors";
import webpush from "web-push";
import { upsertDevice, setInterests, removeDevice } from "./store.js";
import { startScheduler, tick } from "./scheduler.js";

const PORT = process.env.PORT || 8787;
const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error(
    "Missing VAPID keys. Run `npm run generate-vapid` in server/ and copy the\n" +
    "output into server/.env (see .env.example)."
  );
  process.exit(1);
}

webpush.setVapidDetails(VAPID_SUBJECT || "mailto:you@example.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const app = express();
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
app.use(cors({ origin: allowedOrigin === "*" ? true : allowedOrigin.split(",") }));
app.use(express.json());

app.get("/api/vapid-public-key", (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Called once, right after the browser grants Notification permission and
// creates a PushSubscription. `deviceId` is a random id the client makes for
// itself (no accounts here) so we know which subscription to update later.
app.post("/api/register", (req, res) => {
  const { deviceId, subscription, tz, lang } = req.body || {};
  if (!deviceId || !subscription) return res.status(400).json({ error: "deviceId and subscription required" });
  upsertDevice(deviceId, { subscription, tz, lang });
  res.json({ ok: true });
});

// Called whenever interests/entries/photos change locally, so the server
// always has a fresh (but minimal — no journal text or photos) picture of
// what's due and what's already been logged today.
app.post("/api/sync", (req, res) => {
  const { deviceId, interests, tz, lang } = req.body || {};
  if (!deviceId || !Array.isArray(interests)) return res.status(400).json({ error: "deviceId and interests[] required" });
  const updated = setInterests(deviceId, interests, { tz, lang });
  if (!updated) return res.status(404).json({ error: "unknown deviceId — call /api/register first" });
  res.json({ ok: true });
});

app.delete("/api/register/:deviceId", (req, res) => {
  removeDevice(req.params.deviceId);
  res.json({ ok: true });
});

// Dev/QA helper — fires the scheduler pass immediately instead of waiting
// for the next minute-boundary check, so wiring can be verified end-to-end.
app.post("/api/test-tick", async (req, res) => {
  await tick();
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Push server listening on http://localhost:${PORT}`);
  startScheduler();
});
