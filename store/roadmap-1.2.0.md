# 上架最簡路徑 ＋ 未來「師傅每日內容 + 推送」架構

更新：2026-11-22

## 一、現在：最簡單方法上架（唔好再改任何嘢）

| 步驟 | 狀態 | 你要做嘅事 |
|---|---|---|
| App 1.1.0（Build 7）送審 | `WAITING_FOR_REVIEW`（2026-11-11 送出） | **唔好撤回、唔好改版本**，等 Apple |
| 中國大陸兩個聲明（AIGC、安全評估） | 未處理 | 最簡單：價格與供應情況 → 取消勾選「中國大陸」 |
| 審核 demo 帳號 | 已設定 | 無需處理 |
| 年齡分級新欄位 | 已填（全部 false） | 無需處理 |

**結論：現階段唯一「最簡單」動作 = 等。** 任何改動（包括加推送）都會令 1.1.0 送審內容改變，需要重新排隊甚至被拒。

## 二、未來需求（已確認）

1. 由風水師傅提供每日資料（每日輸入一次）。
2. 版面可能完全重新設計。
3. 用 push notification 通知師傅的客戶。

### 技術關鍵：推送必須有原生程式碼

推送通知**唔可以靠網站或遠端設定加入**，必須：
- App binary 內有 push 插件（`@capacitor/push-notifications`）
- Xcode 開啟 Push Notifications capability（entitlements `aps-environment`）
- Apple 開發者帳戶有 **APNs Auth Key (.p8)**

所以：**1.1.0 之後至少要再出一次版本（1.2.0）加推送**；之後所有每日內容改動、推送發送、文字／公告改動都唔需要再上架。

### APNs Key：已完成

`AuthKey_HMXF37VS36.p8`（Key ID `HMXF37VS36`、Team `FKAL7FF922`）已測試可發送推送
（回 `400 BadDeviceToken` = 認證成功），並已寫入 Cloudflare Secrets。
詳見 `store/push-notifications.md`。

**仍需你做一次**：App ID 開啟 Push 能力 + 重新產生描述檔 + 更新 GitHub secret
（現有 profile 沒有 `aps-environment`，否則 1.2.0 存檔會失敗）。步驟見 `store/push-notifications.md`。

## 三、1.2.0 應該包含咩（一次過，之後長期唔使再上架）

### A. 師傅每日內容（後端已完成，UI 已完成，待 1.2.0 一起發佈）

| 項目 | 狀態 |
|---|---|
| D1 `daily_content` 表 | ✅ 已建立（遠端已遷移） |
| `PUT /api/admin/daily` 師傅輸入 | ✅ 已完成 |
| `GET /api/daily?date=…` 客戶讀取 | ✅ 已完成 |
| 管理後台「每日內容（師傅輸入）」表單 | ✅ 已完成（日期、發佈、繁／簡／英、重點、顏色、解說、備註） |
| App 今日頁「師傅今日指引」卡 | ✅ 已完成 |
| 未發佈內容唔會被客戶看到 | ✅ 已驗證 |

> 網站版本即時可用；App 要到 1.2.0 才會顯示。

### B. 推送通知（程式碼已完成，待 1.2.0 上架）

| 項目 | 狀態 |
|---|---|
| `@capacitor/push-notifications` 插件 + `cap sync` | ✅ |
| `AppDelegate` 轉發 device token / 失敗 | ✅ |
| `App.entitlements`（`aps-environment`）+ pbxproj | ✅（待 App ID／profile 配合） |
| D1 `device_tokens` 表 | ✅ 已遷移（本機＋遠端） |
| `POST/DELETE /api/push/register` | ✅ 已測試 |
| `POST/GET /api/admin/push`（APNs HTTP/2 + ES256） | ✅ 已實測，會清理失效 token |
| 管理後台「推送通知」表單 | ✅ |
| 「我的 → 接收每日提示」開關 | ✅ |
| 版本號 | 已升到 `1.2.0`（1.1.0 審核中的 binary 不受影響） |

### C. 版面可配置（為「完全唔同版面」準備）

如新設計完全唔同，建議：
- 把「今日頁」變成**區塊清單**（server-driven）：API 回傳 `sections: [{type:'master', ...}, {type:'colors', ...}]`，
  App 按 type 渲染。咁樣日後加減區塊、改次序都唔需上架。
- 顏色、文案、圖片 URL 全部由後台提供。
- 版面風格（顏色、字體大小）可用 theme 變數由後台覆寫。

**仍然需要上架**：全新版面結構、新互動、新權限、新原生功能。

## 四、建議時序

| 時間 | 動作 |
|---|---|
| 現在 | 等 1.1.0 過審；同時取消中國大陸供應 |
| 1.1.0 上架後 | 開啟 App ID Push 能力、重新產生 profile、更新 GitHub secret，然後觸發 iOS 建置 1.2.0 |
| 1.2.0 送審前 | 用 TestFlight 測試推送（先設 `APNS_ENVIRONMENT=sandbox`）與師傅輸入流程 |
| 1.2.0 上架後 | 之後只改後台：每日內容、推送、文案、公告、顏色、分頁開關 |

## 五、已經可以直接試嘅嘢（唔影響上架）

網站管理後台已經可以：
1. 登入管理員帳號
2. 我的 → 管理後台 → **每日內容（師傅輸入）**
3. 選日期、填內容、勾「已發佈」、儲存
4. 網站「今日」頁會即時顯示「師傅今日指引」
5. 未勾「已發佈」= 草稿，客戶看不到

> 呢個流程同 1.2.0 App 內完全一樣，所以可以請師傅現在開始熟習輸入。
