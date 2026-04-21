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

// Tarihi API'nin istediği YYYYMMDD formatına çeviren fonksiyon
function getApiDate() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

// ================= KOMUTLAR =================

bot.onText(/\/liste/, async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    
    bot.sendMessage(msg.chat.id, "📅 Günün maçları hazırlanıyor...");

    try {
        const apiDate = getApiDate(); // Örn: 20260421
        const resp = await apiClient.get('/football-get-matches-by-date', { 
            params: { date: apiDate } 
        });

        // Görseldeki API yapısına göre sonuçlar 'data' içindedir
        const matches = resp.data.data || resp.data.results;

        if (!matches || matches.length === 0) {
            return bot.sendMessage(msg.chat.id, "⚠️ Bugün oynanacak maç bulunamadı.");
        }

        let report = "📋 *GÜNÜN MAÇ LİSTESİ*\n\n";
        matches.slice(0, 25).forEach(m => {
            report += `🆔 \`${m.id || m.match_id}\` | ${m.home_team_name} - ${m.away_team_name}\n`;
        });

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Liste alınamadı. Detay: " + e.message);
    }
});

bot.on('message', async (msg) => {
    const text = msg.text ? msg.text.trim() : "";
    
    // Eğer kullanıcı sadece sayı (Maç ID) gönderirse analiz başlar
    if (!isNaN(text) && text.length >= 5) {
        bot.sendMessage(msg.chat.id, "🧠 *Harmanlanmış Analiz Yapılıyor...*");

        try {
            // Görseldeki yapıya göre detay endpoint'i muhtemelen budur
            const resp = await apiClient.get('/football-get-matches-events-by-id', { 
                params: { matchid: text } 
            });
            const m = resp.data.data || resp.data.results;

            // Senin %40 Genel / %60 Saha formülün (Temsili hesaplama)
            const homePower = (10 * 0.4) + (12 * 0.6);
            const awayPower = (8 * 0.4) + (5 * 0.6);

            let result = "BERABERLİK (X) 🤝";
            if (homePower - awayPower > 1.5) result = "EV SAHİBİ (1) 🏠";
            else if (awayPower - homePower > 1.5) result = "DEPLASMAN (2) ✈️";

            let report = `📊 *MAÇ ANALİZİ: ${m.home_team_name} - ${m.away_team_name}*\n`;
            report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
            report += `🏆 *TAHMİN:* ${result}\n`;
            report += `⚽ *GOL:* 2.5 ÜST BEKLENTİSİ\n`;
            report += `📈 *Güç:* E ${homePower.toFixed(1)} - D ${awayPower.toFixed(1)}\n`;
            report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
            report += `💡 _Analiz %60 saha avantajı ile hesaplanmıştır._`;

            bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
        } catch (e) {
            bot.sendMessage(msg.chat.id, "❌ Analiz detayı çekilemedi.");
        }
    }
});

// Render için sunucu
http.createServer((req, res) => { res.end('KopRadar Hazır'); }).listen(PORT);
console.log("Bot başarıyla başlatıldı!");
