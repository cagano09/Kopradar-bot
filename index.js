const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const MY_CHAT_ID = "1094416843";
const bot = new TelegramBot(TOKEN, { polling: true });

function kapsamliAnaliz(metin) {
    const sayilar = metin.match(/\d+/g);
    if (!sayilar || sayilar.length < 7) return "❌ Veri eksik! Lütfen Dakika, Şut, Korner, Kart ve Atak verilerinin tamamını kopyalayıp gönderin.";

    // Verileri metinden çekme (Sıralama: Dak, hSut, aSut, hKorner, aKorner, hKart, aKart, hTehAtak, aTehAtak)
    const dak = parseInt(sayilar[0]);
    const tSut = parseInt(sayilar[1]) + parseInt(sayilar[2]);
    const tKorner = parseInt(sayilar[3]) + parseInt(sayilar[4]);
    const tKart = parseInt(sayilar[5]) + parseInt(sayilar[6]);
    const tTehAtak = parseInt(sayilar[7] || 0) + parseInt(sayilar[8] || 0);

    // 1. GOL ANALİZİ (Gol Olur mu?)
    const golBeklentisi = (tTehAtak / dak) * (tSut / 5);
    let golYorum = "⌛ Düşük: Oyun orta sahada sıkışmış.";
    if (golBeklentisi > 2.5) golYorum = "🔥 ÇOK YÜKSEK: Kale her an düşebilir!";
    else if (golBeklentisi > 1.5) golYorum = "✅ YÜKSEK: Baskı sonuç vermek üzere.";

    // 2. KORNER ANALİZİ (Korner Olur mu?)
    const kornerPotansiyeli = (tKorner / (dak / 10));
    let kornerYorum = "📉 Stabil: Kanat akınları az.";
    if (kornerPotansiyeli > 1.5) kornerYorum = "🚀 COŞKULU: Sürekli korner çıkıyor, devamı gelir.";
    else if (kornerPotansiyeli > 1.0) kornerYorum = "🚩 AKTİF: Korner kovalanabilir.";

    // 3. KART & SERTLİK (Maç Kopar mı?)
    const sertlikEndeksi = (tKart / (dak / 15));
    let kartYorum = "🟢 Sakin: Dostane bir maç.";
    if (sertlikEndeksi > 1.5) kartYorum = "🔴 PATLAMAYA HAZIR: Kırmızı kart kapıda!";
    else if (sertlikEndeksi > 0.8) kartYorum = "🟨 GERGİN: Hakem kartlarına başvuruyor.";

    return `🛡️ *KOPRADAR PRO ANALİZ v14.2*\n\n` +
           `🕒 Dakika: ${dak}\n` +
           `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n` +
           `🥅 *GOL OLASILIĞI:* \n${golYorum}\n\n` +
           `🚩 *KORNER DURUMU:* \n${kornerYorum}\n\n` +
           `🟨 *KART & SERTLİK:* \n${kartYorum}\n` +
           `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n` +
           `📊 *MAÇ KARAKTERİ:* \n` +
           `${golBeklentisi > 2 ? "🏟️ Tek Kale Maç" : "⚖️ Denk Kuvvetler"}\n` +
           `💡 _Tavsiye: Dakika ${dak}, ${golBeklentisi > 2 ? "Canlıdan 0.5 ÜST mantıklı." : "Alt seçenekleri hala masada."}_`;
}

bot.on('message', (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID || msg.text.startsWith('/')) return;
    bot.sendMessage(msg.chat.id, kapsamliAnaliz(msg.text), { parse_mode: "Markdown" });
});

http.createServer((req, res) => { res.end('KopRadar v14.2 Multi-Analiz Active'); }).listen(process.env.PORT || 8080);
