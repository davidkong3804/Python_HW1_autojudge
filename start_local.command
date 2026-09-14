#!/bin/bash
# 雙擊就能在本機開批改網頁（不用等網路下載 Python 環境，快很多）
cd "$(dirname "$0")" || exit 1
PORT=8765
python3 -m http.server $PORT >/dev/null 2>&1 &
SERVER=$!
sleep 1
echo "批改網頁已啟動：http://localhost:$PORT/"
echo "用完把這個視窗關掉就會停止。"
if command -v open >/dev/null; then open "http://localhost:$PORT/"; fi
wait $SERVER
