const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

// ================= AYARLAR =================
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

// ================= ANALİZ & ORAN MOTORU =================

function calculateIdealOdds(hPower, aPower) {
    // Güçleri olasılığa çevir (Basitleştirilmiş Poisson mantığı)
    const total = hPower + aPower;
    const hWinProb = (hPower / total) * 0.85; // %15 beraberlik/hata payı düşüyoruz
    const aWinProb = (aPower / total) * 0.85;

    // Oran = 1 / Olasılık
    return {
        hOdd: (1 / hWinProb).toFixed(2),
        aOdd: (1 / aWinProb).toFixed(2)
    };
}

// ================= KOMUTLAR =================

bot.onText(/\/liste/, async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    bot.sendMessage(msg.chat.id, "📊 Ligler ve oranlar analiz ediliyor...");

    try {
        const resp = await apiClient.get('/matches', { params: { status: 'SCHEDULED' } });
        const matches = resp.data.matches || [];
        cache.matches = matches;

        const leagues = [...new Set(matches.map(m => m.competition.code))];
        for (const code of leagues) {
            const stResp = await apiClient.get(`/competitions/${code}/standings`);
            cache.standings[code] = stResp.data.standings[0].table;
        }

        let report = `📋 *KOPRADAR v5.5: İDEAL ORAN ANALİZİ*\n\n`;
        matches.slice(0, 30).forEach(m => {
            report += `🆔 \`${m.id}\` | ${m.homeTeam.shortName} - ${m.awayTeam.shortName}\n`;
        });
        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Liste alınamadı.");
    }
});

bot.on('message', async (msg) => {
    const text = msg.text?.trim();
    if (!text || isNaN(text)) return;

    const match = cache.matches.find(m => String(m.id) === text);
    if (!match) return;

    try {
        const table = cache.standings[match.competition.code];
        const hTeam = table.find(t => t.team.id === match.homeTeam.id);
        const aTeam = table.find(t => t.team.id === match.awayTeam.id);

        const parseForm = (f) => {
            if(!f) return 5;
            let p = 0;
            f.split(',').forEach(r => { if(r==='W') p+=2; if(r==='D') p+=1; });
            return (p/10)*10;
        };

        // GÜÇ PARAMETRELERİ
        const hStats = {
            rank: ((table.length - (hTeam.position - 1)) / table.length) * 10,
            form: parseForm(hTeam.form),
            saha: (hTeam.home.won / hTeam.home.played) * 10 || 5
        };
        const aStats = {
            rank: ((table.length - (aTeam.position - 1)) / table.length) * 10,
            form: parseForm(aTeam.form),
            saha: (aTeam.away.won / aTeam.away.played) * 10 || 5
        };

        const hFinal = (hStats.rank * 0.4) + (hStats.form * 0.3) + (hStats.saha * 0.3);
        const aFinal = (aStats.rank * 0.4) + (aStats.form * 0.3) + (aStats.saha * 0.3);

        const ideal = calculateIdealOdds(hFinal, aFinal);

        let report = `📊 *MAÇ:* ${match.homeTeam.name} - ${match.awayTeam.name}\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `🎯 *BOTUN HESAPLADIĞI İDEAL ORANLAR:*\n`;
        report += `🏠 **MS 1:** ${ideal.hOdd}\n`;
        report += `✈️ **MS 2:** ${ideal.aOdd}\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `💡 *NASIL KULLANILIR?*\n`;
        report += `Eğer senin bahis sitendeki oran, botun oranından **DAHA YÜKSEKSE** (Örn: Bot 1.50 dedi, site 1.80 veriyor), bu maçta **VALUE (Değer)** vardır.`;

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Analiz hatası.");
    }
});

http.createServer((req, res) => { res.end('KopRadar v5.5'); }).listen(PORT);
