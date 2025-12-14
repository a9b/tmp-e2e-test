#!/bin/bash

# 起動オプションのテストスクリプト

echo "=== 起動オプションのテスト ==="
echo ""

cd /Users/a9b/Dropbox/tmp

# テスト1: プロキシなし、ランダム順序
echo "【テスト1】プロキシなし、ランダム順序"
USE_PROXY=false RANDOM_ORDER=true MAX_STEPS=3 MIN_WAIT_TIME=5 MAX_WAIT_TIME=5 npm run dev 2>&1 | grep -E "(エラー|ERROR|WARN|完了|ステップ数)" | tail -5
echo ""

# テスト2: プロキシなし、順序順
echo "【テスト2】プロキシなし、順序順"
USE_PROXY=false RANDOM_ORDER=false MAX_STEPS=3 MIN_WAIT_TIME=5 MAX_WAIT_TIME=5 npm run dev 2>&1 | grep -E "(エラー|ERROR|WARN|完了|ステップ数)" | tail -5
echo ""

# テスト3: プロキシあり、ランダム順序
echo "【テスト3】プロキシあり、ランダム順序"
USE_PROXY=true RANDOM_ORDER=true MAX_STEPS=3 MIN_WAIT_TIME=5 MAX_WAIT_TIME=5 npm run dev 2>&1 | grep -E "(エラー|ERROR|WARN|完了|ステップ数|IP)" | tail -5
echo ""

# テスト4: プロキシあり、順序順
echo "【テスト4】プロキシあり、順序順"
USE_PROXY=true RANDOM_ORDER=false MAX_STEPS=3 MIN_WAIT_TIME=5 MAX_WAIT_TIME=5 npm run dev 2>&1 | grep -E "(エラー|ERROR|WARN|完了|ステップ数|IP)" | tail -5
echo ""

# テスト5: プロキシあり、プロキシローテーションあり
echo "【テスト5】プロキシあり、プロキシローテーションあり"
USE_PROXY=true PROXY_ROTATION_INTERVAL=1 RANDOM_ORDER=false MAX_STEPS=3 MIN_WAIT_TIME=5 MAX_WAIT_TIME=5 npm run dev 2>&1 | grep -E "(エラー|ERROR|WARN|完了|ステップ数|IP|変更)" | tail -5
echo ""

# テスト6: Headlessモード
echo "【テスト6】Headlessモード"
HEADLESS=true USE_PROXY=false MAX_STEPS=2 MIN_WAIT_TIME=5 MAX_WAIT_TIME=5 npm run dev 2>&1 | grep -E "(エラー|ERROR|WARN|完了|ステップ数)" | tail -5
echo ""

echo "=== テスト完了 ==="

