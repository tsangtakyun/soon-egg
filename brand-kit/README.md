# Egg.soon Carousel Production Kit v1

一套把新聞資料與原圖快速轉成 Egg.soon 4:5 IG Carousel 的固定工作流程。

## 使用者每次只需提供

1. 新聞文字或連結
2. 原始新聞圖片
3. 希望的頁數（預設 9 頁）
4. 封面方向（可留空，由 AI 建議）

## 固定品牌檔案

請把以下檔案放入 `brand-kit/brand/`：

- `eggy-character-sheet.png`
- `eggy-expression-library.png`
- `egg-soon-visual-language.png`

排版參考放入：

- `brand-kit/layout-references/cover/`
- `brand-kit/layout-references/information/`
- `brand-kit/layout-references/ending/`

## 最快用法

把今次資料放入一個專案資料夾：

```text
brand-kit/projects/[project-name]/
├── story.txt
└── source-images/
```

然後向 AI 輸入：

```text
請讀取 brand-kit/egg-soon.config.yaml 及
brand-kit/prompts/carousel-master-prompt.md。

今次資料：
brand-kit/projects/[project-name]/story.txt

新聞圖片：
brand-kit/projects/[project-name]/source-images/

先完成 Fact Check、P.1–P.9 結構及圖片分配表。
不要立即生成圖片。
```

結構確認後輸入：

```text
START P.1
```

其後只需輸入：

```text
NEXT
```

## 生產原則

- 先核查，再鎖定故事結構，最後生成。
- 每次只生成一頁。
- 新聞照片保持真實，不重新畫成卡通。
- Eggy 不必每頁出現。
- 修改指定頁面時，只改明確指定位置。
- 生成文字後逐字檢查繁體中文。
