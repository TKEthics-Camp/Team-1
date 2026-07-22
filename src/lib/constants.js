export const PALETTE = [
  "#FFD45E", "#5AA8F2", "#B48CF2", "#6EE7A8",
  "#FF7A6B", "#4FD8E4", "#FF9BC4", "#FFA95C",
];

// Each theme is a data-theme value + a 3-stop swatch for the picker preview.
export const THEMES = [
  { id: "marshmallow", name: ["Marshmallow", "棉花糖"], sw: ["#FFB6D6", "#B4CDFF", "#FFD6BE"] },
  { id: "sunset",      name: ["Sunset", "日落"],       sw: ["#FF966E", "#FF7896", "#FFC460"] },
  { id: "meadow",      name: ["Meadow", "草地"],       sw: ["#78D6A8", "#8CC8FF", "#D2E878"] },
  { id: "midnight",    name: ["Midnight", "午夜"],     sw: ["#50C8BE", "#786EFF", "#D26EDC"] },
];
export const DEFAULT_THEME = "marshmallow";

// Coins: earned by logging real activity, spent on purely cosmetic avatar gear.
export const COINS_PER_LOG = 5;

// A conic gradient reads as a painter's rainbow ring — no single "hobby colour" fits painting.
const RAINBOW_RING = "conic-gradient(from 0deg, #FF3B30, #FF9500, #FFCC00, #34C759, #32ADE6, #5E5CE6, #AF52DE, #FF3B30)";

// Each decoration is a little costume for a specific hobby: a ring (solid
// colour or gradient) plus a badge emoji, so equipping one visibly says
// "this is a piano kid" or "this is a painter", not just "shiny avatar".
export const DECORATIONS = [
  { id: "piano",      name: ["Piano", "钢琴"],       price: 50, ring: "#1C1C1E",     badge: "🎹" },
  { id: "painting",   name: ["Painting", "绘画"],     price: 50, ring: RAINBOW_RING,  badge: "🎨" },
  { id: "basketball", name: ["Basketball", "篮球"],   price: 50, ring: "#FF9500",     badge: "🏀" },
  { id: "football",   name: ["Football", "足球"],     price: 50, ring: "#3A9D3A",     badge: "⚽" },
  { id: "guitar",     name: ["Guitar", "吉他"],       price: 50, ring: "#B5651D",     badge: "🎸" },
  { id: "reading",    name: ["Reading", "读书"],      price: 50, ring: "#7C5CFF",     badge: "📚" },
  { id: "swimming",   name: ["Swimming", "游泳"],     price: 50, ring: "#32ADE6",     badge: "🏊" },
  { id: "cooking",    name: ["Cooking", "做饭"],      price: 50, ring: "#E0453C",     badge: "🍳" },
];

// Curated hobby ideas — the raw material for Explore and For-you.
// No user content, no people: just things a kid could go do offline.
// [name, nameZh, palette index, category (drives recommendations), descEn, descZh].
export const IDEAS = [
  ["Basketball", "篮球", 4, "sport",
    "A team sport where you shoot a ball through a hoop — great for speed, teamwork, and stamina.",
    "把球投进篮筐的团队运动，能锻炼速度、团队配合和耐力。"],
  ["Football", "足球", 3, "sport",
    "Kick a ball into the other team's goal — builds footwork, endurance, and quick thinking.",
    "把球踢进对方球门的运动，锻炼脚法、耐力和快速判断。"],
  ["Badminton", "羽毛球", 1, "sport",
    "A fast racket sport played over a net with a lightweight shuttlecock.",
    "隔网用球拍击打羽毛球的运动，节奏快、讲究反应。"],
  ["Table tennis", "乒乓球", 5, "sport",
    "A quick indoor racket sport played on a small table — sharp reflexes required.",
    "在小球台上进行的快节奏运动，考验反应速度。"],
  ["Running", "跑步", 7, "sport",
    "Just you, your legs, and the road — builds endurance and clears your head.",
    "只需要双腿和一条路，能锻炼耐力，也能让头脑清醒。"],
  ["Cycling", "骑车", 1, "sport",
    "Ride a bike for fun or distance — a gentle way to explore and build stamina.",
    "骑自行车探索周围、锻炼耐力的轻松方式。"],
  ["Swimming", "游泳", 1, "sport",
    "A full-body workout in the water — good for strength and breath control.",
    "在水中进行的全身运动，能锻炼力量和呼吸控制。"],
  ["Rope skipping", "跳绳", 6, "sport",
    "Jump rope with rhythm — cheap, portable, and surprisingly hard to master.",
    "有节奏地跳绳，器材简单，看着容易做起来难。"],
  ["Drawing", "画画", 2, "art",
    "Put what's in your head onto paper with a pencil — no equipment needed.",
    "只用一支笔就能把脑子里的东西画到纸上。"],
  ["Watercolor", "水彩", 6, "art",
    "Paint with water and pigment — loose, flowing colours that are hard to fully control.",
    "用水和颜料作画，色彩流动、很难完全掌控，也是它的乐趣所在。"],
  ["Calligraphy", "书法", 0, "art",
    "Write characters with a brush and ink — a slow, focused art form.",
    "用毛笔和墨写字，是一种讲究专注和耐心的艺术。"],
  ["Paper cutting", "剪纸", 4, "art",
    "Cut intricate patterns out of paper — a traditional folk art.",
    "用剪刀剪出精美图案的传统民间艺术。"],
  ["Photography", "摄影", 5, "art",
    "Capture moments and scenes with a camera or phone.",
    "用相机或手机记录瞬间和场景。"],
  ["Origami", "折纸", 3, "art",
    "Fold a flat sheet of paper into a 3D shape — no glue or scissors.",
    "把一张平的纸折成立体造型，不用胶水也不用剪刀。"],
  ["Clay modeling", "捏泥", 7, "art",
    "Shape wet clay with your hands into figures or pots.",
    "用双手把湿泥捏成各种造型或器皿。"],
  ["Comics", "漫画", 2, "art",
    "Tell a story through drawn panels — mixes writing and drawing.",
    "用一格格画面讲故事，写作和绘画的结合。"],
  ["Piano", "钢琴", 0, "music",
    "Play melody and harmony together on 88 keys — a strong foundation for any musician.",
    "用88个键同时弹出旋律和和声，是学音乐很好的基础。"],
  ["Guitar", "吉他", 3, "music",
    "Strum chords or pick melodies on six strings — portable and social.",
    "用六根弦弹和弦或旋律，方便携带，也适合和朋友一起玩。"],
  ["Singing", "唱歌", 6, "music",
    "Use your own voice as the instrument — no equipment required.",
    "用自己的嗓子当乐器，不需要任何器材。"],
  ["Erhu", "二胡", 4, "music",
    "A two-stringed Chinese instrument played with a bow — a haunting, expressive sound.",
    "中国传统的两弦拉弦乐器，声音悠远、富有感情。"],
  ["Flute", "笛子", 1, "music",
    "Blow across a hole to make sound — light, portable, and melodic.",
    "对着孔吹气发声，轻便易带，音色悠扬。"],
  ["Drums", "打鼓", 5, "music",
    "Keep the beat with sticks and a kit — great for rhythm and energy.",
    "用鼓棒打出节奏，释放能量，锻炼节奏感。"],
  ["Reading", "读书", 2, "mind",
    "Get lost in someone else's world for a while — any genre counts.",
    "暂时走进别人的世界，什么类型的书都算。"],
  ["Chess", "象棋", 0, "mind",
    "A two-player strategy game of moves and countermoves — no luck involved.",
    "双人对弈的策略游戏，全靠脑子，不靠运气。"],
  ["Go", "围棋", 7, "mind",
    "An ancient board game of territory and strategy, played with black and white stones.",
    "用黑白棋子对弈、争夺地盘的古老策略游戏。"],
  ["Journaling", "写日记", 6, "mind",
    "Write a few lines about your day — for no one but yourself.",
    "写几句今天发生的事，只写给自己看。"],
  ["Puzzles", "拼图", 1, "mind",
    "Piece together an image one fragment at a time — patience pays off.",
    "一块一块把图案拼起来，考验耐心。"],
  ["Star gazing", "看星星", 2, "mind",
    "Look up and learn the sky — all you need is a clear night.",
    "抬头认星星，只需要一个晴朗的夜晚。"],
  ["Cooking", "做饭", 7, "food",
    "Turn raw ingredients into a meal — a useful skill you'll use your whole life.",
    "把食材变成一顿饭，是一辈子都用得上的技能。"],
  ["Baking", "烘焙", 3, "food",
    "Precise measuring and heat turn dough or batter into something sweet.",
    "精确称量加上恰当的火候，把面糊变成甜点。"],
  ["Gardening", "园艺", 4, "food",
    "Grow something from a seed and watch it change every day.",
    "从一颗种子开始种起，每天看它一点点变化。"],
  ["Tea making", "泡茶", 5, "food",
    "Brew and taste different teas — a quiet ritual worth slowing down for.",
    "冲泡、品尝不同的茶，是值得慢下来的小仪式。"],
  ["Hiking", "远足", 4, "outdoor",
    "Walk a trail through nature — as short or long as you like.",
    "走一条穿越自然的小路，长短随你安排。"],
  ["Fishing", "钓鱼", 1, "outdoor",
    "Sit by the water and wait, patiently, for a bite.",
    "坐在水边耐心等待鱼儿上钩。"],
  ["Bird watching", "观鸟", 6, "outdoor",
    "Spot and identify birds in the wild — all you need is patience and eyes.",
    "在野外辨认各种鸟类，只需要耐心和一双眼睛。"],
  ["Kite flying", "放风筝", 3, "outdoor",
    "Get a kite up and keep it there — trickier than it looks.",
    "把风筝放上天并让它稳住，比看起来难。"],
  ["Dancing", "跳舞", 2, "dance",
    "Move to music, alone or with others — any style counts.",
    "跟着音乐动起来，一个人或一群人都行，风格不限。"],
  ["Jump rope tricks", "花样跳绳", 5, "dance",
    "Combine rope skipping with flips and footwork for a performance-style challenge.",
    "把跳绳和翻转、步法结合，更有表演性和挑战性。"],
  ["Skateboarding", "滑板", 7, "dance",
    "Ride and land tricks on a board — balance and persistence required.",
    "在滑板上骑行、做技巧动作，考验平衡感和坚持。"],
];

export const ADJACENT = {
  sport: ["dance", "outdoor"], dance: ["sport", "music"], outdoor: ["sport", "mind"],
  art: ["mind", "food"], music: ["dance", "art"], mind: ["art", "outdoor"], food: ["art", "outdoor"],
};

export const CATS = {
  sport: ["Sport", "运动"], art: ["Art", "艺术"], music: ["Music", "音乐"],
  mind: ["Mind", "静心"], food: ["Food & grow", "美食"], outdoor: ["Outdoors", "户外"], dance: ["Movement", "律动"],
};

// Fake classmates. Hobby names reuse IDEAS so "shared with you" resolves.
export const STUDENTS = [
  { name: ["Lin", "小林"], color: 4, orbs: [["Basketball", "篮球", "sport", 760], ["Running", "跑步", "sport", 300]] },
  { name: ["Mei", "小梅"], color: 6, orbs: [["Drawing", "画画", "art", 540], ["Watercolor", "水彩", "art", 210]] },
  { name: ["Hao", "小豪"], color: 1, orbs: [["Swimming", "游泳", "sport", 430], ["Basketball", "篮球", "sport", 250]] },
  { name: ["Yun", "小云"], color: 2, orbs: [["Piano", "钢琴", "music", 910], ["Singing", "唱歌", "music", 260]] },
  { name: ["Jia", "佳佳"], color: 3, orbs: [["Cooking", "做饭", "food", 480], ["Drawing", "画画", "art", 150]] },
  { name: ["Bo", "小博"], color: 7, orbs: [["Guitar", "吉他", "music", 600], ["Reading", "读书", "mind", 320]] },
];

export const CAPTIONS = {
  sport:  [["Finally landed a jump shot after school.", "放学后终于投进了一个跳投。"], ["Ran to the river and back. Legs dead, felt great.", "跑到河边又跑回来。腿废了，但很爽。"]],
  art:    [["Painted the persimmon tree out back.", "画了后院那棵柿子树。"], ["Hands came out wrong again, but the eyes are right.", "手又画歪了，不过眼睛画对了。"]],
  music:  [["Got through the whole piece without stopping!", "整首曲子一次弹完，没停！"], ["Fingers hurt but the chords finally sound clean.", "手指很疼，但和弦终于干净了。"]],
  mind:   [["Finished the book under the big tree.", "在大树下把书看完了。"], ["Lost twice, won once. Good afternoon.", "输了两盘赢了一盘。不错的下午。"]],
  food:   [["Burned the first batch, second came out golden.", "第一锅糊了，第二锅金黄。"], ["Grandma showed me how to fold the dumplings.", "奶奶教我包饺子。"]],
  outdoor:[["Saw three kingfishers by the water.", "在水边看到三只翠鸟。"], ["Kite went so high I lost sight of it.", "风筝飞得太高，我都看不见了。"]],
  dance:  [["Nailed the turn on the tenth try.", "第十次终于转成功了。"], ["Practiced in the yard till the light went.", "在院子里练到天黑。"]],
};
