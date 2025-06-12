module.exports.config = {
    name: "messagelog",//M nên đổi cm cái tên module đi. Tên như con cặc
    version: "1.0.0",
    hasPermssion: 2,
    credits: "a",
    description: "a",
    commandCategory: "a",
    cooldowns: 5,
};

module.exports.onLoad = ({ }) => {
    const fs = require("fs");
    if (!fs.existsSync(__dirname + '/cache/messageLog.json'))
        fs.writeFileSync(__dirname + '/cache/messageLog.json', '{}');
}

module.exports.handleEvent = ({ event, api }) => {
    const fs = require("fs");
    const moment = require('moment-timezone');
    const botID = api.getCurrentUserID();
    if (event.isGroup == false) return
    const writeTime = moment().tz("Asia/Ho_Chi_Minh").format("DD/MM/YYYY HH:mm:ss");
    const messageLog = JSON.parse(fs.readFileSync(__dirname + "/cache/messageLog.json", "utf-8"));

    if (!messageLog[event.threadID])
        messageLog[event.threadID] = [];
    const newEvent = {
        ID: (!messageLog[event.threadID]) ? 0 : messageLog[event.threadID].length,
        writeTime: writeTime,
        ...event
    };
    messageLog[event.threadID].push(newEvent);
    fs.writeFileSync(__dirname + "/cache/messageLog.json", JSON.stringify(messageLog, null, 2));

};

module.exports.run = ({ event, api, args }) => { };