import { downloadPhotoBlob, downloadAudioBlob } from "./remote";

// "Download my data" — a copy of everything a student has put into Forest.
//
// GDPR and PIPL both give a person the right to a copy of their data in a
// form they can take elsewhere, and the privacy policy said plainly that this
// was missing. It was removed twice before (8c1d3f7, f30247b); the old
// version was JSON only, which satisfies a regulator and nobody else. A
// student asking for their data wants their journal and their photos.
//
// So the zip carries both:
//   journal.txt      their writing, readable, grouped by hobby
//   photos/          every photo as an ordinary image file
//   voice-notes/     every recording as an ordinary audio file
//   data.json        everything, machine-readable, for the legal right
//
// Photos and recordings are fetched from Storage when this device does not
// already hold them. A file that cannot be fetched is noted in the journal
// rather than silently left out, so a gap is visible rather than mysterious.

export async function buildExport({ profile, interests, entries, photos, lang = "en" }) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const missing = [];

  const photoFiles = new Map();
  for (const p of photos) {
    const blob = p.blob || (p.storagePath ? await downloadPhotoBlob(p.storagePath) : null);
    if (!blob) { missing.push(p.id); continue; }
    const name = `photos/${p.id}.jpg`;
    zip.file(name, blob);
    photoFiles.set(p.id, name);
  }

  const audioFiles = new Map();
  for (const e of entries) {
    if (!e.audio && !e.audioPath) continue;
    const blob = e.audio || (await downloadAudioBlob(e.audioPath));
    if (!blob) { missing.push(e.id); continue; }
    const name = `voice-notes/${e.id}.${audioExtension(blob.type)}`;
    zip.file(name, blob);
    audioFiles.set(e.id, name);
  }

  zip.file("journal.txt", journalText({ profile, interests, entries, photos, photoFiles, audioFiles, lang }));
  zip.file("data.json", JSON.stringify({
    exportedAt: new Date().toISOString(),
    profile: strip(profile),
    interests: interests.map(strip),
    entries: entries.map((e) => ({ ...strip(e), voiceNoteFile: audioFiles.get(e.id) || null })),
    photos: photos.map((p) => ({ ...strip(p), file: photoFiles.get(p.id) || null })),
  }, null, 2));

  const blob = await zip.generateAsync({ type: "blob" });
  return { blob, missing };
}

// Blobs are binary and already exported as files; everything else is kept.
function strip(rec) {
  if (!rec) return rec;
  const { blob, audio, ...rest } = rec; // eslint-disable-line no-unused-vars
  return rest;
}

function audioExtension(type) {
  if (/mp4|aac|m4a/.test(type || "")) return "m4a";
  if (/ogg/.test(type || "")) return "ogg";
  return "webm";
}

// Pure, so it can be tested without a zip or a network: the part of the
// export a person actually reads.
export function journalText({ profile, interests, entries, photos, photoFiles = new Map(), audioFiles = new Map(), lang = "en" }) {
  const zh = lang !== "en";
  const out = [];
  const name = (profile && profile.name) || "";
  out.push(zh ? `${name} 的 Forest 日记` : `${name}'s Forest journal`);
  out.push(zh ? `导出于 ${new Date().toISOString().slice(0, 10)}` : `Exported ${new Date().toISOString().slice(0, 10)}`);
  out.push("");

  const byInterest = (list, id) => list.filter((x) => x.interestId === id);
  for (const it of interests) {
    const title = zh ? (it.nameZh || it.name) : it.name;
    out.push("=".repeat(Math.max(8, title.length)));
    out.push(title);
    out.push("=".repeat(Math.max(8, title.length)));

    const its = byInterest(entries, it.id)
      .slice()
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    if (!its.length) out.push(zh ? "（还没有日记）" : "(no journal entries yet)");
    for (const e of its) {
      const mins = e.minutes ? (zh ? ` · ${e.minutes} 分钟` : ` · ${e.minutes} min`) : "";
      out.push("");
      out.push(`${e.date}${mins}`);
      if (e.text) out.push(e.text);
      if (audioFiles.has(e.id)) out.push((zh ? "[语音] " : "[voice note] ") + audioFiles.get(e.id));
    }

    const ps = byInterest(photos, it.id);
    if (ps.length) {
      out.push("");
      out.push(zh ? "照片：" : "Photos:");
      for (const p of ps) {
        const file = photoFiles.get(p.id);
        out.push(`  ${file || (zh ? "（无法下载）" : "(could not be downloaded)")}${p.caption ? " — " + p.caption : ""}`);
      }
    }
    out.push("");
  }
  return out.join("\n");
}
