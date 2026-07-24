// Names that don't count as a "hobby to cultivate" under the app's own
// constitution: video games and social-media/short-video apps are screen
// time, not something this app exists to help someone build. Matching is
// substring-based and case-insensitive (Chinese needs no case-folding), so
// common variants ("gaming", "Genshin", "王者") are still caught without
// needing an exhaustive list of every title and app.
const BLOCKED_TERMS = [
  // generic
  "video game", "videogame", "gaming", "gamer", "esports", "e-sports",
  "电竞", "游戏", "手游", "端游", "网游",
  // games popular with Chinese teens specifically, since this build targets
  // local Chinese users
  "honor of kings", "王者荣耀", "王者",
  "pubg", "和平精英", "吃鸡",
  "genshin", "原神",
  "minecraft", "我的世界",
  "league of legends", "英雄联盟",
  "crossfire", "穿越火线",
  "knives out", "荒野行动",
  "identity v", "第五人格",
  "sky: children of the light", "光遇",
  "onmyoji", "阴阳师",
  "honkai", "崩坏",
  "eggy party", "蛋仔派对",
  "roblox", "罗布乐思",
  "fortnite", "堡垒之夜",
  "free fire",
  // social media / short video
  "tiktok", "抖音", "douyin",
  "kuaishou", "快手",
  "weibo", "微博",
  "wechat moments", "朋友圈",
  "xiaohongshu", "小红书", "rednote",
  "instagram", "照片墙",
  "facebook", "脸书",
  "snapchat",
  "twitter", "推特",
  "bilibili", "哔哩哔哩", "b站",
  "youtube", "油管",
];

export function isBlockedHobby(name) {
  const n = String(name || "").trim().toLowerCase();
  if (!n) return false;
  return BLOCKED_TERMS.some((term) => n.includes(term.toLowerCase()));
}
