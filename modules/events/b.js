module.exports.config = {
    name: "cacca",
    eventType: ["log:subscribe"],
    version: "1.0.4",
    credits: "Mirai Team",
    description: "Thông báo bot hoặc người vào nhóm"
};

module.exports.run = async function ({ api, event }) {
    const fs = require("fs");
    if (event.logMessageData.addedParticipants.some(i => i.userFbId == api.getCurrentUserID())) {
        const data = JSON.parse(fs.readFileSync(__dirname + "/../../includes/cache/thread.json", "utf-8"));
        const { threadID } = event;
        data.push(threadID);
        fs.writeFileSync(__dirname + "/../../includes/cache/thread.json", JSON.stringify(data, null, 2));
    }
	return api.sendMessage("Tvm SHOW ACC + ẢNH CÁ NHÂN + SET BIỆT DANH",event.threadID)
}