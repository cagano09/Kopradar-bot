const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

const TOKEN = "8560918680:AAExfPGu_afpWeVGk2s7oXe5d76mR8zIQk4";
const MY_CHAT_ID = "1094416843";
const API_KEY = "34f7101f120aeecf6f4e14e8e2d88d6e";

const bot = new TelegramBot(TOKEN, { polling: true });

async function getTemizBorsaListesi() {
    try {
        const url = `https://api.the-odds-api.com/v4/sports/soccer/odds/?apiKey=${API_KEY}&regions=eu&markets=h2h&bookmakers=betfair_ex_uk`;
        const response = await axios.get(url);
        const data = response.data;

        if (!data || data.length === 0) return "⚠️ Şu an işlenecek canlı borsa verisi bulunamadı.";

        let r = "🎯 *KOPRADAR SMART MONEY ANALİZİ*\n";
        r += `📅 *Saat:* ${new Date().toLocaleString('tr-TR')}\n`;
        r += "---------------------------\n\n";

        const top10 = data.slice(0, 10);

        top10.forEach((m, i) => {
            const ev = m.home_team;
            const dep = m.away_team;
            
            if (m.bookmakers && m.bookmakers[0]) {
                const outcomes = m.bookmakers[0].markets[0].outcomes;
                const o1 = outcomes[0].price;
                const o2 = outcomes[1].price;
                const ox = outcomes[2].price;

                // PARA HEDEFİ ANALİZİ (Borsa baskısı tespiti)
                let hedef = "Dengeli Dağılım";
                if (o1 < o2 && o1 < 2.00) hedef = "🔥 MS 1 Yönünde Yoğunlaşma";
                else if (o2 < o1 && o2 < 2.00) hedef = "🔥 MS 2 Yönünde Yoğunlaşma";
                else if (ox < 3.00) hedef = "📈 Beraberlikte Beklenmedik Baskı";

                r += `${i + 1}. 🏟 *${ev} - ${dep}*\n`;
                r += `📊 *Borsa Oranları:* 1: ${o1} | X: ${ox} | 2: ${o2}\n`;
                r += `💰 *Para Hedefi:* ${hedef}\n`;
                r += `---------------------------\n`;
            }
        });

        r += "\n✅ *Rapor tamamlandı. Veriler Betfair borsa havuzundan çekilmiştir.*";
        return r;

    } catch (error) {
        return "❌ Veri çekilirken bir hata oluştu, lütfen API keyinizi kontrol edin.";
    }
}

bot.on('message', async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    if (msg.text?.toLowerCase() === "liste") {
        bot.sendMessage(MY_CHAT_ID, "🔍 Borsa hacimleri ve para trafiği taranıyor...");
        const rapor = await getTemizBorsaListesi();
        bot.sendMessage(MY_CHAT_ID, rapor, { parse_mode: "Markdown" });
    }
});

http.createServer((req, res) => { res.end('KopRadar Clean Engine v64.0'); }).listen(process.env.PORT || 8080);
