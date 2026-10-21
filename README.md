# 命数五行 · 生命数字 × 五行穿衣

用出生日期推算**生命数字**与**本命五行**，结合每日**干支五行**，生成当天的穿搭配色与灵感。
同一套代码同时提供网页版（PWA）与 Android / iOS 原生外壳（Capacitor）。

## 功能

- **今日**：当日干支、日主五行、五行能量分布（日干 35% + 地支 25% + 本命 40%）、每日三色（主色 / 辅色 / 点缀）与少用配色、三套场景穿搭（通勤 / 休闲 / 约会）、面料建议、分享卡。
- **每週運程**：週一到週日逐日運勢（日干 × 地支 × 本命）、本週平均分、最旺日 / 留意日、本週開運色與提示；可切換前後週。
- **週曆**：以週為單位列出每日三色（主色 / 輔色 / 點綴）與文字穿搭建議；可切換前後週，點按日期查看當日詳情，並標記有記錄的日期。
- **记录**：记录当天穿搭颜色、心情与随手记；统计连续记录天数、本月记录数与配色五行分布。
- **我的**：生命数字解读、本命五行、开运色 / 慎用色、流年数字与主题、编辑资料、清空数据。
- **会员系统**：Email + 密码注册／登录，会员的姓名与出生日期同步到账户；免费版只显示今日摘要、五行能量分布与今日三色，会员解锁全部功能。
- **订阅收费**：Stripe 月费订阅，默认 HK$88／月，后台可随时调整价格与币别；支持 Stripe 客户门户管理订阅。
- **管理后台**：管理员可查看会员、手动开通／停用会籍、修改月费与币别。
- **三语言**：繁體中文（默认）、简体中文、English，可随时切换。
- **离线可用**：Web 端构建时生成 `sw.js`，预缓存全部产物与图标，检测到新版本会提示「立即更新」；原生端资源随包内置。
- **本地存储**：未登入時資料只保存在本機 `localStorage`；登入會員後姓名與出生日期會同步到 Cloudflare D1。

## 本地开发

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # 类型检查 + 生产构建到 dist/
npm run preview      # 预览生产构建
```

### 离线缓存（Web）

`sw.js` 由 `vite.config.ts` 里的 `lifenum-service-worker` 插件在构建时生成：缓存名带上构建哈希，预缓存 `dist` 全部产物与图标；页面导航优先请求网络（3 秒超时后回退缓存），其余静态资源使用 stale-while-revalidate。检测到新版本时，页面底部会显示「有新版本可用 / 立即更新」，点击后跳过等待并自动刷新。

开发模式（`npm run dev`）不注册 Service Worker；`dist/` 里没有 `sw.js` 时不影响应用运行。

## 部署（Cloudflare Pages + D1 + Stripe）

會員、收費與管理後台需要 Cloudflare Pages Functions 與 D1；單純的 GitHub Pages 只能提供靜態免費版，登入與付款會失效。

### 目前部署

- 網址：<https://lifenum.pages.dev>
- Pages 專案：`lifenum`；D1：`lifenum`（`7135fff5-018e-4930-afc0-f7b6763e0ff7`，APAC）
- 已設定密鑰：`ADMIN_EMAIL`、`APP_URL`、`STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`
- Stripe：已建立 live webhook `https://lifenum.pages.dev/api/stripe/webhook`（4 個訂閱事件）與 Billing Portal 設定；月費 HK$88 會即時建立 live Price
- 注意：live 模式會真實收費；測試時可在 Stripe 建立 100% 折扣碼，或改用測試金鑰
- 第一個以 `jackyss@gmail.com` 註冊的帳號會自動成為管理員；之後在「我的 → 管理後台」設定月費

### 第一次部署

1. `npx wrangler login`
2. `npx wrangler d1 create lifenum`，把回傳的 `database_id` 填入 `wrangler.toml`
3. `npm run db:migrate`（遠端）或 `npm run db:migrate:local`（本機）
4. 設定環境變數／密鑰：

```bash
npx wrangler pages secret put STRIPE_SECRET_KEY --project-name lifenum
npx wrangler pages secret put STRIPE_WEBHOOK_SECRET --project-name lifenum
npx wrangler pages secret put ADMIN_EMAIL --project-name lifenum
npx wrangler pages secret put APP_URL --project-name lifenum
```

- `ADMIN_EMAIL`：用此 Email 註冊的帳號會自動成為管理員（預設 `jackyss@gmail.com`）
- `APP_URL`：正式網址，例如 `https://lifenum.pages.dev`

5. Stripe Dashboard → Webhooks → 新增 `https://<你的網域>/api/stripe/webhook`，訂閱：
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   把 signing secret 設為 `STRIPE_WEBHOOK_SECRET`。
6. `npm run deploy:cf`
7. 以管理員 Email 註冊並登入 →「我的 → 管理後台」設定月費（預設 88 HKD）。

### 本機開發

```bash
cp .dev.vars.example .dev.vars   # 填入 Stripe 測試金鑰（可留空）
npm run db:migrate:local
npm run dev:cf                   # http://localhost:8788
```

### 權限與收費

- 免費版：今日摘要、五行能量分布、今日三色。
- 會員：全部功能（穿搭靈感、分享、每週運程、週曆、記錄、完整檔案）。
- 後台：月費／幣別、會員列表、手動開通／停用會籍。
- 修改價格後，下一次結帳會自動建立新的 Stripe Price，舊訂閱不受影響。
- 目前運程內容在前端計算，會員鎖定屬 UI 層；若要防止技術用戶繞過，需把會員專屬計算移到 API。

## 舊網址（GitHub Pages，靜態免費版）

- <https://jaccountx.github.io/lifenum/>
- 此版本沒有 `/api`，登入與收費不可用，只會顯示免費版三張卡；正式會員版請用 Cloudflare Pages。

## 打包 Android / iOS 與商店上架

项目已通过 Capacitor 生成 `android/` 与 `ios/` 原生工程（Capacitor 8，iOS 使用 SPM）。

```bash
npm run sync         # 构建网页并同步到两个原生工程
npx cap open android # 需要 Android Studio + JDK 21
npx cap open ios     # 需要 macOS + Xcode
```

- 应用 ID：`com.lifenum.wuxing`
- 应用名称：命數五行穿衣法
- 圖示與啟動圖已替換為品牌素材（`public/icons`、Android `mipmap-*`、iOS `AppIcon` / `Splash`）。
- 原生分享使用 `@capacitor/share` + `@capacitor/filesystem`，分享卡會寫入緩存目錄後調起系統分享面板。
- **原生 API**：App 以絕對網址 `https://lifenum.pages.dev` 呼叫 `/api`，使用 Bearer token（登入／註冊時由 `X-Client-Platform: native` 取得），不依賴第三方 Cookie。
- **帳戶刪除**：App 與網頁「我的 → 刪除帳戶」可即時取消訂閱並刪除帳戶。
- **私隱政策**：<https://lifenum.pages.dev/privacy>；刪除帳戶說明：<https://lifenum.pages.dev/delete-account>。

### Android 簽名與 AAB
- 上傳金鑰：`.keys/lifenum-upload.jks`（alias `upload`；密碼在 `android/keystore.properties`，兩者已 gitignore，**必須備份**）
- 建置（需要 JDK 21）：
  ```powershell
  $env:JAVA_HOME='C:\Users\user\.jdks\jdk-21.0.12.1+1'
  npm run build; npx cap sync android
  cd android; .\gradlew.bat bundleRelease
  ```
- 產物：`android/app/build/outputs/bundle/release/app-release.aab`

### iOS 與 CI
- Windows 無法簽名 iOS；`.github/workflows/ios.yml` 使用 macOS runner + App Store Connect API key 上傳 TestFlight，所需的 GitHub Secrets 見 `store/app-store.md`。
- Android CI：`.github/workflows/android.yml`（base64 keystore + 密碼 secrets）。
- 商店設定、文案、Data safety / 私隱標籤：`store/google-play.md`、`store/app-store.md`。
- 商店內購（RevenueCat）：伺服器 webhook 已完成並測試；App 端 SDK／paywall 待提供 RevenueCat public keys 後接入，詳見 `store/iap-revenuecat.md`。

### 原生訂閱政策
- 網頁版使用 Stripe（已完成）。
- iOS／Android 的數位訂閱必須使用 Apple／Google 內購；native app 內不會顯示 Stripe 或外部購買連結。
- 在 IAP 接入前，native app 只提供登入現有會員，付費入口顯示「即將推出」。

## 自動備份與自動上架

- **本機自動備份**：Windows 工作排程 `LifeNum Daily Backup`，每日 03:30 執行
  `scripts/backup.ps1`，備份 D1、原始碼、keystore 與本機設定；本機保留 30 日，
  OneDrive `LifeNumBackups` 保留 90 日（不含 secrets）。詳見 `store/automation.md`。
- **GitHub Actions**：
  - `backup.yml`：每日匯出 D1 為 artifact。
  - `android.yml`：建置 AAB，設定 `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` 後自動上傳 Play internal track。
  - `ios.yml`：macOS 建 Archive，設定 Apple secrets 後自動上傳 TestFlight。
- 啟用 CI 前需把專案推上 GitHub，並加入 `store/automation.md` 列出的 Secrets。
- 建立全新商店 app、簽署協議、稅務／銀行資料、送審仍需在 Google Play Console / App Store Connect 手動完成。

## 目录结构

```
src/
  lib/
    wuxing.ts      五行生克、颜色库、关系与基础分
    ganzhi.ts      儒略日 → 日柱干支（天干为日主五行）
    numerology.ts  生命数字、生日数、流年数
    recommend.ts   今日/本命双层加权、穿搭组合生成
    weekly.ts      每週運勢（七日運程、平均分、開運色）
    date.ts        日期与月历工具
    shareCard.ts   Canvas 分享卡绘制与分享
    pwa.ts         Service Worker 注册、更新检测与立即更新
    api.ts         前端 API 客户端（会员、订阅、后台）
    auth.tsx       登录状态、Stripe Checkout 跳转
    storage.ts     localStorage 状态管理
  i18n/            简体 / 繁體 / English 文案
  components/      今日、每週、週曆、记录、我的、引导、分享、会员与后台面板
functions/         Cloudflare Pages Functions（会员、Stripe、后台 API）
migrations/        D1 数据表与默认价格
```

## 算法说明

1. **生命数字**：出生年、月、日所有数字相加，反复归约到个位数；过程中出现 11 / 22 / 33 保留为大师数。
2. **数字五行**（河图）：1、6 水；2、7 火；3、8 木；4、9 金；5 土。大师数按数字和取五行。
3. **每日五行**：取当天日柱的天干（日主），如甲、乙日为木；地支五行作为次要因素。
4. **配色关系**：生我 = 贵人色，同我 = 比肩色，我克 = 财色，克我 = 官煞色，我生 = 泄耗色。
5. **综合评分**：日干 35% + 地支 25% + 本命 40%。每日取分数最高的三个五行作为主色、辅色、点缀，各配一个具体颜色；日历主色会避开前一天，确保每日颜色不同。
6. **每週運程**：每日運勢按日干 60% + 地支 40% 的關係分加權（生我 95、同我 85、我克 70、克我 50、我生 40），週平均為七日平均；本週開運色取七日推薦色中出現次數最多的兩個五行。

内容基于传统五行文化整理，仅供穿搭灵感与娱乐参考。
