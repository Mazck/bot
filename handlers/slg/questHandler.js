const GameData = require('../../utils/slg/gameData');

class QuestHandler {
    static async handleQuest(api, event, args) {
        const { threadID, messageID, senderID } = event;

        if (!args[1]) {
            return this.showActiveQuests(api, event);
        }

        const action = args[1].toLowerCase();

        switch (action) {
            case 'list':
            case 'active':
                return this.showActiveQuests(api, event);
            case 'available':
                return this.showAvailableQuests(api, event);
            case 'accept':
                return this.acceptQuest(api, event, args[2]);
            case 'complete':
                return this.completeQuest(api, event, args[2]);
            case 'abandon':
                return this.abandonQuest(api, event, args[2]);
            case 'daily':
                return this.showDailyQuests(api, event);
            case 'hidden':
                return this.showHiddenQuests(api, event);
            default:
                return this.showActiveQuests(api, event);
        }
    }

    static async showActiveQuests(api, event) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        const players = await gameData.loadData('players.json');
        const player = players[senderID];

        if (!player) {
            return api.sendMessage("Ban chua tham gia game! Su dung 'slg start'", threadID, messageID);
        }

        const quests = await gameData.loadData('quests.json');

        let questMessage = "=== NHIEM VU DANG THUC HIEN ===\n\n";

        if (player.quests.active.length === 0) {
            questMessage += "Ban khong co nhiem vu nao dang thuc hien!\n\n";
            questMessage += "Su dung 'slg quest available' de xem nhiem vu co the nhan\n";
            questMessage += "Su dung 'slg quest daily' de xem nhiem vu hang ngay";
        } else {
            player.quests.active.forEach((questData, index) => {
                const quest = quests[questData.id];
                if (quest) {
                    questMessage += `${index + 1}. ${quest.name}\n`;
                    questMessage += `   ${quest.description}\n`;

                    // Show progress based on quest type
                    if (quest.type === 'kill') {
                        questMessage += `   Tien do: ${questData.progress || 0}/${quest.target.amount}\n`;
                        questMessage += `   Muc tieu: ${quest.target.monster}\n`;
                    } else if (quest.type === 'collect') {
                        questMessage += `   Thu thap: ${questData.progress || 0}/${quest.target.amount}\n`;
                        questMessage += `   Vat pham: ${quest.target.item}\n`;
                    } else if (quest.type === 'level') {
                        questMessage += `   Level yeu cau: ${quest.target.level}\n`;
                        questMessage += `   Level hien tai: ${player.level}\n`;
                    } else if (quest.type === 'chain') {
                        questMessage += `   Buoc hien tai: ${questData.step || 1}/${quest.steps.length}\n`;
                        questMessage += `   Yeu cau: ${quest.steps[questData.step - 1] || quest.steps[0]}\n`;
                    }

                    // Show rewards
                    questMessage += `   Phan thuong: `;
                    if (quest.rewards.exp) questMessage += `${quest.rewards.exp} EXP `;
                    if (quest.rewards.gold) questMessage += `${quest.rewards.gold} Gold `;
                    if (quest.rewards.diamonds) questMessage += `${quest.rewards.diamonds} Diamonds `;
                    questMessage += "\n";

                    if (quest.rewards.items && quest.rewards.items.length > 0) {
                        questMessage += `   Items: ${quest.rewards.items.join(', ')}\n`;
                    }

                    if (quest.rewards.skillPoints) {
                        questMessage += `   Skill Points: ${quest.rewards.skillPoints}\n`;
                    }

                    if (quest.rewards.unlocks) {
                        questMessage += `   Mo khoa: ${quest.rewards.unlocks.join(', ')}\n`;
                    }

                    questMessage += "\n";
                }
            });

            questMessage += "Su dung 'slg quest complete <quest_id>' de hoan thanh nhiem vu";
        }

        return api.sendMessage(questMessage, threadID, messageID);
    }

    static async showAvailableQuests(api, event) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const quests = await gameData.loadData('quests.json');

        const availableQuests = Object.entries(quests).filter(([id, quest]) => {
            // Skip if already completed
            if (player.quests.completed.includes(id)) return false;

            // Skip if already active
            if (player.quests.active.some(q => q.id === id)) return false;

            // Skip if hidden and requirements not met
            if (quest.hidden && !this.checkHiddenQuestRequirements(player, quest)) return false;

            // Check basic requirements
            if (quest.requirements) {
                if (quest.requirements.level && player.level < quest.requirements.level) return false;
                if (quest.requirements.class && quest.requirements.class !== player.class) return false;
                if (quest.requirements.questCompleted && !player.quests.completed.includes(quest.requirements.questCompleted)) return false;
                if (quest.requirements.awakened && !player.awakened) return false;
            }

            return true;
        });

        if (availableQuests.length === 0) {
            return api.sendMessage("Khong co nhiem vu nao co the nhan hien tai!", threadID, messageID);
        }

        let questMessage = "=== NHIEM VU CO THE NHAN ===\n\n";

        availableQuests.slice(0, 10).forEach(([id, quest], index) => {
            questMessage += `${index + 1}. ${quest.name}\n`;
            questMessage += `   ${quest.description}\n`;

            if (quest.requirements) {
                questMessage += `   Yeu cau: `;
                if (quest.requirements.level) questMessage += `Level ${quest.requirements.level} `;
                if (quest.requirements.class) questMessage += `Class ${quest.requirements.class} `;
                if (quest.requirements.awakened) questMessage += `Awakened `;
                questMessage += "\n";
            }

            questMessage += `   Phan thuong: `;
            if (quest.rewards.exp) questMessage += `${quest.rewards.exp} EXP `;
            if (quest.rewards.gold) questMessage += `${quest.rewards.gold} Gold `;
            if (quest.rewards.diamonds) questMessage += `${quest.rewards.diamonds} Diamonds `;
            questMessage += "\n";

            if (quest.hidden) questMessage += `   Loai: HIDDEN QUEST\n`;
            questMessage += `   ID: ${id}\n\n`;
        });

        questMessage += "Su dung 'slg quest accept <quest_id>' de nhan nhiem vu";

        return api.sendMessage(questMessage, threadID, messageID);
    }

    static async acceptQuest(api, event, questId) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        if (!questId) {
            return api.sendMessage("Su dung: slg quest accept <quest_id>", threadID, messageID);
        }

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const quests = await gameData.loadData('quests.json');

        if (!quests[questId]) {
            return api.sendMessage("Khong tim thay nhiem vu nay!", threadID, messageID);
        }

        const quest = quests[questId];

        // Check if already have this quest
        if (player.quests.active.some(q => q.id === questId)) {
            return api.sendMessage("Ban da co nhiem vu nay roi!", threadID, messageID);
        }

        // Check if already completed
        if (player.quests.completed.includes(questId)) {
            return api.sendMessage("Ban da hoan thanh nhiem vu nay roi!", threadID, messageID);
        }

        // Check quest limit (max 5 active quests)
        if (player.quests.active.length >= 5) {
            return api.sendMessage("Ban chi co the nhan toi da 5 nhiem vu cung luc!", threadID, messageID);
        }

        // Check requirements
        if (quest.requirements) {
            if (quest.requirements.level && player.level < quest.requirements.level) {
                return api.sendMessage(`Ban can dat level ${quest.requirements.level} de nhan nhiem vu nay!`, threadID, messageID);
            }
            if (quest.requirements.class && quest.requirements.class !== player.class) {
                return api.sendMessage(`Chi ${quest.requirements.class} moi co the nhan nhiem vu nay!`, threadID, messageID);
            }
            if (quest.requirements.questCompleted && !player.quests.completed.includes(quest.requirements.questCompleted)) {
                return api.sendMessage(`Ban can hoan thanh quest ${quest.requirements.questCompleted} truoc!`, threadID, messageID);
            }
        }

        // Add quest to active list
        player.quests.active.push({
            id: questId,
            progress: 0,
            step: 1,
            startTime: Date.now()
        });

        await gameData.saveData('players.json', players);

        return api.sendMessage(
            `Da nhan nhiem vu: ${quest.name}\n\n` +
            `${quest.description}\n\n` +
            `Bat dau thuc hien nhiem vu ngay!`,
            threadID, messageID
        );
    }

    static async completeQuest(api, event, questId) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        if (!questId) {
            return api.sendMessage("Su dung: slg quest complete <quest_id>", threadID, messageID);
        }

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const quests = await gameData.loadData('quests.json');

        const questIndex = player.quests.active.findIndex(q => q.id === questId);
        if (questIndex === -1) {
            return api.sendMessage("Ban khong co nhiem vu nay trong danh sach active!", threadID, messageID);
        }

        const quest = quests[questId];
        const questData = player.quests.active[questIndex];

        // Check if quest can be completed
        if (!this.canCompleteQuest(player, quest, questData)) {
            return api.sendMessage("Ban chua hoan thanh yeu cau cua nhiem vu!", threadID, messageID);
        }

        // Remove from active quests
        player.quests.active.splice(questIndex, 1);

        // Add to completed quests
        player.quests.completed.push(questId);
        player.statistics.questsCompleted++;

        // Give rewards
        if (quest.rewards.exp) player.exp += quest.rewards.exp;
        if (quest.rewards.gold) player.gold += quest.rewards.gold;
        if (quest.rewards.diamonds) player.diamonds += quest.rewards.diamonds;
        if (quest.rewards.skillPoints) player.skillPoints += quest.rewards.skillPoints;

        if (quest.rewards.items) {
            quest.rewards.items.forEach(itemId => {
                player.inventory[itemId] = (player.inventory[itemId] || 0) + 1;
            });
        }

        // Handle special unlocks
        if (quest.rewards.unlocks) {
            quest.rewards.unlocks.forEach(unlock => {
                if (unlock.startsWith('class_')) {
                    const className = unlock.replace('class_', '');
                    if (!player.unlockedClasses) player.unlockedClasses = [];
                    if (!player.unlockedClasses.includes(className)) {
                        player.unlockedClasses.push(className);
                    }
                } else if (unlock.startsWith('skill_')) {
                    const skillId = unlock.replace('skill_', '');
                    if (!player.availableSkills) player.availableSkills = [];
                    if (!player.availableSkills.includes(skillId)) {
                        player.availableSkills.push(skillId);
                    }
                }
            });
        }

        // Check for level up
        const PlayerUtils = require('../../utils/slg/playerUtils');
        const playerUtils = new PlayerUtils();
        const levelUpResult = await playerUtils.checkLevelUp(player);

        await gameData.saveData('players.json', players);

        let completeMessage = `=== HOAN THANH NHIEM VU ===\n\n`;
        completeMessage += `${quest.name}\n\n`;
        completeMessage += `Phan thuong:\n`;
        if (quest.rewards.exp) completeMessage += `- EXP: ${quest.rewards.exp}\n`;
        if (quest.rewards.gold) completeMessage += `- Gold: ${quest.rewards.gold}\n`;
        if (quest.rewards.diamonds) completeMessage += `- Diamonds: ${quest.rewards.diamonds}\n`;
        if (quest.rewards.skillPoints) completeMessage += `- Skill Points: ${quest.rewards.skillPoints}\n`;

        if (quest.rewards.items && quest.rewards.items.length > 0) {
            completeMessage += `- Items: ${quest.rewards.items.join(', ')}\n`;
        }

        if (quest.rewards.unlocks && quest.rewards.unlocks.length > 0) {
            completeMessage += `- Mo khoa: ${quest.rewards.unlocks.join(', ')}\n`;
        }

        if (levelUpResult.leveledUp) {
            completeMessage += `\nCHUC MUNG! Ban da len cap ${player.level}!`;
        }

        return api.sendMessage(completeMessage, threadID, messageID);
    }

    static canCompleteQuest(player, quest, questData) {
        switch (quest.type) {
            case 'kill':
                return questData.progress >= quest.target.amount;

            case 'collect':
                return player.inventory[quest.target.item] >= quest.target.amount;

            case 'level':
                return player.level >= quest.target.level;

            case 'chain':
                return questData.step > quest.steps.length;

            case 'dungeon':
                return questData.progress >= quest.target.amount;

            default:
                return true;
        }
    }

    static checkHiddenQuestRequirements(player, quest) {
        // Custom logic for each hidden quest
        if (quest.hiddenRequirements) {
            const req = quest.hiddenRequirements;

            if (req.monstersKilled && player.statistics.monstersKilled < req.monstersKilled) return false;
            if (req.dungeonsCleared && player.statistics.dungeonsCleared < req.dungeonsCleared) return false;
            if (req.goldSpent && player.statistics.goldSpent < req.goldSpent) return false;
            if (req.hasItem && (!player.inventory[req.hasItem] || player.inventory[req.hasItem] < 1)) return false;
            if (req.awakened && !player.awakened) return false;
            if (req.awakeningLevel && player.awakeningLevel < req.awakeningLevel) return false;
        }

        return true;
    }

    // Function to update quest progress when certain events happen
    static updateQuestProgress(player, eventType, target, amount = 1) {
        let updated = false;

        player.quests.active.forEach(questData => {
            const gameData = new GameData();
            const quests = gameData.loadDataSync('quests.json');
            const quest = quests[questData.id];

            if (!quest) return;

            if (quest.type === eventType) {
                if (quest.target.monster === target || quest.target.item === target || target === 'any') {
                    questData.progress = (questData.progress || 0) + amount;
                    updated = true;
                }
            }
        });

        return updated;
    }

    static async showDailyQuests(api, event) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        const players = await gameData.loadData('players.json');
        const player = players[senderID];

        // Check if daily quests need reset
        const now = Date.now();
        const lastDaily = player.lastDaily || 0;
        const oneDayMs = 24 * 60 * 60 * 1000;

        if (now - lastDaily > oneDayMs) {
            // Reset daily quests
            player.quests.daily = [];
            player.lastDaily = now;

            // Generate new daily quests
            const dailyQuests = this.generateDailyQuests(player);
            player.quests.daily = dailyQuests;

            await gameData.saveData('players.json', players);
        }

        let dailyMessage = "=== NHIEM VU HANG NGAY ===\n\n";

        if (player.quests.daily.length === 0) {
            dailyMessage += "Khong co nhiem vu hang ngay nao!\n";
            dailyMessage += "Nhiem vu moi se duoc tao sau 24 gio.";
        } else {
            player.quests.daily.forEach((questData, index) => {
                dailyMessage += `${index + 1}. ${questData.name}\n`;
                dailyMessage += `   ${questData.description}\n`;
                dailyMessage += `   Tien do: ${questData.progress}/${questData.target}\n`;
                dailyMessage += `   Phan thuong: ${questData.reward.exp} EXP, ${questData.reward.gold} Gold\n`;

                if (questData.completed) {
                    dailyMessage += `   Trang thai: HOAN THANH\n`;
                } else {
                    dailyMessage += `   Trang thai: Chua hoan thanh\n`;
                }
                dailyMessage += "\n";
            });
        }

        const timeUntilReset = oneDayMs - (now - player.lastDaily);
        const hoursUntilReset = Math.floor(timeUntilReset / (60 * 60 * 1000));
        dailyMessage += `\nThoi gian reset: ${hoursUntilReset} gio nua`;

        return api.sendMessage(dailyMessage, threadID, messageID);
    }

    static generateDailyQuests(player) {
        const dailyTemplates = [
            {
                type: 'kill',
                name: 'San Quai Hang Ngay',
                description: 'Tieu diet 10 quai vat bat ky',
                target: 10,
                reward: { exp: player.level * 20, gold: player.level * 15 }
            },
            {
                type: 'gold',
                name: 'Kiem Vang',
                description: 'Kiem duoc 500 gold',
                target: 500,
                reward: { exp: player.level * 15, gold: 100 }
            },
            {
                type: 'hunt',
                name: 'San Quai Lien Tuc',
                description: 'Thuc hien 5 lan san quai',
                target: 5,
                reward: { exp: player.level * 25, gold: player.level * 20 }
            }
        ];

        // Generate 3 random daily quests
        const selectedQuests = [];
        for (let i = 0; i < 3; i++) {
            const template = dailyTemplates[Math.floor(Math.random() * dailyTemplates.length)];
            selectedQuests.push({
                ...template,
                id: `daily_${i}_${Date.now()}`,
                progress: 0,
                completed: false
            });
        }

        return selectedQuests;
    }
}

module.exports = QuestHandler;