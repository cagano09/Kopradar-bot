const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

// ================= AYARLAR =================
const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const FOOTBALL_DATA_API_KEY = "82179df2de2549cc8d507a5b3b8804aa"; 
const MY_CHAT_ID = "1094416843"; 
const PORT = process.env.PORT || 8080;

const bot = new TelegramBot(TOKEN, { polling: true });
let cache = { matches: [] };

const apiClient = axios.create({
    baseURL: 'https://api.football-data.org/v4',
    headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY },
    timeout: 10000
});

// ================= ANALİZ MOTORU (v7.5) =================

function analyzeFull(hT, aT, totalTeams) {
    // 1. Puan ve Sıralama Gücü
    const hRankP = ((totalTeams - (hT.position - 1)) / totalTeams) * 10;
    const aRankP = ((totalTeams - (aT.position - 1)) / totalTeams) * 10;

    // 2. İç/Dış Saha Gol İstatistikleri
    const hScored = hT.home.goalsFor / (hT.home.played || 1);
    const hConceded = hT.home.goalsAgainst / (hT.home.played || 1);
    const aScored = aT.away.goalsFor / (aT.away.played || 1);
    const aConceded = aT.away.goalsAgainst / (aT.away.played || 1);

    // 3. Güç Puanı Hesaplama
    const hPower = (hRankP * 0.4) + (hScored * 1.5) + (3 - hConceded);
    const aPower = (aRankP * 0.4) + (aScored * 1.5) + (3 - aConceded);

    // 4. Beraberlik (X) Mantığı: Güçler yakınsa beraberlik puanı artar
    const diff = Math.abs(hPower - aPower);
    let drawPower = diff < 1.5 ? 4.5 : 2.0;

    // 5. Olasılık Dağılımı (%90 Üzerinden - %10 Sürpriz Payı)
    const total = hPower + aPower + drawPower;
    const p1 = (hPower / total) * 0.90;
    const pX = (drawPower / total) * 0.90;
    const p2 = (aPower / total) * 0.90;

    // 6. Sonuç Kararı
    let karar = "BERABERLİK (X) 🤝";
    if (p1 > p2 && p1 > pX && (p1 - pX) > 0.05) karar = "EV SAHİBİ (1) 🏠";
    if (p2 > p1 && p2 > pX && (p2 - pX) > 0.05) karar = "DEPLASMAN (2) ✈️";

    return {
        o1: (1/p1).toFixed(2), oX: (1/pX).toFixed(2), o2: (1/p2).toFixed(2),
        y1: (p1*100).toFixed(0), yX: (pX*100).toFixed(0), y2: (p2*100).toFixed(0),
        karar, gExp: (hScored + aConceded + aScored + hConceded) / 2
    };
}

// ================= KOMUTLAR =================

bot.onText(/\/liste/, async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    bot.sendMessage(msg.chat.id, "🌍 Tüm majör liglerdeki güncel bülten çekiliyor...");

    try {
        const resp = await apiClient.get('/matches', { params: { status: 'SCHEDULED' } });
        cache.matches = resp.data.matches || [];

        let report = `📋 *KOPRADAR v7.5 BÜLTENİ*\n\n`;
        cache.matches.slice(0, 50).forEach(m => {
            report += `🆔 \`${m.id}\` | ${m.competition.name}\n👉 ${m.homeTeam.shortName} - ${m.awayTeam.shortName}\n\n`;
        });

        if (cache.matches.length === 0) report = "⚠️ Şu an analiz edilecek yeni maç bulunamadı.";
        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ API Hatası: Liste alınamadı. Limit dolmuş olabilir.");
    }
});

bot.on('message', async (msg) => {
    const text = msg.text?.trim();
    if (!text || text.startsWith('/') || isNaN(text)) return;

    const match = cache.matches.find(m => String(m.id) === text);
    if (!match) return;

    bot.sendMessage(msg.chat.id, `🧬 ${match.homeTeam.shortName} maçı analiz ediliyor...`);

    try {
        const stResp = await apiClient.get(`/competitions/${match.competition.code}/standings`);
        const table = stResp.data.standings[0].table;

        const hT = table.find(t => t.team.id === match.homeTeam.id);
        const aT = table.find(t => t.team.id === match.awayTeam.id);

        if (!hT || !aT) throw new Error("Takım verisi eksik");

        const res = analyzeFull(hT, aT, table.length);

        let report = `📊 *${match.homeTeam.name} - ${match.awayTeam.name}*\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `🏆 *TAHMİN:* ${res.karar}\n`;
        report += `⚽ *Gol Beklentisi:* ${res.gExp.toFixed(2)}\n\n`;
        report += `🎯 *MATEMATİKSEL İDEAL ORANLAR:*\n`;
        report += `🏠 **MS 1:** ${res.o1} (%${res.y1})\n`;
        report += `🤝 **MS X:** ${res.oX} (%${res.yX})\n`;
        report += `✈️ **MS 2:** ${res.o2} (%${res.y2})\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `💡 *İpucu:* Sitedeki oranlar yukarıdaki "İdeal Oranlar"dan daha yüksekse, o seçenek değerlidir (Value).`;

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Veri Hatası: Bu ligin veya maçın verileri ücretsiz plan kapsamında değil.");
    }
});

// Sunucuyu canlı tutmak için
http.createServer((req, res) => { res.end('KopRadar v7.5 Online'); }).listen(PORT);
