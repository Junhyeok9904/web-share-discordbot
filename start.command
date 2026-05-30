#!/bin/bash

echo "==================================================="
echo "Discord Link Opener Bot 시작 중..."
echo "==================================================="
echo ""

# 스크립트가 위치한 디렉토리로 이동 (더블 클릭 실행 시 필요)
cd "$(dirname "$0")"

# Node.js 설치 확인
if ! command -v node &> /dev/null; then
    echo "[오류] Node.js가 설치되어 있지 않습니다."
    echo "Homebrew(brew install node) 또는 공식 웹사이트에서 설치해주세요."
    echo "아무 키나 누르면 종료됩니다..."
    read -n 1 -s
    exit 1
fi

# 봇 실행
node index.js

# 에러 발생 시 대기
if [ $? -ne 0 ]; then
    echo ""
    echo "==================================================="
    echo "[오류] 봇 실행이 중단되었습니다. 위의 에러 메시지를 확인해주세요."
    echo "==================================================="
    echo "아무 키나 누르면 터미널이 닫힙니다..."
    read -n 1 -s
fi
