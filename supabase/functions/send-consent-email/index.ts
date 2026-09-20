// Drains public.consent_outbox and sends each queued message.
//
// This exists because nothing else can. The browser must never hold a
// service-role key or a mail provider's API key, and Postgres has no
// business making outbound HTTP calls on a child's signup path. So the
// database queues a row and this drains it, out of band, holding both
// secrets where only the platform can see them.
//
// Invoked on a schedule (see the cron SQL in the deployment notes). It is
// safe to run at any frequency: rows are claimed by stamping sent_at, and
// a row whose send_after is still in the future — which is every step-two
// message for its first 24 hours — is simply not selected.
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
const MAX_ATTEMPTS = 5;

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

  const { data: due, error } = await db
    .from("consent_outbox")
    .select("id, to_address, token, subject, body, attempts")
    .is("sent_at", null)
    .lte("send_after", new Date().toISOString())
    .lt("attempts", MAX_ATTEMPTS)
    .order("send_after", { ascending: true })
    .limit(BATCH);

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
    const text = `${row.body}\n\n${link}\n\n` +
      `If you were not expecting this, you can ignore it. Nothing happens unless you open the link and agree.`;

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
      // The row stays unsent and is retried next run until MAX_ATTEMPTS.
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
