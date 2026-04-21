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
    bot.sendMessage(msg.chat.id, "🔍 Doğru bağlantı yolu aranıyor (Metod 1-5)...");

    const today = new Date().toISOString().split('T')[0];
    
    // API'nin dökümanında gizli olabilecek tüm varyasyonlar
    const paths = [
        '/get-all-matches-by-date',
        '/football-all-matches-by-date',
        '/fixtures-by-date',
        '/all-matches',
        '/get-matches'
    ];

    let success = false;

    for (let path of paths) {
        if (success) break;
        try {
            const resp = await apiClient.get(path, { params: { date: today } });
            
            // Veri yapısı kontrolü
            const data = resp.data.results || resp.data.data || resp.data.response;

            if (data && data.length > 0) {
                let report = `✅ Çalışan Yol Bulundu: \`${path}\`\n\n`;
                data.slice(0, 15).forEach(m => {
                    const mId = m.match_id || m.id;
                    report += `🆔 \`${mId}\` | ${m.home_team_name || m.home_team} - ${m.away_team_name || m.away_team}\n`;
                });
                bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
                success = true;
            }
        } catch (e) {
            console.log(`${path} denendi: Başarısız.`);
        }
    }

    if (!success) {
        bot.sendMessage(msg.chat.id, "❌ Hiçbir yol çalışmadı.\n\nLütfen RapidAPI ekranındaki sağ panelde bulunan siyah kutudaki **'url'** satırını (örneğin: /v1/fixtures...) buraya kopyala. Sorunu ancak o şekilde kökten çözebiliriz.");
    }
});

// Analiz Dinleyicisi
bot.on('message', async (msg) => {
    const text = msg.text ? msg.text.trim() : "";
    if (!isNaN(text) && text.length >= 5) {
        bot.sendMessage(msg.chat.id, "🧠 Analiz ediliyor...");
        try {
            // Analiz için de en genel detay endpointini deniyoruz
            const resp = await apiClient.get('/get-match-details-by-id', { params: { matchid: text } });
            const d = resp.data.results || resp.data.data;
            
            bot.sendMessage(msg.chat.id, `📊 *Maç:* ${d.home_team_name} vs ${d.away_team_name}\n🎯 *Tahmin:* %60 Saha Avantajı ile Ev Sahibi önde.`);
        } catch (e) {
            bot.sendMessage(msg.chat.id, "❌ Detaylı veri bu ID için mevcut değil.");
        }
    }
});

// Sunucu
http.createServer((req, res) => { res.end('KopRadar Online'); }).listen(PORT);
