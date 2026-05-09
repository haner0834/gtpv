# GTPV — Graduation Trip Photo Viewer

## 專案結構

```
gtpv/
├── src/                    # React + TypeScript SPA
│   ├── components/
│   │   ├── PasscodeModal.tsx   # 4 位數密碼輸入
│   │   ├── ImageGrid.tsx       # 瀑布流相片格
│   │   ├── ImageOverlay.tsx    # 全圖 overlay + 下載
│   │   └── FolderSelector.tsx  # 相簿切換下拉
│   ├── pages/
│   │   ├── WelcomePage.tsx     # 首頁（無 folder）
│   │   └── GalleryPage.tsx     # 相片瀏覽頁
│   ├── lib/
│   │   ├── api.ts              # Worker API 呼叫
│   │   └── platform.ts         # iOS 偵測
│   ├── store/app.ts            # Zustand 全域狀態
│   └── types/index.ts          # TypeScript 型別
├── worker/
│   └── index.ts               # Cloudflare Worker
├── scripts/
│   ├── upload.py              # 上傳腳本
│   └── .env.example           # R2 credentials 範本
├── public/
│   └── _redirects             # Cloudflare Pages SPA routing
├── wrangler.toml              # Worker 部署設定
└── package.json
```

---

## 1. 前端設定

### 安裝依賴

```bash
npm install
```

### 修改 Worker URL

在 `src/lib/api.ts` 確認 Worker base URL：

```ts
const WORKER_BASE = "https://workers.gtpv.kmshweb.com";
```

### 開發

```bash
npm run dev
```

### 部署到 Cloudflare Pages

```bash
npm run build
# 將 dist/ 資料夾部署到 Cloudflare Pages
# 設定 Custom Domain: gtpv.kmshweb.com
```

---

## 2. Worker 部署

### 設定 wrangler.toml

```toml
[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "gtpv-images"   # 改成你的 R2 bucket 名稱
```

### 設定 Secrets

```bash
# 安裝 wrangler
npm install -g wrangler
npx wrangler login

# 設定 SALT（隨機字串即可）
npx wrangler secret put SALT
# 輸入：gtpv_s@lt_2024_random

# 設定 FOLDER_CODES（JSON 格式的 folder → passcode 對應）
npx wrangler secret put FOLDER_CODES
# 輸入：{"lil-u":"1234","friends":"5678"}
```

### 部署 Worker

```bash
npx wrangler deploy
```

在 Cloudflare Dashboard 設定 Custom Domain：
`workers.gtpv.kmshweb.com` → 此 Worker

---

## 3. R2 Bucket 設定

1. 在 Cloudflare Dashboard 建立 R2 Bucket，名稱設為 `gtpv-images`
2. 在 Bucket Settings → Public Access 啟用 Custom Domain：
   `images.gtpv.kmshweb.com`
3. R2 Bucket 結構：
   ```
   {folder}/
     {image_id}/
       full           ← 原圖
       thumbnail64    ← 64px 縮圖
       thumbnail128   ← 128px 縮圖
       thumbnail512   ← 512px 縮圖
   ```

---

## 4. Upload Script

### 安裝依賴

```bash
pip install boto3 Pillow click python-dotenv
```

### 設定 credentials

```bash
cd scripts/
cp .env.example .env
# 編輯 .env，填入 R2 credentials
```

在 Cloudflare Dashboard → R2 → Manage R2 API Tokens 建立新 token：
- Permissions: Object Read & Write
- Bucket: gtpv-images

### 使用方式

```bash
# 上傳 ./my-photos 到 R2 的 lil-u folder
python scripts/upload.py --folder ./my-photos --name lil-u

# Dry run（只列出，不上傳）
python scripts/upload.py --folder ./my-photos --name lil-u --dry-run

# 強制覆蓋已存在檔案
python scripts/upload.py --folder ./my-photos --name lil-u --force
```

---

## 5. URL 結構

| URL | 說明 |
|-----|------|
| `gtpv.kmshweb.com/` | 歡迎頁 |
| `gtpv.kmshweb.com/lil-u` | 需輸入密碼 |
| `gtpv.kmshweb.com/lil-u?token=abc123` | 已驗證，可分享此 URL |

---

## 6. 新增 Folder / 修改密碼

更新 Worker 的 `FOLDER_CODES` secret：

```bash
npx wrangler secret put FOLDER_CODES
# 輸入新的 JSON：{"lil-u":"1234","friends":"5678","new-folder":"9999"}
```

部署後立即生效，不需要重新部署 Worker。
