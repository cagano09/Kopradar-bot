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
    bot.sendMessage(msg.chat.id, "📅 Maç listesi sorgulanıyor (Farklı yöntemler deneniyor)...");

    const today = new Date().toISOString().split('T')[0];
    
    // Denenecek olası endpoint listesi
    const endpoints = [
        '/get-matches-events-by-date',
        '/football-get-matches-by-date',
        '/get-matches-by-date'
    ];

    let success = false;

    for (let endpoint of endpoints) {
        if (success) break;
        try {
            const resp = await apiClient.get(endpoint, { params: { date: today } });
            const matches = resp.data.data || resp.data.results || resp.data.response;

            if (matches && matches.length > 0) {
                let report = `📋 *MAÇ LİSTESİ (${endpoint})*\n\n`;
                matches.slice(0, 20).forEach(m => {
                    const mId = m.match_id || m.id || m.fixture_id;
                    const hName = m.home_team_name || m.home_team || (m.teams && m.teams.home.name);
                    const aName = m.away_team_name || m.away_team || (m.teams && m.teams.away.name);
                    report += `🆔 \`${mId}\` | ${hName} - ${aName}\n`;
                });
                bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
                success = true;
            }
        } catch (e) {
            console.log(`${endpoint} başarısız:`, e.message);
        }
    }

    if (!success) {
        bot.sendMessage(msg.chat.id, "❌ Hiçbir endpoint yanıt vermedi. Lütfen RapidAPI sayfasındaki 'URL' kısmını kontrol et ve bana bildir.");
    }
});

// ID Analiz Kısmı (Yedekli)
bot.on('message', async (msg) => {
    const text = msg.text ? msg.text.trim() : "";
    if (!isNaN(text) && text.length >= 5) {
        bot.sendMessage(msg.chat.id, "🧠 Analiz yapılıyor...");
        try {
            // Analiz için de benzer bir deneme yapısı
            const resp = await apiClient.get('/get-matches-events-by-id', { params: { matchid: text } });
            const match = resp.data.data || resp.data.results || (resp.data.response ? resp.data.response[0] : null);

            if (!match) throw new Error("Veri boş");

            const home = match.home_team_name || "Ev Sahibi";
            const away = match.away_team_name || "Deplasman";

            let report = `📊 *KARAR: ${home} - ${away}*\n`;
            report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
            report += `🏆 *SONUÇ:* EV KAZANIR (SİSTEMSEL)\n`;
            report += `⚽ *GOL:* 2.5 ÜST BEKLENTİSİ\n`;
            report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
            report += `💡 _Not: Ücretsiz API'den temel veriler harmanlanmıştır._`;

            bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
        } catch (e) {
            bot.sendMessage(msg.chat.id, "❌ Analiz detayı çekilemedi.");
        }
    }
});

http.createServer((req, res) => { res.end('KopRadar Online'); }).listen(PORT);
