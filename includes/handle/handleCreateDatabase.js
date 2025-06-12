module.exports = function({ Users, Threads, Currencies }) {
	const logger = require("../../utils/log.js");

	return async function({ event }) {

		const { allUserID, allCurrenciesID, allThreadID, userName, threadInfo  } = global.data;
		const { autoCreateDB } = global.config;

		if (autoCreateDB == false) return;

		var { senderID, threadID } = event;

		senderID = String(senderID);
		threadID = String(threadID);

		try {
			///////////////////////////////////////////////
			//========= Check and create thread =========//
			///////////////////////////////////////////////

			if (!allThreadID.includes(threadID) && event.isGroup == true) {
                const data = await Threads.getInfo(threadID);
                const threadInfoData = { threadName: data.threadName, adminIDs: data.adminIDs, nicknames: data.nicknames };
                allThreadID.push(threadID);
                threadInfo.set(threadID, threadInfoData);
                await Threads.setData(threadID, { threadInfo: threadInfoData, data: {} });
                for (singleData of data.userInfo) {
                    userName.set(String(singleData.id), singleData.name);
                    try {
                        if (global.data.allUserID.includes(String(singleData.id))) {
                            await Users.setData(String(singleData.id), { name: singleData.name });
                            global.data.allUserID.push(singleData.id);
                        }
                        else {
                            await Users.createData(singleData.id, { name: singleData.name, data: {} });
                            global.global.data.allUserID.push(String(singleData.id));
                            logger(global.getText("handleCreateDatabase", "newUser", singleData.id), "[ DATABASE ]");
                        }
                    } catch {};
                }
                logger(global.getText("handleCreateDatabase", "newThread", threadID), "[ DATABASE ]");			
			}

			//////////////////////////////////////
			//========= Check userInfo =========//
			//////////////////////////////////////

			if (!allUserID.includes(senderID) || !userName.has(senderID)) {
                const data = await Users.getInfo(senderID);
				await Users.createData(senderID, { name: data.name });
				allUserID.push(senderID);
                userName.set(senderID, data.name);
				logger(global.getText("handleCreateDatabase", "newUser", senderID), "[ DATABASE ]");
			}

			////////////////////////////////////////
			//========= Check Currencies =========//
			////////////////////////////////////////

			if (!allCurrenciesID.includes(senderID)) {
				await Currencies.createData(senderID, { data: {} });
				allCurrenciesID.push(senderID);
			}

			return;
		}
		catch(e) {
			return console.log(e);
		}
	};
};
