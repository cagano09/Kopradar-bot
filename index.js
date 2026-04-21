bot.onText(/\/liste/, async (msg) => {
    if (msg.chat.id.toString() !== MY_CHAT_ID) return;
    
    bot.sendMessage(msg.chat.id, "📅 Maçlar sorgulanıyor...");

    try {
        // Alternatif Endpoint: Bazı API'lerde sadece 'fixtures' kullanılır
        // Eğer bu da hata verirse, RapidAPI sağ paneldeki URL'yi kontrol etmeliyiz.
        const today = new Date().toISOString().split('T')[0];
        
        // Buradaki '/get-matches-events-by-date' kısmını 
        // RapidAPI sağ paneldeki URL ile birebir değiştirmen gerekebilir.
        const resp = await apiClient.get('/get-matches-events-by-date', { 
            params: { date: today } 
        });
        
        // Gelen veriyi konsola yazdır ki Render loglarından yapısını görebilelim
        console.log("API DATA:", JSON.stringify(resp.data));

        const matches = resp.data.data || resp.data.results || resp.data.response;

        if (!matches || matches.length === 0) {
            return bot.sendMessage(msg.chat.id, "⚠️ Maç bulunamadı (Liste boş).");
        }

        let report = "📋 *MAÇ LİSTESİ*\n\n";
        matches.slice(0, 20).forEach(m => {
            const mId = m.match_id || m.id || m.fixture_id;
            const hName = m.home_team_name || m.home_team || (m.teams && m.teams.home.name);
            const aName = m.away_team_name || m.away_team || (m.teams && m.teams.away.name);
            
            report += `🆔 \`${mId}\` | ${hName} - ${aName}\n`;
        });

        bot.sendMessage(msg.chat.id, report, { parse_mode: "Markdown" });
    } catch (e) {
        // Detaylı hata raporu
        let errorInfo = e.message;
        if (e.response && e.response.data) {
            errorInfo = JSON.stringify(e.response.data);
        }
        bot.sendMessage(msg.chat.id, `❌ Hata: ${errorInfo}\n\nLütfen RapidAPI sağ paneldeki URL'yi kontrol et.`);
    }
});
