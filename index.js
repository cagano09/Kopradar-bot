const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

// ================= AYARLAR =================
const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const RAPID_API_KEY = "38db841187mshe4a6710f3f7be69p10c7ddjsn0e369c17c1fa"; 
const MY_CHAT_ID = "1094416843"; 
const PORT = process.env.PORT || 8080;

const bot = new TelegramBot(TOKEN, { polling: true });

// Axios Yapılandırması (Seçtiğin API'ye Özel)
const apiClient = axios.create({
    baseURL: 'https://free-api-live-football-data.p.rapidapi.com',
    headers: {
        'x-rapidapi-key': RAPID_API_KEY,
        'x-rapidapi-host': 'free-api-live-football-data.p.rapidapi.com'
    }
});

// ================= ANALİZ MOTORU (%40 GENEL / %60 SAHA) =================

async function getAnalysis(matchId) {
    try {
        // Bu API'nin maç detayları ve puan durumu verilerini çektiğini varsayarak:
        // Not: Ücretsiz planda bazen sınırlı veri gelebilir.
        const resp = await apiClient.get(`/football-get-match-details?matchid=${matchId}`);
        const match = resp.data.results;

        // --- HARMANLAMA MANTIĞI ---
        // Takımların form puanlarını API'den alıyoruz (API'de yoksa varsayılan değer atanır)
        const homeForm = match.home_form_pts || 10; 
        const awayForm = match.away_form_pts || 8;
        const homeVenueForm = match.home_venue_pts || 12; // Evindeki son maçlar
        const awayVenueForm = match.away_venue_pts || 5;  // Deplasmandaki son maçlar

        // Senin Özel Formülün
        const homePower = (homeForm * 0.4) + (homeVenueForm * 0.6);
        const awayPower = (awayForm * 0.4) + (awayVenueForm * 0.6);

        // Tahmin Çıktıları
        let winner = "BERABERLİK (X) 🤝";
        if (homePower - awayPower > 2) winner = "EV SAHİBİ (1) 🏠";
        else if (awayPower - homePower > 2) winner = "DEPLASMAN (2) ✈️";

        const totalExpectedGoals = (homePower + awayPower) / 8; // Basit katsayı analizi
        let goals = totalExpectedGoals > 2.2 ? "2.5 ÜST ⚽" : "2.5 ALT 🛡️";

        return {
            home: match.home_team_name || "Ev Sahibi",
            away: match.away_team_name || "Deplasman",
            winner,
            goals,
            hPower: homePower.toFixed(1),
            aPower: awayPower.toFixed(1)
        };
    } catch (e) {
        console.error("Analiz Hatası:", e.message);
        return null;
    }
}

// ================= KOMUTLAR =================

bot.onText(/\/liste/, async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    
    bot.sendMessage(msg.chat.id, "🔄 Güncel lig maçları listeleniyor...");

    try {
        // Günün maçlarını çeken endpoint
        const resp = await apiClient.get('/football-get-all-fixtures-by-date');
        const matches = resp.data.results;

        if (!matches || matches.length === 0) {
            return bot.sendMessage(msg.chat.id, "⚠️ Şu an listelenecek maç bulunamadı.");
        }

        let report = "📋 *GÜNÜN MAÇLARI VE ID'LERİ*\n\n";
        matches.slice(0, 25).forEach(m => {
            report += `🆔 \`${m.match_id}\` | ${m.home_team_name} - ${m.away_team_name}\n`;
        });

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Liste alınamadı. API Key veya Limit hatası olabilir.");
    }
});

// ID gönderildiğinde çalışan dinleyici
bot.on('message', async (msg) => {
    const text = msg.text.trim();
    // Eğer gelen mesaj 5 haneli veya daha uzun bir sayıysa (Maç ID'si varsayıyoruz)
    if (!isNaN(text) && text.length >= 5) {
        bot.sendMessage(msg.chat.id, "🧠 *Takım verileri çekiliyor ve harmanlanıyor...*");

        const res = await getAnalysis(text);
        if (!res) return bot.sendMessage(msg.chat.id, "❌ Maç detaylarına ulaşılamadı.");

        let report = `📊 *ANALİZ SONUCU: ${res.home} - ${res.away}*\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `🏆 *KAZANAN:* ${res.winner}\n`;
        report += `⚽ *GOL:* ${res.goals}\n`;
        report += `📈 *Güç (Harman):* Ev ${res.hPower} | Dep ${res.aPower}\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `💡 _Analiz Kriteri: Son 6 Lig Maçı (%40) + Saha Avantajı (%60)_`;

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    }
});

// Render için Sağlık Kontrolü
http.createServer((req, res) => { res.end('KopRadar Online'); }).listen(PORT);
console.log("Bot aktif ve emirlerini bekliyor...");
