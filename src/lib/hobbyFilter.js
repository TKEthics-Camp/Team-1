import { containsProfanity } from "./textFilter";

// Names that don't count as a "hobby to cultivate" under the app's own
// constitution: video games and social-media/short-video apps are screen
// time, not something this app exists to help someone build. Profanity is
// blocked for the same reason a real teacher would reject it on a form.
const BLOCKED_TERMS = [
  // generic screen-time terms
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

// Profanity lives in textFilter.js now: this file screens hobby names, and
// the same words have to be caught in journal entries and captions too.
// The screen-time list above stays here, because it is about what counts as
// a hobby and has no business rejecting a journal entry that happens to
// mention a game.
export function isBlockedHobby(name) {
  const n = String(name || "").trim().toLowerCase();
  if (!n) return false;
  if (BLOCKED_TERMS.some((term) => n.includes(term))) return true;
  return containsProfanity(n);
}
