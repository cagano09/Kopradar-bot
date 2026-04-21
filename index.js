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

// Son 6 maçın puan ortalamasını 10 üzerinden hesaplar
function getFormPoints(matches, teamId, focus = 'all') {
    if (!matches || matches.length === 0) return 5; // Veri yoksa nötr

    let totalPoints = 0;
    let matchCount = 0;

    // Sadece son 6 maça bak (veya fokus saha ise o sahadaki son 6)
    for (const m of matches) {
        if (matchCount >= 6) break;

        const isHome = m.homeTeam.id === teamId;
        const isAway = m.awayTeam.id === teamId;

        // Saha odaklı analiz (Sadece iç saha veya sadece dış saha)
        if (focus === 'home' && !isHome) continue;
        if (focus === 'away' && !isAway) continue;

        matchCount++;
        if (m.winner === (isHome ? 'HOME_TEAM' : 'AWAY_TEAM')) totalPoints += 3;
        else if (m.winner === 'DRAW') totalPoints += 1;
    }

    return matchCount > 0 ? (totalPoints / (matchCount * 3)) * 10 : 5;
}

function harmanla(hName, aName, hStats, aStats) {
    // FORMÜL: (Genel Form * 0.4) + (Saha Formu * 0.6)
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

    const today = new Date().toISOString().split('T')[0];
    
    // Önbellek: Eğer bugün liste çekildiyse API'ye gitme
    if (cache.date === today && cache.matches.length > 0) {
        return basListeyi(msg.chat.id, cache.matches, "Bellek ✅");
    }

    bot.sendMessage(msg.chat.id, "🔄 Football-Data bülteni taranıyor...");

    try {
        const resp = await apiClient.get('/matches');
        const matches = resp.data.matches || [];

        if (matches.length === 0) return bot.sendMessage(msg.chat.id, "⚠️ Bugün desteklenen liglerde maç bulunamadı.");

        cache.date = today;
        cache.matches = matches;
        basListeyi(msg.chat.id, matches, "Güncel 🔄");
    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ API Hatası: Veri çekilemedi. (Dakikalık limit dolmuş olabilir)");
    }
});

function basListeyi(chatId, matches, info) {
    let report = `📋 *KOPRADAR BÜLTEN (${info})*\n\n`;
    matches.slice(0, 35).forEach(m => {
        report += `🆔 \`${m.id}\` | ${m.homeTeam.shortName} - ${m.awayTeam.shortName}\n`;
    });
    bot.sendMessage(chatId, report, { parse_mode: "Markdown" });
}

bot.on('message', async (msg) => {
    const text = msg.text?.trim();
    if (!text || text.startsWith('/') || isNaN(text)) return;

    // Daha önce analiz edildiyse hafızadan ver (Sorgu tasarrufu!)
    if (cache.analyzed[text]) {
        return bot.sendMessage(msg.chat.id, cache.analyzed[text], { parse_mode: "Markdown" });
    }

    bot.sendMessage(msg.chat.id, "🧠 Gerçek zamanlı form verileri harmanlanıyor...");

    try {
        // H2H ve son maç verilerini çek
        const h2hResp = await apiClient.get(`/matches/${text}/head2head`, { params: { limit: 20 } });
        const matchInfo = cache.matches.find(m => String(m.id) === text);
        
        if (!h2hResp.data || !matchInfo) throw new Error("Veri eksik");

        const hId = matchInfo.homeTeam.id;
        const aId = matchInfo.awayTeam.id;
        const history = h2hResp.data.matches;

        // Senin Kriterlerin: Son 6 maç bazlı puanlama
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
        report += `🏆 *KARAR:* ${res.karar}\n`;
        report += `📈 *Güç:* E ${res.hP} - D ${res.aP}\n`;
        report += `⚽ *GOL:* ${res.gol}\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `📐 *Kriter:* Genel(%40) + Saha(%60)`;

        cache.analyzed[text] = report;
        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });

    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Analiz hatası: Bu maçın detaylı geçmişi API'de bulunamadı.");
    }
});

http.createServer((req, res) => { res.end('KopRadar v4 Online'); }).listen(PORT);
