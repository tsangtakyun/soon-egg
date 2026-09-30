export function buildReplyLanguageInstruction(message: string) {
  const explicitChinese = /(繁體|中文|廣東話|粵語|書面語|用中文|回覆中文)/i.test(message);
  const explicitEnglish = /(?:用|以|回覆|write|reply\s+in)\s*(?:英文|english)|英文回覆/i.test(message);
  const explicitJapanese = /(?:用|以|回覆)\s*(?:日文|日本語)|reply\s+in\s+japanese/i.test(message);
  const explicitKorean = /(?:用|以|回覆)\s*(?:韓文|韓語)|reply\s+in\s+korean/i.test(message);
  const hasKana = /[\u3040-\u30ff]/.test(message);
  const hasKorean = /[\uac00-\ud7af]/.test(message);
  const hanCount = (message.match(/[\u3400-\u9fff]/g) ?? []).length;

  const target = explicitEnglish
    ? "英文"
    : explicitJapanese || hasKana
      ? "日文"
      : explicitKorean || hasKorean
        ? "韓文"
        : explicitChinese || hanCount >= 2
          ? "自然繁體中文書面語"
          : "今次客戶訊息的主要語言";

  return `語言規則（優先級高於既有範本）：今次 reply 必須使用${target}。除非使用者在今次訊息明確要求翻譯或指定另一種語言，否則不可自行轉成英文或其他語言。修改既有草稿時，跟隨使用者最新修改指示的語言；品牌名、產品名及必要專有名詞可保留原文。Brief 亦使用相同語言。`;
}
