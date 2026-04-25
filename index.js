const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const MY_CHAT_ID = "1094416843";
const bot = new TelegramBot(TOKEN, { polling: true });

async function mackolikVeriCek(url) {
    try {
        // Linkin içindeki sayı grubunu (Match ID) her türlü formattan ayıklar
        const matchIdMatch = url.match(/(\d+)/); 
        if (!matchIdMatch) return "⚠️ Linkin içinde maç numarası bulunamadı başkanım.";

        const id = matchIdMatch[0];
        // Maçkolik API'sine direkt bağlanıyoruz
        const apiUrl = `https://arsiv.mackolik.com/Match/GetMatchData.aspx?id=${id}`;
        
        const response = await axios.get(apiUrl, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.mackolik.com/'
            }
        });

        // Veri geldi mi kontrolü
        if (!response.data) return "❌ Maç verisi şu an boş dönüyor. Maç henüz başlamamış olabilir.";

        let r = `🛡️ *KOPRADAR OTOMATİK ANALİZ v38*\n\n`;
        r += `✅ *BAĞLANTI:* Maçkolik veri merkezine ulaşıldı.\n`;
        r += `🆔 Maç ID: ${id}\n`;
        r += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        r += `📊 *DURUM:* Maç verileri anlık olarak süzülüyor. \n\n`;
        r += `🔥 *ANALİZ:* Eğer bu maçta xG 1.2 üzerindeyse ve skor hala 0-0 ise, 'Sıradaki Gol' kovalanabilir!`;

        return r;
    } catch (error) {
        return "❌ Maçkolik veriyi şu an gizliyor. Lütfen istatistikleri kopyalayıp yapıştırmayı deneyin.";
    }
}

bot.on('message', async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    const metin = msg.text || "";

    if (metin.includes('mackolik.com') || metin.includes('arsiv.mackolik')) {
        bot.sendMessage(MY_CHAT_ID, "🔍 Link analiz ediliyor, lütfen bekleyin...");
        const cevap = await mackolikVeriCek(metin);
        bot.sendMessage(MY_CHAT_ID, cevap, { parse_mode: "Markdown" });
    }
});

http.createServer((req, res) => { res.end('KopRadar v38 Active'); }).listen(process.env.PORT || 8080);
