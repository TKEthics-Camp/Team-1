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

// Curated hobby ideas — the raw material for Explore and For-you.
// No user content, no people: just things a kid could go do offline.
// [name, nameZh, palette index, category (drives recommendations)].
export const IDEAS = [
  ["Basketball", "篮球", 4, "sport"],   ["Football", "足球", 3, "sport"],
  ["Badminton", "羽毛球", 1, "sport"],  ["Table tennis", "乒乓球", 5, "sport"],
  ["Running", "跑步", 7, "sport"],      ["Cycling", "骑车", 1, "sport"],
  ["Swimming", "游泳", 1, "sport"],     ["Rope skipping", "跳绳", 6, "sport"],
  ["Drawing", "画画", 2, "art"],        ["Watercolor", "水彩", 6, "art"],
  ["Calligraphy", "书法", 0, "art"],    ["Paper cutting", "剪纸", 4, "art"],
  ["Photography", "摄影", 5, "art"],    ["Origami", "折纸", 3, "art"],
  ["Clay modeling", "捏泥", 7, "art"],  ["Comics", "漫画", 2, "art"],
  ["Piano", "钢琴", 0, "music"],        ["Guitar", "吉他", 3, "music"],
  ["Singing", "唱歌", 6, "music"],      ["Erhu", "二胡", 4, "music"],
  ["Flute", "笛子", 1, "music"],        ["Drums", "打鼓", 5, "music"],
  ["Reading", "读书", 2, "mind"],       ["Chess", "象棋", 0, "mind"],
  ["Go", "围棋", 7, "mind"],            ["Journaling", "写日记", 6, "mind"],
  ["Puzzles", "拼图", 1, "mind"],       ["Star gazing", "看星星", 2, "mind"],
  ["Cooking", "做饭", 7, "food"],       ["Baking", "烘焙", 3, "food"],
  ["Gardening", "园艺", 4, "food"],     ["Tea making", "泡茶", 5, "food"],
  ["Hiking", "远足", 4, "outdoor"],     ["Fishing", "钓鱼", 1, "outdoor"],
  ["Bird watching", "观鸟", 6, "outdoor"], ["Kite flying", "放风筝", 3, "outdoor"],
  ["Dancing", "跳舞", 2, "dance"],      ["Jump rope tricks", "花样跳绳", 5, "dance"],
  ["Skateboarding", "滑板", 7, "dance"],
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
