module.exports = function ({ api, models, Users, Threads, Currencies }) {
	const logger = require("../../utils/log.js");

	return function ({ event }) {

		const { allowInbox } = global.config;
		const { userBanned, threadBanned } = global.data;
		const { commands, eventRegistered } = global.client;

		var { senderID, threadID } = event;

		senderID = String(senderID);
		threadID = String(threadID);

		if (userBanned.has(senderID) || threadBanned.has(threadID) || allowInbox == true && senderID == threadID) return;

		for (const commandName of eventRegistered) {
			const commandModule = commands.get(commandName);

			var getText;
			if (commandModule.languages && typeof commandModule.languages == "object") {
				getText = (...args) => {
					const language = commandModule.languages || {};
					if (!language.hasOwnProperty(global.config.language)) return api.sendMessage(global.getText("handleCommand", "notFoundLanguage", command.config.name), threadID, messengeID);
					var text = commandModule.languages[global.config.language][args[0]] || "";
					for (var i = args.length; i > 0; i--) {
						const regEx = RegExp(`%${i}`, 'g');
						text = text.replace(regEx, args[i]);
					}
					return text;
				}
			} else getText = () => { }; //function trống
			try {
				if (commandModule) commandModule.handleEvent({ event, api, models, Users, Threads, Currencies, getText });
			}
			catch (error) {
				logger(global.getText("handleCommandEvent", "moduleError", commandModule.config.name), "error");
			}
		}
	};
};