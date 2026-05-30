# Web Discord Copy (Discord Link Opener) v1.5.0

디스코드 특정 채널에 올라온 링크를 감지하여 봇을 통해 로컬 머신(Windows, Mac)의 기본 브라우저에서 즉시 열어주는 솔루션입니다.

[English Guide below]

## 주요 기능 (Key Features)

- **Node.js 기반**: 가볍고 빠르게 동작하는 Node.js 애플리케이션
- **단일 실행 파일 빌드 제공**: Node.js 환경이 없어도 실행할 수 있도록 Windows용(`.exe`) 및 Mac용 바이너리 빌드 제공
- **웹 기반 초기 설정 UI**: 처음 실행 시 자동으로 웹 브라우저가 열려 디스코드 토큰 및 설정을 간편하게 완료 가능
- **초대 링크 자동 생성**: 봇 클라이언트 ID만 입력하면 자동으로 서버 초대 링크 생성
- **업데이트 자동 확인**: 실행 시 새 버전이 있는지 확인하고 웹 UI 및 디스코드 채널로 알림 전송
- **다국어 지원**: 한국어 및 영어 지원
- **강력한 보안 로직**: TDD 기반으로 검증된 XSS 및 악성 스킴 필터링 및 방어 기능

## 🤖 디스코드 봇 설정 가이드 (중요!)

봇이 정상적으로 메시지를 읽고 링크를 열기 위해서는 디스코드 개발자 포털에서 아래 설정이 **반드시** 필요합니다.

1. **[Discord Developer Portal](https://discord.com/developers/applications)** 접속 및 로그인
2. 생성한 봇 애플리케이션 클릭 -> 왼쪽 메뉴의 **Bot** 클릭
3. **Privileged Gateway Intents** 섹션에서 아래 두 항목을 **ON(활성화)** 하세요.
   - **Message Content Intent** (메시지 읽기용)
   - **Server Members Intent** (멤버 목록 로드용)
4. 변경 사항을 저장(Save Changes)하세요.

## 사용법 (Usage)

1. `bin/` 폴더 내에 있는 운영체제에 맞는 실행 파일을 실행합니다.
   - Windows: `DiscordLinkOpener-Windows.exe`
   - Mac: `DiscordLinkOpener-Mac-x64` 또는 `DiscordLinkOpener-Mac-Arm64`
2. 웹 브라우저가 자동으로 열리면 안내에 따라 설정을 완료하세요.
3. 설정 완료 후 봇이 즉시 가동됩니다.

---

## English Guide

Discord Link Opener detects links in specific Discord channels and opens them instantly in your local browser (Windows/Mac).

### Key Features
- **Standalone Binary**: Run without Node.js installation.
- **Web-based Setup**: Easy configuration via local web UI.
- **Auto Invite Link**: Automatically generates bot invitation URL.
- **Update Notification**: Alerts via Web UI and Discord channel.
- **Multi-language**: Supports Korean and English.
- **Secure**: TDD-verified XSS and malicious scheme filtering.

### Bot Setup (Crucial!)
Enable **Message Content Intent** and **Server Members Intent** in the Discord Developer Portal under the **Bot** tab to allow the bot to function correctly.
