const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

// ================= AYARLAR =================
const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const FOOTBALL_DATA_API_KEY = "82179df2de2549cc8d507a5b3b8804aa"; 
const MY_CHAT_ID = "1094416843"; 
const PORT = process.env.PORT || 8080;

const bot = new TelegramBot(TOKEN, { polling: true });

let cache = {
    matches: [],
    analyzed: {}
};

const apiClient = axios.create({
    baseURL: 'https://api.football-data.org/v4',
    headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY }
});

// ================= ANALİZ MOTORU (GELİŞTİRİLMİŞ) =================

function getFormPoints(history, targetId, focus = 'all') {
    if (!history || history.length === 0) return 0;
    
    let totalPoints = 0;
    let matchCount = 0;

    for (const m of history) {
        if (matchCount >= 6) break;
        if (m.status !== 'FINISHED') continue;

        // Takım ID eşleştirmesi (Home veya Away fark etmeksizin)
        const isHome = m.homeTeam.id === targetId;
        const isAway = m.awayTeam.id === targetId;

        if (!isHome && !isAway) continue; // Aranan takım bu maçta yoksa geç

        // Saha odaklı analiz filtresi
        if (focus === 'home' && !isHome) continue;
        if (focus === 'away' && !isAway) continue;

        matchCount++;
        
        // Galibiyet/Beraberlik Kontrolü
        if (m.score.winner === (isHome ? 'HOME_TEAM' : 'AWAY_TEAM')) {
            totalPoints += 3;
        } else if (m.score.winner === 'DRAW') {
            totalPoints += 1;
        }
    }

    // 10 üzerinden puanla (Maç başına max 3 puan üzerinden oranla)
    return matchCount > 0 ? (totalPoints / (matchCount * 3)) * 10 : 0;
}

function harmanla(hName, aName, hStats, aStats) {
    // FORMÜL: (Genel Form * 0.4) + (Saha Formu * 0.6)
    const homePower = (hStats.genel * 0.4) + (hStats.saha * 0.6);
    const awayPower = (aStats.genel * 0.4) + (aStats.saha * 0.6);

    let karar = "BERABERLİK (X) 🤝";
    const fark = homePower - awayPower;

    // Eğer her iki takımın da verisi yoksa (Yeni lig vb)
    if (homePower === 0 && awayPower === 0) {
        return { hP: "0.0", aP: "0.0", karar: "YETERSİZ VERİ ⚠️", gol: "BELİRSİZ" };
    }

    if (fark > 1.4) karar = `EV SAHİBİ (${hName}) 🏠`;
    else if (fark < -1.4) karar = `DEPLASMAN (${aName}) ✈️`;

    return {
        hP: homePower.toFixed(1),
        aP: awayPower.toFixed(1),
        karar,
        gol: (homePower + awayPower) > 11.5 ? "2.5 ÜST ⚽" : "2.5 ALT 🛡️"
    };
}

// ================= KOMUTLAR =================

bot.onText(/\/liste/, async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    bot.sendMessage(msg.chat.id, "📅 Güncel bülten hazırlanıyor...");

    try {
        const resp = await apiClient.get('/matches', { params: { status: 'SCHEDULED' } });
        const matches = resp.data.matches || [];

        if (matches.length === 0) return bot.sendMessage(msg.chat.id, "⚠️ Oynanmamış maç bulunamadı.");

        cache.matches = matches;
        cache.analyzed = {}; 

        let report = `📋 *GÜNCEL BÜLTEN*\n\n`;
        matches.slice(0, 30).forEach(m => {
            const time = new Date(m.utcDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            report += `⏰ ${time} | 🆔 \`${m.id}\`\n👉 ${m.homeTeam.shortName} - ${m.awayTeam.shortName}\n\n`;
        });

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Liste alınamadı.");
    }
});

bot.on('message', async (msg) => {
    const text = msg.text?.trim();
    if (!text || text.startsWith('/') || isNaN(text)) return;

    if (cache.analyzed[text]) {
        return bot.sendMessage(msg.chat.id, cache.analyzed[text], { parse_mode: "Markdown" });
    }

    const matchInfo = cache.matches.find(m => String(m.id) === text);
    if (!matchInfo) return bot.sendMessage(msg.chat.id, "❌ ID bulunamadı. Lütfen /liste yapın.");

    bot.sendMessage(msg.chat.id, "🧠 Derin istatistikler harmanlanıyor...");

    try {
        // H2H endpoint'i hem karşılıklı maçları hem de takımların kendi son maçlarını verir
        const h2hResp = await apiClient.get(`/matches/${text}/head2head`, { params: { limit: 50 } });
        const history = h2hResp.data.matches;

        const hId = matchInfo.homeTeam.id;
        const aId = matchInfo.awayTeam.id;

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
        report += `📐 *Harman:* %40 Genel + %60 Saha`;

        cache.analyzed[text] = report;
        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });

    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Veri çekme hatası. Bu maçın geçmişi henüz sisteme girilmemiş olabilir.");
    }
});

http.createServer((req, res) => { res.end('KopRadar v4.2'); }).listen(PORT);
