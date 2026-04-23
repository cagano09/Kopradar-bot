bot.onText(/\/liste/, async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    bot.sendMessage(msg.chat.id, "🔍 Tüm ligler taranıyor, lütfen bekleyin...");

    try {
        // Filtresiz tüm maçları çekmeye çalış
        const resp = await client1.get('/matches');
        const allMatches = resp.data.matches || [];
        
        // Sadece bugün ve yarınki maçları süz (Gereksiz kalabalığı önlemek için)
        const today = new Date().toISOString().split('T')[0];
        cache.matches = allMatches.filter(m => m.utcDate.includes(today) || m.status === 'SCHEDULED' || m.status === 'LIVE');

        if (cache.matches.length === 0) {
            return bot.sendMessage(msg.chat.id, "📭 Şu an aktif veya planlanmış maç bulunamadı. API limitini kontrol edin.");
        }

        let report = `📋 *GENİŞLETİLMİŞ HİBRİT BÜLTEN*\n\n`;
        cache.matches.slice(0, 45).forEach(m => {
            const statusIcon = m.status === 'LIVE' ? '🔴' : '🕒';
            report += `${statusIcon} 🆔 \`${m.id}\` | ${m.competition.name}\n👉 ${m.homeTeam.shortName} - ${m.awayTeam.shortName}\n\n`;
        });

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    } catch (e) {
        console.error(e);
        bot.sendMessage(msg.chat.id, "❌ Liste çekilirken API hatası oluştu. (Limit aşılmış olabilir)");
    }
});
