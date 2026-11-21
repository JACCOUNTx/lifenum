# 內容管理（唔使重新上架）

更新：2026-11-22

App 採用「本機外殼 + 遠端內容設定」架構：介面程式碼打包在 App 內，
但**文字、公告、連結、功能開關**由 `GET /api/app-config` 提供，
管理員改完後 App 下次開啟（或由背景返回）就會更新，**毋須經 App Store 審核**。

> iOS 1.1.0（已送審）未包含此功能；由 **1.2.0** 起生效。
> 網站版本即時可用。

## 1. 可以唔使上架就改嘅內容

| 欄位 | 用途 | 例子 |
|---|---|---|
| `texts` | 覆寫任何一個介面字串（三個語言） | 改標題、按鈕、免責聲明、會員文案 |
| `notice` | App 頂部公告橫幅（可加連結、可關閉） | 推廣、維護通知、活動 |
| `links` | 私隱政策／服務條款連結 | 換成新網址 |
| `features` | 功能開關 | `{"week": false}` 暫時隱藏「每週」分頁 |

**仍然需要出新版本**：版面改動、新畫面、新功能、五行／推薦演算法、原生插件、權限。
如要連程式碼都即時更新，就只剩 OTA 熱更新或 `server.url` 全遠端模式（兩者都有審核風險，見文末）。

## 2. 點樣編輯

### App 內（1.2.0 起）
1. 用管理員帳號登入（`ADMIN_EMAIL`）。
2. 我的 → 管理後台 → **內容與文案（即時生效）**。
3. 直接改 JSON → 儲存。

### 網頁
https://lifenum.pages.dev → 我的 → 管理後台（同一個管理員帳號）。

## 3. JSON 格式

```json
{
  "notice": {
    "enabled": true,
    "text": {
      "zh-TW": "11 月限定：分享穿搭卡即可參加抽獎。",
      "zh-CN": "11 月限定：分享穿搭卡即可参加抽奖。",
      "en": "November only: share your outfit card to join the giveaway."
    },
    "link": "https://lifenum.pages.dev/support"
  },
  "features": {
    "week": true,
    "calendar": true,
    "journal": true
  },
  "texts": {
    "zh-TW": {
      "appSub": "每日五行幸運穿搭配色",
      "today": {
        "share": "生成分享卡"
      }
    },
    "en": {
      "appSub": "Daily five-element colours"
    }
  },
  "links": {
    "privacy": "https://lifenum.pages.dev/privacy",
    "terms": "https://lifenum.pages.dev/terms",
    "support": "https://lifenum.pages.dev/support"
  }
}
```

- `version`、`updatedAt` 由伺服器自動填，唔需要自己改。
- `texts` 只可以覆寫**已經存在**的字串（跟 `src/i18n/*.ts` 的結構）；
  新增 key 會被忽略。字串可以含 `{date}` 等佔位符。
- 陣列（例如 `moodLabels`）可以直接用新陣列覆寫。
- `features` 目前會控制底部五個分頁：`today`、`week`、`calendar`、`journal`、`profile`；
  值為 `false` 即隱藏該分頁。其他 key 會保留給日後功能使用。
- `links.privacy`、`links.terms` 會即時套用到「我的 → 關於」。

## 4. 生效時間與快取

- App 啟動時、以及由背景返回前景時會重新抓取（最多每 60 秒一次）。
- 成功抓取後會快取在裝置，離線時沿用上次設定。
- 公告關閉狀態會記住；當 `version` 改變（即你再次儲存）會重新顯示。
- 伺服器回應有 `Cache-Control: max-age=60`，最遲一分鐘後全體更新，通常即時。

## 5. 限制（伺服器會自動清理）

| 限制 | 值 |
|---|---|
| 整個設定 JSON | 64 KB |
| 公告文字 | 500 字 |
| 每個介面字串 | 4,000 字 |
| 覆寫 key 總數 | 1,500 |
| 巢狀深度 | 6 層 |
| 連結 | 必須 `https://` |

任何非字串／非布林值、未知 key、超長內容會被忽略或截短，唔會令 App 崩潰。

## 6. 安全

- `GET /api/app-config` 公開（所有用戶都看到，等同 App 內文字）；唔好放機密。
- `PUT /api/admin/content` 需要管理員登入；唔可以注入 HTML（純文字）。
- 改錯可以再儲存正確 JSON 即可復原；舊版本資料仍在每日 D1 備份。

## 7. 如果真要「改程式碼都唔使上架」

| 方案 | 效果 | 風險 |
|---|---|---|
| 遠端內容設定（本文件，已實作） | 文字／公告／連結／開關即時生效 | 無 |
| OTA 熱更新（Capgo 等，把新 `dist` 推送） | JS/CSS/版面都可即時更新 | Apple 對下載程式碼有政策風險；需要簽名、回滾、額外服務 |
| `server.url` 直接載入網站（WordPress 模式） | 任何網站改動即時反映 | Capacitor 官方講明唔建議用於 production；Apple 4.2「只是網站」風險；離線不可用 |

建議：日常內容用本文件的遠端設定；功能／版面改動照正常出新版本（`store/release-process.md`）。
如要行 OTA，可另開一個版本加入簽名更新機制，先喺 TestFlight 驗證再送審。
