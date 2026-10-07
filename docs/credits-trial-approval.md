# EGG 最小待批包：試用規則 + wallet/trial DDL

## 最新狀態：已確認政策；staging 目標未能核實

Tommy 已於 Master Chief turn 01a1184c-51dd-7982-8cb5-c3c5e5bb6359
直接回覆「確認！」。下列推薦政策已接受，最新 230000 SQL／rollback 包
可在經核實的獨立 EGG staging 推進；無需重問 UI 或同一政策。
此次授權不包括 production、建立付費資源、RPC／trial activation、Stripe
或 App release。SQL 檔保持已批核 SHA-256，尚未套用遠端。

已只讀查看 Supabase：SOON 組織列出的 soon-egg 專案
`ycqribpphvywibamtjew` 明確為 `main / Production`，並顯示 `No branches`。
可见清單未找到獨立 EGG staging，因此沒有執行遠端 SQL。
完整目標證據及待補資料見 `credits-staging-target-evidence.md`。

以下保留原批准包內容作紀錄；其中「待批／推薦」現依本節更新。

2026-10-07。Tommy 已驗收 EGG Preview UI 方向；毋須再批同一套 UI。
驗收來源：Master Chief 對話 01a0b4df-9d0a-7093-97ec-2a671ac5ffe9，
用家 turn 01a1183a-a5d5-7b42-a761-7cd9e6134072「其餘 ok！可去！」。
本檔建議尚未改動 deployed policy、資料庫或現有用戶權益。

## 只需決定的產品規則（推薦）

| 對象／事件 | 推薦行為 |
| --- | --- |
| 推出後合資格的新創作者帳戶 | 擁有者明確按「開始 7 日試用」才啟動；不因註冊／登入／預覽頁自動倒數 |
| 額度及時限 | 一次共 30 Credits，啟動起連續 168 小時；整個工作空間團隊共用，不每月補發 |
| 防止重領 | 每個擁有者帳戶最多一次、每個工作空間最多一次；加入別人團隊不消耗自己的領取資格，改名／轉移擁有者／重裝不重置 |
| 到期或用完 | 停止新生成；可查看、手動編輯及下載已有內容，不自動扣款 |
| 試用後 | 不自動轉每月 30 點永久免費；可主動選 HK$98／月、150 點創作者版 |
| 推出前已有免費權益的工作空間 | 原有每月 30 點維持；不額外疊加試用。已有該免費權益的擁有者不再領新帳戶試用 |
| 付費升級 | 確認付款後開始付費週期，試用剩餘額度不合併；原試用紀錄保留，到期／取消後不重啟試用 |
| 更改試用額度設定 | 只影響之後新領取；已領取的額度和到期時間不改 |

推薦理由：免費舊用家權益可保留，新用家的試用有清晰終點，避免用完後
立即再得到另一份免費月額。30 點約可完成 6 次 EggThis 或 10 次劇本，
按現行 5／3 點規則計；這不是供應商成本或毛利保證。

「7 日／30 點、新舊免費用家分界、每擁有者一次」合併為一個 policy 決定。
推出時間與合資格舊工作空間清單須在真正啟用前固定並核對；不得只看可變
會員身份、瀏覽器時間或用戶自行傳入 eligible=true。現有正式服務如何儲存
免費權益仍須以資料核對，不由本草稿假定或自動搬移。

## 精確 SQL 範圍

唯一最新完整草稿：
`migrations/20261007230000_egg_workspace_trial_proposal.sql`

配對空庫回退：
`migrations/20261007230000_egg_workspace_trial_proposal.rollback.sql`

相對已交 180000 草稿的完整 unified diff：
`credits-trial-latest.diff`（包含主 SQL 及 rollback）。

這是四張尚不存在資料表的 CREATE 提案，替代之前所有未套用的草稿，
不是先執行舊版本再執行新版。表已存在就停止，另做升級差異。

| 表 | 用途及今次差異 |
| --- | --- |
| egg_credit_wallets_v2 | 沿用每工作空間錢包及 current-period 指標；限制可更新欄位 |
| egg_credit_trials_v2 | 新增唯一領取紀錄，workspace 主鍵、owner 唯一；額度與 168 小時日期快照，只可 SELECT／INSERT |
| egg_credit_periods_v2 | 新增 trial plan；一個 trial 只可綁一個 period；複合 FK 強制同工作空間／日期／額度；只可更新 available／updated_at |
| egg_credit_operations_v2 | 沿用操作 ledger；服務權限只可更新結果／結算狀態，不能改 actor／key／amount／period 身份 |

四表均開 RLS；anon／authenticated 無表權限；service_role 無 DELETE。
不新增 RPC、不搬資料、不改 auth/users 或 creator_profiles 結構、不改 Stripe。
回退只接受完全空表；任何 wallet、trial、period 或 operation 存在都拒絕。

建議下一個批准範圍：**只允許此版本在指定 EGG staging 測試資料庫套用**。
staging project ID／DB 名稱仍要先確認，現有共用／production Supabase 不在
此批准範圍。UI 驗收不代表正式 DB 或收費啟用批准。

## 已本地驗證及未覆蓋

測試檔 `tests/credits-trial-schema.cjs` 在暫存目錄安裝的 PGlite 記憶體
PostgreSQL 執行；不連遠端資料庫、不讀金鑰、不改 app package.json／lock。
它實際執行 DDL、CHECK／UNIQUE／FK、角色權限、空庫回退及有紀錄拒絕回退。
共 33 個核對通過，涵蓋重領、跨 workspace、日期／額度不一致、DST 的
168 小時、非法費用／結算狀態及不可改寫欄位權限。

重現：在隔離暫存目錄安裝 @electric-sql/pglite，再以該目錄 node_modules
作 NODE_PATH 執行 `node tests/credits-trial-schema.cjs`。依賴版本與檔案
SHA-256 記於 `credits-trial-approval-manifest.md`。

本測試未證明 Supabase 專案實際 schema／default grants／membership，也未
證明 reserve、trial activation、並行扣點或退款 worker 的原子性。
這些 RPC 仍待實作、提供獨立可審差異及隔離 DB 驗證。特別是：

- eligibility 與 owner 身份需交易內驗證；以伺服器時間建立一次 enrollment、
  trial period、current pointer，重試讀回原結果而非重發 30 點。
- period 的 available 變動仍需原子 RPC 保證；欄位權限不能取代交易和業務規則。
- 免費舊用家清單、owner 轉移、帳戶刪除／財務保留需落實；保留 enrollment
  可阻擋同帳戶重領，不能阻止建立全新身份，仍需驗證及持久限流。
- 真實登入後生成阻擋／查看／手動編輯／匯出及 App 實機仍待測試。

## 交付狀態

Web 已驗收的 Preview、API policy 及 App policy 畫面本輪沒有改動。
Web source/build/deploy/live unauth evidence 仍見
`credits-preview-verification-2026-10-07.md`。本輪只新增本地草稿與測試。
App code 維持 bcc7fb1；App release build、iPhone install、device verification
仍未完成。正式生成／trial activation 仍關閉，等待後續完整工程驗收。
