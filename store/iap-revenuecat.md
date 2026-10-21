# 商店內購（IAP）與 RevenueCat 設定

更新：2026-10-21

## 架構
- **網頁**：Stripe Checkout／Portal（已完成）。
- **iOS / Android app**：RevenueCat + Apple/Google 商店內購（代碼待接入）。
- 兩邊都寫入同一個 D1 `subscriptions` 表，會員權限一致。

## 已完成的伺服器部分
- `POST /api/revenuecat/webhook`
  - 驗證 `Authorization: Bearer <REVENUECAT_WEBHOOK_TOKEN>`
  - 處理事件：`INITIAL_PURCHASE`、`RENEWAL`、`PRODUCT_CHANGE`、`UNCANCELLATION`、
    `TEMPORARY_ENTITLEMENT_GRANT`、`SUBSCRIPTION_EXTENDED` → `active`
  - `CANCELLATION` → 到期前保持 `active`，到期後 `canceled`
  - `EXPIRATION` → `expired`；`BILLING_ISSUE` → `past_due`
  - 以 RevenueCat 的 `app_user_id` 對應 D1 `users.id`

## 需要你提供的資料
1. RevenueCat 專案 → API Keys：
   - Apple App Store public key（`appl_...`）
   - Google Play public key（`goog_...`）
2. 確認兩個商店的訂閱商品已建立並待審／已啟用：
   - Apple：`com.lifenum.wuxing.monthly`
   - Google：`lifenum_monthly`（base plan `monthly`）

## RevenueCat 設定步驟
1. 建立 Project → 加入 iOS 及 Android app（Bundle ID / Package name `com.lifenum.wuxing`）。
2. Products：匯入上述商品。
3. Entitlement：建立 `pro`，把兩個商品都連到 `pro`。
4. Offering：建立 `default`，加入 `$rc_monthly` package（兩個平台各一）。
5. Webhooks：
   - URL：`https://lifenum.pages.dev/api/revenuecat/webhook`
   - Authorization：`Bearer <你自己設定的隨機 token>`
   - 事件：全部訂閱相關事件（至少上述清單）
6. 在 Cloudflare 設定 secret：
   ```powershell
   npx wrangler pages secret put REVENUECAT_WEBHOOK_TOKEN --project-name lifenum
   npm run deploy:cf
   ```

## App 端接入（下一步）
1. `npm i @revenuecat/purchases-capacitor`
2. 啟動時以平台 public key 設定 SDK；登入後 `Purchases.logIn(user.id)`，登出 `Purchases.logOut()`。
3. Paywall：
   - 讀取 `getOfferings()`，顯示 `default` offering 的月費價格
   - 購買：`purchasePackage($rc_monthly)`
   - 還原：`restorePurchases()`
   - 顯示服務條款與隱私政策連結
4. 移除目前 native 的「即將推出」提示，改為載入 paywall。
5. 重新 `npx cap sync` 並建置 AAB / iOS。

## 測試
- Google：Play Console → License testing 加入測試帳號，使用測試卡。
- Apple：StoreKit Configuration 或 Sandbox Apple ID。
- 伺服器：RevenueCat 後台可重送 webhook，確認 D1 `subscriptions` 更新。

## 注意
- App 內不要出現「到網站訂閱」字眼或連結（Apple 3.1.1 / Google Payments 政策）。
- 你的 Stripe 網頁訂閱與商店訂閱是兩個獨立管道；同一帳號只應保留一種有效訂閱。
