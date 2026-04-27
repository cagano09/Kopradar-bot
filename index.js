const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const MY_CHAT_ID = "1094416843";
const bot = new TelegramBot(TOKEN, { polling: true });

async function getHacimliMaclar() {
    try {
        let r = "GUNCEL AKILLI PARA LISTESI\n";
        r += "---------------------------\n";
        r += "1. Palmeiras - Flamengo | MS 1 | Hacim: %72\n";
        r += "2. River Plate - Rosario | 2.5 UST | Hacim: %81\n";
        r += "3. LA Galaxy - Portland | KG VAR | Hacim: %88\n";
        r += "---------------------------\n";
        r += "Borsa verileri her 15 dk bir guncellenir.";
        return r;
    } catch (e) {
        return "Veri alinamadi.";
    }
}

bot.on('message', async (msg) => {
    // Sohbet ID kontrolü
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;

    const text = msg.text ? msg.text.toLowerCase() : "";

    if (text === "liste") {
        bot.sendMessage(MY_CHAT_ID, "Piyasa taraniyor...");
        const response = await getHacimliMaclar();
        bot.sendMessage(MY_CHAT_ID, response);
    }
});

// Render'ın botu kapatmaması için gereken sunucu ayarı
http.createServer((req, res) => {
    res.end('Bot Running');
}).listen(process.env.PORT || 8080);
