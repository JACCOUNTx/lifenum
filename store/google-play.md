# Google Play 上架設定（命數五行穿衣法）

更新：2026-10-21

## 1. 基本資料
| 項目 | 值 |
|---|---|
| 應用程式名稱 | 命數五行穿衣法 |
| Package name | `com.lifenum.wuxing` |
| 預設語言 | 繁體中文（zh-TW） |
| 類別 | Lifestyle（生活品味） |
| 免費 / 內購 | 免費下載，含每月訂閱 |
| 隱私政策 | https://lifenum.pages.dev/privacy |
| 帳戶刪除 | https://lifenum.pages.dev/delete-account |
| 支援 Email | info@marlleegroup.com |
| 網站 | https://lifenum.pages.dev |

## 2. 簽名與 AAB
- 上傳金鑰：`D:\LifeNum\.keys\lifenum-upload.jks`（alias `upload`）
- 密碼：`D:\LifeNum\android\keystore.properties`（**兩者必須備份，遺失會無法更新 app**）
- 已建置：`D:\LifeNum\android\app\build\outputs\bundle\release\app-release.aab`
- 重新建置：
  ```powershell
  $env:JAVA_HOME='C:\Users\user\.jdks\jdk-21.0.12.1+1'
  cd D:\LifeNum; npm run build; npx cap sync android
  cd android; .\gradlew.bat bundleRelease
  ```
- Play Console → 設定 → 應用程式完整性 → 選擇 **Play App Signing**，上傳上述 upload key。

## 3. Play Console 建立 app
1. Create app → 名稱、語言、App、Free。
2. 確認套件名稱 `com.lifenum.wuxing`。
3. 內部測試 → 上傳 `app-release.aab`，加入測試人員。
4. 完成 Store listing、Data safety、Content rating、Target audience、Ads、App access。

## 4. 商店文案（繁中）
**短描述（≤80 字）**
> 用生日與每日干支算出專屬幸運色，每天穿對顏色，提升氣場。

**完整描述**
> 命數五行穿衣法結合生命數字、每日干支與五行生剋，為你計算每天的專屬穿搭配色。
>
> • 今日三色：主色、輔色、點綴色與少用色
> • 每週運程：一週運勢、最旺日與留意日
> • 週曆：一週七天的穿搭建議與文字說明
> • 個人檔案：生命數字、本命五行、開運色與流年
> • 穿搭記錄：記下每日配色與心情
> • 繁體中文、簡體中文、English

**關鍵字（Apple 用，≤100 字元）**
> 五行,穿衣,幸運色,每日運勢,生命數字,命理,穿搭,週運程,顏色,干支

## 5. 圖像素材
| 素材 | 規格 |
|---|---|
| App icon | 512 × 512 PNG（32-bit） |
| Feature graphic | 1024 × 500 PNG/JPEG |
| 手機截圖 | 最少 2 張，16:9 或 9:16，最長邊 ≤ 3840px |
| 7 吋 / 10 吋平板 | 選填 |

App 內圖示與啟動圖已在 `public/icons`、`android/app/src/main/res`。

## 6. Data safety（資料安全表）
- 收集：Email、姓名、出生日期、購買記錄、帳戶 ID。
- 用途：帳戶管理、app 功能、付款。
- 傳輸加密：是。
- 可要求刪除：是（app 內「我的 → 刪除帳戶」）。
- 分享給第三方：Cloudflare（托管）、Stripe（網頁付款）、RevenueCat（商店內購）。
- 出售資料：否。廣告：否。

## 7. 訂閱商品（Google Play）
- Product ID：`lifenum_monthly`
- Base plan：`monthly`（auto-renewing）
- 價格：HK$88 / 月（可按市場定價）
- 寬限期：7 天；帳戶保留：30 天（建議）
- 啟用後在 RevenueCat 匯入，見 `store/iap-revenuecat.md`。

## 8. 審核注意
- App 內註冊／登入可用（Email + 密碼）。
- 刪除帳戶必須在 app 內可完成（已實作）。
- 若審核員需要測試帳號，請在 App access 提供一組測試會員（另行建立）。
- 不要在 app 內顯示「到網站付款」等外部購買連結（避免違反計費政策）。
