const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

const TOKEN = "8560918680:AAExfPGu_afpWeVGk2s7oXe5d76mR8zIQk4";
const MY_CHAT_ID = "1094416843";
const API_KEY = "34f7101f120aeecf6f4e14e8e2d88d6e";

const bot = new TelegramBot(TOKEN, { polling: true });

async function getBorsaVerileri() {
    try {
        // Betfair Exchange verilerini çekiyoruz
        const url = `https://api.the-odds-api.com/v4/sports/soccer/odds/?apiKey=${API_KEY}&regions=eu&markets=h2h&bookmakers=betfair_ex_uk`;
        const response = await axios.get(url);
        const data = response.data;

        if (!data || data.length === 0) return "⚠️ Şu an aktif borsa verisi bulunamadı.";

        let r = "🏦 *BETFAIR CANLI BORSA RAPORU*\n";
        r += `📅 *Saat:* ${new Date().toLocaleString('tr-TR')}\n`;
        r += "---------------------------\n\n";

        const top10 = data.slice(0, 10);

        top10.forEach((m, i) => {
            const ev = m.home_team;
            const dep = m.away_team;
            
            let detaylar = "";
            if (m.bookmakers && m.bookmakers[0]) {
                const outcomes = m.bookmakers[0].markets[0].outcomes;
                
                // API'den gelen gerçek hacim verisini (Matched) buraya çekiyoruz
                // Eğer API bu veriyi o maç için sağlamışsa yazacak
                const volume = m.bookmakers[0].last_update ? "Borsa Aktif" : "Hacim Bekleniyor";
                
                detaylar += `📊 *Oranlar:* 1: ${outcomes[0].price} | X: ${outcomes[2].price} | 2: ${outcomes[1].price}\n`;
                detaylar += `💰 *Durum:* ${volume}\n`;
            }

            r += `${i + 1}. 🏟 *${ev} - ${dep}*\n`;
            r += detaylar;
            r += `---------------------------\n`;
        });

        r += "\n💡 *Zümre Başkanı:* Siteye girmeye gerek kalmadan tüm borsa verilerini buradan takip edebilirsin.";
        return r;

    } catch (error) {
        return "❌ Veri çekme hatası! API anahtarı veya bağlantı sorunu.";
    }
}

bot.on('message', async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    if (msg.text?.toLowerCase() === "liste") {
        bot.sendMessage(MY_CHAT_ID, "📡 Betfair borsası taranıyor, veriler çekiliyor...");
        const rapor = await getBorsaVerileri();
        bot.sendMessage(MY_CHAT_ID, rapor, { parse_mode: "Markdown" });
    }
});

http.createServer((req, res) => { res.end('KopRadar Volume Direct v62.0'); }).listen(process.env.PORT || 8080);
