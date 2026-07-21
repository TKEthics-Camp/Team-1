import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { ArrowLeft, Camera, ImagePlus, MoreVertical, PenLine, Pin, Trash2, X } from 'lucide-react'
import {
  db, addPhoto, deletePhoto, addEntry, updateEntry, deleteEntry,
  updateInterest, deleteInterest, computeStreak,
  type Entry, type Photo, type Interest,
} from '@/lib/db'
import { gradientOf, getColor, softGlowOf, PALETTE } from '@/lib/palette'
import { downscaleImage, useObjectUrl } from '@/lib/images'

const toDateInput = (ms: number) => {
  const d = new Date(ms)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function PhotoThumb({ photo, onOpen }: { photo: Photo; onOpen: () => void }) {
  const url = useObjectUrl(photo.blob)
  return (
    <button onClick={onOpen} className="relative aspect-square overflow-hidden rounded-2xl bg-white/60 active:scale-95 transition-transform">
      {url && <img src={url} alt={photo.caption} className="h-full w-full object-cover" loading="lazy" />}
      {photo.isPinned && <Pin size={12} className="absolute top-2 right-2 text-[#b3856f] drop-shadow" fill="currentColor" />}
    </button>
  )
}

function PhotoViewer({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  const url = useObjectUrl(photo.blob)
  return (
    <div className="fixed inset-0 z-50 bg-[#2e2b26]/95 flex flex-col" onClick={onClose}>
      <div className="flex justify-between items-center p-4">
        <button
          onClick={async (e) => { e.stopPropagation(); await deletePhoto(photo.id); onClose() }}
          className="rounded-full bg-[#ece8de] p-2.5 text-[#57534a] hover:bg-[#f2ded8]"
        >
          <Trash2 size={18} />
        </button>
        <button onClick={onClose} className="rounded-full bg-[#ece8de] p-2.5 text-[#57534a]">
          <X size={18} />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        {url && <img src={url} alt="" className="max-h-full max-w-full object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />}
      </div>
      {photo.caption && <p className="pb-8 text-center text-sm text-[#6e6a60] px-8">{photo.caption}</p>}
    </div>
  )
}

function AddPhotoSheet({ interestId, open, onClose }: { interestId: string; open: boolean; onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [pinned, setPinned] = useState(false)
  const [saving, setSaving] = useState(false)

  if (!open) return null

  const pick = (f: File | null) => {
    setFile(f)
    if (preview) URL.revokeObjectURL(preview)
    setPreview(f ? URL.createObjectURL(f) : null)
  }

  const save = async () => {
    if (!file || saving) return
    setSaving(true)
    const blob = await downscaleImage(file)
    await addPhoto({ interestId, blob, caption, isPinned: pinned })
    setSaving(false)
    setFile(null); setCaption(''); setPinned(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-[#3d3a33]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-[#e3ded2] bg-[#faf8f3] p-6 pb-8 animate-sheet-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[#4a4640]">存进一张照片</h2>
          <button onClick={onClose} className="text-[#8a857b] p-1"><X size={20} /></button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        {preview ? (
          <button onClick={() => fileRef.current?.click()} className="mb-4 block w-full">
            <img src={preview} alt="" className="max-h-56 w-full rounded-2xl object-cover" />
          </button>
        ) : (
          <button
            onClick={() => fileRef.current?.click()}
            className="mb-4 flex h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[#cfc8b8] text-[#8a857b] hover:border-[#c0a08e] hover:text-[#b3856f]"
          >
            <Camera size={28} strokeWidth={1.5} />
            <span className="text-sm">拍照或从相册选择</span>
          </button>
        )}

        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="一句话说明（可选）"
          className="w-full rounded-xl bg-white/60 border border-[#e3ded2] px-4 py-3 text-[#4a4640] placeholder-[#b5b0a5] outline-none focus:border-[#c0a08e] mb-4"
        />

        <label className="mb-6 flex items-center justify-between text-sm text-[#6e6a60]">
          <span className="flex items-center gap-2"><Pin size={14} /> 钉为回忆，会在首页出现</span>
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-5 w-5 accent-[#b98a78]" />
        </label>

        <button
          onClick={save}
          disabled={!file || saving}
          className="w-full rounded-full py-3.5 font-semibold text-white bg-gradient-to-r from-[#cba396] to-[#b98a78] disabled:opacity-40"
        >
          {saving ? '保存中…' : '保存'}
        </button>
      </div>
    </div>
  )
}

function EntryEditor({
  interestId, entry, open, onClose,
}: { interestId: string; entry: Entry | null; open: boolean; onClose: () => void }) {
  const [date, setDate] = useState(toDateInput(entry?.date ?? Date.now()))
  const [text, setText] = useState(entry?.text ?? '')
  const [pinned, setPinned] = useState(entry?.isPinned ?? false)

  if (!open) return null

  const save = async () => {
    if (!text.trim()) return
    const dateMs = new Date(`${date}T12:00:00`).getTime()
    if (entry) {
      await updateEntry(entry.id, { date: dateMs, text, isPinned: pinned })
    } else {
      await addEntry({ interestId, date: dateMs, text, isPinned: pinned })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-[#3d3a33]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-[#e3ded2] bg-[#faf8f3] p-6 pb-8 animate-sheet-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[#4a4640]">{entry ? '编辑日记' : '记一笔今天'}</h2>
          <button onClick={onClose} className="text-[#8a857b] p-1"><X size={20} /></button>
        </div>

        <label className="block text-xs text-[#8a857b] mb-1.5">日期</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-xl bg-white/60 border border-[#e3ded2] px-4 py-3 text-[#4a4640] outline-none focus:border-[#c0a08e] mb-4 "
        />

        <label className="block text-xs text-[#8a857b] mb-1.5">今天为它做了什么？</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="一两句话就好，比如：练了半小时《梦中的婚礼》"
          rows={3}
          autoFocus={!entry}
          className="w-full rounded-xl bg-white/60 border border-[#e3ded2] px-4 py-3 text-[#4a4640] placeholder-[#b5b0a5] outline-none focus:border-[#c0a08e] mb-4 resize-none"
        />

        <label className="mb-6 flex items-center justify-between text-sm text-[#6e6a60]">
          <span className="flex items-center gap-2"><Pin size={14} /> 钉为回忆，会在首页出现</span>
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-5 w-5 accent-[#b98a78]" />
        </label>

        <button
          onClick={save}
          disabled={!text.trim()}
          className="w-full rounded-full py-3.5 font-semibold text-white bg-gradient-to-r from-[#cba396] to-[#b98a78] disabled:opacity-40"
        >
          保存
        </button>
      </div>
    </div>
  )
}

function EditOrbSheet({ interest, open, onClose }: { interest: Interest; open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const [name, setName] = useState(interest.name)
  const [why, setWhy] = useState(interest.why)
  const [color, setColor] = useState(interest.color)

  useEffect(() => {
    if (open) {
      setName(interest.name)
      setWhy(interest.why)
      setColor(interest.color)
    }
  }, [open, interest])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-[#3d3a33]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-[#e3ded2] bg-[#faf8f3] p-6 pb-8 animate-sheet-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[#4a4640]">编辑星球</h2>
          <button onClick={onClose} className="text-[#8a857b] p-1"><X size={20} /></button>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-xl bg-white/60 border border-[#e3ded2] px-4 py-3 text-[#4a4640] outline-none focus:border-[#c0a08e] mb-4"
        />
        <input
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          placeholder="为什么喜欢它？"
          className="w-full rounded-xl bg-white/60 border border-[#e3ded2] px-4 py-3 text-[#4a4640] placeholder-[#b5b0a5] outline-none focus:border-[#c0a08e] mb-4"
        />
        <div className="flex flex-wrap gap-3 mb-6">
          {PALETTE.map((c) => (
            <button
              key={c.key}
              onClick={() => setColor(c.key)}
              className={`h-9 w-9 rounded-full ${color === c.key ? 'ring-2 ring-[#8a857b] scale-110' : 'opacity-70'}`}
              style={{ background: gradientOf(c.key) }}
            />
          ))}
        </div>
        <button
          onClick={async () => { await updateInterest(interest.id, { name, why, color }); onClose() }}
          disabled={!name.trim()}
          className="w-full rounded-full py-3.5 font-semibold text-white bg-gradient-to-r from-[#cba396] to-[#b98a78] disabled:opacity-40 mb-3"
        >
          保存
        </button>
        <button
          onClick={async () => {
            if (window.confirm('确定删除这颗星球吗？里面的照片和日记会一起删除。')) {
              await deleteInterest(interest.id)
              navigate('/')
            }
          }}
          className="w-full rounded-full py-3 text-sm text-[#c07a6a] border border-[#e3c4bb]"
        >
          删除这颗星球
        </button>
      </div>
    </div>
  )
}

export default function InterestScreen() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const interest = useLiveQuery(() => db.interests.get(id), [id])
  const photos = useLiveQuery(
    () => db.photos.where('interestId').equals(id).reverse().sortBy('createdAt'),
    [id]
  )
  const entries = useLiveQuery(
    () => db.entries.where('interestId').equals(id).reverse().sortBy('date'),
    [id]
  )

  const [tab, setTab] = useState<'album' | 'journal'>('album')
  const [addingPhoto, setAddingPhoto] = useState(false)
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null)
  const [entrySheetOpen, setEntrySheetOpen] = useState(false)
  const [viewing, setViewing] = useState<Photo | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  if (interest === undefined) return <div className="min-h-screen" />
  if (interest === null || !interest) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-[#8a857b]">
        <p>这颗星球不存在了</p>
        <button onClick={() => navigate('/')} className="text-[#b3856f]">回到首页</button>
      </div>
    )
  }

  const monthEntries = (entries ?? []).filter((e) => {
    const d = new Date(e.date)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  const streak = computeStreak((entries ?? []).map((e) => e.date))
  const glow = getColor(interest.color).glow

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div
        className="relative px-6 pt-6 pb-8"
        style={{ background: `linear-gradient(180deg, ${softGlowOf(interest.color)}, transparent)` }}
      >
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => navigate('/')} className="rounded-full bg-white/60 border border-[#e3ded2] p-2.5 text-[#6e6a60]">
            <ArrowLeft size={18} />
          </button>
          <div className="relative">
            <button onClick={() => setMenuOpen((v) => !v)} className="rounded-full bg-white/60 border border-[#e3ded2] p-2.5 text-[#6e6a60]">
              <MoreVertical size={18} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-12 z-20 w-36 rounded-2xl border border-[#e3ded2] bg-[#faf8f3] p-1.5 shadow-xl">
                <button
                  onClick={() => { setMenuOpen(false); setEditOpen(true) }}
                  className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-[#57534a] hover:bg-[#ece8de]"
                >
                  编辑星球
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div
            className="h-16 w-16 rounded-full flex-none"
            style={{ background: gradientOf(interest.color), boxShadow: `0 0 30px ${glow}` }}
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[#4a4640] truncate">{interest.name}</h1>
            {interest.why ? (
              <p className="text-sm text-[#8a857b] mt-1 truncate">「{interest.why}」</p>
            ) : (
              <button onClick={() => setEditOpen(true)} className="text-sm text-[#9a958a] mt-1 underline underline-offset-2">
                写一句“为什么喜欢它”
              </button>
            )}
          </div>
        </div>
        <p className="mt-4 text-xs text-[#8a857b]">
          {photos?.length ?? 0} 张照片 · 本月记录 {monthEntries.length} 天{streak > 0 ? ` · 连续 ${streak} 天 🔥` : ''}
        </p>
      </div>

      {/* Tabs */}
      <div className="px-6">
        <div className="mb-5 flex rounded-full border border-[#e3ded2] bg-white/60 p-1">
          {([['album', '相册'], ['journal', '日记']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 rounded-full py-2 text-sm transition-colors ${
                tab === key ? 'bg-[#ece8de] text-[#4a4640] font-medium' : 'text-[#8a857b]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'album' && (
          <>
            {photos && photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-2.5">
                {photos.map((p) => (
                  <PhotoThumb key={p.id} photo={p} onOpen={() => setViewing(p)} />
                ))}
              </div>
            ) : (
              <div className="py-14 text-center text-sm text-[#9a958a] leading-relaxed">
                还没有照片。<br />把你做的第一件作品存进来吧。
              </div>
            )}
            <button
              onClick={() => setAddingPhoto(true)}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full py-3.5 font-semibold text-white bg-gradient-to-r from-[#cba396] to-[#b98a78]"
            >
              <ImagePlus size={18} /> 添加照片
            </button>
          </>
        )}

        {tab === 'journal' && (
          <>
            {entries && entries.length > 0 ? (
              <div className="space-y-3">
                {entries.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => { setEditingEntry(e); setEntrySheetOpen(true) }}
                    className="w-full rounded-2xl border border-[#e3ded2] bg-white/70 p-4 text-left hover:bg-white"
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs text-[#9a958a]">{new Date(e.date).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}</span>
                      <span className="flex items-center gap-2">
                        {e.isPinned && <Pin size={12} className="text-[#b3856f]" fill="currentColor" />}
                        <Trash2
                          size={14}
                          className="text-[#b0aba0] hover:text-[#c07a6a]"
                          onClick={async (ev) => { ev.stopPropagation(); await deleteEntry(e.id) }}
                        />
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-[#57534a]">{e.text}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-14 text-center text-sm text-[#9a958a] leading-relaxed">
                还没有日记。<br />今天为它花了几分钟？记下来。
              </div>
            )}
            <button
              onClick={() => { setEditingEntry(null); setEntrySheetOpen(true) }}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full py-3.5 font-semibold text-white bg-gradient-to-r from-[#cba396] to-[#b98a78]"
            >
              <PenLine size={18} /> 记一笔
            </button>
          </>
        )}
      </div>

      <AddPhotoSheet interestId={id} open={addingPhoto} onClose={() => setAddingPhoto(false)} />
      <EntryEditor
        key={editingEntry?.id ?? 'new'}
        interestId={id}
        entry={editingEntry}
        open={entrySheetOpen}
        onClose={() => setEntrySheetOpen(false)}
      />
      <EditOrbSheet interest={interest} open={editOpen} onClose={() => setEditOpen(false)} />
      {viewing && <PhotoViewer photo={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
