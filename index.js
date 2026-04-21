const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

// ================= AYARLAR =================
const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const FOOTBALL_DATA_API_KEY = "82179df2de2549cc8d507a5b3b8804aa"; 
const MY_CHAT_ID = "1094416843"; 
const PORT = process.env.PORT || 8080;

const bot = new TelegramBot(TOKEN, { polling: true });

// SORGÜ TASARRUFU İÇİN HAFIZA (CACHE)
let cache = {
    date: null,
    matches: [],
    analyzed: {}
};

const apiClient = axios.create({
    baseURL: 'https://api.football-data.org/v4',
    headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY }
});

// ================= ANALİZ MOTORU (%40 / %60) =================

function getFormPoints(matches, teamId, focus = 'all') {
    if (!matches || matches.length === 0) return 5;
    let totalPoints = 0;
    let matchCount = 0;

    for (const m of matches) {
        if (matchCount >= 6) break;
        // Sadece bitmiş (FINISHED) maçları form analizine dahil et
        if (m.status !== 'FINISHED') continue;

        const isHome = m.homeTeam.id === teamId;
        const isAway = m.awayTeam.id === teamId;

        if (focus === 'home' && !isHome) continue;
        if (focus === 'away' && !isAway) continue;

        matchCount++;
        if (m.winner === (isHome ? 'HOME_TEAM' : 'AWAY_TEAM')) totalPoints += 3;
        else if (m.winner === 'DRAW') totalPoints += 1;
    }
    return matchCount > 0 ? (totalPoints / (matchCount * 3)) * 10 : 5;
}

function harmanla(hName, aName, hStats, aStats) {
    const homePower = (hStats.genel * 0.4) + (hStats.saha * 0.6);
    const awayPower = (aStats.genel * 0.4) + (aStats.saha * 0.6);

    let karar = "BERABERLİK (X) 🤝";
    const fark = homePower - awayPower;

    if (fark > 1.5) karar = `EV SAHİBİ (${hName}) 🏠`;
    else if (fark < -1.5) karar = `DEPLASMAN (${aName}) ✈️`;

    return {
        hP: homePower.toFixed(1),
        aP: awayPower.toFixed(1),
        karar,
        gol: (homePower + awayPower) > 12 ? "2.5 ÜST ⚽" : "2.5 ALT 🛡️"
    };
}

// ================= KOMUTLAR =================

bot.onText(/\/liste/, async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;

    bot.sendMessage(msg.chat.id, "🔄 Oynanmamış maçlar taranıyor ve liste güncelleniyor...");

    try {
        // status=SCHEDULED filtresi sadece başlamamış maçları getirir
        const resp = await apiClient.get('/matches', { params: { status: 'SCHEDULED' } });
        const matches = resp.data.matches || [];

        if (matches.length === 0) {
            return bot.sendMessage(msg.chat.id, "⚠️ Şu an için bültende oynanmamış maç bulunamadı.");
        }

        // Önbelleği her liste komutunda tazeliyoruz (Güncelleme özelliği)
        cache.date = new Date().toISOString().split('T')[0];
        cache.matches = matches;
        cache.analyzed = {}; // Yeni liste gelince eski analizleri temizle

        let report = `📋 *GÜNCEL BÜLTEN (Sadece Başlamamışlar)*\n\n`;
        matches.slice(0, 35).forEach(m => {
            // Saat formatlama (UTC'den yerel saate basit çevrim gerekebilir ama API genelde UTC verir)
            const matchTime = new Date(m.utcDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            report += `⏰ ${matchTime} | 🆔 \`${m.id}\`\n👉 ${m.homeTeam.shortName} - ${m.awayTeam.shortName}\n\n`;
        });

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Liste güncellenemedi. Lütfen biraz sonra tekrar deneyin.");
    }
});

bot.on('message', async (msg) => {
    const text = msg.text?.trim();
    if (!text || text.startsWith('/') || isNaN(text)) return;

    if (cache.analyzed[text]) {
        return bot.sendMessage(msg.chat.id, cache.analyzed[text], { parse_mode: "Markdown" });
    }

    const matchInfo = cache.matches.find(m => String(m.id) === text);
    if (!matchInfo) return bot.sendMessage(msg.chat.id, "❌ Bu ID listede bulunamadı veya maç başlamış olabilir. Lütfen /liste yaparak güncelleyin.");

    bot.sendMessage(msg.chat.id, "🧠 Analiz ediliyor...");

    try {
        const h2hResp = await apiClient.get(`/matches/${text}/head2head`, { params: { limit: 20 } });
        const hId = matchInfo.homeTeam.id;
        const aId = matchInfo.awayTeam.id;
        const history = h2hResp.data.matches;

        const homeStats = {
            genel: getFormPoints(history, hId, 'all'),
            saha: getFormPoints(history, hId, 'home')
        };
        const awayStats = {
            genel: getFormPoints(history, aId, 'all'),
            saha: getFormPoints(history, aId, 'away')
        };

        const res = harmanla(matchInfo.homeTeam.shortName, matchInfo.awayTeam.shortName, homeStats, awayStats);

        let report = `📊 *ANALİZ: ${matchInfo.homeTeam.name} - ${matchInfo.awayTeam.name}*\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `🏆 *TAHMİN:* ${res.karar}\n`;
        report += `📈 *Güç:* E ${res.hP} - D ${res.aP}\n`;
        report += `⚽ *GOL:* ${res.gol}\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `📐 *Harman:* %40 Genel + %60 Saha`;

        cache.analyzed[text] = report;
        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });

    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Detaylı veri çekilemedi.");
    }
});

http.createServer((req, res) => { res.end('KopRadar v4.1'); }).listen(PORT);
