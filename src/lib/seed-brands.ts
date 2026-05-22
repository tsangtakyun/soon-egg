import type { Brand } from "./types";

export const ASIAN_BRANDS: Brand[] = [
  { id: "bonjour", name: "Bonjour", name_zh: "卓悅", category: "美妝零售", region: ["HK"], min_followers: 5000, commission_rate: 6, is_verified: true, description_zh: "香港美妝零售品牌，適合護膚、美妝、生活類創作者。" },
  { id: "sasa", name: "Sasa", name_zh: "莎莎", category: "美妝零售", region: ["HK", "TW", "SG"], min_followers: 4000, commission_rate: 7, is_verified: true, description_zh: "亞洲美妝零售網絡，主打護膚和彩妝內容。" },
  { id: "chow-tai-fook", name: "Chow Tai Fook", name_zh: "周大福", category: "珠寶", region: ["HK", "TW", "CN"], min_followers: 12000, commission_rate: 4, is_verified: true, description_zh: "高認知度珠寶品牌，適合時尚、婚禮、生活品味內容。" },
  { id: "maxims", name: "Maxim's", name_zh: "美心", category: "餐飲", region: ["HK"], min_followers: 3000, commission_rate: 5, is_verified: true, description_zh: "香港餐飲集團，節慶、甜品、外賣內容都有合作空間。" },
  { id: "tsit-wing", name: "Tsit Wing", name_zh: "捷榮", category: "食品飲料", region: ["HK"], min_followers: 2500, commission_rate: 5, description_zh: "咖啡、奶茶和餐飲供應品牌，適合辦公室及港式飲食內容。" },
  { id: "my-beauty-diary", name: "My Beauty Diary", name_zh: "我的美麗日記", category: "美妝", region: ["TW", "HK", "SG"], min_followers: 5000, commission_rate: 8, is_verified: true, description_zh: "台灣面膜品牌，適合開箱、護膚測評和日常保養。" },
  { id: "osim", name: "OSIM", name_zh: "OSIM", category: "健康電器", region: ["TW", "SG", "HK"], min_followers: 9000, commission_rate: 6, description_zh: "健康生活及按摩電器品牌，適合 wellness、家庭和工作壓力內容。" },
  { id: "85c", name: "85度C", name_zh: "85度C", category: "餐飲", region: ["TW", "HK"], min_followers: 3000, commission_rate: 5, description_zh: "台式咖啡甜點品牌，適合探店、下午茶和生活日常。" },
  { id: "charles-keith", name: "Charles & Keith", category: "時裝配件", region: ["SG", "HK", "TW", "MY"], min_followers: 10000, commission_rate: 7, is_verified: true, description_zh: "新加坡時尚配件品牌，適合穿搭、上班族和約會造型內容。" },
  { id: "eu-yan-sang", name: "Eu Yan Sang", name_zh: "余仁生", category: "健康養生", region: ["SG", "HK", "MY"], min_followers: 5000, commission_rate: 6, description_zh: "中式健康養生品牌，適合家庭、健康、節慶送禮內容。" },
  { id: "tiger-balm", name: "Tiger Balm", name_zh: "虎標", category: "健康", region: ["SG", "HK", "MY"], min_followers: 3500, commission_rate: 5, description_zh: "泛亞洲健康品牌，適合運動、旅遊和日常痛症內容。" },
  { id: "klook", name: "Klook", name_zh: "Klook客路", category: "旅遊體驗", region: ["HK", "TW", "SG", "MY"], min_followers: 7000, commission_rate: 9, is_verified: true, description_zh: "旅遊體驗平台，適合本地玩樂、短途旅行和親子內容。" },
  { id: "carousell", name: "Carousell", name_zh: "Carousell", category: "電商平台", region: ["SG", "HK", "TW"], min_followers: 5000, commission_rate: 4, description_zh: "二手交易平台，適合生活整理、可持續消費和潮物內容。" },
  { id: "foodpanda", name: "foodpanda", category: "外賣平台", region: ["HK", "SG", "TW", "MY"], min_followers: 6000, commission_rate: 5, is_verified: true, description_zh: "外賣平台，適合美食、生活效率和優惠攻略內容。" },
  { id: "openrice", name: "OpenRice", name_zh: "開飯喇", category: "餐飲平台", region: ["HK"], min_followers: 4000, commission_rate: 5, is_verified: true, description_zh: "香港餐飲平台，適合探店、排行榜和隱世美食內容。" },
  { id: "sk-ii", name: "SK-II", category: "護膚", region: ["HK", "TW", "SG", "JP"], min_followers: 15000, commission_rate: 8, is_verified: true, description_zh: "高端護膚品牌，適合成熟護膚、美容儀式和成分內容。" },
  { id: "innisfree", name: "Innisfree", category: "韓系護膚", region: ["HK", "TW", "SG"], min_followers: 7000, commission_rate: 7, description_zh: "韓系護膚品牌，適合學生、日常保養和清透妝容。" },
  { id: "sulwhasoo", name: "Sulwhasoo", name_zh: "雪花秀", category: "韓系護膚", region: ["HK", "TW", "SG"], min_followers: 12000, commission_rate: 8, is_verified: true, description_zh: "高端韓系護膚品牌，適合品味生活和抗老護膚內容。" },
  { id: "laneige", name: "LANEIGE", name_zh: "蘭芝", category: "韓系美妝", region: ["HK", "TW", "SG"], min_followers: 8000, commission_rate: 7, description_zh: "韓系美妝護膚品牌，適合補水、底妝和睡眠面膜內容。" },
  { id: "vitasoy", name: "Vitasoy", name_zh: "維他奶", category: "食品飲料", region: ["HK", "SG"], min_followers: 3500, commission_rate: 4, is_verified: true, description_zh: "香港飲品品牌，適合校園、懷舊、本地文化內容。" },
  { id: "want-want", name: "Want Want", name_zh: "旺旺", category: "零食", region: ["TW", "HK"], min_followers: 3000, commission_rate: 4, description_zh: "台灣零食品牌，適合童年回憶、零食開箱和節慶內容。" },
];

export const seedBrandSql = ASIAN_BRANDS.map((brand) => {
  const regions = brand.region.map((region) => `"${region}"`).join(",");
  return `('${brand.name.replaceAll("'", "''")}', ${brand.name_zh ? `'${brand.name_zh.replaceAll("'", "''")}'` : "NULL"}, '${brand.category}', ARRAY[${regions}], ${brand.min_followers ?? 1000}, ${brand.commission_rate ?? "NULL"}, ${brand.is_verified ? "true" : "false"}, ${brand.description_zh ? `'${brand.description_zh.replaceAll("'", "''")}'` : "NULL"})`;
}).join(",\n");
