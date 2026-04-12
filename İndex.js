const TelegramBot = require('node-telegram-bot-api');
const http = require('http');

// RENDER.COM UYUMLU WEB SUNUCUSU (ÇÖKME HATASINI ÇÖZEN KISIM)
const port = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('KopRadar Render Sunucusunda 7/24 Calisiyor!');
});
server.listen(port, () => {
    console.log(`Web sunucusu ${port} portunda aktif.`);
});

// TELEGRAM BOT AYARLARI
const token = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const bot = new TelegramBot(token, {polling: true});
const subscribers = new Set();

// API-FOOTBALL ANAHTARI
const API_KEY = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";

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

        let targetMatches = data.response.filter(m => 
            TARGET_LEAGUES.includes(m.league.id) && 
            m.fixture.status.elapsed > 20
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
                
                let diffThreshold = time < 45 ? 15 : 25;
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
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    } catch (error) {
        console.log("Analiz hatası:", error);
    }
}

setInterval(fetchAndAnalyzeMomentum, 300000); 

bot.onText(/\/start/, (msg) => {
    subscribers.add(msg.chat.id);
    bot.sendMessage(msg.chat.id, `🤖 *KopRadar Tam Zamanlı Momentum Sistemi Aktif!*\n\nRender Sunucusuna başarıyla bağlandı. Fırsatları tarıyorum.`, {parse_mode: 'Markdown'});
    fetchAndAnalyzeMomentum();
});

console.log("KopRadar Render İle 7/24 Başlatıldı!");
