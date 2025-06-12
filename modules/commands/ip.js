module.exports.config = {
    name: "ip",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "a",
    description: "a",
    commandCategory: "a",
    cooldowns: 5,
};
module.exports.run = async function ({ event, api, args }) {
    const { threadID, messageID } = event;
    const axios = require("axios");
    const { data } = await axios.get(`https://ipinfo.io/${event.args[1]}/geo`);
    return api.sendMessage(`IP: ${data.ip}\nCity: ${data.city}\nRegion: ${data.region}\nCountry: ${data.country}\nLoc: ${data.loc}\nOrg: ${data.org}\nPostal: ${data.postal}\nTimezone: ${data.timezone}`, threadID, messageID);
};