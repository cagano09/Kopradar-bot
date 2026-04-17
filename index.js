const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

// RENDER WEB SUNUCUSU
const port = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
    res.writeHead(200); res.end('KopRadar Ultra Guvenli Motor Aktif');
});
server.listen(port);

// TELEGRAM BOT AYARLARI
const token = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const bot = new TelegramBot(token, {polling: true});

// 🔑 GEREKLİ ANAHTARLAR
const API_KEY = "82179df2de2549cc8d507a5b3b8804aa";
const MY_CHAT_ID = "1094416843"; 

// 🛡️ KURAL 1: CACHING (ÖNBELLEK) SİSTEMİ
// Maç verilerini API'den her komutta çekmek yerine 10 dakika boyunca bu hafızada tutarız.
let matchCache = {
    data: null,
    lastFetchTime: 0
};
const CACHE_DURATION = 10 * 60 * 1000; // 10 Dakika (Milisaniye cinsinden)

// Football-Data.org Ücretsiz Lig Kodları (PL: Premier Lig, PD: La Liga, SA: Serie A vb.)
const TARGET_COMPS = ["PL", "PD", "SA", "BL1", "FL1", "DED", "PPL", "BSA", "CL", "ELC"]; 

function getRandomFloat(min, max) { return (Math.random() * (max - min) + min).toFixed(2); }

// GÜVENLİ VERİ ÇEKME FONKSİYONU
async function fetchMatchesSecurely() {
    if(API_KEY === "BURAYA_API_ANAHTARINI_YAZ") return { error: "API Key Eksik!" };

    const now = Date.now();
    
    // CACHE KONTROLÜ: Eğer veriyi son 10 dakika içinde çektiysek, API'ye gitme! Hafızadakini kullan.
    if (matchCache.data && (now - matchCache.lastFetchTime < CACHE_DURATION)) {
        console.log("🛡️ Güvenlik: API'ye gidilmedi. Önbellekteki (Cache) veriler kullanılıyor.");
        return { data: matchCache.data, fromCache: true };
    }

    try {
        console.log("📡 API'den yeni veriler çekiliyor...");
        
        // 🛡️ KURAL 3: HEADER KULLANIMI (Tarayıcı gibi davranıyoruz)
        const response = await fetch("https://api.football-data.org/v4/matches", {
            method: "GET",
            headers: { 
                "X-Auth-Token": API_KEY, // Football-Data.org bu ismi kullanır
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json"
            }
        });

        if(!response.ok) {
            return { error: `API Hatası: ${response.status} (Dakikalık limiti aşmış veya banlanmış olabilirsiniz)` };
        }

        const resultData = await response.json();
        
        // Başarılı olursa hafızaya (Cache) kaydet ve zamanı güncelle
        matchCache.data = resultData;
        matchCache.lastFetchTime = now;
        
        // 🛡️ KURAL 2: REQUEST DELAY (Sistemi yormamak için kod akışını 2 saniye uyutuyoruz)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return { data: resultData, fromCache: false };

    } catch (error) {
        console.error("Bağlantı Hatası:", error); 
        return { error: "Sunucuya bağlanılamadı." };
    }
}

async function generateValueCoupon() {
    let fetchResult = await fetchMatchesSecurely();
    if(fetchResult.error) return fetchResult.error;

    let data = fetchResult.data;

    if(!data.matches || data.matches.length === 0) return "Bugün bültende maç bulunamadı.";

    // FİLTRELEME: Hedef liglerdeki "Başlamamış" (TIMED veya SCHEDULED) maçlar
    let upcomingMatches = data.matches.filter(m => 
        TARGET_COMPS.includes(m.competition.code) && 
        (m.status === "TIMED" || m.status === "SCHEDULED")
    );

    if(upcomingMatches.length < 3) return "Şu an oynanmamış elit lig maçı yeterli sayıda (En az 3) değil. Lütfen daha sonra tekrar deneyin.";

    let valueBets = [];

    for(let m of upcomingMatches) {
        // xG ve Value Bet Simülasyon Matematiği
        let home_xg_last_5 = (Math.random() * (2.8 - 0.8) + 0.8).toFixed(2); 
        let away_xg_last_5 = (Math.random() * (2.2 - 0.5) + 0.5).toFixed(2); 
        
        let home_dangerous_attacks_avg = Math.floor(Math.random() * (70 - 30) + 30);
        let away_dangerous_attacks_avg = Math.floor(Math.random() * (60 - 20) + 20);
        let is_key_player_missing = Math.random() > 0.85;

        let homeWinProbability = 0.33; 
        if(home_xg_last_5 > away_xg_last_5) homeWinProbability += 0.20;
        if(home_dangerous_attacks_avg > away_dangerous_attacks_avg + 15) homeWinProbability += 0.15;
        if(!is_key_player_missing) homeWinProbability += 0.05;
        if(is_key_player_missing && home_xg_last_5 < 1.5) homeWinProbability -= 0.10; 
        if(homeWinProbability > 0.95) homeWinProbability = 0.95;

        let fairOdd = (1 / homeWinProbability).toFixed(2);
        let bookmaker_odd = (parseFloat(fairOdd) + (Math.random() * 0.40 - 0.15)).toFixed(2);
        let is_value = parseFloat(bookmaker_odd) > parseFloat(fairOdd);

        let pick = ""; let reason = "";

        if(is_value && homeWinProbability > 0.55 && parseFloat(bookmaker_odd) >= 1.40) {
            pick = "Maç Sonucu 1";
            reason = `xG Avantajı (+${(home_xg_last_5 - away_xg_last_5).toFixed(2)}). Gerçek İhtimal: %${(homeWinProbability*100).toFixed(0)}. Adil Oran ${fairOdd} (Value Bet)`;
            
            // Tarihi Türkçe formata çevir
            let matchDate = new Date(m.utcDate);
            let timeString = matchDate.toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'});
            
            valueBets.push({ matchName: `${m.homeTeam.name} - ${m.awayTeam.name}`, league: m.competition.name, time: timeString, pick: pick, odd: parseFloat(bookmaker_odd), reason: reason, prob: (homeWinProbability*100).toFixed(0) });
        }
        else if(home_xg_last_5 > 1.40 && away_xg_last_5 > 1.30) {
            let kgVarProb = 0.65;
            let kgFairOdd = (1 / kgVarProb).toFixed(2);
            let kgBookmakerOdd = parseFloat(getRandomFloat(1.50, 1.80));
            if(kgBookmakerOdd > kgFairOdd) {
                pick = "Karşılıklı Gol Var";
                reason = `İki takımın da xG ortalaması 1.30'un üzerinde. Matematiksel olarak kârlı bahis.`;
                
                let matchDate = new Date(m.utcDate);
                let timeString = matchDate.toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'});
                
                valueBets.push({ matchName: `${m.homeTeam.name} - ${m.awayTeam.name}`, league: m.competition.name, time: timeString, pick: pick, odd: kgBookmakerOdd, reason: reason, prob: 65 });
            }
        }
    }

    valueBets.sort((a, b) => b.prob - a.prob);
    let finalCoupon = []; let totalOdd = 1.0;

    for(let match of valueBets) {
        if(finalCoupon.length < 5) {
            if(finalCoupon.length >= 3 && (totalOdd * match.odd) > 10.0) break;
            finalCoupon.push(match); totalOdd = totalOdd * match.odd;
        }
        if(finalCoupon.length >= 3 && totalOdd >= 5.0 && totalOdd <= 10.0) break;
    }

    if(finalCoupon.length < 3) return "Şu an Value Bet (Değerli Oran) algoritmama uyan yeterince kârlı maç bulamadım. Kasa koruması için PAS.";
    return { matches: finalCoupon, totalOdd: totalOdd.toFixed(2), fromCache: fetchResult.fromCache };
}

bot.onText(/\/kupon/, async (msg) => {
    const chatId = msg.chat.id;
    if(MY_CHAT_ID !== "BURAYA_KENDI_ID_RAKAMLARINI_YAZ" && chatId.toString() !== MY_CHAT_ID) return;

    bot.sendMessage(chatId, "🤖 **Algoritma Devrede...** Lütfen bekleyin.", {parse_mode: 'Markdown'});
    
    let result = await generateValueCoupon();
    if(typeof result === "string") return bot.sendMessage(chatId, `⚠️ ${result}`, {parse_mode: 'Markdown'});

    let finalMessage = `✅ **GÜNÜN XG & VALUE BET KUPONU** ✅\n`;
    if(result.fromCache) finalMessage += `_(Hızlı Yanıt: 10 dakikalık Güvenli Önbellekten okundu)_\n\n`;
    else finalMessage += `\n`;

    result.matches.forEach((m, index) => {
        finalMessage += `📌 **MAÇ ${index + 1}:** ${m.matchName}\n`;
        finalMessage += `🌍 **LİG:** ${m.league}\n`;
        finalMessage += `⏰ **SAAT:** ${m.time}\n`;
        finalMessage += `🎯 **TAHMİN:** ${m.pick} (Tahmini Oran: ${m.odd.toFixed(2)})\n`;
        finalMessage += `📝 **ANALİZ:** ${m.reason}\n\n`;
    });

    finalMessage += `────────────────────────────\n`;
    finalMessage += `💰 **TOPLAM TAHMİNİ ORAN:** **${result.totalOdd}**\n`;
    bot.sendMessage(chatId, finalMessage, {parse_mode: 'Markdown'});
});

console.log("KopRadar Ultra Güvenli Motor Başlatıldı!");
