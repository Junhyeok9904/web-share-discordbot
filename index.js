const path = require('path');
const fs = require('fs');
const isPkg = typeof process.pkg !== 'undefined';
const envPath = isPkg ? path.join(path.dirname(process.execPath), '.env') : path.join(process.cwd(), '.env');

// .env 파일이 있으면 로드합니다.
if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
}

const { Client, GatewayIntentBits, Events } = require('discord.js');
const open = require('open');
const express = require('express');
const readline = require('readline');
const { extractValidUrl } = require('./src/utils');

// 에러 발생 시 창이 바로 닫히는 것을 방지하기 위한 대기 함수
function pauseAndExit(code = 1) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('\n종료하려면 아무 키나 누르세요 (Enter)...', () => {
        rl.close();
        process.exit(code);
    });
}

// 예기치 않은 에러 발생 시 처리
process.on('uncaughtException', (err) => {
    console.error('\n❌ 예기치 않은 시스템 오류가 발생했습니다:');
    console.error(err);
    pauseAndExit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('\n❌ 처리되지 않은 비동기 오류가 발생했습니다:');
    console.error(reason);
    pauseAndExit(1);
});

function startBot() {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent
        ]
    });

    const TARGET_CHANNEL_ID = process.env.TARGET_CHANNEL_ID;
    const ALLOWED_USER_ID = process.env.ALLOWED_USER_ID;

    client.once(Events.ClientReady, c => {
        console.log(`\n✅ 디스코드 봇 로그인 완료: ${c.user.tag}`);
        console.log(`📡 수신 대기 중인 채널 ID: ${TARGET_CHANNEL_ID || '모든 채널'}`);
        if (ALLOWED_USER_ID) {
            console.log(`🔒 특정 사용자(${ALLOWED_USER_ID})의 메시지만 허용됩니다.`);
        }
        console.log(`---------------------------------------------------`);
        console.log(`지금부터 디스코드에 올라오는 링크를 감지하여 자동으로 엽니다.`);
    });

    client.on(Events.MessageCreate, async message => {
        if (message.author.bot) return;
        if (TARGET_CHANNEL_ID && message.channelId !== TARGET_CHANNEL_ID) return;
        if (ALLOWED_USER_ID && message.author.id !== ALLOWED_USER_ID) return;

        const targetUrl = extractValidUrl(message.content);

        if (targetUrl) {
            console.log(`\n🔗 링크 수신됨! 브라우저 실행 시도: ${targetUrl}`);
            try {
                await open(targetUrl);
                console.log(`✅ 브라우저 실행 성공`);
                await message.react('✅');
            } catch (error) {
                console.error('❌ 브라우저 실행 실패:', error);
                await message.react('❌');
            }
        }
    });

    // 봇 로그인
    client.login(process.env.DISCORD_TOKEN).catch(err => {
        console.error("\n❌ 로그인 실패: 토큰이 잘못되었거나 디스코드 서버에 연결할 수 없습니다.");
        console.error("👉 의심되는 원인: 디스코드 개발자 포털에서 'Message Content Intent'가 꺼져있을 수 있습니다.");
        console.error(err.message);
        pauseAndExit(1);
    });
}

function startSetupUI() {
    const app = express();
    const port = 8999;

    app.use(express.urlencoded({ extended: true }));

    app.get('/', (req, res) => {
        res.send(`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>디스코드 링크 오프너 - 초기 설정</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen">
    <div class="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <div class="text-center mb-6">
            <h1 class="text-2xl font-extrabold text-indigo-600">봇 초기 설정</h1>
            <p class="text-gray-500 text-sm mt-2">환경 설정(.env) 파일이 없어 설정 화면을 띄웠습니다.</p>
        </div>
        <form action="/setup" method="POST" class="space-y-5">
            <div>
                <label class="block text-sm font-semibold text-gray-700">디스코드 봇 토큰 <span class="text-red-500">*</span></label>
                <input type="password" name="token" required placeholder="MTE..." class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                <p class="text-xs text-gray-500 mt-1">Discord Developer Portal에서 발급받은 봇 토큰을 입력하세요.</p>
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700">허용할 사용자 ID <span class="text-indigo-500 text-xs">(보안 권장)</span></label>
                <input type="text" name="userId" placeholder="예: 123456789012345678" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                <p class="text-xs text-gray-500 mt-1">본인의 디스코드 ID. 아무나 링크를 여는 것을 방지합니다.</p>
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700">타겟 채널 ID <span class="text-gray-400 text-xs">(선택)</span></label>
                <input type="text" name="channelId" placeholder="예: 109876543210987654" class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                <p class="text-xs text-gray-500 mt-1">특정 채널의 링크만 엽니다. 비워두면 봇이 있는 모든 채널에 반응합니다.</p>
            </div>
            <div class="pt-2">
                <button type="submit" class="w-full py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">
                    설정 저장 및 봇 가동
                </button>
            </div>
        </form>
    </div>
</body>
</html>`);
    });

    app.post('/setup', (req, res) => {
        const { token, userId, channelId } = req.body;
        
        // .env 파일 내용 생성
        const envContent = `DISCORD_TOKEN=${token.trim()}
TARGET_CHANNEL_ID=${channelId.trim()}
ALLOWED_USER_ID=${userId.trim()}
`;
        // 로컬에 .env 저장
        fs.writeFileSync(envPath, envContent, 'utf8');
        
        // 현재 프로세스 환경변수 업데이트
        process.env.DISCORD_TOKEN = token.trim();
        process.env.TARGET_CHANNEL_ID = channelId.trim();
        process.env.ALLOWED_USER_ID = userId.trim();

        // 성공 화면 응답
        res.send(`<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>설정 완료</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100 flex items-center justify-center min-h-screen text-center">
    <div class="bg-white p-8 rounded-lg shadow-xl max-w-sm">
        <div class="text-green-500 text-6xl mb-4">✅</div>
        <h1 class="text-2xl font-bold mb-2 text-gray-800">설정이 저장되었습니다!</h1>
        <p class="text-gray-600 mb-6 text-sm">이제 이 창을 닫으셔도 됩니다.<br>콘솔 창에서 봇이 정상적으로 가동됩니다.</p>
        <button onclick="window.close()" class="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">창 닫기</button>
        <script>setTimeout(() => { window.close(); }, 5000);</script>
    </div>
</body>
</html>`);

        // 웹 서버 종료 및 봇 가동
        server.close(() => {
            console.log('\n✅ 웹을 통한 설정 저장이 완료되었습니다. 서버를 닫고 봇 가동을 시작합니다...');
            startBot();
        });
    });

    const server = app.listen(port, async () => {
        console.log(`\n===================================================`);
        console.log(`🚀 초기 설정(토큰 입력)이 필요합니다.`);
        console.log(`브라우저가 자동으로 열립니다. 만약 열리지 않는다면`);
        console.log(`아래 주소를 인터넷 브라우저 주소창에 복사해 넣어주세요.`);
        console.log(`👉 http://localhost:${port}`);
        console.log(`===================================================\n`);
        
        try {
            await open(`http://localhost:${port}`);
        } catch (e) {
            console.log('브라우저 자동 실행에 실패했습니다. 위 주소를 직접 클릭해주세요.');
        }
    });
}

// 토큰 존재 여부에 따라 실행 분기
if (!process.env.DISCORD_TOKEN) {
    startSetupUI();
} else {
    startBot();
}