module.exports.config = {
    name: "cmd",
    version: "1.0.2",
    hasPermssion: 2,
    credits: "Mirai Team",
    description: "Quản lý/Kiểm soát toàn bộ module của bot",
    commandCategory: "config",
    usages: "[load/unload/loadAll/unloadAll/info] [tên module]",
    cooldowns: 5,
    dependencies: {
        "fs-extra": "",
        "child_process": "",
        "path": ""
    }
};

module.exports.languages = {
    "vi": {
        "nameExist": "Tên module bị trùng với một module mang cùng tên khác!",
        "notFoundLanguage": "Module %1 không hỗ trợ ngôn ngữ ngôn ngữ của bạn",
        "notFoundPackage": "Không tìm thấy package %1 hỗ trợ cho module %2, tiến hành cài đặt...",
        "cantInstallPackage": "Không thể cài đặt package %1 cho module %2, lỗi: %3",
        "loadedPackage": "Đã tải thành công toàn bộ package cho module %1",
        "loadedConfig": "Đã tải thành công config cho module %1",
        "cantLoadConfig": "Không thể tải config của module %1, lỗi: %2",
        "cantOnload": "Không thể khởi chạy setup của module %1, lỗi: %1",
        "successLoadModule": "Đã tải thành công module %1",
        "failLoadModule": "Không thể tải thành công module %1, lỗi: %2",
        "moduleError": "Những module đã xảy ra sự cố không mong muốn khi đang tải: \n\n%1",
        "unloadSuccess": "Đã hủy tải module %1",
        "unloadedAll": "Đã hủy tải %1 module",
        "missingInput": "Tên module không được để trống!",
        "moduleNotExist": "Module bạn nhập không tồn tại!",
        "user": "Người dùng",
        "adminGroup": "Quản trị viên nhóm",
        "adminBot": "Quản trị viên bot",
        "dontHavePackage": "Không có",
        "infoModule": "=== %1 ===\n- Được code bởi: %2\n- Phiên bản: %3\n- Yêu cầu quyền hạn: %4\n- Thời gian chờ: %5 giây(s)\n- Các package yêu cầu: %6"
    },
    "en": {
        "nameExist": "Module's name is similar to another module!",
        "notFoundLanguage": "Module %1 does not support your language",
        "notFoundPackage": "Can't find package %1 for module %2, install...",
        "cantInstallPackage": "Can't install package %1 for module %2, error: %3",
        "loadedPackage": "Loaded package for module %1",
        "loadedConfig": "Loaded config for module %1",
        "cantLoadConfig": "Can't load config for module %1, error: %2",
        "cantOnload": "Can't load setup for module %1, error: %1",
        "successLoadModule": "Loaded module %1",
        "failLoadModule": "Can't load module %1, error: %2",
        "moduleError": "Modules which have unexpected error when loading: \n\n%1",
        "unloadSuccess": "Unloaded module %1",
        "unloadedAll": "Unloaded %1 module",
        "missingInput": "Module's name can't be left blank!",
        "moduleNotExist": "Module you enter doesn't exist!",
        "user": "User",
        "adminGroup": "Group admin",
        "adminBot": "Bot admin",
        "dontHavePackage": "None",
        "infoModule": "=== %1 ===\n- Coded by: %2\n- Version: %3\n- Permission: %4\n- Waiting time: %5(s)\n- Required package: %6"
    }
}

module.exports.loadCommand = function ({ moduleList, threadID, messageID, getText }) {
    const { execSync } = global.client.child_process;
    const { writeFileSync, unlinkSync, readFileSync } = global.client["fs-extra"];
    const { join } = global.client.path;
    const { configPath, mainPath, api } = global.client;

    const logger = require(mainPath + "/utils/log");
    const listPackage = JSON.parse(readFileSync(global.client.mainPath + "/package.json"))["dependencies"];
    const listbuiltinModules = require("module")["builtinModules"];

    var errorList = [];

    delete require.cache[require.resolve(configPath)];
    var configValue = require(configPath);
    writeFileSync(configPath + ".temp", JSON.stringify(configValue, null, 4), "utf8");

    for (const nameModule of moduleList) {
        try {
            const dirModule = __dirname + "/" + nameModule + ".js";
            delete require.cache[require.resolve(dirModule)];
            var command = require(dirModule);

            if (!command.config || !command.run || !command.config.commandCategory) {
                throw new Error(getText("nameExist"));
            }

            if (!command.languages || typeof command.languages != "object" || Object.keys(command.languages).length == 0) {
                logger.loader(getText("notFoundLanguage", command.config.name), "warn");
            }

            global.client.eventRegistered = global.client.eventRegistered.filter(item => item != command.config.name);

            if (command.config.dependencies && typeof command.config.dependencies == "object") {
                for (const packageName in command.config.dependencies) {
                    const moduleDir = join(global.client.mainPath, "nodemodules", "node_modules", packageName);
                    try {
                        if (!global.client.hasOwnProperty(packageName)) {
                            if (listPackage.hasOwnProperty(packageName) || listbuiltinModules.includes(packageName)) {
                                global.client[packageName] = require(packageName);
                            } else {
                                global.client[packageName] = require(moduleDir);
                            }
                        }
                    } catch {
                        var tryLoadCount = 0;
                        var loadSuccess = false;
                        var error;

                        logger.loader(getText("notFoundPackage", packageName, command.config.name), "warn");

                        execSync("npm --package-lock false --save " + packageName + (command.config.dependencies[packageName] == "*" || command.config.dependencies[packageName] == "" ? "" : "@" + command.config.dependencies[packageName]), {
                            stdio: "inherit",
                            env: process.env,
                            shell: true,
                            cwd: join(global.client.mainPath, "nodemodules")
                        });

                        for (tryLoadCount = 1; tryLoadCount <= 3; tryLoadCount++) {
                            try {
                                require.cache = {};
                                if (listPackage.hasOwnProperty(packageName) || listbuiltinModules.includes(packageName)) {
                                    global.client[packageName] = require(packageName);
                                } else {
                                    global.client[packageName] = require(moduleDir);
                                }
                                loadSuccess = true;
                                break;
                            } catch (err) {
                                error = err;
                            }
                            if (loadSuccess || !error) break;
                        }

                        if (!loadSuccess || error) {
                            throw getText("cantInstallPackage", packageName, command.config.name, error);
                        }
                    }
                }
                logger.loader(getText("loadedPackage", command.config.name));
            }

            if (command.config.envConfig && typeof command.config.envConfig == "object") {
                try {
                    for (const key in command.config.envConfig) {
                        if (typeof global.configModule[command.config.name] == "undefined") {
                            global.configModule[command.config.name] = {};
                        }
                        if (typeof global.config[command.config.name] == "undefined") {
                            global.config[command.config.name] = {};
                        }
                        if (typeof global.config[command.config.name][key] !== "undefined") {
                            global.configModule[command.config.name][key] = global.config[command.config.name][key];
                        } else {
                            global.configModule[command.config.name][key] = command.config.envConfig[key] || "";
                        }
                        if (typeof global.config[command.config.name][key] == "undefined") {
                            global.config[command.config.name][key] = command.config.envConfig[key] || "";
                        }
                    }
                    logger.loader(getText("loadedConfig", command.config.name));
                } catch (error) {
                    throw new Error(getText("cantLoadConfig", command.config.name, JSON.stringify(error)));
                }
            }

            if (command.onLoad) {
                try {
                    const moduleData = {};
                    moduleData.api = api;
                    command.onLoad(moduleData);
                } catch (error) {
                    throw new Error(getText("cantOnload", command.config.name, JSON.stringify(error)), "error");
                }
            }

            if (command.handleEvent) {
                global.client.eventRegistered.push(command.config.name);
            }

            (global.config.commandDisabled.includes(nameModule + ".js") || configValue.commandDisabled.includes(nameModule + ".js")) && (configValue.commandDisabled.splice(configValue.commandDisabled.indexOf(nameModule + ".js"), 1), global.config.commandDisabled.splice(global.config.commandDisabled.indexOf(nameModule + ".js"), 1));

            global.client.commands.delete(nameModule);
            global.client.commands.set(command.config.name, command);
            logger.loader(getText("successLoadModule", command.config.name));

        } catch (error) {
            errorList.push(getText("failLoadModule", command.config.name, error));
        }
    }

    if (errorList.length != 0) {
        api.sendMessage(getText("moduleError", errorList.join("\n\n")), threadID, messageID);
    } else {
        api.sendMessage("Loaded " + (moduleList.length - errorList.length) + " module(s)", threadID, messageID);
    }

    writeFileSync(configPath, JSON.stringify(configValue, null, 4), "utf8");
    unlinkSync(configPath + ".temp");
    return;
}

module.exports.unloadModule = function ({ moduleList, threadID, messageID, getText }) {
    const { writeFileSync, unlinkSync } = global.client["fs-extra"];
    const { configPath, mainPath, api } = global.client;
    const logger = require(mainPath + "/utils/log").loader;

    delete require.cache[require.resolve(configPath)];
    var configValue = require(configPath);
    writeFileSync(configPath + ".temp", JSON.stringify(configValue, null, 4), "utf8");

    for (const nameModule of moduleList) {
        global.client.commands.delete(nameModule);
        global.client.eventRegistered = global.client.eventRegistered.filter(item => item !== nameModule);
        configValue.commandDisabled.push(nameModule + ".js");
        global.config.commandDisabled.push(nameModule + ".js");
        logger(getText("unloadSuccess", nameModule));
    }

    writeFileSync(configPath, JSON.stringify(configValue, null, 4), "utf8");
    unlinkSync(configPath + ".temp");

    return api.sendMessage(getText("unloadedAll", moduleList.length), threadID, messageID);
}

module.exports.run = function ({ event, args, api, getText }) {
    const { readdirSync } = global.nodemodule["fs-extra"];
    const { threadID, messageID } = event;

    var moduleList = args.splice(1, args.length);

    switch (args[0]) {
        case "load": {
            if (moduleList.length == 0) return api.sendMessage(getText("missingInput"), threadID, messageID);
            else return this.loadCommand({ moduleList, threadID, messageID, getText });
        }
        case "unload": {
            if (moduleList.length == 0) return api.sendMessage(getText("missingInput"), threadID, messageID);
            else return this.unloadModule({ moduleList, threadID, messageID, getText });
        }
        case "loadAll": {
            moduleList = readdirSync(__dirname).filter((file) => file.endsWith(".js") && !file.includes('example'));
            moduleList = moduleList.map(item => item.replace(/\.js/g, ""));
            return this.loadCommand({ moduleList, threadID, messageID, getText });
        }
        case "unloadAll": {
            moduleList = readdirSync(__dirname).filter((file) => file.endsWith(".js") && !file.includes('example') && !file.includes("command"));
            moduleList = moduleList.map(item => item.replace(/\.js/g, ""));
            return this.unloadModule({ moduleList, threadID, messageID, getText });
        }
        case "info": {
            const command = global.client.commands.get(moduleList.join("") || "");
            if (!command) return api.sendMessage(getText("moduleNotExist"), threadID, messageID);
            const { name, version, hasPermssion, credits, cooldowns, dependencies } = command.config;
            return api.sendMessage(getText("infoModule", name.toUpperCase(), credits, version, ((hasPermssion == 0) ? getText("user") : (hasPermssion == 1) ? getText("adminGroup") : getText("adminBot")), cooldowns, ((Object.keys(dependencies || {})).join(", ") || getText("dontHavePackage"))), threadID, messageID);
        }
        default: {
            return global.utils.throwError(this.config.name, threadID, messageID);
        }
    }
}