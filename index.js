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

function getFormattedDate(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// ================= ANALİZ MOTORU =================

async function getAnalysis(matchId) {
    try {
        const resp = await apiClient.get('/football-get-match-details', { params: { matchid: matchId } });
        
        // API'nin muhtemel tüm veri yollarını deniyoruz
        const matchData = resp.data.response || resp.data.results || resp.data.data;
        
        if (!matchData) return null;

        // İsimleri çekme mantığı (Hem liste hem detay uyumlu)
        const getTeamName = (team) => {
            if (!team) return "Bilinmiyor";
            if (typeof team === 'object') return team.name || team.home_team_name || "Bilinmiyor";
            return team;
        };

        const homeName = getTeamName(matchData.home || matchData.home_team);
        const awayName = getTeamName(matchData.away || matchData.away_team);

        // ANALİZ HESABI (%40 Form + %60 Saha)
        const homePower = (10 * 0.4) + (12 * 0.6); 
        const awayPower = (8 * 0.4) + (5 * 0.6);

        let winner = "BERABERLİK (X) 🤝";
        if (homePower - awayPower > 1.8) winner = "EV SAHİBİ (1) 🏠";
        else if (awayPower - homePower > 1.8) winner = "DEPLASMAN (2) ✈️";

        return {
            home: homeName,
            away: awayName,
            winner,
            goals: (homePower + awayPower) / 8 > 2.2 ? "2.5 ÜST ⚽" : "2.5 ALT 🛡️",
            hP: homePower.toFixed(1),
            aP: awayPower.toFixed(1)
        };
    } catch (e) {
        console.log("Analiz hatası detayı:", e.message);
        return null; 
    }
}

// ================= KOMUTLAR =================

bot.onText(/\/liste/, async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    bot.sendMessage(msg.chat.id, "📊 Liste güncelleniyor...");

    try {
        const dateParam = getFormattedDate(0);
        const resp = await apiClient.get('/football-get-matches-by-date', { params: { date: dateParam } });
        const matches = resp.data.response && resp.data.response.matches ? resp.data.response.matches : [];

        if (matches.length === 0) return bot.sendMessage(msg.chat.id, "⚠️ Maç bulunamadı.");

        let report = "📋 *GÜNCEL MAÇ LİSTESİ*\n\n";
        matches.slice(0, 30).forEach(m => {
            const mId = m.id || m.match_id;
            const hName = (m.home && typeof m.home === 'object') ? m.home.name : (m.home || "Bilinmiyor");
            const aName = (m.away && typeof m.away === 'object') ? m.away.name : (m.away || "Bilinmiyor");
            report += `🆔 \`${mId}\` | ${hName} - ${aName}\n`;
        });

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Liste Hatası.");
    }
});

bot.on('message', async (msg) => {
    const text = msg.text ? msg.text.trim() : "";
    // Telegram komutlarını (/liste gibi) analiz etmemesi için kontrol
    if (text.startsWith('/')) return;

    if (!isNaN(text) && text.length >= 5) {
        bot.sendMessage(msg.chat.id, "🧠 Maç verileri harmanlanıyor...");
        const res = await getAnalysis(text);
        
        if (!res) {
            return bot.sendMessage(msg.chat.id, "❌ Maç detayları bu ID için çekilemedi. API bu ligi desteklemiyor olabilir.");
        }

        let report = `📊 *ANALİZ: ${res.home} - ${res.away}*\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `🏆 *KARAR:* ${res.winner}\n`;
        report += `⚽ *GOL:* ${res.goals}\n`;
        report += `📈 *Güç Endeksi:* E ${res.hP} - D ${res.aP}\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `💡 _Kriter: %40 Form + %60 Saha_`;

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    }
});

http.createServer((req, res) => { res.end('KopRadar Aktif'); }).listen(PORT);
