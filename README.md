# Web Discord Copy (Discord Link Opener)

디스코드 특정 채널에 올라온 링크를 감지하여 봇을 통해 로컬 머신(Windows, Mac)의 기본 브라우저에서 즉시 열어주는 솔루션입니다.

## 주요 기능 (Key Features)

- **Node.js 기반**: 가볍고 빠르게 동작하는 Node.js 애플리케이션
- **단일 실행 파일 빌드 제공**: Node.js 환경이 없어도 실행할 수 있도록 Windows용(`.exe`) 및 Mac용 바이너리 빌드 제공
- **원클릭 실행**: `start.bat` (Windows) 및 `start.command` (Mac) 스크립트를 통한 간편한 실행 지원
- **환경 변수 설정**: `.env` 파일을 통한 디스코드 봇 토큰 및 보안 대상 유저 설정
- **강력한 보안 로직**: TDD 기반으로 검증된 XSS 및 악성 스킴(`javascript:`, `vbscript:` 등) 필터링 및 방어 기능

## 사전 요구 사항 (Prerequisites)

- [Node.js](https://nodejs.org/) (소스 코드로 실행 시 필요)
- 디스코드 봇 토큰 (Discord Developer Portal에서 봇 생성 및 토큰 발급 필요)

## 설치 방법 (Installation)

1. 저장소를 클론하거나 다운로드합니다.
   ```bash
   git clone <repository-url>
   cd web-discord-copy
   ```

2. 의존성 패키지를 설치합니다. (소스 코드로 실행 시)
   ```bash
   npm install
   ```

3. 프로젝트 루트에 `.env` 파일을 생성하고 아래와 같이 설정합니다.
   ```env
   DISCORD_BOT_TOKEN=your_bot_token_here
   TARGET_USER_ID=your_discord_user_id_here
   TARGET_CHANNEL_ID=your_discord_channel_id_here
   ```

## 사용법 (Usage)

### 방법 1: 스크립트를 통한 원클릭 실행 (권장)

- **Windows**: `start.bat` 파일을 더블 클릭하여 실행합니다.
- **Mac**: 터미널에서 `./start.command`를 실행하거나 더블 클릭하여 실행합니다. (실행 권한이 필요한 경우 `chmod +x start.command`를 먼저 실행하세요)

### 방법 2: 바이너리(실행 파일) 직접 실행

`bin/` 폴더 내에 있는 운영체제에 맞는 실행 파일을 직접 실행합니다.
- Windows: `bin/DiscordLinkOpener-Windows.exe`
- Mac (Intel/x64): `bin/DiscordLinkOpener-Mac-x64`
- Mac (Apple Silicon/Arm64): `bin/DiscordLinkOpener-Mac-Arm64`

### 방법 3: 소스 코드로 실행

```bash
npm start
```

## 개발 및 빌드 (Development & Build)

테스트 실행 (TDD 검증 보안 로직):
```bash
npm test
```

## 보안 (Security)

이 애플리케이션은 사용자의 브라우저를 직접 제어하므로 악의적인 링크 실행을 방지하기 위해 엄격한 URL 필터링을 거칩니다. `javascript:`, `vbscript:`, `data:` 등의 스킴은 차단되며, 오직 `http:` 및 `https:` 스킴만 허용됩니다. 이러한 보안 로직은 `tests/utils.test.js`에 작성된 테스트 코드를 통해 철저하게 검증되었습니다.
