const path = require('path');
const fs = require('fs');
const isPkg = typeof process.pkg !== 'undefined';
const envPath = isPkg ? path.join(path.dirname(process.execPath), '.env') : path.join(process.cwd(), '.env');

if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
}

const { Client, GatewayIntentBits, Events, ChannelType, EmbedBuilder } = require('discord.js');
const open = require('open');
const express = require('express');
const readline = require('readline');
const { extractValidUrl } = require('./src/utils');
const { checkForUpdates } = require('./src/updater');
const { version } = require('./package.json');

// --- I18N ---
const LANGUAGES = ['ko', 'en'];
const currentLang = process.env.LANG || 'ko';
const I18N = {
    ko: {
        setupTitle: 'Web-Share 초기 설정',
        step1: '1단계: 봇 연결',
        step2: '2단계: 상세 설정',
        tokenLabel: '디스코드 봇 토큰',
        clientIdLabel: '봇 클라이언트 ID (선택)',
        clientIdHint: 'ID를 입력하면 자동으로 초대 링크를 생성해 드립니다.',
        nextBtn: '연결 및 정보 불러오기',
        channelLabel: '감시할 타겟 채널',
        browserLabel: '브라우저 선택',
        userLabel: '허용된 사용자 (복수 선택)',
        finishBtn: '설정 저장 및 가동 시작',
        successTitle: '설정 완료!',
        successMsg: '봇이 성공적으로 세팅되었습니다.',
        updateFound: '새로운 업데이트가 있습니다!',
        updateBtn: '업데이트 확인하러 가기',
        errorIntent: "디스코드 포털에서 'Message Content Intent'와 'Server Members Intent'를 켜주세요.",
        errorToken: "토큰이 올바르지 않습니다. 다시 확인해주세요."
    },
    en: {
        setupTitle: 'Web-Share Setup',
        step1: 'Step 1: Bot Connection',
        step2: 'Step 2: Detailed Setup',
        tokenLabel: 'Discord Bot Token',
        clientIdLabel: 'Bot Client ID (Optional)',
        clientIdHint: 'Enter ID to auto-generate an invitation link.',
        nextBtn: 'Connect & Fetch Info',
        channelLabel: 'Target Channel',
        browserLabel: 'Select Browser',
        userLabel: 'Allowed Users (Multi-select)',
        finishBtn: 'Save & Start Bot',
        successTitle: 'Setup Complete!',
        successMsg: 'The bot has been successfully configured.',
        updateFound: 'New update available!',
        updateBtn: 'Check Update',
        errorIntent: "Please enable 'Message Content Intent' and 'Server Members Intent' in the Discord Portal.",
        errorToken: "Invalid token. Please check again."
    }
};

function t(key) {
    return I18N[currentLang][key] || I18N['en'][key] || key;
}

function getErrorMessage(err) {
    if (err.message.includes('intents')) return t('errorIntent');
    if (err.message.includes('Token')) return t('errorToken');
    return err.message;
}

function pauseAndExit(code = 1) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('\nPress Enter to exit...', () => {
        rl.close();
        process.exit(code);
    });
}

process.on('uncaughtException', (err) => {
    console.error('\n❌ System Error:', err);
    pauseAndExit(1);
});

const BROWSER_APPS = {
    'default': null,
    'chrome': process.platform === 'darwin' ? 'google chrome' : 'chrome',
    'firefox': 'firefox',
    'edge': process.platform === 'darwin' ? 'microsoft edge' : 'msedge',
    'brave': process.platform === 'darwin' ? 'brave browser' : 'brave',
    'safari': 'safari'
};

async function startBot() {
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

    client.once(Events.ClientReady, async c => {
        console.log(`\n✅ Login Success: ${c.user.tag} (v${version})`);
        console.log(`📡 Watching: ${process.env.TARGET_CHANNEL_ID || 'All Channels'}`);
        
        // --- Update Check ---
        const updateInfo = await checkForUpdates(envPath);
        if (updateInfo && updateInfo.hasUpdate) {
            console.log(`\n📢 [UPDATE] New version v${updateInfo.latestVersion} is available!`);
            console.log(`🔗 ${updateInfo.url}`);
            
            // Discord channel notification
            if (process.env.TARGET_CHANNEL_ID) {
                try {
                    const channel = await client.channels.fetch(process.env.TARGET_CHANNEL_ID);
                    if (channel) {
                        const embed = new EmbedBuilder()
                            .setColor(0x0099FF)
                            .setTitle('🚀 New Update Available!')
                            .setDescription(`A new version **v${updateInfo.latestVersion}** has been released.\n[View on GitHub](${updateInfo.url})`)
                            .setTimestamp();
                        await channel.send({ embeds: [embed] });
                    }
                } catch (e) {}
            }
        }
        console.log(`---------------------------------------------------`);
    });

    client.on(Events.MessageCreate, async message => {
        if (message.author.bot) return;
        if (process.env.TARGET_CHANNEL_ID && message.channelId !== process.env.TARGET_CHANNEL_ID) return;
        if (allowedUsers.length > 0 && !allowedUsers.includes(message.author.id)) return;

        const targetUrl = extractValidUrl(message.content);
        if (targetUrl) {
            console.log(`\n🔗 Link Detected (${message.author.tag}): ${targetUrl}`);
            try {
                const browserApp = BROWSER_APPS[selectedBrowserKey];
                if (browserApp) {
                    await open(targetUrl, { app: { name: browserApp } });
                } else {
                    await open(targetUrl);
                }
                console.log(`✅ Success (${selectedBrowserKey})`);
                await message.react('✅');
            } catch (error) {
                console.error(`❌ Fail:`, error.message);
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
        console.error("\n❌ Login Failed:", getErrorMessage(err));
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
                <h1 class="text-2xl font-extrabold text-indigo-600 italic uppercase">${t('step1')}</h1>
                <div class="flex justify-center space-x-2 mt-2">
                    <span class="px-2 py-0.5 bg-indigo-100 text-indigo-600 text-[10px] font-bold rounded">KOREAN</span>
                    <span class="px-2 py-0.5 bg-gray-100 text-gray-400 text-[10px] font-bold rounded">ENGLISH</span>
                </div>
            </div>
            <form action="/step2" method="POST" class="space-y-5">
                <div class="space-y-1">
                    <label class="block text-sm font-bold text-gray-700 ml-1">${t('tokenLabel')}</label>
                    <input type="password" name="token" required placeholder="MTE..." class="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 outline-none transition-all">
                </div>
                <div class="space-y-1">
                    <label class="block text-sm font-bold text-gray-700 ml-1">${t('clientIdLabel')}</label>
                    <input type="text" name="clientId" placeholder="1510..." class="w-full px-4 py-3 border-2 border-gray-100 rounded-2xl focus:border-indigo-500 outline-none transition-all text-sm">
                    <p class="text-[10px] text-gray-400 mt-1 ml-1">${t('clientIdHint')}</p>
                </div>
                <button type="submit" class="w-full py-4 px-4 rounded-2xl text-white bg-indigo-600 hover:bg-indigo-700 font-bold shadow-xl shadow-indigo-100 transition-all active:scale-95">
                    ${t('nextBtn')}
                </button>
            </form>
        `));
    });

    app.post('/step2', async (req, res) => {
        const token = req.body.token.trim();
        const clientId = req.body.clientId?.trim();
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

            // 초대 링크 생성
            let inviteLink = '';
            if (clientId) {
                inviteLink = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=3072&scope=bot`;
            }

            tempClient.destroy();

            res.send(renderLayout(`
                <div class="text-center mb-6">
                    <h1 class="text-2xl font-extrabold text-indigo-600 italic uppercase">${t('step2')}</h1>
                </div>

                ${inviteLink ? `
                <div class="mb-6 p-4 bg-amber-50 rounded-2xl border-2 border-dashed border-amber-200">
                    <p class="text-xs font-bold text-amber-700 mb-2 underline italic">BOT INVITATION REQUIRED</p>
                    <a href="${inviteLink}" target="_blank" class="text-xs text-indigo-600 font-medium break-all hover:underline">${inviteLink}</a>
                    <p class="text-[10px] text-amber-600 mt-2">※ 먼저 위 링크를 통해 봇을 서버에 초대해야 채널 목록이 정상적으로 작동합니다.</p>
                </div>
                ` : ''}

                <form action="/finish" method="POST" class="space-y-6">
                    <input type="hidden" name="token" value="${token}">
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div class="space-y-2">
                            <label class="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">${t('channelLabel')}</label>
                            <select name="channelId" class="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all text-sm font-bold">
                                ${channelOptions}
                            </select>
                        </div>
                        <div class="space-y-2">
                            <label class="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">${t('browserLabel')}</label>
                            <select name="browser" class="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-500 outline-none transition-all text-sm font-bold">
                                <option value="default">System Default</option>
                                <option value="chrome">Chrome</option>
                                <option value="firefox">Firefox</option>
                                <option value="edge">Edge</option>
                                <option value="brave">Brave</option>
                                ${process.platform === 'darwin' ? '<option value="safari">Safari</option>' : ''}
                            </select>
                        </div>
                    </div>

                    <div class="space-y-3">
                        <label class="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1 text-indigo-500">${t('userLabel')}</label>
                        <div class="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                            ${memberCheckboxes || '<p class="text-gray-400 text-sm italic p-4 text-center">No Members Found</p>'}
                        </div>
                    </div>

                    <button type="submit" class="w-full py-4 px-4 rounded-2xl text-white bg-green-600 hover:bg-green-700 font-black shadow-xl shadow-green-100 transition-all active:scale-95">
                        ${t('finishBtn')}
                    </button>
                </form>
            `, 'max-w-xl'));
        } catch (err) {
            if (tempClient) tempClient.destroy();
            res.send(renderLayout(`
                <div class="text-center py-8">
                    <div class="text-red-500 text-7xl mb-4 font-black text-shadow">ERROR</div>
                    <h2 class="text-xl font-bold text-gray-800 mb-2">FAIL</h2>
                    <p class="text-gray-500 text-sm mb-8 px-4">${getErrorMessage(err)}</p>
                    <a href="/" class="px-10 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all">RETRY</a>
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
                <h1 class="text-4xl font-black text-gray-800 mb-3 tracking-tighter uppercase">${t('successTitle')}</h1>
                <p class="text-gray-400 font-medium mb-10">${t('successMsg')}</p>
                <div class="text-[10px] text-gray-300 font-mono tracking-widest animate-bounce uppercase">Closing...</div>
                <script>setTimeout(() => { window.close(); }, 3000);</script>
            </div>
        `));

        server.close(() => {
            console.log('\n✨ [SETUP OK]');
            startBot();
        });
    });

    function renderLayout(content, maxWidth = 'max-w-md') {
        return `<!DOCTYPE html>
        <html lang="${currentLang}">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Web-Share Setup</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;500;700;800&display=swap" rel="stylesheet">
            <style>
                body { font-family: 'Space Grotesk', 'Pretendard', sans-serif; letter-spacing: -0.02em; }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
                .text-shadow { text-shadow: 0 10px 30px rgba(239, 68, 68, 0.4); }
            </style>
        </head>
        <body class="bg-[#F8FAFC] flex items-center justify-center min-h-screen p-4 leading-tight">
            <div class="bg-white p-10 rounded-[48px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.08)] border border-white/50 w-full ${maxWidth} transition-all">
                ${content}
            </div>
        </body>
        </html>`;
    }

    const server = app.listen(port, async () => {
        console.log(`\n🚀 Setup UI Ready: http://localhost:${port}`);
        await open(`http://localhost:${port}`);
    });
}

if (!process.env.DISCORD_TOKEN) {
    startSetupUI();
} else {
    startBot();
}