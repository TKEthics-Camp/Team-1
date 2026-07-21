import Dexie, { type Table } from 'dexie'

export interface Interest {
  id: string
  name: string
  color: string // gradient key from palette
  why: string
  createdAt: number
  updatedAt: number
}

export interface Photo {
  id: string
  interestId: string
  blob: Blob
  caption: string
  isPinned: boolean
  createdAt: number
}

export interface Entry {
  id: string
  interestId: string
  date: number // the day being journaled (user-set, ms)
  text: string
  isPinned: boolean
  createdAt: number
  updatedAt: number
}

export interface Profile {
  id: string // always 'me'
  name: string
  emoji: string
}

class OrbsDB extends Dexie {
  interests!: Table<Interest, string>
  photos!: Table<Photo, string>
  entries!: Table<Entry, string>
  profile!: Table<Profile, string>

  constructor() {
    super('orbs')
    this.version(1).stores({
      interests: 'id, name, createdAt',
      photos: 'id, interestId, createdAt, isPinned',
      entries: 'id, interestId, date, isPinned',
    })
    this.version(2).stores({
      profile: 'id',
    })
  }
}

export const db = new OrbsDB()

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

// ---------- interests ----------
export async function createInterest(data: { name: string; color: string; why?: string }) {
  const now = Date.now()
  const interest: Interest = {
    id: uid(),
    name: data.name.trim(),
    color: data.color,
    why: data.why?.trim() ?? '',
    createdAt: now,
    updatedAt: now,
  }
  await db.interests.add(interest)
  return interest
}

export async function updateInterest(id: string, patch: Partial<Pick<Interest, 'name' | 'color' | 'why'>>) {
  await db.interests.update(id, { ...patch, updatedAt: Date.now() })
}

export async function deleteInterest(id: string) {
  await db.transaction('rw', db.interests, db.photos, db.entries, async () => {
    await db.photos.where('interestId').equals(id).delete()
    await db.entries.where('interestId').equals(id).delete()
    await db.interests.delete(id)
  })
}

// ---------- photos ----------
export async function addPhoto(data: { interestId: string; blob: Blob; caption?: string; isPinned?: boolean }) {
  const photo: Photo = {
    id: uid(),
    interestId: data.interestId,
    blob: data.blob,
    caption: data.caption?.trim() ?? '',
    isPinned: data.isPinned ?? false,
    createdAt: Date.now(),
  }
  await db.photos.add(photo)
  return photo
}

export async function deletePhoto(id: string) {
  await db.photos.delete(id)
}

// ---------- entries ----------
export async function addEntry(data: { interestId: string; date: number; text: string; isPinned?: boolean }) {
  const now = Date.now()
  const entry: Entry = {
    id: uid(),
    interestId: data.interestId,
    date: data.date,
    text: data.text.trim(),
    isPinned: data.isPinned ?? false,
    createdAt: now,
    updatedAt: now,
  }
  await db.entries.add(entry)
  return entry
}

export async function updateEntry(id: string, patch: Partial<Pick<Entry, 'date' | 'text' | 'isPinned'>>) {
  await db.entries.update(id, { ...patch, updatedAt: Date.now() })
}

export async function deleteEntry(id: string) {
  await db.entries.delete(id)
}

// ---------- derived stats ----------
const dayStart = (t: number) => {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Consecutive-day streak ending today (or yesterday) computed from entry dates. */
export function computeStreak(dates: number[]): number {
  if (dates.length === 0) return 0
  const days = new Set(dates.map(dayStart))
  const today = dayStart(Date.now())
  let cursor = days.has(today) ? today : today - 86400000
  if (!days.has(cursor)) return 0
  let streak = 0
  while (days.has(cursor)) {
    streak++
    cursor -= 86400000
  }
  return streak
}
