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

// ================= KOMUTLAR =================

bot.onText(/\/liste/, async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    bot.sendMessage(msg.chat.id, "🔍 Bülten taranıyor...");

    try {
        // Bugünün tarihini API'nin sevdiği formata getirelim
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        
        const dateStr = `${year}-${month}-${day}`; // 2026-04-21 formatı

        // Senin API'ndeki dökümana göre en olası endpoint:
        const resp = await apiClient.get('/football-get-all-matches-by-date', { 
            params: { date: dateStr } 
        });

        // Debug: API'den gelen ham yanıtı görelim (Boş mu değil mi?)
        console.log("API Yanıtı:", JSON.stringify(resp.data));

        const matches = resp.data.results || resp.data.data || resp.data.response;

        if (!matches || (Array.isArray(matches) && matches.length === 0)) {
            return bot.sendMessage(msg.chat.id, `⚠️ API bağlandı ama bugün (${dateStr}) için veri boş döndü. Henüz maçlar bültene düşmemiş olabilir.`);
        }

        let report = "📋 *GÜNÜN MAÇ LİSTESİ*\n\n";
        matches.slice(0, 30).forEach(m => {
            const mId = m.match_id || m.id;
            const hName = m.home_team_name || m.home_team;
            const aName = m.away_team_name || m.away_team;
            report += `🆔 \`${mId}\` | ${hName} - ${aName}\n`;
        });

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });

    } catch (e) {
        let errorDetail = e.response ? JSON.stringify(e.response.data) : e.message;
        bot.sendMessage(msg.chat.id, "❌ Liste Hatası: " + errorDetail);
    }
});

// Analiz Dinleyicisi
bot.on('message', async (msg) => {
    const text = msg.text ? msg.text.trim() : "";
    if (!isNaN(text) && text.length >= 5) {
        bot.sendMessage(msg.chat.id, "🧠 Veriler harmanlanıyor...");
        try {
            const resp = await apiClient.get('/football-get-match-details', { params: { matchid: text } });
            const d = resp.data.results || resp.data.data;
            
            if(!d) throw new Error("Veri yok");

            bot.sendMessage(msg.chat.id, `📊 *ANALİZ TAMAMLANDI*\n⚽ ${d.home_team_name} vs ${d.away_team_name}\n🏆 Tahmin: Veri yetersiz, manuel kontrol gerek.`);
        } catch (e) {
            bot.sendMessage(msg.chat.id, "❌ Bu maç için detaylı analiz verisi şu an eksik.");
        }
    }
});

// Sunucu
http.createServer((req, res) => { res.end('KopRadar Online'); }).listen(PORT);
console.log("Bot 2026 sürümüyle yayında!");
