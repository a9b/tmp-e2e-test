#!/bin/bash

echo "=== プロキシ設定テスト用スクリプト ==="
echo ""
echo "このスクリプトは、実際のプロキシ設定を使ってIPアドレスの変更を確認します。"
echo ""

# .envファイルの確認
if [ ! -f .env ]; then
    echo "⚠️  .envファイルが見つかりません。"
    echo ""
    echo "以下のコマンドで.envファイルを作成してください："
    echo "  cp .env.example .env"
    echo ""
    echo "その後、.envファイルを編集して、実際のプロキシ認証情報を設定してください："
    echo "  USE_PROXY=true"
    echo "  PROXY_URL=http://username:password@geo.iproyal.com:51200"
    echo "  PROXY_ROTATION_INTERVAL=2"
    exit 1
fi

# USE_PROXYの確認
if ! grep -q "^USE_PROXY=true" .env; then
    echo "⚠️  .envファイルでUSE_PROXY=trueが設定されていません。"
    echo ""
    echo ".envファイルを編集して、USE_PROXY=trueを設定してください。"
    exit 1
fi

echo "✅ .envファイルの設定を確認しました"
echo ""

# プロキシ設定の確認
if grep -q "^PROXY_URL=" .env || grep -q "^PROXY_URLS=" .env; then
    echo "✅ プロキシURLが設定されています"
else
    echo "⚠️  プロキシURLが設定されていません。"
    echo "   PROXY_URLまたはPROXY_URLSを設定してください。"
    exit 1
fi

echo ""
echo "プロキシローテーションテストを実行します..."
echo "（PROXY_ROTATION_INTERVAL=2で、2ステップごとにプロキシを切り替えます）"
echo ""

MAX_STEPS=6 PROXY_ROTATION_INTERVAL=2 npm run dev 2>&1 | grep -E "(IP|プロキシ|ローテーション|===|✅|⚠️|初期|変更)" | head -40
