const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

// ================= AYARLAR =================
const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const SPORTMONKS_TOKEN = "gB0apFceXMQkAQveed0dQmPbju6urrCq6rz5xyJs9UYDkIUSMDwIwNOHTwif"; 
const MY_CHAT_ID = "1094416843";
const PORT = process.env.PORT || 8080;

const bot = new TelegramBot(TOKEN, { polling: true });

const apiClient = axios.create({
    baseURL: 'https://api.sportmonks.com/v3/football',
    params: { api_token: SPORTMONKS_TOKEN }
});

// ================= ANALİZ MOTORU =================

bot.onText(/\/canli/, async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    bot.sendMessage(msg.chat.id, "📡 Sportmonks üzerinden canlı sahalar taranıyor...");

    try {
        // Canlı maçları; takım isimleri, lig bilgisi ve istatistiklerle beraber çekiyoruz
        const resp = await apiClient.get('/fixtures/live', {
            params: { 
                include: 'statistics;participants;league',
                'fields[statistics]': 'type_id,data',
                'fields[participants]': 'name'
            }
        });

        const matches = resp.data.data || [];
        if (matches.length === 0) return bot.sendMessage(msg.chat.id, "📭 Şu an aktif canlı maç bulunmuyor (Veya mevcut planınız bu ligleri kapsamıyor).");

        let report = `🔥 *CANLI BASKI VE İSTATİSTİK RAPORU*\n\n`;
        let count = 0;

        matches.forEach(m => {
            const homeTeam = m.participants.find(p => p.meta.location === 'home');
            const awayTeam = m.participants.find(p => p.meta.location === 'away');
            
            // Korner ve Şut verilerini süzüyoruz (Type ID 34: Corner, 45: Shots on Goal - Sportmonks standartları)
            const homeStats = m.statistics?.filter(s => s.location === 'home') || [];
            const awayStats = m.statistics?.filter(s => s.location === 'away') || [];

            // Basit bir fonksiyonla veriyi çekelim
            const getStat = (stats, type) => stats.find(s => s.type_id === type)?.data?.value || 0;

            const hCorner = getStat(homeStats, 34);
            const aCorner = getStat(awayStats, 34);
            const hShots = getStat(homeStats, 45);
            const aShots = getStat(awayStats, 45);

            report += `⚽ *${homeTeam.name} ${m.scores?.find(s => s.description === 'CURRENT')?.score?.goals || 0} - ${m.scores?.find(s => s.description === 'CURRENT')?.score?.goals || 0} ${awayTeam.name}*\n`;
            report += `🕒 Dakika: ${m.minute}' | 🏆 ${m.league?.name}\n`;
            report += `📊 Korner: ${hCorner}-${aCorner} | İ.Şut: ${hShots}-${aShots}\n`;
            
            // Baskı Algoritması: Bir takımın korner ve şut toplamı diğerinden çok üstünse yıldız koy
            if ((hCorner + hShots) > (aCorner + aShots) + 4) report += `⚡ *Baskı: ${homeTeam.name} yükleniyor!*\n`;
            if ((aCorner + aShots) > (hCorner + hShots) + 4) report += `⚡ *Baskı: ${awayTeam.name} yükleniyor!*\n`;
            
            report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
            count++;
        });

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    } catch (e) {
        console.error(e);
        bot.sendMessage(msg.chat.id, "❌ Sportmonks hatası: Yetki yetersiz veya bağlantı koptu. (Not: Ücretsiz plan sadece belirli ligleri destekler)");
    }
});

http.createServer((req, res) => { res.end('KopRadar Sportmonks Live Ready'); }).listen(PORT);
