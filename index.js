const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

const TOKEN = "8560918680:AAExfPGu_afpWeVGk2s7oXe5d76mR8zIQk4";
const MY_CHAT_ID = "1094416843";
const API_KEY = "34f7101f120aeecf6f4e14e8e2d88d6e"; // Senin verdiğin Odds API Key

const bot = new TelegramBot(TOKEN, { polling: true });

async function getLiveOdds() {
    try {
        // Dünyadaki güncel futbol maçlarını ve oranlarını çeker
        const url = `https://api.the-odds-api.com/v4/sports/soccer/odds/?apiKey=${API_KEY}&regions=eu&markets=h2h&bookmakers=pinnacle,betfair_ex_uk`;
        
        const response = await axios.get(url);
        const data = response.data;

        if (!data || data.length === 0) {
            return "⚠️ Şu an aktif veya yakında başlayacak maç bulunamadı.";
        }

        let r = "🏆 *BORSA CANLI ANALİZ (İLK 10 MAÇ)*\n";
        r += `📅 *Tarih:* ${new Date().toLocaleString('tr-TR')}\n`;
        r += "---------------------------\n\n";

        // İlk 10 maçı alalım
        const top10 = data.slice(0, 10);

        top10.forEach((m, i) => {
            const evSahibi = m.home_team;
            const deplasman = m.away_team;
            const lig = m.sport_title;
            
            // Betfair veya Pinnacle oranlarını çekmeye çalışalım
            let oranlar = "Oranlar yükleniyor...";
            if (m.bookmakers && m.bookmakers[0]) {
                const outcome = m.bookmakers[0].markets[0].outcomes;
                oranlar = `1: ${outcome[0].price} | X: ${outcome[2].price} | 2: ${outcome[1].price}`;
            }

            r += `${i + 1}. 🏟 *${evSahibi} - ${deplasman}*\n`;
            r += `🏆 *Lig:* ${lig}\n`;
            r += `📊 *Oranlar:* ${oranlar}\n`;
            r += `---------------------------\n`;
        });

        r += "\n✅ *Veriler Betfair/Pinnacle üzerinden anlık çekilmiştir.*";
        return r;

    } catch (error) {
        console.error(error);
        return "❌ API bağlantı hatası! Lütfen anahtar limitini veya internet bağlantısını kontrol et başkanım.";
    }
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    if (chatId !== MY_CHAT_ID) return;

    const text = msg.text ? msg.text.toLowerCase() : "";

    if (text === "liste" || text === "/start") {
        bot.sendMessage(chatId, "📡 Dünya borsaları taranıyor, gerçek zamanlı veriler çekiliyor...");
        const rapor = await getLiveOdds();
        bot.sendMessage(chatId, rapor, { parse_mode: "Markdown" });
    }
});

// Render için basit sunucu
http.createServer((req, res) => {
    res.end('KopRadar API Engine v59.0 Live');
}).listen(process.env.PORT || 8080);
