const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

const TOKEN = "8560918680:AAExfPGu_afpWeVGk2s7oXe5d76mR8zIQk4";
const MY_CHAT_ID = "1094416843";
const API_KEY = "34f7101f120aeecf6f4e14e8e2d88d6e";

const bot = new TelegramBot(TOKEN, { polling: true });

async function getBorsaListesi() {
    try {
        // Betfair Exchange verilerine odaklanıyoruz
        const url = `https://api.the-odds-api.com/v4/sports/soccer/odds/?apiKey=${API_KEY}&regions=eu&markets=h2h&bookmakers=betfair_ex_uk`;
        const response = await axios.get(url);
        const data = response.data;

        if (!data || data.length === 0) return "⚠️ Şu an aktif borsa verisi bulunamadı.";

        let r = "🏦 *BETFAIR EXCHANGE CANLI TAKİP LİSTESİ*\n";
        r += `📅 *Tarih:* ${new Date().toLocaleString('tr-TR')}\n`;
        r += "---------------------------\n\n";

        const top10 = data.slice(0, 10);

        top10.forEach((m, i) => {
            const ev = m.home_team;
            const dep = m.away_team;
            const lig = m.sport_title;
            
            let oranSatiri = "";
            if (m.bookmakers && m.bookmakers[0]) {
                const outcomes = m.bookmakers[0].markets[0].outcomes;
                oranSatiri = `📊 *Oranlar:* 1: ${outcomes[0].price} | X: ${outcomes[2].price} | 2: ${outcomes[1].price}`;
            }

            // Betfair'de bu maçın hacmini görebileceğin resmi arama linki
            const borsaLink = `https://www.betfair.com/exchange/plus/football/search/${encodeURIComponent(ev)}`;

            r += `${i + 1}. 🏟 *${ev} - ${dep}*\n`;
            r += `🏆 *Lig:* ${lig}\n`;
            r += `${oranSatiri}\n`;
            r += `🔗 [Gerçek Para Hacmini Gör](${borsaLink})\n`;
            r += `---------------------------\n`;
        });

        r += "\n✅ *Linke tıklayarak Betfair üzerindeki 'Matched' (Eşleşen Para) miktarını resmi siteden görebilirsiniz.*";
        return r;

    } catch (error) {
        return "❌ Borsa bağlantı hatası oluştu.";
    }
}

bot.on('message', async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    if (msg.text?.toLowerCase() === "liste") {
        bot.sendMessage(MY_CHAT_ID, "📡 Canlı borsa taranıyor...");
        const rapor = await getBorsaListesi();
        bot.sendMessage(MY_CHAT_ID, rapor, { parse_mode: "Markdown", disable_web_page_preview: true });
    }
});

http.createServer((req, res) => { res.end('KopRadar Official Link Engine v61.0'); }).listen(process.env.PORT || 8080);
