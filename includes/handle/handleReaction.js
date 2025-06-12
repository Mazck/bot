module.exports = function({ api, models, Users, Threads, Currencies }) {
	return function({ event }) {
		
		const { handleReaction, commands } = global.client;
		const { messageID, threadID } = event;

		if (handleReaction.length !== 0) {
			const indexOfHandle = handleReaction.findIndex(e => e.messageID == messageID);
			if (indexOfHandle < 0) return;
			const indexOfMessage = handleReaction[indexOfHandle];
			const handleNeedExec = commands.get(indexOfMessage.name);
			if (!handleNeedExec) return api.sendMessage(global.getText("handleReaction", "missingValue"), threadID, messageID);
			try {
				var getText;
				if (handleNeedExec.languages && typeof handleNeedExec.languages == "object") { 
					getText = (...args) => {
						const language = handleNeedExec.languages || {};
						if (!language.hasOwnProperty(global.config.language)) return api.sendMessage(global.getText("handleCommand", "notFoundLanguage", command.config.name), threadID, messengeID);
						var text = handleNeedExec.languages[global.config.language][args[0]] || "";
						for (var i = args.length; i > 0; i--) {
							const regEx = RegExp(`%${i}`, 'g');
							text = text.replace(regEx, args[i]);
						}
						return text;
					}
				} else getText = () => {}; //function trống
				handleNeedExec.handleReaction({ api, event, models, Users, Threads, Currencies, handleReaction: indexOfMessage, models, getText });
				return;
			} catch (error) { return api.sendMessage(global.getText("handleReaction", "executeError", error), threadID, messageID) }
		}
	};
};