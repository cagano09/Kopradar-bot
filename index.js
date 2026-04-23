const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

// ================= AYARLAR =================
const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const RAPID_API_KEY = "38db841187mshe4a6710f3f7be69p10c7ddjsn0e369c17c1fa"; 
const MY_CHAT_ID = "1094416843";
const PORT = process.env.PORT || 8080;

const bot = new TelegramBot(TOKEN, { polling: true });

const apiClient = axios.create({
    baseURL: 'https://api-football-v1.p.rapidapi.com/v3',
    headers: {
        'x-rapidapi-key': RAPID_API_KEY,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
    }
});

// ================= ANALİZ MOTORU =================

function calculateProbabilities(pred) {
    // API'nin kendi olasılık verilerini kullan (yüzdelik olarak gelir)
    const p = pred.predictions.percent;
    
    // Yüzdeleri sayıya çevir ve 1/x ile ideal orana dönüştür
    const probH = parseFloat(p.home.replace('%', '')) / 100;
    const probX = parseFloat(p.draw.replace('%', '')) / 100;
    const probA = parseFloat(p.away.replace('%', '')) / 100;

    return {
        y1: p.home, yX: p.draw, y2: p.away,
        o1: (1 / (probH || 0.1)).toFixed(2),
        oX: (1 / (probX || 0.1)).toFixed(2),
        o2: (1 / (probA || 0.1)).toFixed(2),
        advice: pred.predictions.advice
    };
}

// ================= KOMUTLAR =================

bot.onText(/\/liste/, async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    bot.sendMessage(msg.chat.id, "🌍 Dünya genelindeki bugünkü maçlar taranıyor...");

    try {
        const today = new Date().toISOString().split('T')[0];
        const resp = await apiClient.get('/fixtures', { 
            params: { date: today, status: 'NS' } 
        });
        
        const matches = resp.data.response || [];
        if (matches.length === 0) return bot.sendMessage(msg.chat.id, "📭 Bugün için analiz edilebilir maç bulunamadı.");

        let report = `📋 *DÜNYA BÜLTENİ (v8.0)*\n\n`;
        // İlk 40 maçı listele
        matches.slice(0, 40).forEach(m => {
            report += `🆔 \`${m.fixture.id}\` | ${m.league.name}\n⚽ ${m.teams.home.name} - ${m.teams.away.name}\n\n`;
        });

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Liste hatası. API anahtarınız bu servise (API-Football) abone olmayabilir.");
    }
});

bot.on('message', async (msg) => {
    const text = msg.text?.trim();
    if (!text || text.startsWith('/') || isNaN(text)) return;

    bot.sendMessage(msg.chat.id, "🧬 Tüm dünya ligleri taranıyor ve analiz ediliyor...");

    try {
        // Maç Tahmin Verilerini Çek
        const predResp = await apiClient.get('/predictions', { params: { fixture: text } });
        const pred = predResp.data.response[0];
        
        if (!pred) throw new Error("Veri yok");

        const probs = calculateProbabilities(pred);

        let report = `📊 *${pred.teams.home.name} - ${pred.teams.away.name}*\n`;
        report += `🏆 *Lig:* ${pred.league.name} / ${pred.league.country}\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `🔥 *OLASILIKLAR:* \n`;
        report += `🏠 **MS 1:** %${probs.y1} (İdeal: ${probs.o1})\n`;
        report += `🤝 **MS X:** %${probs.yX} (İdeal: ${probs.oX})\n`;
        report += `✈️ **MS 2:** %${probs.y2} (İdeal: ${probs.o2})\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `💡 *UZMAN TAVSİYESİ:* \n`;
        report += `👉 ${probs.advice}\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `📈 *Kıyaslama:* Bahis sitesindeki oran botun ideal oranından yüksekse "Value" vardır.`;

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });

    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Analiz hatası. Bu ID'ye ait analiz verisi şu an mevcut değil.");
    }
});

http.createServer((req, res) => { res.end('KopRadar v8.0 Global Ready'); }).listen(PORT);
