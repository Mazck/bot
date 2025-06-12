const GameData = require('../../utils/slg/gameData');
const CombatHandler = require('./combatHandler');

class DungeonHandler {
    static async handleDungeon(api, event, args) {
        const { threadID, messageID, senderID } = event;

        if (!args[1]) {
            return this.showAvailableDungeons(api, event);
        }

        const action = args[1].toLowerCase();

        switch (action) {
            case 'list':
                return this.showAvailableDungeons(api, event);
            case 'enter':
                return this.enterDungeon(api, event, args[2]);
            case 'create':
                return this.createPartyDungeon(api, event, args[2]);
            case 'join':
                return this.joinPartyDungeon(api, event, args[2]);
            case 'info':
                return this.showDungeonInfo(api, event, args[2]);
            case 'ranking':
                return this.showDungeonRanking(api, event);
            default:
                return this.showAvailableDungeons(api, event);
        }
    }

    static async showAvailableDungeons(api, event) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const dungeons = await gameData.loadData('dungeons.json');

        if (!player) {
            return api.sendMessage("Ban chua tham gia game! Su dung 'slg start'", threadID, messageID);
        }

        const availableDungeons = Object.entries(dungeons).filter(([id, dungeon]) => {
            // Check level requirement
            if (dungeon.requirements && dungeon.requirements.level && player.level < dungeon.requirements.level) {
                return false;
            }

            // Check class requirement
            if (dungeon.requirements && dungeon.requirements.class && dungeon.requirements.class !== player.class) {
                return false;
            }

            // Check if hidden dungeon
            if (dungeon.hidden && !this.checkHiddenDungeonRequirements(player, dungeon)) {
                return false;
            }

            return true;
        });

        if (availableDungeons.length === 0) {
            return api.sendMessage("Khong co dungeon nao co the vao hien tai!", threadID, messageID);
        }

        let dungeonMessage = "=== DANH SACH DUNGEON ===\n\n";

        availableDungeons.forEach(([id, dungeon], index) => {
            dungeonMessage += `${index + 1}. ${dungeon.name}\n`;
            dungeonMessage += `   Level: ${dungeon.level} | Difficulty: ${dungeon.difficulty}\n`;
            dungeonMessage += `   Type: ${dungeon.type} | Max Party: ${dungeon.maxParty || 1}\n`;
            dungeonMessage += `   Rewards: ${dungeon.rewards.exp} EXP, ${dungeon.rewards.gold} Gold\n`;

            if (dungeon.requirements) {
                dungeonMessage += `   Yeu cau: Level ${dungeon.requirements.level || 1}`;
                if (dungeon.requirements.class) dungeonMessage += `, Class ${dungeon.requirements.class}`;
                dungeonMessage += "\n";
            }

            dungeonMessage += `   ID: ${id}\n`;
            dungeonMessage += `   Status: ${dungeon.hidden ? "HIDDEN" : "AVAILABLE"}\n\n`;
        });

        dungeonMessage += "LENH:\n";
        dungeonMessage += "slg dungeon enter <dungeon_id> - Vao dungeon solo\n";
        dungeonMessage += "slg dungeon create <dungeon_id> - Tao party dungeon\n";
        dungeonMessage += "slg dungeon info <dungeon_id> - Xem thong tin chi tiet\n";
        dungeonMessage += "slg dungeon ranking - Bang xep hang dungeon";

        return api.sendMessage(dungeonMessage, threadID, messageID);
    }

    static async enterDungeon(api, event, dungeonId) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        if (!dungeonId) {
            return api.sendMessage("Su dung: slg dungeon enter <dungeon_id>", threadID, messageID);
        }

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const dungeons = await gameData.loadData('dungeons.json');

        if (!dungeons[dungeonId]) {
            return api.sendMessage("Khong tim thay dungeon nay!", threadID, messageID);
        }

        const dungeon = dungeons[dungeonId];

        // Check cooldown
        const now = Date.now();
        const dungeonCooldown = 5 * 60 * 1000; // 5 minutes
        if (now - player.lastDungeon < dungeonCooldown) {
            const remaining = Math.ceil((dungeonCooldown - (now - player.lastDungeon)) / 1000 / 60);
            return api.sendMessage(`Ban can cho ${remaining} phut nua de vao dungeon tiep theo!`, threadID, messageID);
        }

        // Check requirements
        if (dungeon.requirements) {
            if (dungeon.requirements.level && player.level < dungeon.requirements.level) {
                return api.sendMessage(`Ban can dat level ${dungeon.requirements.level} de vao dungeon nay!`, threadID, messageID);
            }
            if (dungeon.requirements.class && player.class !== dungeon.requirements.class) {
                return api.sendMessage(`Chi ${dungeon.requirements.class} moi co the vao dungeon nay!`, threadID, messageID);
            }
        }

        // Check HP
        if (player.hp < player.maxHp * 0.5) {
            return api.sendMessage("HP cua ban qua thap de vao dungeon! Su dung potion de hoi phuc", threadID, messageID);
        }

        // Start dungeon exploration
        const result = await this.exploreDungeon(player, dungeon);

        // Update last dungeon time
        player.lastDungeon = now;

        let dungeonMessage = `=== DUNGEON: ${dungeon.name.toUpperCase()} ===\n\n`;

        if (result.success) {
            dungeonMessage += "THANH CONG!\n\n";
            dungeonMessage += `Ban da hoan thanh dungeon ${dungeon.name}!\n\n`;

            // Apply rewards
            player.exp += result.rewards.exp;
            player.gold += result.rewards.gold;
            player.statistics.dungeonsCleared++;

            if (result.rewards.items) {
                result.rewards.items.forEach(itemId => {
                    player.inventory[itemId] = (player.inventory[itemId] || 0) + 1;
                });
            }

            dungeonMessage += "QUA TRINH:\n";
            result.log.forEach((entry, index) => {
                dungeonMessage += `${index + 1}. ${entry}\n`;
            });

            dungeonMessage += `\nPHAN THUONG:\n`;
            dungeonMessage += `- EXP: ${result.rewards.exp}\n`;
            dungeonMessage += `- Gold: ${result.rewards.gold}\n`;

            if (result.rewards.items && result.rewards.items.length > 0) {
                dungeonMessage += `- Items: ${result.rewards.items.join(', ')}\n`;
            }

            // Check for level up
            const PlayerUtils = require('../../utils/slg/playerUtils');
            const playerUtils = new PlayerUtils();
            const levelUpResult = await playerUtils.checkLevelUp(player);

            if (levelUpResult.leveledUp) {
                dungeonMessage += `\nCHUC MUNG! Ban da len cap ${player.level}!`;
            }

        } else {
            dungeonMessage += "THAT BAI!\n\n";
            dungeonMessage += `Ban da that bai trong dungeon ${dungeon.name}!\n\n`;

            if (result.log && result.log.length > 0) {
                dungeonMessage += "QUA TRINH:\n";
                result.log.forEach((entry, index) => {
                    dungeonMessage += `${index + 1}. ${entry}\n`;
                });
            }

            dungeonMessage += `\nHP con lai: ${player.hp}/${player.maxHp}\n`;
            dungeonMessage += "Su dung potion de hoi phuc va thu lai!";
        }

        await gameData.saveData('players.json', players);
        return api.sendMessage(dungeonMessage, threadID, messageID);
    }

    static async exploreDungeon(player, dungeon) {
        const gameData = new GameData();
        const monsters = await gameData.loadData('monsters.json');

        let log = [];
        let totalRewards = {
            exp: 0,
            gold: 0,
            items: []
        };

        let currentHp = player.hp;
        let floors = dungeon.floors || 1;

        for (let floor = 1; floor <= floors; floor++) {
            log.push(`Tang ${floor}: Bat dau kham pha`);

            // Generate monsters for this floor
            const floorMonsters = this.generateFloorMonsters(dungeon, floor);

            for (let i = 0; i < floorMonsters.length; i++) {
                const monsterId = floorMonsters[i];
                const monster = monsters[monsterId];

                if (!monster) continue;

                log.push(`Gap ${monster.name}`);

                // Create temporary player for combat
                const tempPlayer = { ...player, hp: currentHp };
                const combatResult = await CombatHandler.simulateCombat(tempPlayer, monster);

                currentHp = tempPlayer.hp;

                if (!combatResult.victory) {
                    log.push(`Bi ${monster.name} danh bai`);
                    player.hp = currentHp;
                    return {
                        success: false,
                        log: log,
                        rewards: null
                    };
                }

                log.push(`Danh bai ${monster.name}`);
                totalRewards.exp += combatResult.rewards.exp;
                totalRewards.gold += combatResult.rewards.gold;
                totalRewards.items.push(...combatResult.rewards.items);
            }

            log.push(`Hoan thanh tang ${floor}`);
        }

        // Boss fight
        if (dungeon.boss) {
            log.push(`Boss xuat hien: ${dungeon.boss.name}`);

            const tempPlayer = { ...player, hp: currentHp };
            const bossResult = await CombatHandler.simulateCombat(tempPlayer, dungeon.boss);

            currentHp = tempPlayer.hp;

            if (!bossResult.victory) {
                log.push(`Bi boss ${dungeon.boss.name} danh bai`);
                player.hp = currentHp;
                return {
                    success: false,
                    log: log,
                    rewards: null
                };
            }

            log.push(`Danh bai boss ${dungeon.boss.name}!`);

            // Boss rewards
            totalRewards.exp += dungeon.boss.expReward || (dungeon.boss.level * 50);
            totalRewards.gold += dungeon.boss.goldReward || (dungeon.boss.level * 100);

            if (dungeon.boss.drops) {
                dungeon.boss.drops.forEach(drop => {
                    if (Math.random() < (drop.chance || 0.5)) {
                        totalRewards.items.push(drop.itemId);
                    }
                });
            }
        }

        // Dungeon completion rewards
        totalRewards.exp += dungeon.rewards.exp;
        totalRewards.gold += dungeon.rewards.gold;

        if (dungeon.rewards.items) {
            totalRewards.items.push(...dungeon.rewards.items);
        }

        // Apply difficulty multiplier
        const difficultyMultiplier = this.getDifficultyMultiplier(dungeon.difficulty);
        totalRewards.exp = Math.floor(totalRewards.exp * difficultyMultiplier);
        totalRewards.gold = Math.floor(totalRewards.gold * difficultyMultiplier);

        player.hp = currentHp;
        log.push("Dungeon hoan thanh!");

        return {
            success: true,
            log: log,
            rewards: totalRewards
        };
    }

    static generateFloorMonsters(dungeon, floor) {
        const monstersPerFloor = dungeon.monstersPerFloor || 3;
        const availableMonsters = dungeon.monsters || ['goblin', 'orc', 'skeleton'];

        const floorMonsters = [];
        for (let i = 0; i < monstersPerFloor; i++) {
            const randomMonster = availableMonsters[Math.floor(Math.random() * availableMonsters.length)];
            floorMonsters.push(randomMonster);
        }

        return floorMonsters;
    }

    static getDifficultyMultiplier(difficulty) {
        switch (difficulty) {
            case 'easy': return 0.8;
            case 'normal': return 1.0;
            case 'hard': return 1.5;
            case 'expert': return 2.0;
            case 'nightmare': return 3.0;
            default: return 1.0;
        }
    }

    static checkHiddenDungeonRequirements(player, dungeon) {
        if (dungeon.hiddenRequirements) {
            const req = dungeon.hiddenRequirements;

            if (req.questCompleted && !player.quests.completed.includes(req.questCompleted)) return false;
            if (req.itemRequired && (!player.inventory[req.itemRequired] || player.inventory[req.itemRequired] < 1)) return false;
            if (req.dungeonsCleared && player.statistics.dungeonsCleared < req.dungeonsCleared) return false;
            if (req.awakeningLevel && player.awakeningLevel < req.awakeningLevel) return false;
        }

        return true;
    }

    static async showDungeonInfo(api, event, dungeonId) {
        const { threadID, messageID } = event;
        const gameData = new GameData();

        if (!dungeonId) {
            return api.sendMessage("Su dung: slg dungeon info <dungeon_id>", threadID, messageID);
        }

        const dungeons = await gameData.loadData('dungeons.json');

        if (!dungeons[dungeonId]) {
            return api.sendMessage("Khong tim thay dungeon nay!", threadID, messageID);
        }

        const dungeon = dungeons[dungeonId];

        let infoMessage = `=== ${dungeon.name.toUpperCase()} ===\n\n`;
        infoMessage += `${dungeon.description || "Dungeon nguy hiem"}\n\n`;
        infoMessage += `Level: ${dungeon.level}\n`;
        infoMessage += `Difficulty: ${dungeon.difficulty}\n`;
        infoMessage += `Type: ${dungeon.type}\n`;
        infoMessage += `Floors: ${dungeon.floors || 1}\n`;
        infoMessage += `Max Party: ${dungeon.maxParty || 1}\n\n`;

        if (dungeon.requirements) {
            infoMessage += "YEU CAU:\n";
            if (dungeon.requirements.level) infoMessage += `- Level: ${dungeon.requirements.level}\n`;
            if (dungeon.requirements.class) infoMessage += `- Class: ${dungeon.requirements.class}\n`;
            infoMessage += "\n";
        }

        infoMessage += "QUAI VAT:\n";
        if (dungeon.monsters) {
            dungeon.monsters.forEach((monster, index) => {
                infoMessage += `${index + 1}. ${monster}\n`;
            });
        }

        if (dungeon.boss) {
            infoMessage += `\nBOSS: ${dungeon.boss.name}\n`;
            infoMessage += `Level: ${dungeon.boss.level}\n`;
            infoMessage += `HP: ${dungeon.boss.hp}\n`;
            infoMessage += `Attack: ${dungeon.boss.attack}\n`;

            if (dungeon.boss.drops) {
                infoMessage += "Boss Drops:\n";
                dungeon.boss.drops.forEach(drop => {
                    infoMessage += `- ${drop.itemId} (${Math.floor(drop.chance * 100)}%)\n`;
                });
            }
        }

        infoMessage += `\nPHAN THUONG:\n`;
        infoMessage += `- EXP: ${dungeon.rewards.exp}\n`;
        infoMessage += `- Gold: ${dungeon.rewards.gold}\n`;

        if (dungeon.rewards.items) {
            infoMessage += `- Items: ${dungeon.rewards.items.join(', ')}\n`;
        }

        const multiplier = this.getDifficultyMultiplier(dungeon.difficulty);
        if (multiplier !== 1.0) {
            infoMessage += `\nDifficulty Multiplier: x${multiplier}`;
        }

        return api.sendMessage(infoMessage, threadID, messageID);
    }
}

module.exports = DungeonHandler;