// ==================== MAIN COMMAND FILE ====================
// File: modules/commands/slg.js

module.exports.config = {
    name: "slg",
    version: "2.0.0",
    hasPermssion: 0,
    credits: "Solo Leveling Game System",
    description: "Complete Solo Leveling RPG Game",
    commandCategory: "game",
    usages: "[start|hunt|dungeon|quest|awaken|class|shop|buy|sell|forge|equip|stats|shadow|party|help]",
    cooldowns: 2
};

module.exports.run = async function ({ api, event, args, Users, Threads, Currencies }) {
    const { threadID, messageID, senderID } = event;

    // Import all handlers
    const GameCore = require('../../handlers/slg/gameCore');
    const CombatHandler = require('../../handlers/slg/combatHandler');
    const QuestHandler = require('../../handlers/slg/questHandler');
    const AwakenHandler = require('../../handlers/slg/awakenHandler');
    const DungeonHandler = require('../../handlers/slg/dungeonHandler');
    const ShopHandler = require('../../handlers/slg/shopHandler');
    const ForgeHandler = require('../../handlers/slg/forgeHandler');
    const ShadowHandler = require('../../handlers/slg/shadowHandler');
    const PartyHandler = require('../../handlers/slg/partyHandler');
    const StatsHandler = require('../../handlers/slg/statsHandler');
    const TradingHandler = require('../../handlers/slg/tradingHandler');

    const gameCore = new GameCore();
    const action = args[0] ? args[0].toLowerCase() : 'help';

    try {
        // Initialize player if needed
        await gameCore.initializePlayer(senderID);

        switch (action) {
            case 'start':
                return await gameCore.startGame(api, event);

            case 'stats':
            case 'profile':
            case 'me':
                return await StatsHandler.showPlayerStats(api, event);

            case 'hunt':
                return await CombatHandler.startHunt(api, event, args);

            case 'dungeon':
            case 'dg':
                return await DungeonHandler.handleDungeon(api, event, args);

            case 'quest':
            case 'q':
                return await QuestHandler.handleQuest(api, event, args);

            case 'awaken':
            case 'aw':
                return await AwakenHandler.handleAwaken(api, event, args);

            case 'class':
            case 'classes':
                return await AwakenHandler.showClasses(api, event, args);

            case 'shop':
                return await ShopHandler.handleShop(api, event, args);

            case 'buy':
                return await ShopHandler.buyItem(api, event, args);

            case 'sell':
                return await ShopHandler.sellItem(api, event, args);

            case 'forge':
            case 'upgrade':
            case 'enchant':
                return await ForgeHandler.handleForge(api, event, args);

            case 'equip':
            case 'eq':
                return await gameCore.equipItem(api, event, args);

            case 'inventory':
            case 'inv':
                return await gameCore.showInventory(api, event, args);

            case 'shadow':
            case 'pet':
                return await ShadowHandler.handleShadow(api, event, args);

            case 'party':
            case 'team':
                return await PartyHandler.handleParty(api, event, args);

            case 'skill':
            case 'skills':
                return await gameCore.handleSkills(api, event, args);

            case 'trade':
                return await TradingHandler.handleTrade(api, event, args);

            case 'reset':
                return await StatsHandler.resetStats(api, event, args);

            case 'ranking':
            case 'rank':
                return await gameCore.showRanking(api, event, args);

            case 'help':
            default:
                return await gameCore.showHelp(api, event);
        }
    } catch (error) {
        console.error('SLG Error:', error);
        return api.sendMessage("Da xay ra loi trong he thong game. Vui long thu lai!", threadID, messageID);
    }
};

