# 自動備份與自動上架

更新：2026-10-21

## A. 自動備份（已在本機啟用）

Windows 工作排程器：**LifeNum Daily Backup**，每日 **03:30** 執行
`D:\LifeNum\scripts\backup.ps1`。

每次會建立 `D:\LifeNum\backups\YYYYMMDD-HHMMSS\`：
| 檔案 | 內容 |
|---|---|
| `d1-lifenum.sql` | Cloudflare D1 完整匯出（schema + 資料） |
| `source.tar.gz` | 原始碼（排除 node_modules、dist、build、.keys、.dev.vars、keystore） |
| `secrets/` | 上傳金鑰、`keystore.properties`、RevenueCat token、`.dev.vars`、`config.txt`（僅本機） |

- 本機保留 30 日；OneDrive `C:\Users\user\OneDrive\LifeNumBackups` 保留 90 日（**不含 secrets**）。
- 日誌：`D:\LifeNum\backups\backup.log`。
- 手動執行：
  ```powershell
  powershell -NoProfile -ExecutionPolicy Bypass -File D:\LifeNum\scripts\backup.ps1
  ```
- 查看／修改排程：
  ```powershell
  Get-ScheduledTask -TaskName 'LifeNum Daily Backup'
  # 修改時間：Unregister-ScheduledTask -TaskName 'LifeNum Daily Backup' 後重新 Register
  ```

### 還原 D1
匯出的 SQL 含 `CREATE TABLE`，請匯入**新的** D1：
```powershell
npx wrangler d1 create lifenum-restore
npx wrangler d1 execute lifenum-restore --remote --file D:\LifeNum\backups\<stamp>\d1-lifenum.sql -y
```
然後把 `wrangler.toml` 的 `database_id` 改為新 DB，重新部署。
亦可使用 Cloudflare D1 Time Travel 還原至指定時間。

> `secrets/` 是明文，資料夾已限制只有你的 Windows 帳戶可讀。建議另外把 `lifenum-upload.jks`
> 與 `keystore.properties` 存入密碼管理器；只依賴本機備份仍有風險。

## B. GitHub Actions 自動備份（異地）
`.github/workflows/backup.yml`：每日 03:30 HKT 匯出 D1，保存為 Actions artifact 90 日。
需要 GitHub Secrets：
- `CLOUDFLARE_API_TOKEN`（D1 Read/Export 權限即可）
- `CLOUDFLARE_ACCOUNT_ID` = `f290476bc3765b7d9a8631ef8a24f95c`

先在 GitHub 建立／推送原始碼，Actions 才能執行。

## C. 自動上架 Android（Google Play internal track）
`.github/workflows/android.yml` 會建置 AAB，然後在 `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` 存在時自動上傳至 **internal** track。

一次性設定：
1. Play Console → 設定 → API 存取權 → 建立服務帳戶（或連結現有 GCP 服務帳戶）。
2. 在 Google Cloud Console 為該服務帳戶建立 JSON key。
3. Play Console → 使用者與權限 → 邀請服務帳戶，給予「Release to testing tracks」權限。
4. 在 Play Console 手動建立 app `com.lifenum.wuxing`（API 不能建立全新 app）。
5. GitHub Secrets 加入：
   - `ANDROID_KEYSTORE_BASE64`：`[Convert]::ToBase64String([IO.File]::ReadAllBytes('D:\LifeNum\.keys\lifenum-upload.jks'))`
   - `ANDROID_STORE_PASSWORD`、`ANDROID_KEY_PASSWORD`（見 `android/keystore.properties`）
   - `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`：服務帳戶 JSON 全文
6. 執行 `Android Release AAB` workflow。上傳後到 Play Console 內部測試確認。

> 第一次上架仍需在 Play Console 完成 Store listing、Data safety、Content rating、訂閱商品；
> 這些無法由 API 全自動完成。

## D. 自動上架 iOS（TestFlight）
`.github/workflows/ios.yml` 在 macOS runner 建 Archive，並在 Apple API secrets 存在時上傳 TestFlight。
需要 Secrets（詳見 `store/app-store.md`）：
`IOS_DIST_CERT_P12_BASE64`、`IOS_DIST_CERT_PASSWORD`、`IOS_PROVISION_PROFILE_BASE64`、
`IOS_PROFILE_NAME`、`IOS_TEAM_ID`、`APPSTORE_API_KEY_ID`、`APPSTORE_ISSUER_ID`、
`APPSTORE_API_PRIVATE_KEY`。

上傳 TestFlight 後，正式送審（App Review）仍建議在 App Store Connect 手動按「Submit for Review」，
因為需要選擇 build、填寫審核備註與示範帳號。

## E. 仍無法全自動的部分
- 建立全新的 Google Play / App Store app record（只可在 Console 建立）。
- 簽署商店協議、稅務與銀行資料。
- App 審核、年齡分級、私隱標籤問卷。
- iOS 憑證與 provisioning profile（需你的 Apple 帳戶）。
- RevenueCat 商品與 API keys（見 `store/iap-revenuecat.md`）。

## 安全
- 所有 credentials 只放在 GitHub Secrets / Cloudflare Secrets，不要 commit。
- `backups/`、`.keys/`、`android/keystore.properties`、`.dev.vars`、`config.txt` 已 gitignore。
