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
    analyzed: {},
    standings: {} // Lig tablolarını burada saklayacağız
};

const apiClient = axios.create({
    baseURL: 'https://api.football-data.org/v4',
    headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY }
});

// ================= HİBRİT ANALİZ MOTORU =================

function getStandingStats(leagueCode, teamId) {
    const table = cache.standings[leagueCode];
    if (!table) return { rankPoints: 5, homeAwayPoints: 5 };

    const team = table.find(t => t.team.id === teamId);
    if (!team) return { rankPoints: 5, homeAwayPoints: 5 };

    // Ligdeki pozisyonuna göre 10 üzerinden puan (Lider=10, Sonuncu=1)
    const totalTeams = table.length;
    const rankPoints = ((totalTeams - (team.position - 1)) / totalTeams) * 10;

    return { rankPoints, team };
}

function harmanla(hName, aName, hStats, aStats) {
    // YENİ FORMÜL: %40 Lig Gücü + %30 Form + %30 Saha Gücü
    const hFinal = (hStats.rank * 0.4) + (hStats.form * 0.3) + (hStats.saha * 0.3);
    const aFinal = (aStats.rank * 0.4) + (aStats.form * 0.3) + (aStats.saha * 0.3);

    let karar = "BERABERLİK (X) 🤝";
    const fark = hFinal - aFinal;

    if (fark > 1.8) karar = `EV SAHİBİ (${hName}) 🏠`;
    else if (fark < -1.8) karar = `DEPLASMAN (${aName}) ✈️`;

    return {
        hP: hFinal.toFixed(1),
        aP: aFinal.toFixed(1),
        karar,
        gol: (hFinal + aFinal) > 13 ? "2.5 ÜST ⚽" : "2.5 ALT 🛡️"
    };
}

// ================= KOMUTLAR =================

bot.onText(/\/liste/, async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    bot.sendMessage(msg.chat.id, "📊 Lig tabloları ve güncel bülten harmanlanıyor...");

    try {
        const resp = await apiClient.get('/matches', { params: { status: 'SCHEDULED' } });
        const matches = resp.data.matches || [];

        if (matches.length === 0) return bot.sendMessage(msg.chat.id, "⚠️ Maç bulunamadı.");

        cache.matches = matches;
        
        // Benzersiz liglerin tablolarını çek (Sorgu tasarrufu için)
        const leagues = [...new Set(matches.map(m => m.competition.code))];
        for (const code of leagues) {
            const stResp = await apiClient.get(`/competitions/${code}/standings`);
            cache.standings[code] = stResp.data.standings[0].table;
        }

        let report = `📋 *KOPRADAR v5.0 (HİBRİT BÜLTEN)*\n\n`;
        matches.slice(0, 30).forEach(m => {
            const time = new Date(m.utcDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            report += `⏰ ${time} | 🆔 \`${m.id}\` | ${m.homeTeam.shortName} - ${m.awayTeam.shortName}\n`;
        });

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Liste Hatası. API limiti dolmuş olabilir.");
    }
});

bot.on('message', async (msg) => {
    const text = msg.text?.trim();
    if (!text || text.startsWith('/') || isNaN(text)) return;

    const matchInfo = cache.matches.find(m => String(m.id) === text);
    if (!matchInfo) return;

    bot.sendMessage(msg.chat.id, "🧬 Lig konumu ve form verileri işleniyor...");

    try {
        const lCode = matchInfo.competition.code;
        const hId = matchInfo.homeTeam.id;
        const aId = matchInfo.awayTeam.id;

        // 1. Lig Pozisyonu Puanları
        const hRank = getStandingStats(lCode, hId);
        const aRank = getStandingStats(lCode, aId);

        // 2. Form Puanları (Puan durumundaki son 5 maça bakıyoruz - Çok daha stabil)
        const parseForm = (formStr) => {
            if (!formStr) return 5;
            let p = 0;
            formStr.split(',').forEach(res => {
                if (res === 'W') p += 2;
                if (res === 'D') p += 1;
            });
            return (p / 10) * 10;
        };

        const hStats = {
            rank: hRank.rankPoints,
            form: parseForm(hRank.team?.form),
            saha: (hRank.team?.home?.won / hRank.team?.home?.played) * 10 || 5
        };

        const aStats = {
            rank: aRank.rankPoints,
            form: parseForm(aRank.team?.form),
            saha: (aRank.team?.away?.won / aRank.team?.away?.played) * 10 || 5
        };

        const res = harmanla(matchInfo.homeTeam.shortName, matchInfo.awayTeam.shortName, hStats, aStats);

        let report = `📊 *HİBRİT ANALİZ: ${matchInfo.homeTeam.name} - ${matchInfo.awayTeam.name}*\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `🏆 *TAHMİN:* ${res.karar}\n`;
        report += `📈 *Güç Skoru:* E ${res.hP} - D ${res.aP}\n`;
        report += `⚽ *GOL:* ${res.gol}\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `ℹ️ _Liderlik Gücü + Güncel Form + Saha Performansı harmanlanmıştır._`;

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });

    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Analiz yapılamadı.");
    }
});

http.createServer((req, res) => { res.end('KopRadar v5.0'); }).listen(PORT);
