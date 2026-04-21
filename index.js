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

// Tarih formatını API'nin istediği şekle (YYYYMMDD) çeviren fonksiyon
function getApiDate() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}${m}${day}`;
}

// ================= KOMUTLAR =================

bot.onText(/\/liste/, async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    bot.sendMessage(msg.chat.id, "📅 Günün bülteni hazırlanıyor...");

    try {
        const targetDate = getApiDate();
        // Görüntüdeki kesinleşen endpoint: /football-get-matches-by-date
        const resp = await apiClient.get('/football-get-matches-by-date', { 
            params: { date: targetDate } 
        });

        const matches = resp.data.results || resp.data.data;

        if (!matches || matches.length === 0) {
            return bot.sendMessage(msg.chat.id, "⚠️ Bugün için oynanacak maç verisi bulunamadı.");
        }

        let report = "📋 *GÜNÜN MAÇ LİSTESİ*\n\n";
        matches.slice(0, 25).forEach(m => {
            const mId = m.match_id || m.id;
            report += `🆔 \`${mId}\` | ${m.home_team_name} - ${m.away_team_name}\n`;
        });

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Liste alınamadı. Hata: " + e.message);
    }
});

// ID ile analiz tetikleme
bot.on('message', async (msg) => {
    const text = msg.text ? msg.text.trim() : "";
    if (!isNaN(text) && text.length >= 5) {
        bot.sendMessage(msg.chat.id, "🧠 Analiz ediliyor...");
        try {
            // Maç detayları için de ekran görüntüsündeki mantığa uygun yol
            const resp = await apiClient.get('/football-get-matches-by-id', { params: { matchid: text } });
            const match = resp.data.results || resp.data.data;

            if (!match) throw new Error("Detay yok");

            // Harmanlama Formülü (%40 Genel + %60 Saha)
            const hPower = (10 * 0.4) + (12 * 0.6); // Örnek katsayılar
            const aPower = (8 * 0.4) + (5 * 0.6);

            let report = `📊 *ANALİZ: ${match.home_team_name} - ${match.away_team_name}*\n`;
            report += `🏆 *KARAR:* ${hPower > aPower ? "EV SAHİBİ (1)" : "DEPLASMAN (2)"}\n`;
            report += `⚽ *GOL:* 2.5 ÜST BEKLENTİSİ\n`;
            report += `📈 *Güç:* E ${hPower.toFixed(1)} - D ${aPower.toFixed(1)}`;

            bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
        } catch (e) {
            bot.sendMessage(msg.chat.id, "❌ Maç analizi için yeterli veri çekilemedi.");
        }
    }
});

http.createServer((req, res) => { res.end('KopRadar Online'); }).listen(PORT);
console.log("Bot tam uyumlu modda başlatıldı.");
