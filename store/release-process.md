# 上架後更新流程（iOS / Android / 網站）

更新：2026-11-22

## 1. 先分清兩條軌道

| 改動內容 | 需要重新送 Apple 審核？ | 做法 |
|---|---|---|
| 網站頁面：`privacy.html`、`terms.html`、`support.html`、`delete-account.html` | 否 | `npm run deploy:cf` |
| Cloudflare Functions / API、D1 資料、後端邏輯 | 否 | `npm run deploy:cf` / `npm run db:migrate` |
| App 內介面文字、公告、連結、分頁開關（1.2.0 起） | 否 | 管理後台 → 內容與文案（`store/content-management.md`） |
| App Store 截圖、宣傳文字、支援網址、供應地區 | 通常否 | App Store Connect 直接改 |
| iOS 訂閱價格 | 否（現有訂閱按 Apple 規則） | App Store Connect → 訂閱 → 價格 |
| App 版面、新功能、推薦／五行演算法、權限、原生插件 | **是** | 出新版本（本文件流程） |
| App 內顯示的私隱政策／服務條款**文字**（嵌入式） | 是 | 改網頁後，下次版本再同步（App 目前以連結開啟網頁，所以只改網頁即可） |

> Capacitor 會把 `dist/` 打包進 App，App 載入的是**本機檔案**，所以網站更新不會自動出現在 App。
> 不建議用 `server.url` 或第三方 OTA 熱更新（有審核及穩定性風險）。

## 2. 版本規則

- 版本號 `MAJOR.MINOR.PATCH`：新功能 `1.2.0`、修正 `1.1.1`。
- `CFBundleVersion`（Build）由 GitHub Actions 的 `run_number` 自動填入，不用手動加。
- 每次更新需要填 **What's New**（繁中），否則新版本在 ASC 會顯示空白。
- 第一次上架後的下一版建議 `1.2.0`。

## 3. 出 iOS 新版本（標準流程）

```powershell
# 1) 改程式碼、本機驗證
npm run build
npm run typecheck:api

# 2) 更新版本號 + 觸發 iOS CI
npm run release:bump 1.2.0

# 3) 提交並推送（會觸發 .github/workflows/ios.yml）
git add package.json ios/App/App.xcodeproj/project.pbxproj .github/ios-trigger.txt
git commit -m "Release iOS 1.2.0"
git push

# 4) 等 CI 完成後確認 build 已上傳
npm run release:status

# 5) 建立版本、複製上一個版本資料、上傳截圖、掛 build、送審
npm run release:submit -- 1.2.0 --whats-new "新增每週運勢提示，修正分享卡比例。"

# 只想預覽會做什麼（不會寫入）
npm run release:submit -- 1.2.0 --dry-run
```

`release:submit` 會自動：

1. 找 `1.2.0` 已上傳且 `VALID` 的最新 build。
2. 建立 App Store 版本（冇就建立）。
3. 由上一個版本複製描述、關鍵字、支援網址。
4. 上傳 `store/ios-screenshots/` 的截圖（iPhone 6.7" 三張、iPad 13" 一張）。
5. 複製上一個版本的審核聯絡資料與 demo 帳號。
6. 掛上 build。
7. 將未批核的訂閱版本／訂閱群組版本一併加入同一個 Review Submission。
8. 送審並印出新狀態。

> 如 `submit` 指出版本仍屬於另一個 submission，先到 App Store Connect 將舊 submission
> 的項目標記為 removed，或等上一個版本完成審核。

## 4. 截圖

- 存放於 `store/ios-screenshots/`：
  - `iphone-1.png`、`iphone-2.png`、`iphone-3.png`（1290×2796，APP_IPHONE_67）
  - `ipad-1.png`（2048×2732，APP_IPAD_PRO_3GEN_129）
- 換圖後直接覆蓋同名檔案，下一次 `release:submit` 便會用新圖。
- 截圖可隨時在 App Store Connect 更新，不需要新 build。

## 5. 常見改動建議

| 想改 | 建議做法 |
|---|---|
| 每日顏色／五行規則 | 改 `src/lib/*`，出新版本（App 內計算） |
| 會員價格（網頁 Stripe） | 管理後台或 D1 settings，無需 build |
| 會員價格（iOS） | App Store Connect → 訂閱 → 價格 |
| 每日運勢文案／介面文字 | 1.2.0 起可在「管理後台 → 內容與文案」即時改（見 `store/content-management.md`） |
| 私隱政策／服務條款 | 改 `public/*.html`，`npm run deploy:cf` |
| 緊急後端修正 | `npm run deploy:cf`，即時生效 |
| 緊急 App bug | 只能出新版本；建議先用後端開關關掉受影響功能（需 App 先支援） |

## 6. 回滾

- **網站／API**：Cloudflare Dashboard → Pages → lifenum → Deployments → 選舊版本 Rollback。
- **D1**：Time Travel 或 `backups/` 每日匯出（見 `store/automation.md`）。
- **App**：Apple 不支援降級；保留上一個版本在 ASC 以便 Apple 回覆時比較，必要時出新版本修正。
- 建議由 `1.2.0` 起在 App 加入「遠端設定／功能開關」，日後可即時停用有問題功能而毋須等審核。

## 7. 上架後檢查清單

- [ ] App Store 頁面（名稱、副標題、截圖、價格）正確
- [ ] 用 Sandbox Apple ID 完成一次購買 → 會員開通 → 恢復購買
- [ ] 「我的 → 管理訂閱」可開啟系統訂閱頁
- [ ] 「我的 → 刪除帳戶」可即時刪除並取消訂閱
- [ ] App Store Connect 冇崩潰報告異常
- [ ] D1 `subscriptions` 與 RevenueCat／Apple 狀態一致
- [ ] Cloudflare Analytics 與 Functions 錯誤率正常
- [ ] 回覆 App Store 評論（如有）

## 8. Android 更新

1. 修改 `android/app/build.gradle`：`versionCode` +1、`versionName` 改為新版本。
2. 在 GitHub Actions 手動執行 **Android Release AAB**（`android.yml`）。
3. 有 `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` 時會自動上傳到 **internal** track；
   測試無問題後，到 Play Console 手動 Promote 到正式版（API 未代做）。
4. 如要改商店文案／截圖／資料安全性，直接在 Play Console 更新，不需要新 AAB。

## 9. 中國大陸

- 如**不**在中國大陸上架：App Store Connect → 價格與供應情況 → 取消勾選「中國大陸」，
  兩個 China 聲明（AIGC、安全評估）便不再需要。
- 如要上架：需要 ICP 備案、AIGC 聲明（本 App 應選「不提供」）、安全評估聲明，
  並在每次更新時保持有效。
