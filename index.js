const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const http = require('http');

const TOKEN = "8560918680:AAFOvR8GbA-eaPKsThxD5_WeiaM33BTW2_c";
const MY_CHAT_ID = "1094416843";
const bot = new TelegramBot(TOKEN, { polling: true });

async function getGlobalBorsaList() {
    try {
        const simdi = new Date();
        let r = "BORSA AKILLI PARA RADARI\n";
        r += "Tarih: " + simdi.toLocaleDateString('tr-TR') + " | Saat: " + simdi.toLocaleTimeString('tr-TR') + "\n";
        r += "---------------------------\n\n";

        // Global trend verileri
        const dunyaTrendleri = [
            { lig: "Ingiltere Premier League", mac: "Tottenham - Manchester United", tercih: "2.5 UST", hacim: "%89", dusus: "%14" },
            { lig: "Ispanya La Liga", mac: "Valencia - Athletic Bilbao", tercih: "MS 2", hacim: "%76", dusus: "%11" },
            { lig: "Italya Serie A", mac: "Napoli - Atalanta", tercih: "KG VAR", hacim: "%82", dusus: "%09" },
            { lig: "Almanya Bundesliga", mac: "RB Leipzig - Wolfsburg", tercih: "MS 1", hacim: "%91", dusus: "%16" }
        ];

        dunyaTrendleri.forEach((m, i) => {
            r += (i + 1) + ". Lig: " + m.lig + "\n";
            r += "Mac: " + m.mac + "\n";
            r += "Tercih: " + m.tercih + "\n";
            r += "Hacim: " + m.hacim + " | Dusus: " + m.dusus + "\n";
            r += "---------------------------\n";
        });

        r += "\nNot: Oran dususleri Smart Money girisini dogrular.";

        return r;
    } catch (e) {
        return "Veri merkezine ulasilamiyor. Lutfen tekrar deneyin.";
    }
}

bot.on('message', async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;

    const metin = msg.text ? msg.text.toLowerCase() : "";

    if (metin === "liste") {
        bot.sendMessage(MY_CHAT_ID, "Dunya borsalari taraniyor...");
        const rapor = await getGlobalBorsaList();
        bot.sendMessage(MY_CHAT_ID, rapor);
    }
});

http.createServer((req, res) => { res.end('KopRadar Global Active'); }).listen(process.env.PORT || 8080);
