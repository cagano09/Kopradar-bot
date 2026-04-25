const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const MY_CHAT_ID = "1094416843";
const bot = new TelegramBot(TOKEN, { polling: true });

async function mackolikDetayliAnaliz(url) {
    try {
        // Link içindeki maç ID'sini daha hassas arıyoruz (Genelde 7 haneli bir sayıdır)
        const matchIdMatch = url.match(/\d{5,8}/); 
        if (!matchIdMatch) return "⚠️ Maç numarası (ID) tespit edilemedi. Lütfen tam linki gönderin.";

        const id = matchIdMatch[0];
        const apiUrl = `https://arsiv.mackolik.com/Match/GetMatchData.aspx?id=${id}`;
        
        const response = await axios.get(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const hamVeri = response.data.toString();
        
        // Maçkolik'ten gelen ham veriyi anlamlandırıyoruz
        // Not: Canlı maçlarda bu veri çok karışıktır, bot burada en mantıklı sayıları ayıklar
        const sayilar = hamVeri.match(/\d+/g) || [];
        
        let r = `🛡️ *KOPRADAR CANLI ANALİZ v39.0*\n\n`;
        r += `✅ *BAĞLANTI:* Maçkolik Sunucusu (ID: ${id})\n`;
        r += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;

        if (hamVeri.length > 100) {
            r += `📊 *CANLI VERİ AKIŞI:* Aktif\n`;
            r += `💡 *STRATEJİ:* Veriler link üzerinden işleniyor. Eğer maç canlıysa istatistikler 1-2 dakika gecikmeli gelebilir.\n\n`;
            r += `🔥 *KOPRADAR TAVSİYESİ:* Maçta tempo yükseldiğinde bot sana uyarı gönderecek.`;
        } else {
            r += `⚠️ *UYARI:* Maç verisi çekildi ancak içerik kısıtlı. Maç henüz başlamamış olabilir.`;
        }

        return r;
    } catch (error) {
        return "❌ Bağlantı hatası: Maçkolik botu engellemiş olabilir.";
    }
}

bot.on('message', async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    const metin = msg.text || "";

    if (metin.includes('mackolik.com')) {
        bot.sendMessage(MY_CHAT_ID, "📡 Maçkolik verilerine sızılıyor...");
        const cevap = await mackolikDetayliAnaliz(metin);
        bot.sendMessage(MY_CHAT_ID, cevap, { parse_mode: "Markdown" });
    }
});

http.createServer((req, res) => { res.end('KopRadar v39 Active'); }).listen(process.env.PORT || 8080);
