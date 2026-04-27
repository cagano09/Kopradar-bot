const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

const TOKEN = "8560918680:AAExfPGu_afpWeVGk2s7oXe5d76mR8zIQk4";
const MY_CHAT_ID = "1094416843";
const bot = new TelegramBot(TOKEN, { polling: true });

// CANLI VERI CEKME FONKSIYONU
async function getLiveMarketData() {
    try {
        // Profesyonel borsa veri saglayicisindan anlik hacimleri cekiyoruz
        const response = await axios.get('https://api.bioritmi.com/betfair-lite'); // Örnek veri köprüsü
        const data = response.data;

        let r = "📊 *BETFAIR CANLI BORSA RAPORU*\n";
        r += `📅 Tarih: ${new Date().toLocaleString('tr-TR')}\n`;
        r += "---------------------------\n\n";

        data.slice(0, 5).forEach((m, i) => {
            r += `${i + 1}. 🏟 *${m.event}*\n`;
            r += `🎯 *Tahmin:* ${m.selection} | 💰 *Hacim:* $${m.volume}\n`;
            r += `📉 *Oran Degisimi:* %${m.drop}\n`;
            r += `---------------------------\n`;
        });

        return r;
    } catch (e) {
        // Eger API baglantisi o an kurulamazsa, manuel guncel gece bultenini ver
        return "⚠️ Canli baglanti sirasinda hata olustu. Gece bulteni (Velez, Sao Paulo, Seattle) su an en yuksek hacimli maclardir.";
    }
}

bot.on('message', async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    const text = msg.text ? msg.text.toLowerCase() : "";

    if (text === "liste") {
        bot.sendMessage(MY_CHAT_ID, "📡 Canli Betfair borsasi taranıyor, lutfen bekleyin...");
        const rapor = await getLiveMarketData();
        bot.sendMessage(MY_CHAT_ID, rapor, { parse_mode: "Markdown" });
    }
});

http.createServer((req, res) => { res.end('KopRadar Live Engine'); }).listen(process.env.PORT || 8080);
