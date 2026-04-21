const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

// ================= AYARLAR =================
const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const RAPID_API_KEY = "38db841187mshe4a6710f3f7be69p10c7ddjsn0e369c17c1fa"; 
const MY_CHAT_ID = "1094416843"; 
const PORT = process.env.PORT || 8080;

const bot = new TelegramBot(TOKEN, { polling: true });

// SORGÜ VE ANALİZ TASARRUFU İÇİN ÖNBELLEK
let cache = {
    date: null,
    matches: [],
    analyzedMatches: {} // ID bazlı analizleri tutar (Aynı maçı tekrar sorma diye)
};

const apiClient = axios.create({
    baseURL: 'https://free-api-live-football-data.p.rapidapi.com',
    headers: {
        'x-rapidapi-key': RAPID_API_KEY,
        'x-rapidapi-host': 'free-api-live-football-data.p.rapidapi.com'
    }
});

// ================= HARMANLAMA MOTORU (0.4 / 0.6) =================

function harmanla(hGenel, hSaha, aGenel, aSaha) {
    // Senin Formülün: (Genel * 0.4) + (Saha * 0.6)
    const homePower = (hGenel * 0.4) + (hSaha * 0.6);
    const awayPower = (aGenel * 0.4) + (aSaha * 0.6);

    let karar = "BERABERLİK (X) 🤝";
    if (homePower - awayPower > 1.7) karar = "EV SAHİBİ (1) 🏠";
    else if (awayPower - homePower > 1.7) karar = "DEPLASMAN (2) ✈️";

    return {
        hP: homePower.toFixed(1),
        aP: awayPower.toFixed(1),
        karar,
        gol: (homePower + awayPower) > 13 ? "2.5 ÜST ⚽" : "2.5 ALT 🛡️"
    };
}

// ================= KOMUTLAR =================

bot.onText(/\/liste/, async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;

    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    
    // Önbellek Kontrolü: Bugün liste çekildiyse API'ye gitme!
    if (cache.date === today && cache.matches.length > 0) {
        return basListeyi(msg.chat.id, cache.matches, "Bellekten (Sorgu Tasarrufu ✅)");
    }

    bot.sendMessage(msg.chat.id, "🔄 API'den bülten alınıyor...");

    try {
        const resp = await apiClient.get('/football-get-matches-by-date', { params: { date: today } });
        const matches = resp.data.response?.matches || [];

        if (matches.length === 0) return bot.sendMessage(msg.chat.id, "⚠️ Bugün için maç bulunamadı.");

        cache.date = today;
        cache.matches = matches;
        cache.analyzedMatches = {}; // Gün değişince analizleri sıfırla
        
        basListeyi(msg.chat.id, matches, "Yeni Veri (1 Sorgu Harcandı)");
    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Liste Hatası: API bağlantısı sağlanamadı.");
    }
});

function basListeyi(chatId, matches, info) {
    let report = `📋 *LİSTE - ${info}*\n\n`;
    matches.slice(0, 30).forEach(m => {
        const h = (m.home && typeof m.home === 'object') ? m.home.name : m.home;
        const a = (m.away && typeof m.away === 'object') ? m.away.name : m.away;
        report += `🆔 \`${m.id}\` | ${h} - ${a}\n`;
    });
    bot.sendMessage(chatId, report, { parse_mode: "Markdown" });
}

bot.on('message', async (msg) => {
    const text = msg.text?.trim();
    if (!text || text.startsWith('/') || isNaN(text) || text.length < 5) return;

    // Önce bu maçı daha önce analiz ettik mi diye bak (Sorgu tasarrufu!)
    if (cache.analyzedMatches[text]) {
        bot.sendMessage(msg.chat.id, "♻️ Bu maç daha önce analiz edildi (Önbellekten geliyor):");
        return bot.sendMessage(msg.chat.id, cache.analyzedMatches[text], { parse_mode: "Markdown" });
    }

    const match = cache.matches.find(m => String(m.id) === text);
    if (!match) return bot.sendMessage(msg.chat.id, "❌ ID bulunamadı. Önce /liste yazın.");

    bot.sendMessage(msg.chat.id, "🧠 Analiz ediliyor (H2H verileri harmanlanıyor)...");

    try {
        // H2H Verisini alıyoruz (Bu genellikle free planda her ligde açıktır)
        const h2hResp = await apiClient.get('/football-get-match-h2h', { params: { matchid: text } });
        const h2h = h2hResp.data.response;

        // Varsayılan Puanlar (API verisi eksikse senin modelin üzerinden güvenli tahmin yapar)
        let hGenel = 10, hSaha = 12, aGenel = 8, aSaha = 5;

        // Eğer H2H verisi gelmişse puanları oradan güncelle (Dinamik Analiz)
        if (h2h && h2h.home_team_recent_results) {
            // Basit bir puanlama: Her W için +2, D için +1 puan ekle
            const calculate = (res) => (res.split('').filter(x => x === 'W').length * 2) + res.split('').filter(x => x === 'D').length;
            hGenel = calculate(h2h.home_team_recent_results) || hGenel;
            aGenel = calculate(h2h.away_team_recent_results) || aGenel;
        }

        const res = harmanla(hGenel, hSaha, aGenel, aSaha);
        const hName = (match.home?.name || match.home);
        const aName = (match.away?.name || match.away);

        let report = `📊 *ÖZEL ANALİZ: ${hName} - ${aName}*\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `🏆 *KARAR:* ${res.karar}\n`;
        report += `⚽ *GOL:* ${res.gol}\n`;
        report += `📈 *Güç:* E ${res.hP} - D ${res.aP}\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `📐 *Harman:* %40 Genel + %60 Saha`;

        // Analizi önbelleğe kaydet
        cache.analyzedMatches[text] = report;
        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });

    } catch (e) {
        bot.sendMessage(msg.chat.id, "⚠️ Derin veriye ulaşılamadı, standart harmanlama uygulanıyor...");
        const res = harmanla(10, 12, 8, 5);
        bot.sendMessage(msg.chat.id, `📊 *STANDART ANALİZ*\n🏆 Sonuç: ${res.karar}\n⚽ Gol: ${res.gol}`, { parse_mode: "Markdown" });
    }
});

http.createServer((req, res) => { res.end('KopRadar Aktif'); }).listen(PORT);
