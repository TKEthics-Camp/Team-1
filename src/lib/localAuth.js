import { db } from "../db/db";
import { uid } from "./id";

// Plan A: no backend exists yet, so accounts live entirely on this device —
// see the AuthContext/ProfileScreen comments for the migration path once a
// real Supabase project exists (the existing local-first sync/reconcile
// logic in StoreContext is what would "claim" this data under a real
// account later; nothing here needs to change for that to work).

function normalize(username) {
  return (username || "").trim().toLowerCase();
}

function randomSalt() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(password, salt) {
  const bytes = new TextEncoder().encode(salt + ":" + password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createLocalAccount(rawUsername, password) {
  const username = normalize(rawUsername);
  if (!username || !password) return { ok: false, reason: "empty" };
  if (await db.accounts.get(username)) return { ok: false, reason: "taken" };
  const salt = randomSalt();
  const account = {
    username, displayName: rawUsername.trim(),
    salt, passwordHash: await hashPassword(password, salt),
    id: uid(), createdAt: Date.now(),
  };
  await db.accounts.put(account);
  return { ok: true, account };
}

export async function verifyLocalAccount(rawUsername, password) {
  const username = normalize(rawUsername);
  const account = await db.accounts.get(username);
  if (!account) return { ok: false, reason: "notFound" };
  if ((await hashPassword(password, account.salt)) !== account.passwordHash) {
    return { ok: false, reason: "wrongPassword" };
  }
  return { ok: true, account };
}

export async function getLocalAccountByUsername(rawUsername) {
  return db.accounts.get(normalize(rawUsername));
}
