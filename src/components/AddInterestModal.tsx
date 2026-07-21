import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { PALETTE, gradientOf } from '@/lib/palette'
import { createInterest } from '@/lib/db'

export default function AddInterestModal({
  open,
  onClose,
  presetName,
}: {
  open: boolean
  onClose: () => void
  presetName?: string
}) {
  const [name, setName] = useState('')
  const [why, setWhy] = useState('')
  const [color, setColor] = useState(PALETTE[0].key)

  useEffect(() => {
    if (open) {
      setName(presetName ?? '')
      setWhy('')
      setColor(PALETTE[Math.floor(Math.random() * PALETTE.length)].key)
    }
  }, [open, presetName])

  if (!open) return null

  const save = async () => {
    if (!name.trim()) return
    await createInterest({ name, color, why })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-[#3d3a33]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-[#e3ded2] bg-[#faf8f3] p-6 pb-8 shadow-2xl animate-sheet-up">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[#4a4640]">新的热爱 ✨</h2>
          <button onClick={onClose} className="text-[#8a857b] hover:text-[#4a4640] p-1">
            <X size={20} />
          </button>
        </div>

        <label className="block text-xs text-[#8a857b] mb-1.5">它叫什么？</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="比如：水彩、钢琴、篮球……"
          autoFocus
          className="w-full rounded-xl bg-white/60 border border-[#e3ded2] px-4 py-3 text-[#4a4640] placeholder-[#b5b0a5] outline-none focus:border-[#c0a08e] mb-4"
        />

        <label className="block text-xs text-[#8a857b] mb-1.5">为什么喜欢它？（可选）</label>
        <input
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          placeholder="一句话就好"
          className="w-full rounded-xl bg-white/60 border border-[#e3ded2] px-4 py-3 text-[#4a4640] placeholder-[#b5b0a5] outline-none focus:border-[#c0a08e] mb-4"
        />

        <label className="block text-xs text-[#8a857b] mb-2">选一抹颜色</label>
        <div className="flex flex-wrap gap-3 mb-6">
          {PALETTE.map((c) => (
            <button
              key={c.key}
              onClick={() => setColor(c.key)}
              title={c.label}
              className={`h-10 w-10 rounded-full transition-transform ${
                color === c.key ? 'ring-2 ring-[#8a857b] scale-110' : 'opacity-70 hover:opacity-100'
              }`}
              style={{ background: gradientOf(c.key) }}
            />
          ))}
        </div>

        <button
          onClick={save}
          disabled={!name.trim()}
          className="w-full rounded-full py-3.5 font-semibold text-white bg-gradient-to-r from-[#cba396] to-[#b98a78] disabled:opacity-40 shadow-[0_10px_30px_rgba(185,138,120,0.35)]"
        >
          点亮这颗星球
        </button>
      </div>
    </div>
  )
}
