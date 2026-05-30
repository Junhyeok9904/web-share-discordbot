@echo off
title Discord Link Opener Bot
echo ===================================================
echo Discord Link Opener Bot 시작 중...
echo ===================================================
echo.

cd /d "%~dp0"

:: Node.js 설치 확인
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [오류] Node.js가 설치되어 있지 않거나 환경 변수에 등록되지 않았습니다.
    echo Node.js를 설치한 후 다시 실행해주세요. (https://nodejs.org)
    echo.
    pause
    exit /b
)

:: 봇 실행
node index.js

:: 에러로 인해 종료되었을 때 창이 바로 닫히는 것을 방지
if %errorlevel% neq 0 (
    echo.
    echo ===================================================
    echo [오류] 봇 실행이 중단되었습니다. (에러 코드: %errorlevel%)
    echo 위의 에러 메시지를 확인해주세요.
    echo ===================================================
    pause
)
