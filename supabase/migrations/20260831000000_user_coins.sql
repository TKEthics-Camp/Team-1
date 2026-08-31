-- Coins were local-only (see StoreContext.jsx's bumpCoins/reviveInterest/
-- buyDecoration/buyAndEquipAvatarPart) — nothing else needed a table of its
-- own, just one more column on the row that already tracks this account's
-- other synced preferences (discovery_enabled, avatar, class_code, ...).
alter table public.users add column if not exists coins integer not null default 0;
