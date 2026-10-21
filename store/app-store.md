# App Store 上架設定（命數五行穿衣法）

更新：2026-10-21

## 1. 基本資料
| 項目 | 值 |
|---|---|
| App 名稱 | 命數五行穿衣法 |
| Bundle ID | `com.lifenum.wuxing` |
| SKU | `lifenum-wuxing-1` |
| 主要語言 | 繁體中文 |
| 類別 | Lifestyle |
| 價格 | 免費（含自動續訂） |
| 隱私政策 | https://lifenum.pages.dev/privacy |
| 帳戶刪除 | https://lifenum.pages.dev/delete-account |
| 支援網址 | https://lifenum.pages.dev |
| 支援 Email | info@marlleegroup.com |

## 2. App Store Connect
1. Certificates, Identifiers & Profiles → Identifiers → 新增 App ID `com.lifenum.wuxing`。
2. App Store Connect → My Apps → 新增 App（iOS、名稱、語言、Bundle ID、SKU）。
3. App 資訊：
   - 副標題（30 字元）：`每日五行幸運穿搭配色`
   - 關鍵字：`五行,穿衣,幸運色,每日運勢,生命數字,命理,穿搭`
   - 描述：可沿用 `store/google-play.md` 的完整描述
   - 隱私政策 URL、支援 URL
4. App Privacy（隱私標籤）：
   - Contact Info → Email、Name（App Functionality，linked）
   - Other Data → Birth date（App Functionality，linked）
   - Purchases → Purchase history（App Functionality）
   - Identifiers → User ID（App Functionality）
   - Tracking：否
5. 年齡分級：4+（無不雅內容；命理內容僅供娛樂）。

## 3. 訂閱商品
- 訂閱群組：`LifeNum Membership`
- Product ID：`com.lifenum.wuxing.monthly`
- 期間：1 個月；價格：HK$88（選最接近的價格點）
- 提供試用？如需要可設 7 天免費試用（RevenueCat offering 需同步）
- 訂閱群組需包含隱私政策及服務條款連結。

## 4. 建置與上傳（Windows 環境用 GitHub Actions）
本機是 Windows，無法用 Xcode 簽名。已提供 `.github/workflows/ios.yml`：
1. 把專案推到 GitHub repo（private 亦可）。
2. 在 GitHub → Settings → Secrets and variables → Actions 加入：
   - `IOS_DIST_CERT_P12_BASE64`：Apple Distribution 憑證 `.p12` 的 base64
   - `IOS_DIST_CERT_PASSWORD`：`.p12` 密碼
   - `IOS_PROVISION_PROFILE_BASE64`：App Store provisioning profile 的 base64
   - `IOS_PROFILE_NAME`：profile 名稱
   - `IOS_TEAM_ID`：Apple Team ID
   - `APPSTORE_API_KEY_ID`：App Store Connect API Key ID
   - `APPSTORE_ISSUER_ID`：Issuer ID
   - `APPSTORE_API_PRIVATE_KEY`：`AuthKey_XXXX.p8` 內容
3. 執行 workflow（workflow_dispatch），上傳到 TestFlight。
4. 在 App Store Connect 選擇 TestFlight build 送審。

## 5. 截圖
| 裝置 | 尺寸（像素） |
|---|---|
| iPhone 6.9" | 1320 × 2868 或 2868 × 1320 |
| iPhone 6.5" | 1284 × 2778 或 2778 × 1284 |
| iPad 13"（如支援） | 2064 × 2752 或 2752 × 2064 |

至少提供 3 張：今日三色、週曆、每週運程（會員視角）。

## 6. 審核備註
- 需要登入才能使用完整功能；請建立一組測試帳號並在 App Review Information 提供。
- App 內提供「刪除帳戶」（我的 → 刪除帳戶）。
- 不要在 app 內連結到網站付款；native 訂閱使用 IAP（見 `store/iap-revenuecat.md`）。
- 已設定 `ITSAppUsesNonExemptEncryption = false`（只用標準 HTTPS）。
