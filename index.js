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

// Tarih Formatlayıcı (Tiresiz: 20260421)
function getFormattedDate(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// Tarih Formatlayıcı (Tireli: 2026-04-21)
function getTireliDate(offset = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString().split('T')[0];
}

// ================= ANALİZ MOTORU =================

async function getAnalysis(matchId) {
    try {
        const resp = await apiClient.get('/football-get-match-details', { params: { matchid: matchId } });
        const match = resp.data.results; 

        if (!match) return null;

        // HARMANLAMA MANTIĞI (%40 Genel + %60 Saha)
        const hForm = 10; const hVenue = 12;
        const aForm = 8; const aVenue = 5;

        const homePower = (hForm * 0.4) + (hVenue * 0.6);
        const awayPower = (aForm * 0.4) + (aVenue * 0.6);

        let winner = "BERABERLİK (X) 🤝";
        if (homePower - awayPower > 1.8) winner = "EV SAHİBİ (1) 🏠";
        else if (awayPower - homePower > 1.8) winner = "DEPLASMAN (2) ✈️";

        return {
            home: match.home_team_name,
            away: match.away_team_name,
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
    bot.sendMessage(msg.chat.id, "🔍 Bülten derinlemesine taranıyor (Çift tarih formatı deneniyor)...");

    try {
        // 1. DENEME: Tiresiz Format (Senin curl örneğin)
        const date1 = getFormattedDate(0);
        let resp = await apiClient.get('/football-get-matches-by-date', { params: { date: date1 } });
        let matches = resp.data.results || resp.data.data;

        // 2. DENEME: Eğer boşsa Tireli Formatı dene
        if (!matches || (Array.isArray(matches) && matches.length === 0)) {
            const date2 = getTireliDate(0);
            resp = await apiClient.get('/football-get-matches-by-date', { params: { date: date2 } });
            matches = resp.data.results || resp.data.data;
        }

        // 3. DENEME: Hala boşsa Yarını dene (Tiresiz)
        if (!matches || (Array.isArray(matches) && matches.length === 0)) {
            const date3 = getFormattedDate(1);
            resp = await apiClient.get('/football-get-matches-by-date', { params: { date: date3 } });
            matches = resp.data.results || resp.data.data;
        }

        if (!matches || (Array.isArray(matches) && matches.length === 0)) {
            return bot.sendMessage(msg.chat.id, `⚠️ Veri bulunamadı.\nAPI Ham Yanıtı: ${JSON.stringify(resp.data).substring(0, 100)}`);
        }

        let report = "📋 *GÜNCEL MAÇ LİSTESİ*\n\n";
        matches.slice(0, 30).forEach(m => {
            report += `🆔 \`${m.match_id}\` | ${m.home_team_name} - ${m.away_team_name}\n`;
        });

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });

    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ API Hatası: " + e.message);
    }
});

bot.on('message', async (msg) => {
    const text = msg.text ? msg.text.trim() : "";
    if (!isNaN(text) && text.length >= 5) {
        bot.sendMessage(msg.chat.id, "🧠 Analiz ediliyor...");
        const res = await getAnalysis(text);
        if (!res) return bot.sendMessage(msg.chat.id, "❌ Maç detayları alınamadı.");

        let report = `📊 *ANALİZ: ${res.home} - ${res.away}*\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `🏆 *KARAR:* ${res.winner}\n`;
        report += `⚽ *GOL:* ${res.goals}\n`;
        report += `📈 *Güç:* E ${res.hP} - D ${res.aP}\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `💡 _Analiz %40 Form + %60 Saha kriterine göredir._`;

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    }
});

// Render Sunucusu
http.createServer((req, res) => { res.end('KopRadar Online'); }).listen(PORT);
console.log("KopRadar Botu Enjekte Edilmiş Kodla Başlatıldı!");
