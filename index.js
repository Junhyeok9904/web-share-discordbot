const path = require('path');
const isPkg = typeof process.pkg !== 'undefined';
const envPath = isPkg ? path.join(path.dirname(process.execPath), '.env') : path.join(process.cwd(), '.env');
require('dotenv').config({ path: envPath });

const { Client, GatewayIntentBits, Events } = require('discord.js');
const open = require('open');
const { extractValidUrl } = require('./src/utils');

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
    console.log(`✅ 디스코드 봇 로그인 완료: ${c.user.tag}`);
    console.log(`📡 수신 대기 중인 채널 ID: ${TARGET_CHANNEL_ID || '모든 채널'}`);
    if (ALLOWED_USER_ID) {
        console.log(`🔒 특정 사용자(${ALLOWED_USER_ID})의 메시지만 허용됩니다.`);
    }
});

client.on(Events.MessageCreate, async message => {
    // 봇 자신이 보낸 메시지는 무시
    if (message.author.bot) return;

    // 타겟 채널이 설정되어 있고, 현재 채널이 타겟 채널이 아니면 무시
    if (TARGET_CHANNEL_ID && message.channelId !== TARGET_CHANNEL_ID) return;

    // 허용된 사용자가 설정되어 있고, 보낸 사람이 허용된 사용자가 아니면 무시 (보안 권장)
    if (ALLOWED_USER_ID && message.author.id !== ALLOWED_USER_ID) {
        return;
    }

    // HTTP/HTTPS URL 추출 (TDD 방식으로 검증된 로직 사용)
    const targetUrl = extractValidUrl(message.content);

    if (targetUrl) {
        console.log(`\n🔗 링크 수신됨! 브라우저 실행 시도: ${targetUrl}`);
        
        try {
            await open(targetUrl);
            
            console.log(`✅ 브라우저 실행 성공`);
            await message.react('✅'); // 처리 성공 시 채널에 체크 이모지 반응
        } catch (error) {
            console.error('❌ 브라우저 실행 실패:', error);
            await message.react('❌');
        }
    }
});

const readline = require('readline');

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

// 환경변수에 토큰이 없으면 에러 출력 후 대기
if (!process.env.DISCORD_TOKEN) {
    console.error("\n❌ 오류: 봇 토큰(DISCORD_TOKEN)을 찾을 수 없습니다.");
    console.error("이 실행 파일(.exe)과 동일한 폴더에 '.env' 파일이 있는지 확인해주세요.");
    console.error(".env 파일 안에 DISCORD_TOKEN=여러분의_토큰 값이 입력되어 있어야 합니다.");
    pauseAndExit(1);
} else {
    // 토큰이 있을 때만 로그인 시도
    client.login(process.env.DISCORD_TOKEN).catch(err => {
        console.error("\n❌ 로그인 실패: 토큰이 잘못되었거나 디스코드 서버에 연결할 수 없습니다.");
        console.error(err.message);
        pauseAndExit(1);
    });
}