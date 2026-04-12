const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

// 1. REPLIT WEB SUNUCUSU
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('KopRadar Tam Zamanli Momentum Sistemi Calisiyor!');
});
server.listen(8080);

// 2. TELEGRAM BOT AYARLARI
const token = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const bot = new TelegramBot(token, {polling: true});
const subscribers = new Set();

// 3. API-FOOTBALL ANAHTARI
const API_KEY = "e7ac9a7866864265a83bd3b463cf86af";

// MAJÖR LİGLER
const TARGET_LEAGUES = [39, 140, 78, 135, 61, 203, 2, 3]; 

let opportunities = [];

function broadcastOpportunity(matchId, title, desc, teamName, minute) {
    let exists = opportunities.find(o => o.matchId === matchId && o.title === title);
    if(exists) return;

    opportunities.push({ matchId: matchId, title: title });

    let message = `🔥 **MOMENTUM UYARISI** 🔥\n⏱️ Dakika: ${minute}'\n\n💡 **${title}**\n👉 **Baskı Kuran Takım:** ${teamName}\n📝 *${desc}*\n\n📡 _KopRadar Akıllı İstatistik Sistemi_`;

    subscribers.forEach(chatId => {
        bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });
}

function getStatValue(statsArray, typeName) {
    if(!statsArray) return 0;
    let stat = statsArray.find(s => s.type === typeName);
    return (stat && stat.value !== null) ? parseInt(stat.value) : 0;
}

async function fetchAndAnalyzeMomentum() {
    if(API_KEY === "BURAYA_API_ANAHTARINI_YAZ") return console.log("API Key eksik!");

    try {
        const response = await fetch("https://v3.football.api-sports.io/fixtures?live=all", {
            method: "GET", headers: { "x-apisports-key": API_KEY }
        });
        const data = await response.json();

        if(!data.response) return;

        // DEĞİŞİKLİK: Sadece 45. dakika sonrasını değil, 20. dakikadan sonraki TÜM canlı maçları alıyoruz!
        let targetMatches = data.response.filter(m => 
            TARGET_LEAGUES.includes(m.league.id) && 
            m.fixture.status.elapsed > 20 // İlk 20 dk veri oturmasını bekle
        );

        for (let match of targetMatches) {
            let matchId = match.fixture.id;
            let time = match.fixture.status.elapsed;
            let homeName = match.teams.home.name;
            let awayName = match.teams.away.name;

            const statsRes = await fetch(`https://v3.football.api-sports.io/fixtures/statistics?fixture=${matchId}`, {
                method: "GET", headers: { "x-apisports-key": API_KEY }
            });
            const statsData = await statsRes.json();

            if(statsData.response && statsData.response.length === 2) {
                let homeStats = statsData.response[0].statistics;
                let awayStats = statsData.response[1].statistics;

                let homeDangerous = getStatValue(homeStats, "Dangerous Attacks");
                let awayDangerous = getStatValue(awayStats, "Dangerous Attacks");

                let homeShotsOnTarget = getStatValue(homeStats, "Shots on Goal");
                let awayShotsOnTarget = getStatValue(awayStats, "Shots on Goal");

                // İlk yarı için fark barajını 15'e, ikinci yarı için 25'e çıkarıyoruz
                let diffThreshold = time < 45 ? 15 : 25;
                // Şut beklentisini ilk yarı için 2'ye, ikinci yarı için 4'e düşürüyoruz
                let shotThreshold = time < 45 ? 2 : 4;

                // EV SAHİBİ BASKISI
                if (homeDangerous > (awayDangerous + diffThreshold) && homeShotsOnTarget >= shotThreshold) {
                    broadcastOpportunity(
                        matchId, 
                        time < 45 ? "İlk Yarıda Müthiş Baskı!" : "Ceza Sahasına Hapsetti!", 
                        `${homeName} oyunun kontrolünü tamamen eline aldı. \n(Tehlikeli Atak: ${homeDangerous} - ${awayDangerous})\n(İsabetli Şut: ${homeShotsOnTarget} - ${awayShotsOnTarget})\nHer an gol sesi gelebilir!`, 
                        homeName, 
                        time
                    );
                }

                // DEPLASMAN BASKISI
                if (awayDangerous > (homeDangerous + diffThreshold) && awayShotsOnTarget >= shotThreshold) {
                    broadcastOpportunity(
                        matchId, 
                        time < 45 ? "Deplasman Takımı Şok Baskı!" : "Deplasman Takımı Ablukaya Aldı!", 
                        `${awayName} rakip yarı alana yerleşti. \n(Tehlikeli Atak: ${awayDangerous} - ${homeDangerous})\n(İsabetli Şut: ${awayShotsOnTarget} - ${homeShotsOnTarget})\nSürpriz bir gol yaklaşıyor!`, 
                        awayName, 
                        time
                    );
                }
            }

            // API sunucusunu yormamak için her maç arası 1 saniye bekle
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

    } catch (error) {
        console.log("Analiz hatası:", error);
    }
}

// Kotayı idareli kullanmak için HER 5 DAKİKADA BİR çalışır
setInterval(fetchAndAnalyzeMomentum, 300000); 

bot.onText(/\/start/, (msg) => {
    subscribers.add(msg.chat.id);
    bot.sendMessage(msg.chat.id, `🤖 *KopRadar Tam Zamanlı Momentum Sistemi Aktif!*\n\nArtık sadece 2. yarıyı değil, **İlk Yarıda (20. dakikadan sonra) oluşan şok baskıları da** tarayacağım. Bir takım rakibini ceza sahasına hapsettiğinde sana anında mesaj atacağım.`, {parse_mode: 'Markdown'});
    fetchAndAnalyzeMomentum();
});

console.log("KopRadar İlk Yarı + İkinci Yarı Momentum Algoritması Başlatıldı!");
