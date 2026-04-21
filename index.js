const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

// ================= AYARLAR =================
const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const API_KEY = "82179df2de2549cc8d507a5b3b8804aa";
const MY_CHAT_ID = "1094416843"; 
const PORT = process.env.PORT || 8080;

const bot = new TelegramBot(TOKEN, { polling: true });

// Sadece ana liglerin kodları (Kupa ve Avrupa'yı dışlamak için)
const VALID_LEAGUES = ['PL', 'PD', 'BL1', 'SA', 'FL1', 'DED', 'PPL', 'ELC', 'BSA', 'TR'];

// ================= ANALİZ MOTORU (SON 6 MAÇ & HARMANLAMA) =================

async function getTeamStats(teamId) {
    try {
        const url = `https://api.football-data.org/v4/teams/${teamId}/matches?limit=40`;
        const resp = await axios.get(url, { headers: { 'X-Auth-Token': API_KEY } });
        
        // Sadece lig maçlarını filtrele
        const leagueMatches = resp.data.matches.filter(m => VALID_LEAGUES.includes(m.competition.code) && m.status === 'FINISHED');

        // A. Genel Form (Son 6 Lig Maçı - İç/Dış Karışık)
        const last6General = leagueMatches.slice(0, 6);
        
        // B. Saha Formu (Ev sahibi ise evindeki, deplasman ise deplasmandaki son 6 lig maçı)
        const last6Venue = leagueMatches.filter(m => 
            (m.homeTeam.id === teamId && m.homeTeam.id === teamId) || 
            (m.awayTeam.id === teamId && m.awayTeam.id === teamId)
        ).slice(0, 6);

        return {
            general: calculatePointsAndGoals(last6General, teamId),
            venue: calculatePointsAndGoals(last6Venue, teamId)
        };
    } catch (e) { return null; }
}

function calculatePointsAndGoals(matches, teamId) {
    let pts = 0, scored = 0, conceded = 0;
    matches.forEach(m => {
        const isHome = m.homeTeam.id === teamId;
        const g = isHome ? m.score.fullTime.home : m.score.fullTime.away;
        const a = isHome ? m.score.fullTime.away : m.score.fullTime.home;
        scored += g; conceded += a;
        if (g > a) pts += 3; else if (g === a) pts += 1;
    });
    return { pts, avgScored: (scored / (matches.length || 1)), avgConceded: (conceded / (matches.length || 1)) };
}

function harmonicDecision(home, away) {
    // FORMÜL: (Genel Form %40) + (Saha Formu %60)
    const homePower = (home.general.pts * 0.4) + (home.venue.pts * 0.6);
    const awayPower = (away.general.pts * 0.4) + (away.venue.pts * 0.6);

    // GOL ANALİZİ: (Atma potansiyeli + Yeme potansiyeli) / 2
    const expHome = (home.venue.avgScored + away.venue.avgConceded) / 2;
    const expAway = (away.venue.avgScored + home.venue.avgConceded) / 2;
    const totalExp = expHome + expAway;

    let winner = "BERABERLİK (X) 🤝";
    if (homePower - awayPower > 1.8) winner = "EV SAHİBİ (1) 🏠";
    else if (awayPower - homePower > 1.8) winner = "DEPLASMAN (2) ✈️";

    let goals = "2.5 ALT 🛡️";
    if (totalExp > 2.3) goals = "2.5 ÜST ⚽";
    else if (totalExp > 1.7) goals = "1.5 ÜST ⚠️";

    return { winner, goals, score: `${expHome.toFixed(1)} - ${expAway.toFixed(1)}` };
}

// ================= KOMUTLAR =================

bot.onText(/\/liste/, async (msg) => {
    const matches = await axios.get(`https://api.football-data.org/v4/matches`, { headers: { 'X-Auth-Token': API_KEY } });
    let report = "📋 *GÜNÜN LİG MAÇLARI*\n\n";
    matches.data.matches.filter(m => VALID_LEAGUES.includes(m.competition.code)).slice(0, 25).forEach(m => {
        report += `🆔 \`${m.id}\` | ${m.homeTeam.shortName} - ${m.awayTeam.shortName}\n`;
    });
    bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
});

bot.on('message', async (msg) => {
    const text = msg.text;
    if (!isNaN(text) && text.length > 3) { // Eğer gelen mesaj bir maç ID'si ise
        bot.sendMessage(msg.chat.id, "🔍 Veriler harmanlanıyor, lütfen bekleyin...");
        
        try {
            const matchInfo = await axios.get(`https://api.football-data.org/v4/matches/${text}`, { headers: { 'X-Auth-Token': API_KEY } });
            const homeStats = await getTeamStats(matchInfo.data.homeTeam.id);
            const awayStats = await getTeamStats(matchInfo.data.awayTeam.id);

            const result = harmonicDecision(homeStats, awayStats);

            let report = `📈 *ANALİZ: ${matchInfo.data.homeTeam.name} - ${matchInfo.data.awayTeam.name}*\n`;
            report += `🏆 Lig: ${matchInfo.data.competition.name}\n`;
            report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
            report += `🏠 Ev Sahibi (Son 6): ${homeStats.general.pts} P / Saha: ${homeStats.venue.pts} P\n`;
            report += `✈️ Deplasman (Son 6): ${awayStats.general.pts} P / Saha: ${awayStats.venue.pts} P\n`;
            report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
            report += `🎯 *KARAR:* ${result.winner}\n`;
            report += `⚽ *GOL:* ${result.goals}\n`;
            report += `🥅 *BEKLENEN SKOR:* ${result.score}\n`;
            report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
            report += `💡 _Analiz sadece lig maçlarını (Son 6) baz alır. %60 Saha, %40 Genel form ağırlıklıdır._`;

            bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
        } catch (e) { bot.sendMessage(msg.chat.id, "❌ Hata: Maç verisi çekilemedi."); }
    }
});

// Sunucu
http.createServer((r, s) => { s.writeHead(200); s.end('Bot Online'); }).listen(PORT);
