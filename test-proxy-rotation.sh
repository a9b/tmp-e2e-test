#!/bin/bash

# プロキシローテーションテスト用スクリプト
# 使用方法: ./test-proxy-rotation.sh

echo "=== プロキシローテーションテスト ==="
echo ""
echo "このスクリプトは、プロキシローテーション機能をテストします。"
echo "実際のプロキシ認証情報を.envファイルに設定してください。"
echo ""

# .envファイルの存在確認
if [ ! -f .env ]; then
    echo "⚠️  .envファイルが見つかりません。"
    echo "   .env.exampleを参考に.envファイルを作成してください。"
    exit 1
fi

# USE_PROXYの確認
if ! grep -q "USE_PROXY=true" .env; then
    echo "⚠️  .envファイルでUSE_PROXY=trueが設定されていません。"
    echo "   プロキシを使用する場合は、.envファイルでUSE_PROXY=trueを設定してください。"
    exit 1
fi

echo "✅ .envファイルが見つかりました"
echo ""

# プロキシローテーション間隔を短く設定してテスト
echo "プロキシローテーションテストを実行します..."
echo "（PROXY_ROTATION_INTERVAL=2で、2ステップごとにプロキシを切り替えます）"
echo ""

MAX_STEPS=6 PROXY_ROTATION_INTERVAL=2 npm run dev 2>&1 | grep -E "(IP|プロキシ|ローテーション|===|✅|⚠️)" | head -30

