const path = require('path');
const fs = require('fs');
const isPkg = typeof process.pkg !== 'undefined';
const envPath = isPkg ? path.join(path.dirname(process.execPath), '.env') : path.join(process.cwd(), '.env');

if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
}

const { Client, GatewayIntentBits, Events, ChannelType } = require('discord.js');
const open = require('open');
const express = require('express');
const readline = require('readline');
const { extractValidUrl } = require('./src/utils');

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

process.on('uncaughtException', (err) => {
    console.error('\n❌ 예기치 않은 시스템 오류가 발생했습니다:');
    console.error(err);
    pauseAndExit(1);
});

function startBot() {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMembers // 멤버 목록 확인을 위해 필요
        ]
    });

    const allowedUsers = (process.env.ALLOWED_USER_IDS || '').split(',').filter(id => id.trim() !== '');

    client.once(Events.ClientReady, c => {
        console.log(`\n✅ 디스코드 봇 로그인 완료: ${c.user.tag}`);
        console.log(`📡 감시 중인 채널 ID: ${process.env.TARGET_CHANNEL_ID || '모든 채널'}`);
        if (allowedUsers.length > 0) {
            console.log(`🔒 허용된 사용자 수: ${allowedUsers.length}명`);
        } else {
            console.log(`⚠️ 보안 알림: 허용된 사용자가 설정되지 않았습니다. 누구나 링크를 열 수 있습니다.`);
        }
        console.log(`---------------------------------------------------`);
        console.log(`링크 감지 가동 중...`);
    });

    client.on(Events.MessageCreate, async message => {
        if (message.author.bot) return;
        if (process.env.TARGET_CHANNEL_ID && message.channelId !== process.env.TARGET_CHANNEL_ID) return;
        
        // 복수 유저 아이디 체크
        if (allowedUsers.length > 0 && !allowedUsers.includes(message.author.id)) {
            return;
        }

        const targetUrl = extractValidUrl(message.content);
        if (targetUrl) {
            console.log(`\n🔗 링크 감지 (${message.author.tag}): ${targetUrl}`);
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

    client.login(process.env.DISCORD_TOKEN).catch(err => {
        console.error("\n❌ 로그인 실패:", err.message);
        pauseAndExit(1);
    });
}

function startSetupUI() {
    const app = express();
    const port = 8999;
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use(express.json());

    app.get('/', (req, res) => {
        res.send(renderLayout(`
            <div class="text-center mb-6">
                <h1 class="text-2xl font-extrabold text-indigo-600 italic">WEB-SHARE SETUP</h1>
                <p class="text-gray-500 text-sm mt-2">1단계: 봇 토큰 입력</p>
            </div>
            <form action="/step2" method="POST" class="space-y-5">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">디스코드 봇 토큰</label>
                    <input type="password" name="token" required placeholder="MTE..." class="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all">
                    <p class="text-[11px] text-gray-400 mt-2 italic">※ 권한 설정에서 'Message Content'와 'Server Members' 인텐트가 켜져 있어야 합니다.</p>
                </div>
                <button type="submit" class="w-full py-3 px-4 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-200 transition-all active:scale-[0.98]">
                    서버 및 멤버 목록 불러오기
                </button>
            </form>
        `));
    });

    app.post('/step2', async (req, res) => {
        const token = req.body.token.trim();
        const tempClient = new Client({ 
            intents: [
                GatewayIntentBits.Guilds, 
                GatewayIntentBits.GuildMembers
            ] 
        });

        try {
            await tempClient.login(token);
            const guilds = await tempClient.guilds.fetch();
            
            let channelOptions = '<option value="">모든 채널 (전체 허용)</option>';
            let memberMap = new Map(); // 중복 제거를 위한 Map

            for (const [id, guild] of guilds) {
                const fullGuild = await guild.fetch();
                
                // 채널 정보 수집
                const channels = await fullGuild.channels.fetch();
                const textChannels = channels.filter(c => c.type === ChannelType.GuildText);
                channelOptions += `<optgroup label="${fullGuild.name}">`;
                textChannels.forEach(ch => {
                    channelOptions += `<option value="${ch.id}">${fullGuild.name} > #${ch.name}</option>`;
                });
                channelOptions += `</optgroup>`;

                // 멤버 정보 수집 (최대 1000명까지만 안전하게 로드)
                try {
                    const members = await fullGuild.members.fetch({ limit: 1000 });
                    members.forEach(m => {
                        if (!m.user.bot) {
                            memberMap.set(m.id, {
                                name: m.user.globalName || m.user.username,
                                tag: m.user.tag,
                                avatar: m.user.displayAvatarURL({ size: 32 })
                            });
                        }
                    });
                } catch (e) {
                    console.error(`${fullGuild.name} 멤버 로드 실패:`, e.message);
                }
            }

            // 멤버 목록을 이름순으로 정렬
            const sortedMembers = Array.from(memberMap.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name));

            let memberCheckboxes = '';
            sortedMembers.forEach(([id, info]) => {
                memberCheckboxes += `
                    <label class="flex items-center p-3 border border-gray-100 rounded-xl hover:bg-indigo-50 cursor-pointer transition-colors group">
                        <input type="checkbox" name="userIds" value="${id}" class="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500">
                        <img src="${info.avatar}" class="w-7 h-7 rounded-full ml-3 border border-gray-200">
                        <div class="ml-3">
                            <div class="text-sm font-bold text-gray-800 group-hover:text-indigo-700">${info.name}</div>
                            <div class="text-[10px] text-gray-400 font-mono">${info.tag}</div>
                        </div>
                    </label>
                `;
            });

            tempClient.destroy();

            res.send(renderLayout(`
                <div class="text-center mb-6">
                    <h1 class="text-2xl font-extrabold text-indigo-600 italic">STEP 2: 상세 설정</h1>
                    <p class="text-gray-500 text-sm mt-1 font-medium">감시할 채널과 이용 가능한 사용자를 선택하세요.</p>
                </div>
                <form action="/finish" method="POST" class="space-y-6">
                    <input type="hidden" name="token" value="${token}">
                    
                    <div class="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                        <label class="block text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2 ml-1">감시할 타겟 채널</label>
                        <select name="channelId" class="w-full px-4 py-3 border border-indigo-200 rounded-xl shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                            ${channelOptions}
                        </select>
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">링크 실행을 허용할 사용자 (복수 선택)</label>
                        <div class="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                            ${memberCheckboxes || '<p class="text-gray-400 text-sm italic p-4 text-center">불러온 멤버가 없습니다.</p>'}
                        </div>
                    </div>

                    <button type="submit" class="w-full py-4 px-4 rounded-xl text-white bg-green-600 hover:bg-green-700 font-bold shadow-lg shadow-green-200 transition-all active:scale-[0.98]">
                        설정 저장 및 서비스 시작
                    </button>
                </form>
                <style>
                    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: #ddd; border-radius: 10px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #ccc; }
                </style>
            `, 'max-w-lg'));
        } catch (err) {
            if (tempClient) tempClient.destroy();
            res.send(renderLayout(`
                <div class="text-center py-4">
                    <div class="text-red-500 text-6xl mb-6 font-bold">!</div>
                    <h2 class="text-xl font-bold text-gray-800 mb-2">로그인에 실패했습니다</h2>
                    <p class="text-gray-500 text-sm mb-8 leading-relaxed">${err.message}<br><span class="text-xs text-red-400 font-bold italic">※ Server Members Intent가 켜져 있는지 확인하세요.</span></p>
                    <a href="/" class="px-8 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all">돌아가기</a>
                </div>
            `));
        }
    });

    app.post('/finish', (req, res) => {
        let { token, userIds, channelId } = req.body;
        
        // userIds가 단일 선택일 경우 문자열, 복수일 경우 배열로 옵니다.
        if (typeof userIds === 'string') userIds = [userIds];
        const allowedIdsStr = (userIds || []).join(',');

        const envContent = `DISCORD_TOKEN=${token}\nTARGET_CHANNEL_ID=${channelId}\nALLOWED_USER_IDS=${allowedIdsStr}\n`;
        fs.writeFileSync(envPath, envContent, 'utf8');
        
        process.env.DISCORD_TOKEN = token;
        process.env.TARGET_CHANNEL_ID = channelId;
        process.env.ALLOWED_USER_IDS = allowedIdsStr;

        res.send(renderLayout(`
            <div class="text-center py-10">
                <div class="inline-flex items-center justify-center w-20 h-20 bg-green-100 text-green-600 rounded-full text-4xl mb-6 animate-bounce">✓</div>
                <h1 class="text-3xl font-black text-gray-800 mb-3 tracking-tighter">ALL READY!</h1>
                <p class="text-gray-500 font-medium mb-8">성공적으로 설정되었습니다.<br>이제 브라우저를 닫고 봇을 사용하세요.</p>
                <div class="text-xs text-gray-300 font-mono italic">3초 후 창이 자동으로 닫힙니다...</div>
                <script>setTimeout(() => { window.close(); }, 3000);</script>
            </div>
        `));

        server.close(() => {
            console.log('\n✨ [CONFIG SUCCESS] 모든 설정이 완료되었습니다.');
            console.log('🚀 봇 가동을 시작합니다...');
            startBot();
        });
    });

    function renderLayout(content, maxWidth = 'max-w-md') {
        return `<!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Discord Link Opener Setup</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Pretendard:wght@400;600;800&display=swap" rel="stylesheet">
            <style>body { font-family: 'Pretendard', sans-serif; }</style>
        </head>
        <body class="bg-[#F8FAFC] flex items-center justify-center min-h-screen p-4">
            <div class="bg-white p-8 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 w-full ${maxWidth}">
                ${content}
            </div>
        </body>
        </html>`;
    }

    const server = app.listen(port, async () => {
        console.log(`\n🚀 웹 설정 화면이 준비되었습니다: http://localhost:${port}`);
        await open(`http://localhost:${port}`);
    });
}

if (!process.env.DISCORD_TOKEN) {
    startSetupUI();
} else {
    startBot();
}