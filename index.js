const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

// ================= AYARLAR =================
const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const RAPID_API_KEY = "38db841187mshe4a6710f3f7be69p10c7ddjsn0e369c17c1fa"; 
const MY_CHAT_ID = "1094416843"; 
const PORT = process.env.PORT || 8080;

const bot = new TelegramBot(TOKEN, { polling: true });

const apiClient = axios.create({
    baseURL: 'https://free-api-live-football-data.p.rapidapi.com',
    headers: {
        'x-rapidapi-key': RAPID_API_KEY,
        'x-rapidapi-host': 'free-api-live-football-data.p.rapidapi.com'
    }
});

// ================= ANALİZ MOTORU =================

async function getAnalysis(matchId) {
    try {
        const resp = await apiClient.get('/get-matches-events-by-id', { params: { matchid: matchId } });
        const match = resp.data.data || resp.data.results || resp.data.response; 

        const hForm = 10; const aForm = 8; const hVenue = 12; const aVenue = 5;
        const homePower = (hForm * 0.4) + (hVenue * 0.6);
        const awayPower = (aForm * 0.4) + (aVenue * 0.6);

        let winner = "BERABERLİK (X) 🤝";
        if (homePower - awayPower > 1.8) winner = "EV SAHİBİ (1) 🏠";
        else if (awayPower - homePower > 1.8) winner = "DEPLASMAN (2) ✈️";

        return {
            home: match.home_team_name || "Ev Sahibi",
            away: match.away_team_name || "Deplasman",
            winner,
            goals: (homePower + awayPower) / 8 > 2.2 ? "2.5 ÜST ⚽" : "2.5 ALT 🛡️",
            hP: homePower.toFixed(1),
            aP: awayPower.toFixed(1)
        };
    } catch (e) { return null; }
}

// ================= KOMUTLAR =================

bot.onText(/\/liste/, async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    bot.sendMessage(msg.chat.id, "📅 Günün maçları sorgulanıyor...");

    try {
        const today = new Date().toISOString().split('T')[0];
        // ÖNEMLİ: Eğer yine 'Endpoint exist' hatası alırsan burayı '/get-matches-by-date' yapmayı dene
        const resp = await apiClient.get('/get-matches-events-by-date', { params: { date: today } });
        
        const matches = resp.data.data || resp.data.results || resp.data.response;

        if (!matches || matches.length === 0) {
            return bot.sendMessage(msg.chat.id, "⚠️ Bugün için maç bulunamadı.");
        }

        let report = "📋 *GÜNÜN MAÇ LİSTESİ*\n\n";
        matches.slice(0, 20).forEach(m => {
            const mId = m.match_id || m.id || m.fixture_id;
            report += `🆔 \`${mId}\` | ${m.home_team_name || m.home_team} - ${m.away_team_name || m.away_team}\n`;
        });

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    } catch (e) {
        let errorMsg = e.response ? JSON.stringify(e.response.data) : e.message;
        bot.sendMessage(msg.chat.id, "❌ Hata: " + errorMsg);
    }
});

bot.on('message', async (msg) => {
    const text = msg.text ? msg.text.trim() : "";
    if (!isNaN(text) && text.length >= 5) {
        bot.sendMessage(msg.chat.id, "🧠 Analiz ediliyor...");
        const res = await getAnalysis(text);
        if (!res) return bot.sendMessage(msg.chat.id, "❌ Veri çekilemedi.");

        let report = `📊 *KARAR: ${res.home} - ${res.away}*\n`;
        report += `🏆 *SONUÇ:* ${res.winner}\n`;
        report += `⚽ *GOL:* ${res.goals}\n`;
        report += `📈 *Güç:* E ${res.hP} - D ${res.aP}`;
        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    }
});

// ================= SUNUCU =================
http.createServer((req, res) => { res.end('KopRadar Online'); }).listen(PORT);
console.log("Bot başlatıldı...");
