# Web Discord Copy (Discord Link Opener)

디스코드 특정 채널에 올라온 링크를 감지하여 봇을 통해 로컬 머신(Windows, Mac)의 기본 브라우저에서 즉시 열어주는 솔루션입니다.

## 주요 기능 (Key Features)

- **Node.js 기반**: 가볍고 빠르게 동작하는 Node.js 애플리케이션
- **단일 실행 파일 빌드 제공**: Node.js 환경이 없어도 실행할 수 있도록 Windows용(`.exe`) 및 Mac용 바이너리 빌드 제공
- **원클릭 실행**: `start.bat` (Windows) 및 `start.command` (Mac) 스크립트를 통한 간편한 실행 지원
- **웹 기반 초기 설정 UI**: 처음 실행 시 자동으로 웹 브라우저가 열려 디스코드 토큰 및 설정을 간편하게 완료 가능
- **실행 브라우저 선택**: Chrome, Firefox, Edge, Brave 등 원하는 브라우저를 선택하여 링크를 열 수 있는 기능 추가
- **복수 유저 자동 선택**: 유저 ID를 직접 입력할 필요 없이, 서버 멤버 목록에서 본인이나 친구를 체크박스로 선택하여 멀티 유저 모드 지원
- **강력한 보안 로직**: TDD 기반으로 검증된 XSS 및 악성 스킴(`javascript:`, `vbscript:` 등) 필터링 및 방어 기능

## 사전 요구 사항 (Prerequisites)

- [Node.js](https://nodejs.org/) (소스 코드로 실행 시 필요)
- 디스코드 봇 토큰 (Discord Developer Portal에서 봇 생성 및 토큰 발급 필요)

## 🤖 디스코드 봇 설정 가이드 (중요!)

봇이 정상적으로 메시지를 읽고 링크를 열기 위해서는 디스코드 개발자 포털에서 아래 설정이 **반드시** 필요합니다.

1. **[Discord Developer Portal](https://discord.com/developers/applications)** 접속 및 로그인
2. 생성한 봇 애플리케이션 클릭 -> 왼쪽 메뉴의 **Bot** 클릭
3. **Privileged Gateway Intents** 섹션에서 **Message Content Intent** 및 **Server Members Intent** 스위치를 모두 **ON(활성화)** 하세요. (이게 꺼져 있으면 봇이 메시지를 읽거나 멤버 목록을 가져오지 못합니다!)
4. 왼쪽 메뉴의 **OAuth2 -> URL Generator** 클릭
   - **Scopes**: `bot` 체크
   - **Bot Permissions**: `View Channels`, `Send Messages`, `Add Reactions`, `Read Message History` 체크
5. 하단에 생성된 URL을 브라우저에 복사하여 본인의 서버에 봇을 초대하세요.

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

3. **자동 초기 설정**: 별도의 `.env` 파일을 만들 필요 없이 바로 실행합니다. 처음 실행 시 브라우저가 자동으로 열리며, 안내에 따라 설정을 완료하면 됩니다.

## 사용법 (Usage)

### 방법 1: 스크립트를 통한 원클릭 실행 (권장)

- **Windows**: `start.bat` 파일을 더블 클릭하여 실행합니다.
- **Mac**: 터미널에서 `./start.command`를 실행하거나 더블 클릭하여 실행합니다. (실행 권한이 필요한 경우 `chmod +x start.command`를 먼저 실행하세요)

**참고**: 최초 실행 시 웹 브라우저가 열리며 초기 설정 화면이 나타납니다. 토큰 입력 후 서버와 채널을 선택하면 멤버 목록이 자동으로 로드됩니다. 이제 유저 ID를 직접 입력할 필요 없이, **목록에서 본인이나 친구를 체크박스로 선택**하고 **링크를 열 브라우저(Chrome, Firefox 등)를 선택**하기만 하면 설정을 완료할 수 있습니다. 저장이 완료되면 자동으로 봇이 실행됩니다.

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
��되었습니다.
