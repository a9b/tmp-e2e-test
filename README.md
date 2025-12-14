# E2E回遊テストプロジェクト

Chrome自動操作によるE2E回遊テスト用プロジェクト。Webサイトの回遊を自動化し、人間に近い挙動でのE2Eテストを行います。

## 特徴

- **ランダムウォーキング**: クリック順序とタイミングをランダム化可能
- **拡張可能な設計**: アクション定義を別ファイルで管理し、簡単に追加・変更可能
- **柔軟な設定**: Headless/Headed両対応、待機時間の調整、ステップ数の制限など
- **詳細なログ**: 実行ログを標準出力に出力

## 技術スタック

- Node.js
- TypeScript
- Playwright
- Chrome

## セットアップ

```bash
# 依存関係のインストール
npm install

# Playwrightブラウザのインストール
npx playwright install chromium

# プロキシを使用する場合（オプション）
# .env.exampleをコピーして.envを作成し、プロキシ設定を追加
cp .env.example .env
# .envファイルを編集してプロキシ情報を設定
```

## 使用方法

### 基本的な実行

```bash
# TypeScriptを直接実行（開発用）
npm run dev

# ビルドして実行
npm run build
npm start
```

### 環境変数による設定

```bash
# Headlessモードで実行
HEADLESS=true npm run dev

# 最大ステップ数を指定
MAX_STEPS=30 npm run dev

# 待機時間を調整
MIN_WAIT_TIME=500 MAX_WAIT_TIME=2000 npm run dev

# 順序順に実行（ランダム無効）
RANDOM_ORDER=false npm run dev
```

## プロジェクト構成

```
project-root/
├── package.json
├── tsconfig.json
├── playwright.config.ts
├── src/
│   ├── index.ts              # エントリーポイント
│   ├── browser/
│   │   └── launcher.ts       # ブラウザ起動管理
│   ├── actions/
│   │   ├── actionTypes.ts    # アクション型定義
│   │   └── actionRegistry.ts # アクション定義（ここを編集してアクションを追加）
│   ├── runner/
│   │   └── randomWalker.ts   # 回遊ロジック
│   └── utils/
│       ├── random.ts         # ランダム処理ユーティリティ
│       └── logger.ts         # ログ出力ユーティリティ
└── README.md
```

## アクションの追加方法

`src/actions/actionRegistry.ts`を編集して、新しいアクションを追加できます。

```typescript
export const monroeShopActions: Action[] = [
  createClickAction(
    '新しいアクション名',
    [
      'a:has-text("テキスト")',
      'text=テキスト',
      '[href*="url-pattern"]',
    ],
    'アクションの説明'
  ),
  // ... 既存のアクション
];
```

## 設定オプション

### RandomWalker設定

- `maxSteps`: 最大ステップ数（デフォルト: 50）
- `minWaitTime`: 最小待機時間（ミリ秒、デフォルト: 1000）
- `maxWaitTime`: 最大待機時間（ミリ秒、デフォルト: 3000）
- `randomOrder`: ランダム順序で実行するか（デフォルト: true）
- `maxVisitedUrls`: 訪問済みURLの最大数（デフォルト: 20）
- `screenshotDir`: スクリーンショット保存ディレクトリ（デフォルト: './screenshots'）

### BrowserLauncher設定

- `headless`: Headlessモード（デフォルト: false）
- `viewport`: ビューポートサイズ（デフォルト: 1920x1080）
- `userAgent`: ユーザーエージェント
- `timeout`: タイムアウト（ミリ秒、デフォルト: 30000）

### プロキシ設定（オプション）

`.env`ファイルに以下の環境変数を設定することで、プロキシ経由でアクセスできます：

```bash
# プロキシを使用するかどうか
USE_PROXY=true

# 単一のプロキシを使用する場合
PROXY_URL=http://username:password@proxy.example.com:8080

# 複数のプロキシをローテーションする場合
PROXY_URLS=http://user1:pass1@proxy1.com:8080,http://user2:pass2@proxy2.com:8080
PROXY_ROTATION=random  # random または sequential

# プロキシをローテーションする間隔（ステップ数、0の場合はローテーションしない）
PROXY_ROTATION_INTERVAL=10
```

**注意:** `.env`ファイルは`.gitignore`に含まれているため、機密情報を安全に管理できます。

**プロキシローテーションの動作:**
- `PROXY_ROTATION_INTERVAL`を設定すると、指定したステップ数ごとに自動的にプロキシが切り替わります
- 例: `PROXY_ROTATION_INTERVAL=10` の場合、10ステップごとにプロキシがローテーションされます
- `PROXY_ROTATION=random` の場合、ランダムにプロキシが選択されます
- `PROXY_ROTATION=sequential` の場合、順番にプロキシが選択されます

## 拡張性

### ページ遷移グラフ方式への拡張

将来的にページ遷移グラフ方式に拡張する場合、`PageActionSet`の`identifier`を活用して、ページごとの遷移可能なアクションを定義できます。

### スクリーンショット保存

エラー発生時に自動的にスクリーンショットを保存する機能が組み込まれています（`screenshotDir`を指定）。

## ライセンス

MIT


