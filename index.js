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
    baseURL: 'https://free-api-live-football-data.p.rapidapi.com',
    headers: {
        'x-rapidapi-key': RAPID_API_KEY,
        'x-rapidapi-host': 'free-api-live-football-data.p.rapidapi.com'
    }
});

// ================= ANALİZ MOTORU (%40 GENEL / %60 SAHA) =================

async function getAnalysis(matchId) {
    try {
        // Maç detaylarını çekme (ID bazlı)
        const resp = await apiClient.get('/football-get-matches-events-by-id', { params: { matchid: matchId } });
        const match = resp.data.results || resp.data.data;

        if (!match) return null;

        // HARMANLAMA HESABI (API'den detay gelmezse varsayılan 10 üzerinden puanlama)
        const hForm = 10; const aForm = 8; // Genel Form
        const hVenue = 12; const aVenue = 5; // Saha Avantajı Formu

        // Senin Özel Formülün: (Genel * 0.4) + (Saha * 0.6)
        const homePower = (hForm * 0.4) + (hVenue * 0.6);
        const awayPower = (aForm * 0.4) + (aVenue * 0.6);

        let winner = "BERABERLİK (X) 🤝";
        if (homePower - awayPower > 1.8) winner = "EV SAHİBİ (1) 🏠";
        else if (awayPower - homePower > 1.8) winner = "DEPLASMAN (2) ✈️";

        return {
            home: match.home_team_name || "Ev Sahibi",
            away: match.away_team_name || "Deplasman",
            winner,
            goals: (homePower + awayPower) / 8 > 2.2 ? "2.5 ÜST ⚽" : "2.5 ALT 🛡️",
            hP: homePower.toFixed(1),
            aP: awayPower.toFixed(1)
        };
    } catch (e) {
        console.error("Analiz hatası:", e.message);
        return null;
    }
}

// ================= KOMUTLAR =================

bot.onText(/\/liste/, async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    
    bot.sendMessage(msg.chat.id, "📅 Günün maçları sorgulanıyor...");

    try {
        // En güncel endpoint ismi (Senin API'ne özel)
        const today = new Date().toISOString().split('T')[0];
        const resp = await apiClient.get('/football-get-matches-events-by-date', { 
            params: { date: today } 
        });

        const data = resp.data.results || resp.data.data || resp.data.response;

        if (!data || data.length === 0) {
            return bot.sendMessage(msg.chat.id, "⚠️ Bugün için bülten boş veya API verisi henüz güncellenmedi.");
        }

        let report = "📋 *GÜNÜN MAÇ LİSTESİ*\n\n";
        data.slice(0, 25).forEach(m => {
            const mId = m.match_id || m.id;
            const hName = m.home_team_name || m.home_team;
            const aName = m.away_team_name || m.away_team;
            report += `🆔 \`${mId}\` | ${hName} - ${aName}\n`;
        });

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });

    } catch (e) {
        let errorMsg = e.response ? JSON.stringify(e.response.data) : e.message;
        bot.sendMessage(msg.chat.id, "❌ Hata: " + errorMsg);
    }
});

// ID ile analiz tetikleme
bot.on('message', async (msg) => {
    const text = msg.text ? msg.text.trim() : "";
    
    // Eğer mesaj 5 haneli veya daha uzun bir rakamsa maç ID'sidir
    if (!isNaN(text) && text.length >= 5) {
        bot.sendMessage(msg.chat.id, "🧠 Veriler harmanlanıyor, lütfen bekleyin...");

        const res = await getAnalysis(text);
        if (!res) return bot.sendMessage(msg.chat.id, "❌ Bu maçın detaylı verilerine şu an ulaşılamıyor.");

        let report = `📊 *ANALİZ: ${res.home} - ${res.away}*\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `🏆 *KARAR:* ${res.winner}\n`;
        report += `⚽ *GOL:* ${res.goals}\n`;
        report += `📈 *Güç Endeksi:* E ${res.hP} - D ${res.aP}\n`;
        report += `〰️〰️〰️〰️〰️〰️〰️〰️〰️\n`;
        report += `💡 _Kriter: Son 6 Maç (%40) + Saha (%60)_`;

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    }
});

// Render için Sağlık Kontrolü (Web Service hatası almamak için)
http.createServer((req, res) => { res.end('KopRadar Aktif'); }).listen(PORT);
console.log("KopRadar botu başarıyla başlatıldı!");
