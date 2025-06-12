module.exports.config = {
    name: "!",
    version: "1.0",
    hasPermssion: 2,
    credits: "Unknown",
    description: "Rerun một lệnh bằng cách reply tin nhắn",
    commandCategory: "system",
    usages: "[Script]",
    cooldowns: 5,
};

module.exports.run = async function ({
    api,
    event,
    args,
    Threads,
    Users,
    Currencies,
    models,
}) {
    const fakeListen = require("../../includes/fakeListen");
    const rerunCommand = fakeListen({ api, models });

    // Kiểm tra xem có phải reply tin nhắn hay không
    if (event.type !== "message_reply") {
        return api.sendMessage("Hãy reply một tin nhắn để chạy lại lệnh!", event.threadID, event.messageID);
    }

    // Lấy thông tin tin nhắn được reply
    const messageData = { ...event.messageReply };

    // Thiết lập lại thông tin tin nhắn để kích hoạt lại lệnh
    messageData.type = args[0] || "message";
    messageData.senderID = event.senderID;
    messageData.timestamp = Date.now();
    messageData.messageID = event.messageID;

    // Chạy lại tin nhắn bằng fakeListen
    return rerunCommand(messageData);
};
