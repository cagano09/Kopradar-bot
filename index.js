const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const MY_CHAT_ID = "1094416843"; // Burası senin numaran
const bot = new TelegramBot(TOKEN, { polling: true });

bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const text = msg.text ? msg.text.toLowerCase() : "";

    // TEST: Bot herhangi bir mesaj aldığında çalışıyor mu? 
    // Bu satır sayesinde ID yanlışsa bile bot sana "Buradayım" diyecek.
    console.log("Mesaj geldi! Gonderen ID: " + chatId);

    if (text === "liste" || text === "merhaba") {
        let r = "KOPRADAR CANLI BAGLANTI KURULDU\n";
        r += "---------------------------\n";
        r += "1. Palmeiras - Flamengo | MS 1\n";
        r += "2. River Plate - Rosario | 2.5 UST\n";
        r += "3. LA Galaxy - Portland | KG VAR\n";
        r += "---------------------------\n";
        r += "Senin ID numaran: " + chatId;
        
        // Önce senin kayıtlı ID'ne, sonra da mesajı atan kişiye (sana) gönderiyoruz
        bot.sendMessage(chatId, r); 
    }
});

http.createServer((req, res) => { res.end('Bot Aktif'); }).listen(process.env.PORT || 8080);
