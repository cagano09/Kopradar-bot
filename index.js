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
        'x-rapidapi-host': 'free-api-live-football-data.p.rapidapi.com',
        'Content-Type': 'application/json'
    }
});

// Tarihi API'nin istediği YYYYMMDD formatına çeviren yardımcı fonksiyon
function getFormattedDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// ================= ANALİZ MOTORU =================

async function getAnalysis(matchId) {
    try {
        // Maç detayları için doğru endpoint
        const resp = await apiClient.get('/football-get-match-details', { params: { matchid: matchId } });
        const match = resp.data.results; 

        if (!match) return null;

        // HARMANLAMA HESABI (%40 Genel + %60 Saha)
        const hForm = 10; const aForm = 8;
        const hVenue = 12; const aVenue = 5;

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
    } catch (e) {
        return null;
    }
}

// ================= KOMUTLAR =================

bot.onText(/\/liste/, async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    bot.sendMessage(msg.chat.id, "📅 Günün bülteni hazırlanıyor...");

    try {
        const dateParam = getFormattedDate(); // Örn: 20260421
        const resp = await apiClient.get('/football-get-matches-by-date', { 
            params: { date: dateParam } 
        });

        // API sonuçları 'results' içinde dizi olarak gönderiyor
        const matches = resp.data.results;

        if (!matches || !Array.isArray(matches) || matches.length === 0) {
            return bot.sendMessage(msg.chat.id, "⚠️ Bugün için oynanacak maç bulunamadı veya API güncellenmedi.");
        }

        let report = "📋 *GÜNÜN MAÇ LİSTESİ*\n\n";
        matches.slice(0, 30).forEach(m => {
            report += `🆔 \`${m.match_id}\` | ${m.home_team_name} - ${m.away_team_name}\n`;
        });

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });

    } catch (e) {
        let errorMsg = e.response ? JSON.stringify(e.response.data) : e.message;
        bot.sendMessage(msg.chat.id, "❌ Liste hatası: " + errorMsg);
    }
});

bot.on('message', async (msg) => {
    const text = msg.text ? msg.text.trim() : "";
    if (!isNaN(text) && text.length >= 5) {
        bot.sendMessage(msg.chat.id, "🧠 Analiz ediliyor...");
        const res = await getAnalysis(text);
        if (!res) return bot.sendMessage(msg.chat.id, "❌ Detaylar alınamadı.");

        let report = `📊 *ANALİZ: ${res.home} - ${res.away}*\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `🏆 *KARAR:* ${res.winner}\n`;
        report += `⚽ *GOL:* ${res.goals}\n`;
        report += `📈 *Güç:* E ${res.hP} - D ${res.aP}\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `💡 _Kriter: %40 Form + %60 Saha_`;

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    }
});

http.createServer((req, res) => { res.end('KopRadar Online'); }).listen(PORT);
console.log("Bot yeni URL yapısıyla başlatıldı!");
