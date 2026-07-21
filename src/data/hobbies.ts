/** 爱好推荐目录 —— keywords 用于和用户日志做本地匹配，全部离线运行。 */
export interface HobbySuggestion {
  id: string
  name: string
  emoji: string
  color: string // palette key
  tagline: string
  why: string
  firstStep: string
  keywords: string[] // 用户记录里出现这些词，说明可能喜欢
}

export const HOBBY_CATALOG: HobbySuggestion[] = [
  {
    id: 'sketch', name: '速写', emoji: '✏️', color: 'slate',
    tagline: '一支笔一张纸，随时开始',
    why: '把眼前的东西快速画下来，是最自由的记录方式',
    firstStep: '今天画下你书桌上的一样东西，限时 5 分钟',
    keywords: ['画', '水彩', '素描', '颜料', '涂鸦', '美术'],
  },
  {
    id: 'calligraphy', name: '书法', emoji: '🖌️', color: 'stone',
    tagline: '写字，也是写心',
    why: '一笔一画慢下来，作业之外也能享受写字',
    firstStep: '找一句喜欢的诗，认真抄三遍',
    keywords: ['字', '写', '诗', '语文', '抄'],
  },
  {
    id: 'guitar', name: '吉他', emoji: '🎸', color: 'milktea',
    tagline: '四个和弦，弹出一百首歌',
    why: '入门最快的乐器之一，宿舍里也能练',
    firstStep: '学会 C 和 G 两个和弦的按法',
    keywords: ['琴', '音乐', '歌', '弹', '钢琴', '唱'],
  },
  {
    id: 'photography', name: '摄影', emoji: '📷', color: 'haze',
    tagline: '手机就是你的相机',
    why: '学会看光，平凡的放学路也能出片',
    firstStep: '今天拍一张「光与影子」的照片',
    keywords: ['照片', '拍', '风景', '相机', '天空'],
  },
  {
    id: 'running', name: '跑步', emoji: '🏃', color: 'sage',
    tagline: '最便宜的快乐，只要一双鞋',
    why: '跑完的那种轻松，游戏给不了',
    firstStep: '慢跑 10 分钟，不追求速度',
    keywords: ['跑', '球', '运动', '操场', '篮球', '体育'],
  },
  {
    id: 'badminton', name: '羽毛球', emoji: '🏸', color: 'olive',
    tagline: '一副拍子，两个人的快乐',
    why: '上手快、场地要求低，课间都能来两拍',
    firstStep: '学会正确的握拍方式',
    keywords: ['球', '运动', '体育', '篮球', '足球'],
  },
  {
    id: 'baking', name: '烘焙', emoji: '🍞', color: 'oat',
    tagline: '把厨房变成实验室',
    why: '黄油和面粉的香气，是最治愈的奖励',
    firstStep: '从免打发的玛芬蛋糕开始',
    keywords: ['吃', '厨房', '蛋糕', '饼', '甜'],
  },
  {
    id: 'reading', name: '阅读', emoji: '📚', color: 'mauve',
    tagline: '一本好书是一个 portable 的世界',
    why: '读故事的人，写作文都不会太差',
    firstStep: '选一本薄的书，今天读 10 页',
    keywords: ['书', '读', '故事', '小说', '作文'],
  },
  {
    id: 'plants', name: '种植物', emoji: '🌱', color: 'sage',
    tagline: '看着一颗种子发芽',
    why: '照料一个小生命，每天都有小期待',
    firstStep: '用一颗绿豆发一盆豆芽',
    keywords: ['花', '草', '植物', '种子', '阳台'],
  },
  {
    id: 'craft', name: '手工', emoji: '🧩', color: 'bean',
    tagline: '双手做出来的成就感',
    why: '折纸、模型、编织——做完能拿在手里的快乐',
    firstStep: '折一只会跳的纸青蛙',
    keywords: ['做', '手工', '折纸', '模型', '编'],
  },
]
