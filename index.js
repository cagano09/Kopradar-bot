const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

// ================= AYARLAR =================
const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const API_KEY_1 = "82179df2de2549cc8d507a5b3b8804aa"; 
const API_KEY_2 = "38db841187mshe4a6710f3f7be69p10c7ddjsn0e369c17c1fa"; 
const MY_CHAT_ID = "1094416843";
const PORT = process.env.PORT || 8080;

// BOTUN TANIMLANMASI (Hatanın çözümü burası)
const bot = new TelegramBot(TOKEN, { polling: true });
let cache = { matches: [] };

const client1 = axios.create({
    baseURL: 'https://api.football-data.org/v4',
    headers: { 'X-Auth-Token': API_KEY_1 }
});

// ANALİZ FONKSİYONU
function hybridAnalysis(hT, aT, tableSize) {
    const hRank = hT ? hT.position : 10;
    const aRank = aT ? aT.position : 10;
    const hPower = ((tableSize - (hRank - 1)) / tableSize) * 10;
    const aPower = ((tableSize - (aRank - 1)) / tableSize) * 10;
    const total = hPower + aPower + 3;
    
    return {
        ms1: (1 / ((hPower / total) * 0.85)).toFixed(2),
        msX: "3.45",
        ms2: (1 / ((aPower / total) * 0.85)).toFixed(2),
        scoreExp: ((hPower + aPower) / 5).toFixed(2)
    };
}

// ================= KOMUTLAR =================

bot.onText(/\/liste/, async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    bot.sendMessage(msg.chat.id, "🔍 Maçlar taranıyor...");

    try {
        const resp = await client1.get('/matches');
        const allMatches = resp.data.matches || [];
        const today = new Date().toISOString().split('T')[0];
        
        // Bugünün ve planlanmış maçları al
        cache.matches = allMatches.filter(m => m.utcDate.includes(today) || m.status === 'SCHEDULED' || m.status === 'LIVE');

        if (cache.matches.length === 0) {
            return bot.sendMessage(msg.chat.id, "📭 Şu an aktif maç bulunamadı.");
        }

        let report = `📋 *GÜNCEL HİBRİT BÜLTEN*\n\n`;
        cache.matches.slice(0, 45).forEach(m => {
            const icon = m.status === 'LIVE' ? '🔴' : '🕒';
            report += `${icon} 🆔 \`${m.id}\` | ${m.competition.name}\n👉 ${m.homeTeam.shortName} - ${m.awayTeam.shortName}\n\n`;
        });
        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Liste çekilemedi. API limiti dolmuş olabilir.");
    }
});

bot.on('message', async (msg) => {
    const text = msg.text?.trim();
    if (!text || isNaN(text) || text.startsWith('/')) return;
    
    const match = cache.matches.find(m => String(m.id) === text);
    if (!match) return;

    bot.sendMessage(msg.chat.id, "🧬 Analiz ediliyor...");

    try {
        let hT, aT, tSize = 20;
        try {
            const stResp = await client1.get(`/competitions/${match.competition.code}/standings`);
            const table = stResp.data.standings[0].table;
            hT = table.find(t => t.team.id === match.homeTeam.id);
            aT = table.find(t => t.team.id === match.awayTeam.id);
            tSize = table.length;
        } catch (err) {}

        const res = hybridAnalysis(hT, aT, tSize);
        let report = `📊 *${match.homeTeam.name} - ${match.awayTeam.name}*\n`;
        report += `🎯 MS 1: **${res.ms1}** | MS X: **${res.msX}** | MS 2: **${res.ms2}**\n`;
        report += `⚽ Gol Beklentisi: **${res.scoreExp}**\n`;
        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    } catch (e) {
        bot.sendMessage(msg.chat.id, "❌ Veri çekilemedi.");
    }
});

// Render'da hata almamak için gerekli server
http.createServer((req, res) => { res.end('KopRadar v11.2 Active'); }).listen(PORT);
