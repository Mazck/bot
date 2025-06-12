module.exports = function ({ api, models, Users, Threads, Currencies }) {
  return function ({ event }) {
    if (!event.messageReply) return;

    const { handleReply, commands } = global.client;
    const { messageID, threadID, messageReply } = event;

    if (handleReply.length !== 0) {
      const indexOfHandle = handleReply.findIndex(
        (e) => e.messageID == messageReply.messageID
      );
      if (indexOfHandle < 0) return;
      const indexOfMessage = handleReply[indexOfHandle];
      const handleNeedExec = commands.get(indexOfMessage.name);
      if (!handleNeedExec)
        return api.sendMessage(
          global.getText("handleReply", "missingValue"),
          threadID,
          messageID
        );
      try {
        var getText;
        if (
          handleNeedExec.languages &&
          typeof handleNeedExec.languages == "object"
        ) {
          getText = (...args) => {
            const language = handleNeedExec.languages || {};
            if (!language.hasOwnProperty(global.config.language))
              return api.sendMessage(
                global.getText(
                  "handleCommand",
                  "notFoundLanguage",
                  command.config.name
                ),
                threadID,
                messengeID
              );
            var text =
              handleNeedExec.languages[global.config.language][args[0]] || "";
            for (var i = args.length; i > 0; i--) {
              const regEx = RegExp(`%${i}`, "g");
              text = text.replace(regEx, args[i]);
            }
            return text;
          };
        } else getText = () => {};
        handleNeedExec.handleReply({
          api,
          event,
          models,
          Users,
          Threads,
          Currencies,
          handleReply: indexOfMessage,
          models,
          getText,
        });
        return;
      } catch (error) {
        return api.sendMessage(
          global.getText("handleReply", "executeError", error),
          threadID,
          messageID
        );
      }
    }
  };
};
