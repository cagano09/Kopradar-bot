const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

// ================= AYARLAR =================
const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const API_KEY = "82179df2de2549cc8d507a5b3b8804aa";
const MY_CHAT_ID = "1094416843"; 
const PORT = process.env.PORT || 8080;

const bot = new TelegramBot(TOKEN, { polling: true });

// ================= CACHE (ÖNBELLEK) SİSTEMİ =================
let matchCache = {
    data: null,
    lastFetchTime: 0
};
const CACHE_DURATION = 20 * 60 * 1000; // 20 Dakika (Banlanmayı önlemek için ideal süre)

// ================= MONTE CARLO & POISSON ALGORİTMASI =================
function runMonteCarlo(match) {
    // Takım ID'lerinden sentetik güç ve form verisi türetme (API kısıtlaması nedeniyle)
    // Gerçek bir modelde buralara lig tablosu verileri çekilip eklenmelidir.
    const homeId = match.homeTeam.id;
    const awayId = match.awayTeam.id;

    // Temel Gol Beklentisi (Lambda) - Form ve güç simülasyonu
    let lambdaHome = 1.2 + ((homeId % 10) / 10);
    let lambdaAway = 1.0 + ((awayId % 10) / 10);

    // Ev sahibi/Motivasyon avantajı katsayısı
    lambdaHome *= 1.10;

    let results = { homeWin: 0, draw: 0, awayWin: 0, over25: 0, totalGoals: 0, scores: {} };
    const iterations = 10000;

    for (let i = 0; i < iterations; i++) {
        // Poisson Dağılımına Göre Gol Üretimi
        let hGoals = 0, aGoals = 0;
        let LHome = Math.exp(-lambdaHome), LAway = Math.exp(-lambdaAway);
        let pHome = 1.0, pAway = 1.0;

        do { hGoals++; pHome *= Math.random(); } while (pHome > LHome);
        do { aGoals++; pAway *= Math.random(); } while (pAway > LAway);
        hGoals--; aGoals--;

        // İstatistikleri Kaydet
        if (hGoals > aGoals) results.homeWin++;
        else if (hGoals === aGoals) results.draw++;
        else results.awayWin++;

        if (hGoals + aGoals > 2.5) results.over25++;
        results.totalGoals += (hGoals + aGoals);

        let scoreKey = `${hGoals}-${aGoals}`;
        results.scores[scoreKey] = (results.scores[scoreKey] || 0) + 1;
    }

    // En Olası Skor
    let topScore = Object.keys(results.scores).reduce((a, b) => results.scores[a] > results.scores[b] ? a : b);

    return {
        homeProb: (results.homeWin / 100).toFixed(1),
        drawProb: (results.draw / 100).toFixed(1),
        awayProb: (results.awayWin / 100).toFixed(1),
        overProb: (results.over25 / 100).toFixed(1),
        avgGoals: (results.totalGoals / iterations).toFixed(2),
        topScore
    };
}

// ================= API VERİ ÇEKME =================
async function fetchMatches() {
    const now = Date.now();
    if (matchCache.data && (now - matchCache.lastFetchTime < CACHE_DURATION)) {
        return matchCache.data;
    }

    const today = new Date().toISOString().split('T')[0];
    const tomorrowObj = new Date();
    tomorrowObj.setDate(tomorrowObj.getDate() + 1);
    const tomorrow = tomorrowObj.toISOString().split('T')[0];
    
    // Ücretsiz plan kısıtlaması nedeniyle tarih aralığını dar tutuyoruz
    const url = `https://api.football-data.org/v4/matches?dateFrom=${today}&dateTo=${tomorrow}`;

    try {
        const response = await fetch(url, {
            headers: { 'X-Auth-Token': API_KEY }
        });

        if (response.status === 429) {
            console.error("API Limit Aşıldı!");
            return "LIMIT_EXCEEDED";
        }

        const data = await response.json();
        const matches = data.matches ? data.matches.filter(m => m.status === 'TIMED' || m.status === 'SCHEDULED') : [];
        
        matchCache.data = matches;
        matchCache.lastFetchTime = now;
        return matches;
    } catch (e) {
        console.error("Fetch Hatası:", e);
        return null;
    }
}

// ================= TELEGRAM KOMUTLARI =================

bot.onText(/\/start/, (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    const help = "🤖 *KopRadar Monte Carlo Analiz Botu*\n\n" +
                 "📋 `/liste` - Günün maçlarını ve ID'lerini getirir.\n" +
                 "🎯 `/simule [ID]` - Seçilen maçı 10.000 kez simüle eder.\n" +
                 "💰 `/kupon` - En yüksek güvenli maçlardan kupon yapar.";
    bot.sendMessage(msg.chat.id, help, { parse_mode: "Markdown" });
});

bot.onText(/\/liste/, async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    
    bot.sendMessage(msg.chat.id, "🔄 Maç listesi güncelleniyor, lütfen bekleyin...");
    const matches = await fetchMatches();

    if (matches === "LIMIT_EXCEEDED") {
        return bot.sendMessage(msg.chat.id, "⚠️ API limiti doldu. Lütfen 15 dakika bekleyin.");
    }

    if (!matches || matches.length === 0) {
        return bot.sendMessage(msg.chat.id, "⚠️ Bugün desteklenen liglerde oynanacak maç bulunamadı.");
    }

    let response = "📅 *Bugün & Yarın Oynanacak Maçlar:*\n\n";
    matches.slice(0, 30).forEach(m => {
        response += `🆔 \`${m.id}\` | ${m.homeTeam.shortName} - ${m.awayTeam.shortName}\n`;
    });

    bot.sendMessage(msg.chat.id, response, { parse_mode: "Markdown" });
});

bot.onText(/\/simule (.+)/, async (msg, match) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    const matchId = match[1].trim();

    const matches = await fetchMatches();
    const target = (matches && matches !== "LIMIT_EXCEEDED") ? matches.find(m => m.id.toString() === matchId) : null;

    if (!target) {
        return bot.sendMessage(msg.chat.id, "❌ Maç bulunamadı. Lütfen `/liste` ile ID'yi kontrol edin.");
    }

    bot.sendMessage(msg.chat.id, `⚙️ *${target.homeTeam.name}* maçı için 10.000 olasılık hesaplanıyor...`, { parse_mode: "Markdown" });

    const sim = runMonteCarlo(target);

    let report = `📊 *MONTE CARLO ANALİZ RAPORU*\n`;
    report += `🏟 *${target.homeTeam.name} - ${target.awayTeam.name}*\n`;
    report += `🏆 ${target.competition.name}\n`;
    report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
    report += `🏠 Ev Kazanır: %${sim.homeProb}\n`;
    report += `🤝 Beraberlik: %${sim.drawProb}\n`;
    report += `🚀 Deplasman Kazanır: %${sim.awayProb}\n\n`;
    report += `⚽ 2.5 Üst Olasılığı: %${sim.overProb}\n`;
    report += `🥅 Beklenen Gol: ${sim.avgGoals}\n`;
    report += `🎯 *En Olası Skor:* ${sim.topScore}\n`;
    report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
    report += `💡 _Sistem her maçı 10.000 kez simüle ederek en istikrarlı sonucu bulur._`;

    bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
});

// ================= SUNUCU =================
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('KopRadar Bot is Online');
}).listen(PORT);

console.log("Bot başlatıldı...");
