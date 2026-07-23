import webpush from "web-push";
import { allDevices, markSent, removeDevice } from "./store.js";
import { localParts, dayKeyOffset, parseTime, dayOfWeek } from "./time.js";

// Message copy, bilingual to match the app. `names` is the list of hobby
// names swept up in this trigger (bundled into one push instead of one per
// hobby, so a quiet week doesn't turn into a wall of banners).
const MSG = {
  before: {
    en: (n) => [n.length === 1 ? n[0] : `${n.length} hobbies coming up`, "Starting in 30 minutes."],
    zh: (n) => [n.length === 1 ? n[0] : `${n.length} 个爱好`, "30 分钟后开始。"],
  },
  at: {
    en: (n) => [n.length === 1 ? n[0] : `${n.length} hobbies`, "It's time — go do it."],
    zh: (n) => [n.length === 1 ? n[0] : `${n.length} 个爱好`, "到时间了，去做吧。"],
  },
  wither7: {
    en: (n) => [`${n.length > 1 ? "Your trees are" : "Your tree is"} about to wither`, `${n.join(", ")} — log something before the day ends.`],
    zh: (n) => [`${n.join("、")} 快枯萎了`, "今天结束前记录一下，把它救回来。"],
  },
  wither8: {
    en: (n) => ["Still waiting…", `${n.join(", ")} wilted a little more overnight. Log today to bring ${n.length > 1 ? "them" : "it"} back.`],
    zh: (n) => ["还在等你", `${n.join("、")} 昨晚又枯萎了一点。今天记录一次，把它救回来。`],
  },
};

function norm(mins) {
  return ((mins % 1440) + 1440) % 1440;
}

// "before"/"at" are keyed to the hobby's chosen time, not just the day — so
// editing that time mid-day (after today's reminder already fired) doesn't
// get silently swallowed by a dedupe record that was written for the old time.
function sentValue(key, dayKey, it) {
  return key === "before" || key === "at" ? `${dayKey}@${it.time}` : dayKey;
}

async function send(device, title, body) {
  try {
    await webpush.sendNotification(device.subscription, JSON.stringify({ title, body, url: "/" }));
    return { ok: true };
  } catch (err) {
    if (err.statusCode === 410 || err.statusCode === 404) return { expired: true };
    console.error("push send failed:", err.statusCode, err.body || err.message);
    return { ok: false };
  }
}

export function startScheduler() {
  tick();
  setInterval(tick, 60 * 1000);
}

export async function tick() {
  const devices = allDevices();
  for (const [deviceId, device] of Object.entries(devices)) {
    if (!device.subscription) continue;
    const { dayKey, minutes } = localParts(device.tz);
    const yesterday = dayKeyOffset(dayKey, -1);
    const dow = dayOfWeek(dayKey);
    const lang = device.lang === "zh" ? "zh" : "en";

    const buckets = { before: [], at: [], wither7: [], wither8: [] };

    for (const it of device.interests || []) {
      const doneToday = it.lastLoggedDayKey === dayKey;
      const doneYesterday = !!it.lastLoggedDayKey && it.lastLoggedDayKey >= yesterday;
      const sent = it.sent || {};
      const mins = parseTime(it.time);
      // Missing/empty `days` means every day, same as the client's own rule.
      const onToday = !it.days || !it.days.length || it.days.includes(dow);

      if (mins !== null && onToday && !doneToday && minutes === norm(mins - 30) && sent.before !== sentValue("before", dayKey, it)) buckets.before.push(it);
      if (mins !== null && onToday && !doneToday && minutes === mins && sent.at !== sentValue("at", dayKey, it)) buckets.at.push(it);
      if (!doneToday && minutes === 19 * 60 && sent.wither7 !== dayKey) buckets.wither7.push(it);
      if (!doneYesterday && minutes === 8 * 60 && sent.wither8 !== dayKey) buckets.wither8.push(it);
    }

    let expired = false;
    for (const [key, list] of Object.entries(buckets)) {
      if (!list.length || expired) continue;
      const names = list.map((it) => it.name);
      const [title, body] = MSG[key][lang](names);
      const result = await send(device, title, body);
      if (result.expired) { expired = true; continue; }
      if (result.ok) list.forEach((it) => markSent(deviceId, it.id, key, sentValue(key, dayKey, it)));
    }
    if (expired) removeDevice(deviceId);
  }
}
