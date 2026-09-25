// Drains public.consent_outbox and sends each queued message.
//
// This exists because nothing else can. The browser must never hold a
// service-role key or a mail provider's API key, and Postgres has no
// business making outbound HTTP calls on a child's signup path. So the
// database queues a row and this drains it, out of band, holding both
// secrets where only the platform can see them.
//
// Invoked on a schedule (see schedule.sql). It is safe to run at any
// frequency and to overlap with itself: rows are claimed in the database
// before they are sent, and a row whose send_after is still in the future —
// every step-two message for its first 24 hours — is not claimable at all.
//
// Environment:
//   SUPABASE_URL              provided by the platform
//   SUPABASE_SERVICE_ROLE_KEY provided by the platform
//   RESEND_API_KEY            you set this
//   CONSENT_FROM              e.g. "Forest <consent@yourdomain.com>"
//   CONSENT_BASE_URL          e.g. "https://tkethics-camp.github.io/Team-1"
//
// CONSENT_BASE_URL lives here rather than coming from the app on purpose:
// the client never supplies the link, so nothing a signed-in child sends
// can redirect a consent email somewhere else.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BATCH = 25;

Deno.serve(async () => {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("CONSENT_FROM");
  const baseUrl = (Deno.env.get("CONSENT_BASE_URL") || "").replace(/\/+$/, "");

  const missing = [
    !url && "SUPABASE_URL",
    !key && "SUPABASE_SERVICE_ROLE_KEY",
    !resendKey && "RESEND_API_KEY",
    !from && "CONSENT_FROM",
    !baseUrl && "CONSENT_BASE_URL",
  ].filter(Boolean);

  if (missing.length) {
    // Loud rather than silent: a misconfigured worker looks exactly like a
    // quiet one, and the symptom is a child waiting forever.
    return new Response(
      JSON.stringify({ error: "missing config", missing }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  }

  const db = createClient(url!, key!, { auth: { persistSession: false } });

  // Claimed, not merely selected: the database locks and stamps these rows
  // in one step, so an overlapping run gets different rows or none, and no
  // parent receives the same email twice. See 20260926010000.
  const { data: due, error } = await db.rpc("claim_consent_outbox", { p_limit: BATCH });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }

  let sent = 0;
  let failed = 0;

  for (const row of due ?? []) {
    const link = `${baseUrl}/consent/${row.token}`;
    // The footer is the parent's standing instruction for the life of the
    // account: this one link is also how they withdraw or delete later.
    const text = `${row.body}\n\n${link}\n\n` +
      `If you were not expecting this, you can ignore it. Nothing happens unless you open the link and agree.\n\n` +
      `Keep this email. You can take permission back, or have the account deleted with everything in it, at any time by opening the same link.`;

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "authorization": `Bearer ${resendKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [row.to_address],
          subject: row.subject,
          text,
        }),
      });

      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);

      await db
        .from("consent_outbox")
        .update({ sent_at: new Date().toISOString(), attempts: row.attempts + 1 })
        .eq("id", row.id);
      sent += 1;
    } catch (e) {
      // The row stays unsent and is claimable again after its claim goes
      // stale, up to five attempts (see claim_consent_outbox).
      // last_error is kept because "the parent never got it" is otherwise
      // impossible to tell apart from "the parent ignored it".
      await db
        .from("consent_outbox")
        .update({
          attempts: row.attempts + 1,
          last_error: String(e).slice(0, 500),
        })
        .eq("id", row.id);
      failed += 1;
    }
  }

  return new Response(JSON.stringify({ sent, failed, considered: due?.length ?? 0 }), {
    headers: { "content-type": "application/json" },
  });
});
