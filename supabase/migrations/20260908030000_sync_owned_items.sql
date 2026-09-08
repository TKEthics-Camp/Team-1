-- Coins spent on a Market decoration or an avatar hair/outfit style
-- already sync (see updateCoins) — what was actually bought never did.
-- Buying something spent real coins locally and remotely, but the
-- purchase itself only ever lived on this device: a sign-out wipes local
-- storage, and the profile rebuilt on the next sign-in had nowhere to
-- recover the purchase from, so coins stayed spent while the item vanished.
alter table public.users
  add column if not exists owned_decorations text[] not null default '{}',
  add column if not exists equipped_decoration text,
  add column if not exists owned_hair text[] not null default '{}',
  add column if not exists owned_outfits text[] not null default '{}';
