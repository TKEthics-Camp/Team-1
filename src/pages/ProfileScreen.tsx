import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Download, Trash2, X } from 'lucide-react'
import { db, computeStreak } from '@/lib/db'

const EMOJIS = ['🎨', '🎹', '🏀', '📚', '🌱', '🎸', '🏸', '✏️', '📷', '🧩', '🎮', '🌟']

export default function ProfileScreen() {
  const profile = useLiveQuery(() => db.profile.get('me'), [])
  const interests = useLiveQuery(() => db.interests.count(), [])
  const photoCount = useLiveQuery(() => db.photos.count(), [])
  const allEntries = useLiveQuery(() => db.entries.toArray(), [])
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🌟')

  const streak = computeStreak((allEntries ?? []).map((e) => e.date))

  const openEdit = () => {
    setName(profile?.name ?? '')
    setEmoji(profile?.emoji ?? '🌟')
    setEditing(true)
  }

  const saveProfile = async () => {
    await db.profile.put({ id: 'me', name: name.trim() || '热爱生活的人', emoji })
    setEditing(false)
  }

  const exportData = async () => {
    const [its, ents] = await Promise.all([db.interests.toArray(), db.entries.toArray()])
    const photos = await db.photos.toArray()
    // Images are exported as base64 so the backup is a single portable JSON file.
    const toBase64 = (blob: Blob) =>
      new Promise<string>((resolve) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result as string)
        r.readAsDataURL(blob)
      })
    const photosOut = await Promise.all(
      photos.map(async (p) => ({ ...p, blob: await toBase64(p.blob) }))
    )
    const payload = { app: 'orbs', version: 1, exportedAt: Date.now(), interests: its, entries: ents, photos: photosOut }
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `orbs-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const clearAll = async () => {
    if (!window.confirm('确定清空所有数据吗？星球、照片和日记都会被删除，无法恢复。')) return
    await Promise.all([db.interests.clear(), db.photos.clear(), db.entries.clear(), db.profile.clear()])
  }

  const stats = [
    { label: '星球', value: interests ?? 0 },
    { label: '日记', value: allEntries?.length ?? 0 },
    { label: '照片', value: photoCount ?? 0 },
    { label: '连续天数', value: streak },
  ]

  return (
    <div className="min-h-screen pb-28">
      <header className="px-6 pt-10 pb-6">
        <h1 className="text-2xl font-bold text-[#4a4640] tracking-wide">我的</h1>
      </header>

      <main className="px-6 space-y-5">
        <button
          onClick={openEdit}
          className="flex w-full items-center gap-4 rounded-3xl border border-[#e3ded2] bg-white/70 p-5 text-left hover:bg-white"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#e4c6bf] to-[#bcc8b2] text-3xl border border-[#e3ded2]">
            {profile?.emoji ?? '🌟'}
          </div>
          <div>
            <p className="text-lg font-semibold text-[#4a4640]">{profile?.name || '热爱生活的人'}</p>
            <p className="text-xs text-[#9a958a] mt-0.5">点击修改名字和头像</p>
          </div>
        </button>

        <div className="grid grid-cols-4 gap-2.5">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-[#e3ded2] bg-white/70 py-4 text-center">
              <p className="text-xl font-bold text-[#b3856f]">{s.value}</p>
              <p className="mt-1 text-[11px] text-[#8a857b]">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-[#e3ded2] bg-white/70 divide-y divide-[#eeeade]">
          <button onClick={exportData} className="flex w-full items-center gap-3 px-5 py-4 text-sm text-[#57534a] hover:bg-white/60 rounded-t-3xl">
            <Download size={16} className="text-[#9a958a]" /> 导出我的数据（JSON 备份）
          </button>
          <button onClick={clearAll} className="flex w-full items-center gap-3 px-5 py-4 text-sm text-[#c07a6a] hover:bg-white/60 rounded-b-3xl">
            <Trash2 size={16} /> 清空所有数据
          </button>
        </div>

        <div className="pt-4 text-center">
          <p className="text-sm text-[#9a958a]">Orbs · 星球</p>
          <p className="mt-1 text-xs text-[#b0aba0] leading-relaxed">
            一个安放热爱的私人小宇宙。<br />数据只保存在这台设备的浏览器里。
          </p>
        </div>
      </main>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-[#3d3a33]/40 backdrop-blur-sm" onClick={() => setEditing(false)} />
          <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-[#e3ded2] bg-[#faf8f3] p-6 pb-8 animate-sheet-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-[#4a4640]">编辑资料</h2>
              <button onClick={() => setEditing(false)} className="text-[#8a857b] p-1"><X size={20} /></button>
            </div>
            <label className="block text-xs text-[#8a857b] mb-1.5">名字</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="怎么称呼你？"
              className="w-full rounded-xl bg-white/60 border border-[#e3ded2] px-4 py-3 text-[#4a4640] placeholder-[#b5b0a5] outline-none focus:border-[#c0a08e] mb-4"
            />
            <label className="block text-xs text-[#8a857b] mb-2">头像</label>
            <div className="grid grid-cols-6 gap-2.5 mb-6">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`flex h-11 items-center justify-center rounded-xl text-2xl ${
                    emoji === e ? 'bg-[#e7e2d6] ring-1 ring-[#b98a78]/50' : 'bg-white/60'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            <button
              onClick={saveProfile}
              className="w-full rounded-full py-3.5 font-semibold text-white bg-gradient-to-r from-[#cba396] to-[#b98a78]"
            >
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
