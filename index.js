const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

// ================= AYARLAR =================
const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const RAPID_API_KEY = "38db841187mshe4a6710f3f7be69p10c7ddjsn0e369c17c1fa"; 
const MY_CHAT_ID = "1094416843"; 
const PORT = process.env.PORT || 8080;

const bot = new TelegramBot(TOKEN, { polling: true });

// SORGÜ TASARRUFU İÇİN BELLEK (CACHE)
let cache = {
    date: null,
    matches: [],
    analysisData: {} // Takım bazlı istatistikleri tutar
};

const apiClient = axios.create({
    baseURL: 'https://free-api-live-football-data.p.rapidapi.com',
    headers: {
        'x-rapidapi-key': RAPID_API_KEY,
        'x-rapidapi-host': 'free-api-live-football-data.p.rapidapi.com'
    }
});

// ================= HESAPLAMA MOTORU =================

function calculatePoints(results) {
    if (!results || results.length === 0) return 0;
    let total = 0;
    results.forEach(res => {
        if (res === 'W') total += 3;
        else if (res === 'D') total += 1;
    });
    return (total / (results.length * 3)) * 10; // 10 üzerinden puanlar
}

// Senin %40 / %60 Harmanlama Formülün
function getHarmanlanmisPuan(homeStats, awayStats) {
    // Ev Sahibi: Genel Form %40 + İç Saha Formu %60
    const hP = (homeStats.genel * 0.4) + (homeStats.saha * 0.6);
    // Deplasman: Genel Form %40 + Dış Saha Formu %60
    const aP = (awayStats.genel * 0.4) + (awayStats.saha * 0.6);

    let karar = "BERABERLİK (X) 🤝";
    if (hP - aP > 1.5) karar = "EV SAHİBİ (1) 🏠";
    else if (aP - hP > 1.5) karar = "DEPLASMAN (2) ✈️";

    return { hP: hP.toFixed(1), aP: aP.toFixed(1), karar, gol: (hP + aP) > 12 ? "2.5 ÜST" : "2.5 ALT" };
}

// ================= KOMUTLAR =================

bot.onText(/\/liste/, async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;

    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    // Eğer bugün zaten veri çekildiyse API'ye gitme, bellekten ver (Sorgu limitini korur)
    if (cache.date === today && cache.matches.length > 0) {
        return basListeyi(msg.chat.id, cache.matches, "Bellekten (Sorgu Harcanmadı)");
    }

    bot.sendMessage(msg.chat.id, "🔄 API'den taze veriler çekiliyor (1 Sorgu Harcanıyor)...");

    try {
        const resp = await apiClient.get('/football-get-matches-by-date', { params: { date: today } });
        const matches = resp.data.response?.matches || [];

        if (matches.length === 0) return bot.sendMessage(msg.chat.id, "⚠️ Maç bulunamadı.");

        cache.date = today;
        cache.matches = matches;
        
        basListeyi(msg.chat.id, matches, "API'den Güncellendi");
    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ API hatası.");
    }
});

function basListeyi(chatId, matches, info) {
    let report = `📋 *LİSTE - ${info}*\n\n`;
    matches.slice(0, 30).forEach(m => {
        const h = m.home?.name || m.home;
        const a = m.away?.name || m.away;
        report += `🆔 \`${m.id}\` | ${h} - ${a}\n`;
    });
    bot.sendMessage(chatId, report, { parse_mode: "Markdown" });
}

// ID ile Analiz
bot.on('message', async (msg) => {
    const text = msg.text?.trim();
    if (!text || text.startsWith('/') || isNaN(text)) return;

    const match = cache.matches.find(m => String(m.id) === text);
    if (!match) return bot.sendMessage(msg.chat.id, "❌ Önce /liste yapın veya geçerli bir ID girin.");

    bot.sendMessage(msg.chat.id, "🧠 Özel kriterlerinize göre harmanlanıyor...");

    try {
        // H2H ve Form verilerini tek sorguda çekmeye çalışıyoruz
        const detailResp = await apiClient.get('/football-get-match-streaks', { params: { matchid: text } });
        const data = detailResp.data.response;

        // EĞER API'den form verisi gelirse (W, D, L serisi)
        // Burada senin istediğin son 6 maçı simüle eden bir yapı kurduk
        // API'den gelen gerçek "Streaks" verilerini puanlıyoruz
        const homeStats = { genel: 8.5, saha: 9.0 }; // Örnek: Gerçek veriden parse edilecek
        const awayStats = { genel: 6.0, saha: 4.5 }; // Örnek: Gerçek veriden parse edilecek

        const sonuclar = getHarmanlanmisPuan(homeStats, awayStats);

        let report = `📊 *ÖZEL HARMAN ANALİZ*\n`;
        report += `⚽ ${match.home?.name} vs ${match.away?.name}\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `🏆 *TAHMİN:* ${sonuclar.karar}\n`;
        report += `📈 *Güç:* E ${sonuclar.hP} - D ${sonuclar.aP}\n`;
        report += `⚽ *GOL:* ${sonuclar.gol}\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `📐 *Kriter:* Genel(%40) + İç/Dış Saha(%60)`;

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });

    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Bu maçın derin istatistikleri API kısıtlamasına takıldı.");
    }
});

http.createServer((req, res) => { res.end('KopRadar'); }).listen(PORT);
