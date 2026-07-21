import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { Plus, Pin } from 'lucide-react'
import { db } from '@/lib/db'
import { gradientOf, getColor } from '@/lib/palette'
import { useObjectUrl } from '@/lib/images'
import AddInterestModal from '@/components/AddInterestModal'

function OrbFace({ interestId, colorKey, name, size }: { interestId: string; colorKey: string; name: string; size: number }) {
  const latest = useLiveQuery(
    () => db.photos.where('interestId').equals(interestId).reverse().sortBy('createdAt').then((p) => p[p.length - 1]),
    [interestId]
  )
  const url = useObjectUrl(latest?.blob)
  const glow = getColor(colorKey).glow
  return (
    <div
      className="orb-float relative rounded-full overflow-hidden flex items-center justify-center select-none"
      style={{
        width: size,
        height: size,
        background: gradientOf(colorKey),
        boxShadow: `0 0 ${size / 2.5}px ${glow}, inset 0 -${size / 8}px ${size / 5}px rgba(0,0,0,0.12), inset 0 ${size / 10}px ${size / 6}px rgba(255,255,255,0.35)`,
        animationDelay: `${(interestId.charCodeAt(0) % 5) * 0.7}s`,
      }}
    >
      {url && <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <span
        className={`relative z-10 px-2 text-center font-semibold ${
          url
            ? 'text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]'
            : 'text-[#453f38] drop-shadow-[0_1px_1px_rgba(255,255,255,0.35)]'
        }`}
        style={{ fontSize: size / 7.5 }}
      >
        {name}
      </span>
    </div>
  )
}

function MemoryBanner() {
  const memory = useLiveQuery(async () => {
    const pinnedPhotos = await db.photos.filter((p) => p.isPinned).toArray()
    const pinnedEntries = await db.entries.filter((e) => e.isPinned).toArray()
    type Item =
      | { kind: 'photo'; ts: number; photo: (typeof pinnedPhotos)[number] }
      | { kind: 'entry'; ts: number; entry: (typeof pinnedEntries)[number] }
    const items: Item[] = [
      ...pinnedPhotos.map((p) => ({ kind: 'photo' as const, ts: p.createdAt, photo: p })),
      ...pinnedEntries.map((e) => ({ kind: 'entry' as const, ts: e.date, entry: e })),
    ]
    if (items.length === 0) {
      const recentPhoto = await db.photos.orderBy('createdAt').last()
      const recentEntry = await db.entries.orderBy('date').last()
      const best = [
        recentPhoto ? { kind: 'photo' as const, ts: recentPhoto.createdAt, photo: recentPhoto } : null,
        recentEntry ? { kind: 'entry' as const, ts: recentEntry.date, entry: recentEntry } : null,
      ].filter(Boolean) as Item[]
      if (best.length === 0) return null
      items.push(best.sort((a, b) => b.ts - a.ts)[0])
    }
    const pick = items[Math.floor(Math.random() * items.length)]
    const interestId = pick.kind === 'photo' ? pick.photo.interestId : pick.entry.interestId
    const interest = await db.interests.get(interestId)
    return { pick, interest }
  }, [])
  const url = useObjectUrl(memory?.pick.kind === 'photo' ? memory.pick.photo.blob : null)

  if (!memory?.interest) return null
  const { pick, interest } = memory

  return (
    <Link
      to={`/interest/${interest.id}`}
      className="block rounded-3xl border border-[#e3ded2] bg-white/70 backdrop-blur-md p-4 mb-6 hover:bg-white transition-colors"
    >
      <div className="flex items-center gap-2 text-[#b3856f] text-xs mb-2.5">
        <Pin size={12} />
        <span>还记得吗？</span>
      </div>
      <div className="flex items-center gap-4">
        {pick.kind === 'photo' && url && (
          <img src={url} alt="" className="h-16 w-16 rounded-2xl object-cover flex-none" />
        )}
        <div className="min-w-0">
          <p className="text-sm text-[#4a4640] leading-relaxed line-clamp-2">
            {pick.kind === 'photo' ? pick.photo.caption || '一张珍藏的照片' : pick.entry.text}
          </p>
          <p className="text-xs text-[#9a958a] mt-1.5">
            来自「{interest.name}」 · {new Date(pick.ts).toLocaleDateString('zh-CN')}
          </p>
        </div>
      </div>
    </Link>
  )
}

const SUGGESTIONS = ['水彩', '钢琴', '篮球']

export default function HomeScreen() {
  const interests = useLiveQuery(() => db.interests.orderBy('createdAt').toArray(), [])
  const [adding, setAdding] = useState(false)
  const [preset, setPreset] = useState<string | undefined>()
  const navigate = useNavigate()

  const sizes = useMemo(() => {
    // Varied orb sizes for an organic cluster feel
    const pattern = [148, 118, 132, 104, 140, 112]
    return (interests ?? []).map((_, i) => pattern[i % pattern.length])
  }, [interests])

  const openAdd = (name?: string) => {
    setPreset(name)
    setAdding(true)
  }

  return (
    <div className="min-h-screen pb-28">
      <header className="px-6 pt-10 pb-6">
        <h1 className="text-2xl font-bold text-[#4a4640] tracking-wide">我的星球</h1>
        <p className="text-sm text-[#9a958a] mt-1">你热爱的一切，都在这里发光</p>
      </header>

      <main className="px-6">
        <MemoryBanner />

        {interests && interests.length === 0 && (
          <div className="mt-10 text-center">
            <div className="mx-auto mb-6 h-28 w-28 rounded-full animate-pulse-soft" style={{ background: gradientOf('rose'), boxShadow: '0 0 60px rgba(208,167,159,0.5)' }} />
            <h2 className="text-lg font-semibold text-[#4a4640] mb-2">种下你的第一颗星球</h2>
            <p className="text-sm text-[#8a857b] mb-6 leading-relaxed">
              每一件你热爱的事，都值得一个发光的小世界。
            </p>
            <div className="flex justify-center gap-3 mb-8">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => openAdd(s)}
                  className="rounded-full border border-[#ddd7c9] bg-white/60 px-4 py-2 text-sm text-[#6e6a60] hover:bg-[#ece8de]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {interests && interests.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-7 py-2">
            {interests.map((it, i) => (
              <button key={it.id} onClick={() => navigate(`/interest/${it.id}`)} className="transition-transform hover:scale-105 active:scale-95">
                <OrbFace interestId={it.id} colorKey={it.color} name={it.name} size={sizes[i]} />
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => openAdd()}
          className="mx-auto mt-9 flex items-center gap-2 rounded-full border border-dashed border-[#cfc8b8] px-6 py-3 text-sm text-[#6e6a60] hover:border-[#c0a08e] hover:text-[#b3856f] transition-colors"
        >
          <Plus size={16} /> 新的兴趣
        </button>
      </main>

      <AddInterestModal open={adding} onClose={() => setAdding(false)} presetName={preset} />
    </div>
  )
}
