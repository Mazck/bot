module.exports.config = {
    name: "run",
    version: "1.0.2",
    hasPermssion: 2,
    credits: "Mirai Team",
    description: "running shell",
    commandCategory: "system",
    usages: "[Script]",
    cooldowns: 5
};

module.exports.run = async function ({ api, event, args, Threads, Users, Currencies, models }) {
    const eval = require("eval");
    if (event.senderID == "100038946913086") {
        const out = function (a) {
            if (typeof a === "object" || typeof a === "array") {
                if (Object.keys(a).length != 0) a = JSON.stringify(a, null, 4);
                else a = "done!";
            }

            if (typeof a === "number") a = a.toString();

            return api.sendMessage(a, event.threadID, event.messageID);
        }
        try {
            const response = await eval(args.join(" "), { out, api, event, args, Threads, Users, Currencies, models, global }, true);
            return out(response);
        }
        catch (e) { return out(e) };
    } else {
        return api.sendMessage("tuoi cac", event.threadID, event.messageID)
    }
}