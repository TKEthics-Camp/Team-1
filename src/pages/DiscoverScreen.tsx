import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { BookOpen, Clock, Compass, Plus, Sparkles, X } from 'lucide-react'
import { db, createInterest } from '@/lib/db'
import { gradientOf } from '@/lib/palette'
import { HOBBY_CATALOG, type HobbySuggestion } from '@/data/hobbies'
import { ARTICLES, type Article } from '@/data/articles'

interface Scored {
  hobby: HobbySuggestion
  score: number
  reason: string
}

function HobbyCard({
  hobby, reason, owned, onAdd,
}: { hobby: HobbySuggestion; reason?: string; owned: boolean; onAdd: () => void }) {
  return (
    <div className="rounded-3xl border border-[#e3ded2] bg-white/70 p-4">
      <div className="flex items-start gap-3">
        <div
          className="flex h-12 w-12 flex-none items-center justify-center rounded-full text-xl"
          style={{ background: gradientOf(hobby.color) }}
        >
          {hobby.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-semibold text-[#4a4640]">{hobby.name}</p>
            {owned ? (
              <span className="flex-none rounded-full bg-[#e7e2d6] px-3 py-1 text-[11px] text-[#8a857b]">已点亮</span>
            ) : (
              <button
                onClick={onAdd}
                className="flex flex-none items-center gap-1 rounded-full bg-gradient-to-r from-[#cba396] to-[#b98a78] px-3 py-1 text-[11px] font-medium text-white"
              >
                <Plus size={12} /> 点亮
              </button>
            )}
          </div>
          <p className="mt-0.5 text-xs text-[#8a857b]">{hobby.tagline}</p>
          {reason && (
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-[#b3856f]">
              <Sparkles size={11} /> {reason}
            </p>
          )}
          <p className="mt-2 text-xs leading-relaxed text-[#6e6a60]">
            <span className="text-[#9a958a]">第一步：</span>
            {hobby.firstStep}
          </p>
        </div>
      </div>
    </div>
  )
}

function ArticleReader({ article, onClose }: { article: Article; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-[#3d3a33]/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full max-w-md flex-col rounded-t-3xl sm:rounded-3xl border border-[#e3ded2] bg-[#faf8f3] animate-sheet-up">
        <div className="flex items-start justify-between gap-4 p-6 pb-3">
          <div>
            <span className="mb-2 inline-block rounded-full bg-[#e7e2d6] px-3 py-1 text-[11px] text-[#8a857b]">
              {article.tag} · {article.minutes} 分钟
            </span>
            <h2 className="text-lg font-bold leading-snug text-[#4a4640]">{article.title}</h2>
          </div>
          <button onClick={onClose} className="flex-none rounded-full bg-[#ece8de] p-2 text-[#8a857b]">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto px-6 pb-8">
          {article.body.map((p, i) => (
            <p key={i} className="mb-4 text-sm leading-7 text-[#57534a]">{p}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function DiscoverScreen() {
  const navigate = useNavigate()
  const interests = useLiveQuery(() => db.interests.toArray(), [])
  const entries = useLiveQuery(() => db.entries.toArray(), [])
  const photos = useLiveQuery(() => db.photos.toArray(), [])
  const [reading, setReading] = useState<Article | null>(null)

  const ownedNames = useMemo(
    () => new Set((interests ?? []).map((i) => i.name)),
    [interests]
  )

  // 基于用户日志的本地推荐：把兴趣名/why/日记/照片说明拼成语料，匹配关键词
  const recommendations = useMemo<Scored[]>(() => {
    if (!interests || !entries || !photos) return []
    const corpus = [
      ...interests.map((i) => `${i.name} ${i.why}`),
      ...entries.map((e) => e.text),
      ...photos.map((p) => p.caption),
    ].join(' ')
    if (!corpus.trim()) return []

    return HOBBY_CATALOG.filter((h) => !ownedNames.has(h.name))
      .map((hobby) => {
        let score = 0
        let bestKw = ''
        let bestCount = 0
        for (const kw of hobby.keywords) {
          const count = corpus.split(kw).length - 1
          if (count > 0) {
            score += count
            if (count > bestCount) {
              bestCount = count
              bestKw = kw
            }
          }
        }
        return { hobby, score, reason: `你的记录里 ${bestCount} 次提到“${bestKw}”` }
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
  }, [interests, entries, photos, ownedNames])

  const addHobby = async (h: HobbySuggestion) => {
    const it = await createInterest({ name: h.name, color: h.color, why: h.why })
    navigate(`/interest/${it.id}`)
  }

  const hasLogs = (entries?.length ?? 0) + (photos?.length ?? 0) > 0
  const newHobbies = HOBBY_CATALOG.filter((h) => !ownedNames.has(h.name)).slice(0, 6)

  return (
    <div className="min-h-screen pb-28">
      <header className="px-6 pt-10 pb-5">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-wide text-[#4a4640]">
          <Compass size={22} className="text-[#b3856f]" /> 发现
        </h1>
        <p className="mt-1 text-sm text-[#9a958a]">新的热爱，正在等你</p>
      </header>

      <main className="space-y-8 px-6">
        {/* 基于记录的推荐 */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[#6e6a60]">为你推荐</h2>
          {recommendations.length > 0 ? (
            <div className="space-y-3">
              {recommendations.map((r) => (
                <HobbyCard
                  key={r.hobby.id}
                  hobby={r.hobby}
                  reason={r.reason}
                  owned={false}
                  onAdd={() => addHobby(r.hobby)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-[#cfc8b8] p-5 text-center">
              <p className="text-sm leading-relaxed text-[#9a958a]">
                {hasLogs
                  ? '暂时没有匹配到你的偏好，多记录几天，推荐会更懂你。'
                  : '先在星球里记录几天，这里会根据你的日志推荐新爱好。'}
              </p>
            </div>
          )}
        </section>

        {/* 新爱好建议 */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[#6e6a60]">试试新爱好</h2>
          <div className="-mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-1">
            {newHobbies.map((h) => (
              <div
                key={h.id}
                className="w-40 flex-none snap-start rounded-3xl border border-[#e3ded2] bg-white/70 p-4"
              >
                <div
                  className="mb-3 flex h-12 w-12 items-center justify-center rounded-full text-xl"
                  style={{ background: gradientOf(h.color) }}
                >
                  {h.emoji}
                </div>
                <p className="font-semibold text-[#4a4640]">{h.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#8a857b]">{h.tagline}</p>
                <button
                  onClick={() => addHobby(h)}
                  className="mt-3 flex w-full items-center justify-center gap-1 rounded-full bg-gradient-to-r from-[#cba396] to-[#b98a78] py-2 text-xs font-medium text-white"
                >
                  <Plus size={13} /> 点亮这颗星球
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* 轻阅读 */}
        <section>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-[#6e6a60]">
            <BookOpen size={14} /> 轻阅读
          </h2>
          <div className="space-y-3">
            {ARTICLES.map((a) => (
              <button
                key={a.id}
                onClick={() => setReading(a)}
                className="w-full rounded-3xl border border-[#e3ded2] bg-white/70 p-4 text-left transition-colors hover:bg-white"
              >
                <div className="mb-1.5 flex items-center gap-2 text-[11px] text-[#9a958a]">
                  <span className="rounded-full bg-[#e7e2d6] px-2.5 py-0.5 text-[#8a857b]">{a.tag}</span>
                  <span className="flex items-center gap-1"><Clock size={11} /> {a.minutes} 分钟</span>
                </div>
                <p className="font-semibold leading-snug text-[#4a4640]">{a.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-[#8a857b]">{a.summary}</p>
              </button>
            ))}
          </div>
        </section>
      </main>

      {reading && <ArticleReader article={reading} onClose={() => setReading(null)} />}
    </div>
  )
}
