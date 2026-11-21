# 推送通知（APNs）設定與操作

更新：2026-11-22

## 架構

```
App（1.2.0 起）
  └─ 登入後請求通知權限 → 取得 APNs device token
        └─ POST /api/push/register（Bearer token）→ D1 device_tokens
師傅／管理員
  └─ 管理後台「推送通知」→ POST /api/admin/push
        └─ Worker 用 APNs HTTP/2 + ES256 JWT 發送
              └─ 失效 token（410 / BadDeviceToken）自動刪除
```

- 用戶可隨時在「我的」關閉「接收每日提示」→ 伺服器刪除該裝置 token。
- 推送 payload 含 `thread-id: lifenum-daily`，同一日通知會分組。

## 已設定（Cloudflare Pages Secrets）

| Secret | 值 |
|---|---|
| `APNS_KEY_ID` | `HMXF37VS36` |
| `APNS_TEAM_ID` | `FKAL7FF922` |
| `APNS_PRIVATE_KEY` | `AuthKey_HMXF37VS36.p8` 內容 |
| `APNS_TOPIC` | `com.lifenum.wuxing` |
| `APNS_ENVIRONMENT` | `production`（提交 App Store 前先用 `sandbox` 測試） |

本機 `.dev.vars` 亦有同名變數（`APNS_ENVIRONMENT=sandbox`），供 `npm run dev:cf` 測試。

已驗證：
- 用新 key 直接打 APNs → `400 BadDeviceToken`（代表認證成功）。
- 經正式 Worker 發送 → 同樣回 `400 BadDeviceToken`，並自動移除無效 token。

## ⚠️ 你仍需要做：開啟 App ID 的 Push 能力並重新產生描述檔

現有 `LifeNum App Store.mobileprovision` 的 entitlements **沒有** `aps-environment`，
所以 1.2.0 用現有 profile 存檔會失敗（entitlements 與 profile 不符）。

1. https://developer.apple.com/account/resources/identifiers/list
2. 選 `com.lifenum.wuxing` → 勾選 **Push Notifications** → Save
3. https://developer.apple.com/account/resources/profiles/list
4. `LifeNum App Store` → Edit → Save（重新產生）→ Download
5. 覆蓋 `D:\LifeNum\.keys\ios\LifeNum_AppStore.mobileprovision`
6. 更新 GitHub Secret `IOS_PROVISION_PROFILE_BASE64`：
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes('D:\LifeNum\.keys\ios\LifeNum_AppStore.mobileprovision')) | Set-Clipboard
   ```
   GitHub → Settings → Secrets and variables → Actions → 更新該 secret。

> 若只想先出一個不含推送的版本，可把 `ios/App/App/App.entitlements` 的
> `aps-environment` 移除並在 pbxproj 刪除 `CODE_SIGN_ENTITLEMENTS`，但之後仍要再上架一次。

## 如何發送

管理後台 → 推送通知：
- 標題（最多 120 字）
- 內容（最多 500 字）
- 對象：全部 / 繁中 / 簡中 / EN（按用戶 App 語言）

未開啟通知的裝置不會收到；伺服器會顯示目前 token 數。

## 測試流程（1.2.0 上 TestFlight 後）

1. 把 `APNS_ENVIRONMENT` 改為 `sandbox` 並重新部署：
   ```powershell
   "sandbox" | npx wrangler pages secret put APNS_ENVIRONMENT --project-name lifenum
   npm run deploy:cf
   ```
2. TestFlight 安裝 → 登入 → 允許通知
3. 管理後台發送測試推送
4. 成功後改回 `production` 並重新部署

## 限制

- 只支援 iOS（Android 需要 FCM，另行接入）。
- 每次最多 5000 部裝置；已分批（每批 50）併發發送。
- 憑證失效（`InvalidProviderToken`）不會自動刪 token，但會顯示在 `failures`。
