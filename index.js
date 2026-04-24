const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const SPORTMONKS_TOKEN = "gB0apFceXMQkAQveed0dQmPbju6urrCq6rz5xyJs9UYDkIUSMDwIwNOHTwif"; 
const MY_CHAT_ID = "1094416843";
const PORT = process.env.PORT || 8080;

const bot = new TelegramBot(TOKEN, { polling: true });

const apiClient = axios.create({
    baseURL: 'https://api.sportmonks.com/v3/football',
    params: { api_token: SPORTMONKS_TOKEN }
});

bot.onText(/\/canli/, async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    
    bot.sendMessage(msg.chat.id, "📡 Sportmonks sunucularına bağlanılıyor...");

    try {
        const resp = await apiClient.get('/fixtures/live', {
            params: { include: 'participants;league;scores' }
        });

        const matches = resp.data.data || [];

        // EĞER MAÇ YOKSA VEYA LİG KISITLIYSA
        if (matches.length === 0) {
            return bot.sendMessage(msg.chat.id, "📭 Şu an canlıda izlenebilir maç yok.\n\n⚠️ *Not:* Ücretsiz planda olduğunuz için sadece Danimarka vb. belirli ligler taranmaktadır. Şu an o liglerde maç olmayabilir.");
        }

        let report = `🔥 *CANLI BÜLTEN SİNYALİ*\n\n`;
        
        matches.forEach(m => {
            const home = m.participants.find(p => p.meta.location === 'home')?.name || "Ev";
            const away = m.participants.find(p => p.meta.location === 'away')?.name || "Dep";
            const score = m.scores && m.scores[0] ? `${m.scores[0].score.goals} - ${m.scores[1]?.score.goals || 0}` : "0 - 0";
            
            report += `⚽ ${home} ${score} ${away}\n`;
            report += `🕒 Dakika: ${m.minute}' | 🏆 ${m.league?.name}\n`;
            report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        });

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });

    } catch (e) {
        // Hatanın detayını Telegram'a gönder
        let errorMsg = "❌ Bir hata oluştu.";
        if (e.response && e.response.status === 401) errorMsg = "❌ Hata: API Anahtarınız (Token) geçersiz veya süresi dolmuş.";
        if (e.response && e.response.status === 403) errorMsg = "❌ Hata: Bu veriye erişim yetkiniz yok (Paket kısıtlaması).";
        
        bot.sendMessage(msg.chat.id, errorMsg);
        console.error("Detaylı Hata:", e.message);
    }
});

http.createServer((req, res) => { res.end('KopRadar v12.2 Active'); }).listen(PORT);
