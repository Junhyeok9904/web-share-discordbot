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

// OS별 브라우저 앱 이름 매핑
const BROWSER_APPS = {
    'default': null,
    'chrome': process.platform === 'darwin' ? 'google chrome' : 'chrome',
    'firefox': 'firefox',
    'edge': process.platform === 'darwin' ? 'microsoft edge' : 'msedge',
    'brave': process.platform === 'darwin' ? 'brave browser' : 'brave',
    'safari': 'safari' // macOS 전용
};

function startBot() {
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent,
            GatewayIntentBits.GuildMembers
        ]
    });

    const allowedUsers = (process.env.ALLOWED_USER_IDS || '').split(',').filter(id => id.trim() !== '');
    const selectedBrowserKey = process.env.SELECTED_BROWSER || 'default';

    client.once(Events.ClientReady, c => {
        console.log(`\n✅ 디스코드 봇 로그인 완료: ${c.user.tag}`);
        console.log(`📡 감시 채널: ${process.env.TARGET_CHANNEL_ID || '모든 채널'}`);
        console.log(`🌐 실행 브라우저: ${selectedBrowserKey}`);
        if (allowedUsers.length > 0) {
            console.log(`🔒 허용 사용자: ${allowedUsers.length}명`);
        }
        console.log(`---------------------------------------------------`);
        console.log(`가동 중...`);
    });

    client.on(Events.MessageCreate, async message => {
        if (message.author.bot) return;
        if (process.env.TARGET_CHANNEL_ID && message.channelId !== process.env.TARGET_CHANNEL_ID) return;
        if (allowedUsers.length > 0 && !allowedUsers.includes(message.author.id)) return;

        const targetUrl = extractValidUrl(message.content);
        if (targetUrl) {
            console.log(`\n🔗 링크 감지 (${message.author.tag}): ${targetUrl}`);
            try {
                const browserApp = BROWSER_APPS[selectedBrowserKey];
                if (browserApp) {
                    await open(targetUrl, { app: { name: browserApp } });
                } else {
                    await open(targetUrl);
                }
                console.log(`✅ ${selectedBrowserKey} 브라우저 실행 성공`);
                await message.react('✅');
            } catch (error) {
                console.error(`❌ ${selectedBrowserKey} 브라우저 실행 실패:`, error.message);
                console.log('기본 브라우저로 재시도합니다...');
                try {
                    await open(targetUrl);
                    await message.react('✅');
                } catch (e) {
                    await message.react('❌');
                }
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
                <h1 class="text-2xl font-extrabold text-indigo-600 italic uppercase tracking-tighter">Web-Share Setup</h1>
                <p class="text-gray-500 text-sm mt-1">1단계: 디스코드 봇 연결</p>
            </div>
            <form action="/step2" method="POST" class="space-y-5">
                <div class="space-y-1">
                    <label class="block text-sm font-bold text-gray-700 ml-1">봇 토큰 (Bot Token)</label>
                    <input type="password" name="token" required placeholder="MTE..." class="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 outline-none transition-all">
                </div>
                <button type="submit" class="w-full py-4 px-4 rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 font-bold shadow-xl shadow-indigo-100 transition-all active:scale-95">
                    연결 및 서버 정보 불러오기
                </button>
            </form>
        `));
    });

    app.post('/step2', async (req, res) => {
        const token = req.body.token.trim();
        const tempClient = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

        try {
            await tempClient.login(token);
            const guilds = await tempClient.guilds.fetch();
            
            let channelOptions = '<option value="">모든 채널 (전체 허용)</option>';
            let memberMap = new Map();

            for (const [id, guild] of guilds) {
                const fullGuild = await guild.fetch();
                const channels = await fullGuild.channels.fetch();
                const textChannels = channels.filter(c => c.type === ChannelType.GuildText);
                channelOptions += `<optgroup label="${fullGuild.name}">`;
                textChannels.forEach(ch => {
                    channelOptions += `<option value="${ch.id}">${fullGuild.name} > #${ch.name}</option>`;
                });
                channelOptions += `</optgroup>`;

                try {
                    const members = await fullGuild.members.fetch({ limit: 100 });
                    members.forEach(m => {
                        if (!m.user.bot) {
                            memberMap.set(m.id, {
                                name: m.user.globalName || m.user.username,
                                tag: m.user.tag,
                                avatar: m.user.displayAvatarURL({ size: 32 })
                            });
                        }
                    });
                } catch (e) {}
            }

            const sortedMembers = Array.from(memberMap.entries()).sort((a, b) => a[1].name.localeCompare(b[1].name));
            let memberCheckboxes = '';
            sortedMembers.forEach(([id, info]) => {
                memberCheckboxes += `
                    <label class="flex items-center p-3 border border-gray-50 rounded-xl hover:bg-indigo-50 cursor-pointer transition-all group">
                        <input type="checkbox" name="userIds" value="${id}" class="w-5 h-5 text-indigo-600 border-gray-200 rounded-lg">
                        <img src="${info.avatar}" class="w-8 h-8 rounded-full ml-3 ring-2 ring-white">
                        <div class="ml-3">
                            <div class="text-sm font-bold text-gray-800">${info.name}</div>
                            <div class="text-[10px] text-gray-400 font-mono">${info.tag}</div>
                        </div>
                    </label>
                `;
            });

            tempClient.destroy();

            res.send(renderLayout(`
                <div class="text-center mb-8">
                    <h1 class="text-2xl font-extrabold text-indigo-600 italic uppercase tracking-tighter text-shadow">Final Step</h1>
                    <p class="text-gray-500 text-sm mt-1 font-medium">상세 설정을 완료해 주세요.</p>
                </div>
                <form action="/finish" method="POST" class="space-y-6">
                    <input type="hidden" name="token" value="${token}">
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <label class="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">타겟 채널</label>
                            <select name="channelId" class="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all text-sm font-bold">
                                ${channelOptions}
                            </select>
                        </div>
                        <div class="space-y-2">
                            <label class="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">브라우저 선택</label>
                            <select name="browser" class="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all text-sm font-bold">
                                <option value="default">시스템 기본</option>
                                <option value="chrome">Google Chrome</option>
                                <option value="firefox">Firefox</option>
                                <option value="edge">MS Edge</option>
                                <option value="brave">Brave</option>
                                ${process.platform === 'darwin' ? '<option value="safari">Safari</option>' : ''}
                            </select>
                        </div>
                    </div>

                    <div class="space-y-3">
                        <label class="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1 text-indigo-500">허용된 사용자 (나를 포함해 체크)</label>
                        <div class="grid grid-cols-1 gap-2 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
                            ${memberCheckboxes || '<p class="text-gray-400 text-sm italic p-4 text-center">멤버 정보 없음</p>'}
                        </div>
                    </div>

                    <button type="submit" class="w-full py-4 px-4 rounded-2xl text-white bg-green-600 hover:bg-green-700 font-black shadow-xl shadow-green-100 transition-all active:scale-95">
                        모든 설정 저장 및 가동 시작
                    </button>
                </form>
            `, 'max-w-xl'));
        } catch (err) {
            if (tempClient) tempClient.destroy();
            res.send(renderLayout(`
                <div class="text-center py-8">
                    <div class="text-red-500 text-7xl mb-4 font-black">ERROR</div>
                    <h2 class="text-xl font-bold text-gray-800 mb-2">로그인 실패</h2>
                    <p class="text-gray-500 text-sm mb-8 px-4">${err.message}</p>
                    <a href="/" class="px-10 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all shadow-lg">다시 토큰 입력하기</a>
                </div>
            `));
        }
    });

    app.post('/finish', (req, res) => {
        let { token, userIds, channelId, browser } = req.body;
        if (typeof userIds === 'string') userIds = [userIds];
        const allowedIdsStr = (userIds || []).join(',');

        const envContent = `DISCORD_TOKEN=${token}\nTARGET_CHANNEL_ID=${channelId}\nALLOWED_USER_IDS=${allowedIdsStr}\nSELECTED_BROWSER=${browser}\n`;
        fs.writeFileSync(envPath, envContent, 'utf8');
        
        process.env.DISCORD_TOKEN = token;
        process.env.TARGET_CHANNEL_ID = channelId;
        process.env.ALLOWED_USER_IDS = allowedIdsStr;
        process.env.SELECTED_BROWSER = browser;

        res.send(renderLayout(`
            <div class="text-center py-12">
                <div class="w-24 h-24 bg-green-50 text-green-500 rounded-full flex items-center justify-center text-5xl mx-auto mb-6 animate-pulse">✓</div>
                <h1 class="text-4xl font-black text-gray-800 mb-3 tracking-tighter">MISSION COMPLETE</h1>
                <p class="text-gray-400 font-medium mb-10">봇이 성공적으로 세팅되었습니다.<br>지금부터 링크가 감지되면 자동으로 브라우저가 열립니다.</p>
                <div class="text-[10px] text-gray-300 font-mono tracking-widest animate-bounce uppercase">Closing in 3 seconds...</div>
                <script>setTimeout(() => { window.close(); }, 3000);</script>
            </div>
        `));

        server.close(() => {
            console.log('\n✨ [CONFIG SUCCESS] 설정 저장 완료.');
            console.log('🚀 시스템 가동을 시작합니다!');
            startBot();
        });
    });

    function renderLayout(content, maxWidth = 'max-w-md') {
        return `<!DOCTYPE html>
        <html lang="ko">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>WEB-SHARE SETUP</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;500;700&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Space Grotesk', 'Pretendard', sans-serif; letter-spacing: -0.02em; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
                .text-shadow { text-shadow: 0 10px 20px rgba(79, 70, 229, 0.2); }
            </style>
        </head>
        <body class="bg-[#F1F5F9] flex items-center justify-center min-h-screen p-4 leading-tight">
            <div class="bg-white p-10 rounded-[40px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] border border-white/50 w-full ${maxWidth} transition-all">
                ${content}
            </div>
        </body>
        </html>`;
    }

    const server = app.listen(port, async () => {
        console.log(`\n🚀 웹 설정 화면 준비 완료: http://localhost:${port}`);
        await open(`http://localhost:${port}`);
    });
}

if (!process.env.DISCORD_TOKEN) {
    startSetupUI();
} else {
    startBot();
}