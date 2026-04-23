const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const FOOTBALL_DATA_API_KEY = "82179df2de2549cc8d507a5b3b8804aa"; 
const MY_CHAT_ID = "1094416843"; 
const PORT = process.env.PORT || 8080;

const bot = new TelegramBot(TOKEN, { polling: true });

let cache = { matches: [], standings: {} };

const apiClient = axios.create({
    baseURL: 'https://api.football-data.org/v4',
    headers: { 'X-Auth-Token': FOOTBALL_DATA_API_KEY }
});

// Oran Hesaplama Motoru
function calculateIdealOdds(hPower, aPower) {
    const total = hPower + aPower;
    if (total === 0) return { hOdd: "0.00", aOdd: "0.00" };
    
    // %15 kar marjı/beraberlik payı bırakılmış olasılık
    const hWinProb = (hPower / total) * 0.82; 
    const aWinProb = (aPower / total) * 0.82;

    return {
        hOdd: (1 / hWinProb).toFixed(2),
        aOdd: (1 / aWinProb).toFixed(2)
    };
}

bot.onText(/\/liste/, async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    bot.sendMessage(msg.chat.id, "📊 Bülten hazırlanıyor...");

    try {
        const resp = await apiClient.get('/matches', { params: { status: 'SCHEDULED' } });
        cache.matches = resp.data.matches || [];

        const leagues = [...new Set(cache.matches.map(m => m.competition.code))];
        for (const code of leagues) {
            try {
                const stResp = await apiClient.get(`/competitions/${code}/standings`);
                cache.standings[code] = stResp.data.standings[0].table;
            } catch (err) { console.log(`${code} tablosu alınamadı.`); }
        }

        let report = `📋 *LİSTE GÜNCELLENDİ*\n\n`;
        cache.matches.slice(0, 30).forEach(m => {
            report += `🆔 \`${m.id}\` | ${m.homeTeam.shortName} - ${m.awayTeam.shortName}\n`;
        });
        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ API Hatası. Lütfen 1 dakika bekleyip tekrar /liste yapın.");
    }
});

bot.on('message', async (msg) => {
    const text = msg.text?.trim();
    
    // Komutları ve sayı olmayan mesajları ele
    if (!text || text.startsWith('/') || isNaN(text)) return;

    // ÖNEMLİ: ID'yi hem string hem number olarak kontrol et
    const match = cache.matches.find(m => String(m.id) === text);
    
    if (!match) {
        // Eğer maç bulunamadıysa kullanıcıya bilgi ver (Sessiz kalma sorunu çözümü)
        return bot.sendMessage(msg.chat.id, "⚠️ Bu ID bültende bulunamadı. Lütfen önce /liste yaparak güncel ID'leri alın.");
    }

    bot.sendMessage(msg.chat.id, `🧬 ${match.homeTeam.shortName} maçı için ideal oranlar hesaplanıyor...`);

    try {
        const table = cache.standings[match.competition.code];
        if (!table) throw new Error("Puan durumu bulunamadı.");

        const hTeam = table.find(t => t.team.id === match.homeTeam.id);
        const aTeam = table.find(t => t.team.id === match.awayTeam.id);

        if (!hTeam || !aTeam) throw new Error("Takım verisi eksik.");

        const parseForm = (f) => {
            if(!f) return 5;
            let p = 0;
            f.split(',').forEach(r => { if(r==='W') p+=2; if(r==='D') p+=1; });
            return (p/10)*10;
        };

        const hStats = {
            rank: ((table.length - (hTeam.position - 1)) / table.length) * 10,
            form: parseForm(hTeam.form),
            saha: (hTeam.home.won / (hTeam.home.played || 1)) * 10
        };
        const aStats = {
            rank: ((table.length - (aTeam.position - 1)) / table.length) * 10,
            form: parseForm(aTeam.form),
            saha: (aTeam.away.won / (aTeam.away.played || 1)) * 10
        };

        const hFinal = (hStats.rank * 0.4) + (hStats.form * 0.3) + (hStats.saha * 0.3);
        const aFinal = (aStats.rank * 0.4) + (aStats.form * 0.3) + (aStats.saha * 0.3);

        const ideal = calculateIdealOdds(hFinal, aFinal);

        let report = `📊 *${match.homeTeam.name} - ${match.awayTeam.name}*\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `🎯 *İDEAL BAHİS ORANLARI:*\n`;
        report += `🏠 **EV:** ${ideal.hOdd}\n`;
        report += `✈️ **DEP:** ${ideal.aOdd}\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `🔍 *Analiz Notu:* Eğer bahis sitesi bu oranlardan daha YÜKSEK veriyorsa o seçenek değerlidir.`;

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Veri hatası: Bu maçın lig tablosuna şu an ulaşılamıyor.");
    }
});

http.createServer((req, res) => { res.end('KopRadar v5.6 Ready'); }).listen(PORT);
