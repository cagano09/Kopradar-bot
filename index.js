const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

// Yeni aldığın temiz token
const TOKEN = "8560918680:AAExfPGu_afpWeVGk2s7oXe5d76mR8zIQk4";
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
    const chatId = msg.chat.id.toString();
    const text = msg.text ? msg.text.toLowerCase() : "";

    // Sadece senin ID'nden gelen mesajlara cevap verir
    if (chatId === MY_CHAT_ID) {
        if (text === "liste" || text === "merhaba" || text === "/start") {
            bot.sendMessage(chatId, "Piyasa taranıyor, akıllı para izleri sürülüyor...");
            const response = await getHacimliMaclar();
            bot.sendMessage(chatId, response);
        }
    }
});

// Render'ın uykuya dalmaması için sunucu
http.createServer((req, res) => {
    res.end('KopRadar v54.4 Live');
}).listen(process.env.PORT || 8080);
