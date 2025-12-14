#!/bin/bash

echo "=== IP確認機能テスト ==="
echo ""

# プロキシなしでIP確認
echo "1. プロキシなしでIP確認"
USE_PROXY=false MAX_STEPS=2 npm run dev 2>&1 | grep -E "(IP|初期|===)" | head -10

echo ""
echo "=== テスト完了 ==="
echo ""
echo "プロキシを使用する場合は、.envファイルに正しい認証情報を設定してください。"
