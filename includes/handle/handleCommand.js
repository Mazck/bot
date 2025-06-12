module.exports = function ({ api, models, Users, Threads, Currencies, event }) {
  const stringSimilarity = require("string-similarity");
  const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const logger = require("../../utils/log.js");
  const moment = require("moment-timezone");
  return async function ({ event }) {
    const dateNow = Date.now();
    const time = moment.tz("Asia/Ho_Chi_minh").format("HH:MM:ss L");
    const { allowInbox, PREFIX, ADMINBOT, DeveloperMode } = global.config;
    const { userBanned, threadBanned, threadInfo, threadData, commandBanned } =
      global.data;
    const { commands, cooldowns } = global.client;

    var { body: contentMessage, senderID, threadID, messageID } = event;

    senderID = String(senderID);
    threadID = String(threadID);
    const threadSetting = threadData.get(threadID) || {};
    const prefixRegex = new RegExp(
      `^(<@!?${senderID}>|${escapeRegex(
        threadSetting.hasOwnProperty("PREFIX") ? threadSetting.PREFIX : PREFIX
      )})\\s*`
    );
    if (!prefixRegex.test(contentMessage)) return;

    ////////////////////////////////////////////////////
    //========= Check user or thread banned  =========//
    ////////////////////////////////////////////////////
    if (
      userBanned.has(senderID) ||
      threadBanned.has(threadID) ||
      (allowInbox == false && senderID == threadID)
    ) {
      if (!ADMINBOT.includes(senderID)) {
        if (userBanned.has(senderID)) {
          const { reason, dateAdded } = userBanned.get(senderID) || {};
          return api.sendMessage(
            global.getText(
              "handleCommand",
              "userBanned",
              reason ? `- Lý do: ${reason}` : "",
              dateAdded ? `- Bị cấm vào: ${dateAdded}` : ""
            ),
            threadID,
            async (error, info) => {
              await new Promise((resolve) => setTimeout(resolve, 5 * 1000));
              return api.unsendMessage(info.messageID);
            },
            messageID
          );
        } else if (threadBanned.has(threadID)) {
          const { reason, dateAdded } = threadBanned.get(threadID) || {};
          return api.sendMessage(
            global.getText(
              "handleCommand",
              "threadBanned",
              reason ? `- Lý do: ${reason}` : "",
              dateAdded ? `- Bị cấm vào: ${dateAdded}` : ""
            ),
            threadID,
            async (error, info) => {
              await new Promise((resolve) => setTimeout(resolve, 5 * 1000));
              return api.unsendMessage(info.messageID);
            },
            messageID
          );
        }
      }
    }
    ////////////////////////////////////////////
    //=========        thread        =========//
    ////////////////////////////////////////////
    const fs = require("fs");
    var { senderID, threadID } = event;
    if (event.isGroup == false) {
      return api.sendMessage(
        `you can not send to message to bot`,
        event.threadID,
        event.messageID
      );
    }

    ////////////////////////////////////////////
    //========= Get command user use =========//
    ////////////////////////////////////////////

    const [matchedPrefix] = contentMessage.match(prefixRegex);
    const args = contentMessage.slice(matchedPrefix.length).trim().split(/\s+/);
    const commandName = args.shift().toLowerCase();
    var command = commands.get(commandName);
    if (!command) {
      var allCommandName = [];
      const commandValues = commands.keys();
      for (const cmd of commandValues) allCommandName.push(cmd);
      const checker = stringSimilarity.findBestMatch(
        commandName,
        allCommandName
      );

      if (checker.bestMatch.rating >= 0.5) command = commands.get(checker.bestMatch.target);

      else
        return api.sendMessage(
          global.getText(
            "handleCommand",
            "commandNotExist",
            checker.bestMatch.target
          ),
          threadID,
          messageID
        );
    }

    //////////////////////////////////////////
    //========= Check command ban  =========//
    //////////////////////////////////////////

    if (commandBanned.has(threadID) || commandBanned.has(senderID)) {
      if (!ADMINBOT.includes(senderID)) {
        const dataThread = commandBanned.get(threadID) || [];
        const dataUser = commandBanned.get(senderID) || [];
        if (dataThread.includes(command.config.name))
          return api.sendMessage(
            global.getText(
              "handleCommand",
              "commandThreadBanned",
              command.config.name
            ),
            threadID,
            async (error, info) => {
              await new Promise((resolve) => setTimeout(resolve, 5 * 1000));
              return api.unsendMessage(info.messageID);
            },
            messageID
          );
        if (dataUser.includes(command.config.name))
          return api.sendMessage(
            global.getText(
              "handleCommand",
              "commandUserBanned",
              command.config.name
            ),
            threadID,
            async (error, info) => {
              await new Promise((resolve) => setTimeout(resolve, 5 * 1000));
              return api.unsendMessage(info.messageID);
            },
            messageID
          );
      }
    }

    if (
      command.config.commandCategory.toLowerCase() == "nsfw" &&
      !global.data.threadAllowNSFW.includes(threadID) &&
      !ADMINBOT.includes(senderID)
    )
      return api.sendMessage(
        global.getText("handleCommand", "threadNotAllowNSFW"),
        threadID,
        async (error, info) => {
          await new Promise((resolve) => setTimeout(resolve, 5 * 1000));
          return api.unsendMessage(info.messageID);
        },
        messageID
      );

    ////////////////////////////////////////
    //========= Check threadInfo =========//
    ////////////////////////////////////////
    var thread;
    if (event.isGroup == true) {
      try {
        thread = threadInfo.get(threadID);
        if (Object.keys(thread).length == 0) throw new Error();
      } catch (error) {
        logger(
          global.getText("handleCommand", "cantGetInfoThread", error),
          "error"
        );
      }
    }
    ///////////////////////////////////////
    //========= Check permssion =========//
    ///////////////////////////////////////

    var permssion = 0;
    const find = (thread || { adminIDs: [] }).adminIDs.find(
      (el) => el.id.toString() == senderID.toString()
    );

    if (ADMINBOT.includes(senderID)) permssion = 2;
    else if (!ADMINBOT.includes(senderID.toString()) && find) permssion = 1;

    if (command.config.hasPermssion > permssion)
      return api.sendMessage(
        global.getText(
          "handleCommand",
          "permssionNotEnough",
          command.config.name
        ),
        threadID,
        messageID
      );
    //////////////////////////////////////
    //========= Check cooldown =========//
    //////////////////////////////////////

    if (!cooldowns.has(command.config.name))
      cooldowns.set(command.config.name, new Map());
    const timestamps = cooldowns.get(command.config.name);
    const cooldownAmount = (command.config.cooldowns || 1) * 1000;
    if (
      timestamps.has(senderID) &&
      dateNow < timestamps.get(senderID) + cooldownAmount
    )
      return api.setMessageReaction(
        "🐶",
        event.messageID,
        (err) =>
          err
            ? logger(
              global.getText("handleCommand", "permssionNotEnough", error),
              "error"
            )
            : "",
        true
      );

    ////////////////////////////////////
    //========= Get language =========//
    ////////////////////////////////////

    var getText;
    if (
      command.languages &&
      typeof command.languages == "object" &&
      command.languages.hasOwnProperty(global.config.language)
    ) {
      getText = (...args) => {
        var text = command.languages[global.config.language][args[0]] || "";
        for (var i = args.length; i > 0; i--) {
          const regEx = RegExp(`%${i}`, "g");
          text = text.replace(regEx, args[i]);
        }
        return text;
      };
    } else getText = () => { }; //function trống
    ///////////////////////////////////
    //========= Run command =========//
    ///////////////////////////////////
    var nameUser = await Users.getNameUser(event.senderID)
    const chalk = require('chalk');
    console.log(chalk.red('[ DEV ]') + chalk.blue(`BOX: ${threadID} | UserID: ${senderID} | NameUser: ${nameUser} | Modules: ${commandName} | Args đi kèm: ${args.join(" ")}\nTime: ${time}`))

    try {
      command.run({
        api,
        event,
        args,
        models,
        Users,
        Threads,
        Currencies,
        permssion,
        getText,
      });
      timestamps.set(senderID, dateNow);

      if (DeveloperMode == true)
        logger(
          global.getText(
            "handleCommand",
            "executeCommand",
            time,
            commandName,
            senderID,
            threadID,
            args.join(" "),
            Date.now() - dateNow
          ),
          "[ DEV MODE ]"
        );
      return;
    } catch (error) {
      logger(
        global.getText(
          "handleCommand",
          "commandError",
          command.config.name,
          error
        ),
        "error"
      );
      return api.sendMessage(
        global.getText(
          "handleCommand",
          "commandError",
          command.config.name,
          error
        ),
        threadID
      );
    }
  };
};
