# Database

Everything the live database is built from: `migrations/` (applied in
filename order), `functions/` (edge functions), `tests/`, and `admin/`
(one-off scripts that are not migrations).

## Applying migrations

Until now every migration was pasted into the Supabase SQL editor by hand.
That works, but the Supabase CLI then has no record of what is applied, and
`supabase db push` would try to apply everything again. To switch over once:

1. Apply any migrations that are not in yet, by hand as before.
2. Run `admin/record_applied_migrations.sql` in the SQL editor. It records
   every migration in this folder as applied, without running any of them.
3. Install the CLI and link the project:
   `supabase login`, then `supabase link --project-ref <project ref>`.

From then on, add a new file to `migrations/` and run `supabase db push`.
The CLI applies only what is new and keeps the record itself.

If a migration is still applied by hand for any reason, check it landed with
a query afterwards — the editor runs a file as one transaction, and one that
fails part-way can leave the database half changed.

## Checking the privacy rules

`tests/privacy_checks.sql` signs in as a set of pretend accounts and tries
everything that must be refused. Paste it into the SQL editor and run it
after any migration that touches a policy or a trigger. It always ends in a
red error box that carries the results and undoes everything it created;
"14 of 14 passed" is the answer you want.
