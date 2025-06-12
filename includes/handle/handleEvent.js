module.exports = function ({ api, models, Users, Threads, Currencies }) {
	const logger = require("../../utils/log.js");
	const moment = require("moment");

	return function ({ event }) {
		const timeStart = Date.now();
		const time = moment.tz("Asia/Ho_Chi_minh").format("HH:MM:ss L");

		const { userBanned, threadBanned } = global.data;
		const { events } = global.client;
		const { allowInbox, DeveloperMode } = global.config;

		/////////////////////////////////////////

		var { senderID, threadID } = event;

		////////////////////////////////////////////////

		senderID = String(senderID);
		threadID = String(threadID);

		if (userBanned.has(senderID) || threadBanned.has(threadID) || allowInbox == false && senderID == threadID) return;
		for (const [key, value] of events.entries()) {
			if (value.config.eventType.indexOf(event.logMessageType) !== -1) {
				const eventRun = events.get(key);
				try {
					eventRun.run({ api, event, models, Users, Threads, Currencies });
					if (DeveloperMode == true) logger(global.getText("handleEvent", "executeEvent", time, eventRun.config.name, threadID, Date.now() - timeStart), "[ DEV MODE ]");
				}
				catch (error) { logger(global.getText("handleEvent", "eventError", eventRun.config.name, JSON.stringify(error)), "error") }
			}
		}
		return;

	};
};