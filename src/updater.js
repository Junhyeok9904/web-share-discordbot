const https = require('https');
const fs = require('fs');
const path = require('path');
const { version } = require('../package.json');

const REPO = 'Junhyeok9904/web-share-discordbot';
const CACHE_FILE = '.update-cache.json';

/**
 * GitHub API를 통해 최신 버전을 확인합니다.
 * 레이트 리밋 방지를 위해 로컬 캐시를 사용합니다.
 */
async function checkForUpdates(envPath) {
    const cachePath = path.join(path.dirname(envPath), CACHE_FILE);
    
    // 1. 로컬 캐시 확인 (24시간)
    if (fs.existsSync(cachePath)) {
        try {
            const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
            const now = Date.now();
            if (now - cache.timestamp < 24 * 60 * 60 * 1000) {
                return cache.data;
            }
        } catch (e) {}
    }

    // 2. GitHub API 호출
    return new Promise((resolve) => {
        const options = {
            hostname: 'api.github.com',
            path: `/repos/${REPO}/releases/latest`,
            headers: { 'User-Agent': 'Discord-Link-Opener-Bot' }
        };

        https.get(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const data = JSON.parse(body);
                    if (data.tag_name) {
                        const latestVersion = data.tag_name.replace('v', '');
                        const hasUpdate = isNewerVersion(version, latestVersion);
                        const result = {
                            currentVersion: version,
                            latestVersion: latestVersion,
                            hasUpdate,
                            url: data.html_url,
                            assets: data.assets
                        };
                        
                        // 캐시 저장
                        fs.writeFileSync(cachePath, JSON.stringify({
                            timestamp: Date.now(),
                            data: result
                        }), 'utf8');
                        
                        resolve(result);
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    resolve(null);
                }
            });
        }).on('error', () => resolve(null));
    });
}

function isNewerVersion(current, latest) {
    const c = current.split('.').map(Number);
    const l = latest.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
        if (l[i] > c[i]) return true;
        if (l[i] < c[i]) return false;
    }
    return false;
}

module.exports = { checkForUpdates };