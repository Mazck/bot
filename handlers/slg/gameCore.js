const fs = require('fs-extra');
const path = require('path');
const GameData = require('../../utils/slg/gameData');
const PlayerUtils = require('../../utils/slg/playerUtils');

class GameCore {
    constructor() {
        this.dataPath = path.join(__dirname, '../data');
        this.gameData = new GameData();
        this.playerUtils = new PlayerUtils();
        this.ensureDataStructure();
    }

    ensureDataStructure() {
        if (!fs.existsSync(this.dataPath)) {
            fs.mkdirSync(this.dataPath, { recursive: true });
        }

        // Initialize all game data files
        this.gameData.initializeAllData();
    }

    async initializePlayer(playerID) {
        const playersPath = path.join(this.dataPath, 'players.json');
        const players = await this.gameData.loadData('players.json');

        if (!players[playerID]) {
            // Create new player with default stats
            players[playerID] = this.createNewPlayer(playerID);
            await this.gameData.saveData('players.json', players);
        }

        return players[playerID];
    }

    createNewPlayer(playerID) {
        return {
            id: playerID,
            name: "Hunter",
            level: 1,
            exp: 0,
            expToNext: 100,

            // Primary Stats
            strength: 10,
            agility: 10,
            intelligence: 10,
            vitality: 10,
            luck: 5,

            // Secondary Stats
            hp: 100,
            maxHp: 100,
            mana: 50,
            maxMana: 50,
            attack: 15,
            defense: 8,
            critRate: 5,
            critDamage: 150,

            // Character Progression
            class: "none",
            awakened: false,
            awakeningLevel: 0,
            statPoints: 0,
            skillPoints: 0,

            // Currencies
            gold: 500,
            diamonds: 10,
            eventTokens: 0,

            // Inventory & Equipment
            inventory: {
                "basic_sword": 1,
                "health_potion": 5,
                "mana_potion": 3
            },
            equipment: {
                weapon: null,
                armor: null,
                helmet: null,
                gloves: null,
                boots: null,
                ring1: null,
                ring2: null,
                necklace: null
            },

            // Skills & Abilities
            skills: [],
            passiveSkills: [],
            hiddenSkills: [],

            // Quests & Progress
            quests: {
                active: [],
                completed: [],
                daily: []
            },

            // Social & Party
            party: null,
            friends: [],

            // Shadow System
            shadows: [],
            shadowSlots: 3,

            // Achievements & Stats
            achievements: [],
            statistics: {
                monstersKilled: 0,
                dungeonsCleared: 0,
                questsCompleted: 0,
                itemsForged: 0,
                pvpWins: 0,
                pvpLosses: 0
            },

            // Timestamps
            lastDaily: 0,
            lastHunt: 0,
            lastDungeon: 0,
            created: Date.now(),
            lastActive: Date.now()
        };
    }

    async startGame(api, event) {
        const { threadID, messageID, senderID } = event;
        const player = await this.initializePlayer(senderID);

        if (player.level > 1) {
            return api.sendMessage(
                "Ban da tham gia game roi!\n\n" +
                `Hunter: ${player.name}\n` +
                `Level: ${player.level}\n` +
                `Class: ${player.class === 'none' ? 'Chua thuc tinh' : player.class}\n\n` +
                "Su dung 'slg help' de xem danh sach lenh\n" +
                "Su dung 'slg stats' de xem thong tin chi tiet",
                threadID, messageID
            );
        }

        // First time setup
        const welcomeMessage =
            "=== CHAO MUNG DEN VOI SOLO LEVELING ===\n\n" +
            "Ban da tro thanh mot Hunter moi!\n\n" +
            "THONG TIN BAN DAU:\n" +
            `Level: ${player.level}\n` +
            `HP: ${player.hp}/${player.maxHp}\n` +
            `Mana: ${player.mana}/${player.maxMana}\n` +
            `Gold: ${player.gold}\n` +
            `Diamonds: ${player.diamonds}\n\n` +
            "VAT PHAM BAN DAU:\n" +
            "- Basic Sword x1\n" +
            "- Health Potion x5\n" +
            "- Mana Potion x3\n\n" +
            "HUONG DAN:\n" +
            "1. Su dung 'slg hunt' de san quai\n" +
            "2. Su dung 'slg quest' de nhan nhiem vu\n" +
            "3. Dat level 5 de co the thuc tinh class dau tien\n" +
            "4. Su dung 'slg help' de xem tat ca lenh\n\n" +
            "Chuc ban co nhung cuoc phieu luu tuyet voi!";

        return api.sendMessage(welcomeMessage, threadID, messageID);
    }

    async equipItem(api, event, args) {
        const { threadID, messageID, senderID } = event;
        const players = await this.gameData.loadData('players.json');
        const player = players[senderID];

        if (!player) {
            return api.sendMessage("Ban chua tham gia game! Su dung 'slg start'", threadID, messageID);
        }

        if (!args[1]) {
            return api.sendMessage("Su dung: slg equip <ten_vat_pham>", threadID, messageID);
        }

        const itemName = args.slice(1).join('_').toLowerCase();
        const items = await this.gameData.loadData('items.json');

        // Find item in inventory
        let itemId = null;
        for (const [id, quantity] of Object.entries(player.inventory)) {
            if (quantity > 0 && items[id] &&
                (id === itemName || items[id].name.toLowerCase().replace(/\s+/g, '_') === itemName)) {
                itemId = id;
                break;
            }
        }

        if (!itemId) {
            return api.sendMessage("Ban khong co vat pham nay trong inventory!", threadID, messageID);
        }

        const item = items[itemId];

        if (!item.equipable) {
            return api.sendMessage("Vat pham nay khong the trang bi!", threadID, messageID);
        }

        // Check class requirements
        if (item.classRequired && item.classRequired !== player.class && player.class !== 'none') {
            return api.sendMessage(`Chi ${item.classRequired} moi co the su dung vat pham nay!`, threadID, messageID);
        }

        // Check level requirements
        if (item.levelRequired && player.level < item.levelRequired) {
            return api.sendMessage(`Can level ${item.levelRequired} de su dung vat pham nay!`, threadID, messageID);
        }

        const equipSlot = item.equipSlot;

        // Unequip current item
        if (player.equipment[equipSlot]) {
            const currentItem = player.equipment[equipSlot];
            player.inventory[currentItem] = (player.inventory[currentItem] || 0) + 1;

            // Remove stats from current item
            this.removeItemStats(player, items[currentItem]);
        }

        // Equip new item
        player.equipment[equipSlot] = itemId;
        player.inventory[itemId]--;

        if (player.inventory[itemId] <= 0) {
            delete player.inventory[itemId];
        }

        // Apply item stats
        this.applyItemStats(player, item);

        // Recalculate secondary stats
        this.recalculateStats(player);

        await this.gameData.saveData('players.json', players);

        return api.sendMessage(
            `Da trang bi ${item.name}!\n\n` +
            `Loai: ${item.equipSlot}\n` +
            `Rarity: ${item.rarity}\n` +
            `Bonus stats da duoc ap dung!`,
            threadID, messageID
        );
    }

    applyItemStats(player, item) {
        if (item.stats) {
            Object.entries(item.stats).forEach(([stat, value]) => {
                if (player.hasOwnProperty(stat)) {
                    player[stat] += value;
                }
            });
        }
    }

    removeItemStats(player, item) {
        if (item.stats) {
            Object.entries(item.stats).forEach(([stat, value]) => {
                if (player.hasOwnProperty(stat)) {
                    player[stat] = Math.max(0, player[stat] - value);
                }
            });
        }
    }

    recalculateStats(player) {
        // Recalculate HP and Mana based on vitality and intelligence
        const baseHp = 100 + (player.vitality * 10);
        const baseMana = 50 + (player.intelligence * 5);

        const hpPercent = player.hp / player.maxHp;
        const manaPercent = player.mana / player.maxMana;

        player.maxHp = baseHp;
        player.maxMana = baseMana;

        player.hp = Math.floor(player.maxHp * hpPercent);
        player.mana = Math.floor(player.maxMana * manaPercent);

        // Recalculate attack and defense
        player.attack = 10 + player.strength * 2 + player.agility;
        player.defense = 5 + player.vitality + Math.floor(player.strength / 2);

        // Recalculate crit rate (based on agility and luck)
        player.critRate = 5 + Math.floor(player.agility / 5) + Math.floor(player.luck / 3);
    }

    async showInventory(api, event, args) {
        const { threadID, messageID, senderID } = event;
        const players = await this.gameData.loadData('players.json');
        const player = players[senderID];

        if (!player) {
            return api.sendMessage("Ban chua tham gia game! Su dung 'slg start'", threadID, messageID);
        }

        const items = await this.gameData.loadData('items.json');
        const filter = args[1] ? args[1].toLowerCase() : 'all';

        let inventoryMessage = "=== INVENTORY ===\n\n";

        if (Object.keys(player.inventory).length === 0) {
            inventoryMessage += "Inventory trong!\n\n";
        } else {
            let filteredItems = Object.entries(player.inventory).filter(([id, quantity]) => {
                if (quantity <= 0) return false;
                const item = items[id];
                if (!item) return false;

                if (filter === 'all') return true;
                if (filter === 'weapon' && item.equipSlot === 'weapon') return true;
                if (filter === 'armor' && ['armor', 'helmet', 'gloves', 'boots'].includes(item.equipSlot)) return true;
                if (filter === 'accessory' && ['ring1', 'ring2', 'necklace'].includes(item.equipSlot)) return true;
                if (filter === 'consumable' && item.type === 'consumable') return true;
                if (filter === 'material' && item.type === 'material') return true;

                return false;
            });

            if (filteredItems.length === 0) {
                inventoryMessage += `Khong co vat pham nao loai '${filter}'!\n\n`;
            } else {
                filteredItems.forEach(([itemId, quantity]) => {
                    const item = items[itemId];
                    inventoryMessage += `${item.name} x${quantity}\n`;
                    inventoryMessage += `  Rarity: ${item.rarity}`;
                    if (item.equipable) inventoryMessage += ` | Slot: ${item.equipSlot}`;
                    if (item.levelRequired) inventoryMessage += ` | Level: ${item.levelRequired}`;
                    inventoryMessage += "\n\n";
                });
            }
        }

        inventoryMessage += "TRANG BI HIEN TAI:\n";
        Object.entries(player.equipment).forEach(([slot, itemId]) => {
            if (itemId && items[itemId]) {
                inventoryMessage += `${slot}: ${items[itemId].name}\n`;
            } else {
                inventoryMessage += `${slot}: Trong\n`;
            }
        });

        inventoryMessage += "\nBo loc: slg inv [weapon|armor|accessory|consumable|material]";

        return api.sendMessage(inventoryMessage, threadID, messageID);
    }

    async handleSkills(api, event, args) {
        const { threadID, messageID, senderID } = event;
        const players = await this.gameData.loadData('players.json');
        const player = players[senderID];

        if (!player) {
            return api.sendMessage("Ban chua tham gia game! Su dung 'slg start'", threadID, messageID);
        }

        if (!args[1]) {
            return this.showSkills(api, event);
        }

        const action = args[1].toLowerCase();

        switch (action) {
            case 'list':
                return this.showSkills(api, event);
            case 'learn':
                return this.learnSkill(api, event, args[2]);
            case 'upgrade':
                return this.upgradeSkill(api, event, args[2]);
            case 'use':
                return this.useSkill(api, event, args[2]);
            default:
                return this.showSkills(api, event);
        }
    }

    async showSkills(api, event) {
        const { threadID, messageID, senderID } = event;
        const players = await this.gameData.loadData('players.json');
        const player = players[senderID];
        const skills = await this.gameData.loadData('skills.json');

        let skillMessage = "=== KY NANG CUA BAN ===\n\n";

        if (player.skills.length === 0) {
            skillMessage += "Ban chua co ky nang nao!\n";
            skillMessage += "Thuc tinh class de nhan ky nang dau tien.\n\n";
        } else {
            skillMessage += "ACTIVE SKILLS:\n";
            player.skills.forEach(skillData => {
                const skill = skills[skillData.id];
                if (skill) {
                    skillMessage += `${skill.name} (Level ${skillData.level})\n`;
                    skillMessage += `  ${skill.description}\n`;
                    skillMessage += `  Cost: ${skill.cost} mana | Cooldown: ${skill.cooldown}s\n\n`;
                }
            });
        }

        if (player.passiveSkills.length > 0) {
            skillMessage += "PASSIVE SKILLS:\n";
            player.passiveSkills.forEach(skillData => {
                const skill = skills[skillData.id];
                if (skill) {
                    skillMessage += `${skill.name} (Level ${skillData.level})\n`;
                    skillMessage += `  ${skill.description}\n\n`;
                }
            });
        }

        if (player.hiddenSkills.length > 0) {
            skillMessage += "HIDDEN SKILLS:\n";
            player.hiddenSkills.forEach(skillData => {
                const skill = skills[skillData.id];
                if (skill) {
                    skillMessage += `${skill.name} (Level ${skillData.level})\n`;
                    skillMessage += `  ${skill.description}\n\n`;
                }
            });
        }

        skillMessage += `Skill Points: ${player.skillPoints}\n\n`;
        skillMessage += "LENH:\n";
        skillMessage += "slg skill learn <skill_name> - Hoc ky nang moi\n";
        skillMessage += "slg skill upgrade <skill_name> - Nang cap ky nang\n";
        skillMessage += "slg skill use <skill_name> - Su dung ky nang";

        return api.sendMessage(skillMessage, threadID, messageID);
    }

    async showRanking(api, event, args) {
        const { threadID, messageID } = event;
        const players = await this.gameData.loadData('players.json');

        const type = args[1] ? args[1].toLowerCase() : 'level';
        let sortedPlayers = [];

        switch (type) {
            case 'level':
                sortedPlayers = Object.values(players).sort((a, b) => {
                    if (b.level !== a.level) return b.level - a.level;
                    return b.exp - a.exp;
                });
                break;
            case 'gold':
                sortedPlayers = Object.values(players).sort((a, b) => b.gold - a.gold);
                break;
            case 'power':
                sortedPlayers = Object.values(players).sort((a, b) => {
                    const powerA = a.attack + a.defense + a.hp;
                    const powerB = b.attack + b.defense + b.hp;
                    return powerB - powerA;
                });
                break;
            default:
                sortedPlayers = Object.values(players).sort((a, b) => b.level - a.level);
        }

        let rankingMessage = `=== BANG XEP HANG - ${type.toUpperCase()} ===\n\n`;

        const topPlayers = sortedPlayers.slice(0, 10);
        topPlayers.forEach((player, index) => {
            rankingMessage += `${index + 1}. ${player.name} (Level ${player.level})\n`;

            switch (type) {
                case 'level':
                    rankingMessage += `   EXP: ${player.exp}/${player.expToNext}\n`;
                    break;
                case 'gold':
                    rankingMessage += `   Gold: ${player.gold}\n`;
                    break;
                case 'power':
                    const power = player.attack + player.defense + player.hp;
                    rankingMessage += `   Power: ${power}\n`;
                    break;
            }

            rankingMessage += `   Class: ${player.class === 'none' ? 'Chua thuc tinh' : player.class}\n\n`;
        });

        rankingMessage += "Loai bang xep hang: slg rank [level|gold|power]";

        return api.sendMessage(rankingMessage, threadID, messageID);
    }

    async showHelp(api, event) {
        const { threadID, messageID } = event;

        const helpMessage =
            "=== SOLO LEVELING - HUONG DAN SU DUNG ===\n\n" +
            "CAC LENH CO BAN:\n" +
            "slg start - Bat dau choi game\n" +
            "slg stats - Xem thong tin nhan vat\n" +
            "slg help - Hien thi huong dan\n\n" +
            "CHIEN DAU & SAN QUAI:\n" +
            "slg hunt - San quai random\n" +
            "slg hunt <ten_quai> - San quai cu the\n" +
            "slg dungeon - Vao dungeon\n\n" +
            "NHIEM VU & THUC TINH:\n" +
            "slg quest - Xem nhiem vu\n" +
            "slg awaken - Thuc tinh class\n" +
            "slg class - Xem cac class\n\n" +
            "TRANG BI & CUA HANG:\n" +
            "slg inventory - Xem tui do\n" +
            "slg equip <ten_do> - Trang bi\n" +
            "slg shop - Mo cua hang\n" +
            "slg buy <ten_do> - Mua do\n" +
            "slg sell <ten_do> - Ban do\n" +
            "slg forge - Ren/nang cap trang bi\n\n" +
            "KY NANG & SHADOW:\n" +
            "slg skill - Quan ly ky nang\n" +
            "slg shadow - Quan ly shadow pet\n\n" +
            "XA HOI & GIAO DICH:\n" +
            "slg party - Tao/tham gia team\n" +
            "slg trade - Giao dich voi nguoi choi\n" +
            "slg ranking - Bang xep hang\n\n" +
            "NANG CAO:\n" +
            "slg reset - Reset diem chi so\n" +
            "Them chi tiet: slg help <ten_lenh>";

        return api.sendMessage(helpMessage, threadID, messageID);
    }
}

module.exports = GameCore;