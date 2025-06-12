const GameData = require('../../utils/slg/gameData');

class AwakenHandler {
    static async handleAwaken(api, event, args) {
        const { threadID, messageID, senderID } = event;

        if (!args[1]) {
            return this.showAwakenStatus(api, event);
        }

        const action = args[1].toLowerCase();

        switch (action) {
            case 'status':
                return this.showAwakenStatus(api, event);
            case 'awaken':
                return this.performAwakening(api, event, args[2]);
            case 'reawaken':
                return this.performReawakening(api, event, args[2]);
            case 'requirements':
                return this.showAwakenRequirements(api, event, args[2]);
            default:
                return this.showAwakenStatus(api, event);
        }
    }

    static async showAwakenStatus(api, event) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const classes = await gameData.loadData('classes.json');

        if (!player) {
            return api.sendMessage("Ban chua tham gia game! Su dung 'slg start'", threadID, messageID);
        }

        let statusMessage = "=== TRANG THAI THUC TINH ===\n\n";

        statusMessage += `Awakened: ${player.awakened ? "Co" : "Chua"}\n`;
        statusMessage += `Awakening Level: ${player.awakeningLevel}\n`;

        if (player.class !== "none" && classes[player.class]) {
            const currentClass = classes[player.class];
            statusMessage += `Class hien tai: ${currentClass.name}\n`;
            statusMessage += `Mo ta: ${currentClass.description}\n`;

            if (currentClass.skills && currentClass.skills.length > 0) {
                statusMessage += `Class Skills: ${currentClass.skills.join(', ')}\n`;
            }

            if (currentClass.passiveSkills && currentClass.passiveSkills.length > 0) {
                statusMessage += `Passive Skills: ${currentClass.passiveSkills.join(', ')}\n`;
            }
        } else {
            statusMessage += `Class hien tai: Chua thuc tinh\n`;
        }

        statusMessage += "\n";

        if (!player.awakened) {
            statusMessage += "DIEU KIEN THUC TINH LAN DAU:\n";
            statusMessage += "- Level >= 5\n";
            statusMessage += "- Hoan thanh quest 'first_awakening'\n";
            statusMessage += "- Co 1000 gold\n\n";
            statusMessage += "Su dung 'slg class' de xem cac class co the thuc tinh\n";
            statusMessage += "Su dung 'slg awaken awaken <class_id>' de thuc tinh";
        } else {
            statusMessage += "DIEU KIEN THUC TINH LAI:\n";
            statusMessage += "- Level >= 20\n";
            statusMessage += "- Co Awakening Stone\n";
            statusMessage += "- Co 10000 gold\n\n";
            statusMessage += "Su dung 'slg awaken reawaken <class_id>' de thuc tinh lai";
        }

        return api.sendMessage(statusMessage, threadID, messageID);
    }

    static async showClasses(api, event, args) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const classes = await gameData.loadData('classes.json');

        if (!player) {
            return api.sendMessage("Ban chua tham gia game! Su dung 'slg start'", threadID, messageID);
        }

        const filter = args[1] ? args[1].toLowerCase() : 'all';

        let classMessage = "=== CAC CLASS ===\n\n";

        const availableClasses = Object.entries(classes).filter(([id, classData]) => {
            if (filter === 'hidden' && !classData.hidden) return false;
            if (filter === 'normal' && classData.hidden) return false;
            if (filter === 'unlocked' && !this.checkClassRequirements(player, classData)) return false;

            return true;
        });

        if (availableClasses.length === 0) {
            classMessage += `Khong co class nao trong loai '${filter}'!`;
        } else {
            availableClasses.forEach(([id, classData], index) => {
                classMessage += `${index + 1}. ${classData.name}\n`;
                classMessage += `   ${classData.description}\n`;

                if (classData.requirements) {
                    classMessage += `   Yeu cau: `;
                    if (classData.requirements.level) classMessage += `Level ${classData.requirements.level} `;
                    if (classData.requirements.quest) classMessage += `Quest: ${classData.requirements.quest} `;
                    if (classData.requirements.item) classMessage += `Item: ${classData.requirements.item} `;
                    if (classData.requirements.class) classMessage += `Previous Class: ${classData.requirements.class} `;
                    if (classData.requirements.awakeningLevel) classMessage += `Awakening Level: ${classData.requirements.awakeningLevel} `;
                    classMessage += "\n";
                }

                if (classData.bonuses) {
                    classMessage += `   Bonus Stats: `;
                    Object.entries(classData.bonuses).forEach(([stat, value]) => {
                        classMessage += `${stat}+${value} `;
                    });
                    classMessage += "\n";
                }

                if (classData.skills && classData.skills.length > 0) {
                    classMessage += `   Skills: ${classData.skills.join(', ')}\n`;
                }

                classMessage += `   Type: ${classData.hidden ? "HIDDEN" : "NORMAL"}\n`;
                classMessage += `   ID: ${id}\n`;

                const canUnlock = this.checkClassRequirements(player, classData);
                classMessage += `   Status: ${canUnlock ? "CO THE MO KHOA" : "CHUA DU DIEU KIEN"}\n\n`;
            });
        }

        classMessage += "LENH:\n";
        classMessage += "slg class [all|normal|hidden|unlocked] - Loc class\n";
        classMessage += "slg awaken requirements <class_id> - Xem yeu cau chi tiet\n";
        classMessage += "slg awaken awaken <class_id> - Thuc tinh class";

        return api.sendMessage(classMessage, threadID, messageID);
    }

    static async performAwakening(api, event, classId) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        if (!classId) {
            return api.sendMessage("Su dung: slg awaken awaken <class_id>", threadID, messageID);
        }

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const classes = await gameData.loadData('classes.json');

        if (!player) {
            return api.sendMessage("Ban chua tham gia game! Su dung 'slg start'", threadID, messageID);
        }

        if (player.awakened) {
            return api.sendMessage("Ban da thuc tinh roi! Su dung 'slg awaken reawaken' de thuc tinh lai", threadID, messageID);
        }

        if (!classes[classId]) {
            return api.sendMessage("Class nay khong ton tai!", threadID, messageID);
        }

        const selectedClass = classes[classId];

        // Check basic awakening requirements
        if (player.level < 5) {
            return api.sendMessage("Ban can dat level 5 de co the thuc tinh!", threadID, messageID);
        }

        if (player.gold < 1000) {
            return api.sendMessage("Ban can co 1000 gold de thuc tinh!", threadID, messageID);
        }

        if (!player.quests.completed.includes('first_awakening')) {
            return api.sendMessage("Ban can hoan thanh quest 'first_awakening' truoc khi thuc tinh!", threadID, messageID);
        }

        // Check class-specific requirements
        if (!this.checkClassRequirements(player, selectedClass)) {
            return api.sendMessage("Ban chua du dieu kien de thuc tinh class nay!", threadID, messageID);
        }

        // Perform awakening
        player.awakened = true;
        player.awakeningLevel = 1;
        player.class = classId;
        player.gold -= 1000;

        // Apply class bonuses
        if (selectedClass.bonuses) {
            Object.entries(selectedClass.bonuses).forEach(([stat, value]) => {
                if (stat === 'maxHp') {
                    player.maxHp += value;
                    player.hp += value;
                } else if (stat === 'maxMana') {
                    player.maxMana += value;
                    player.mana += value;
                } else if (player.hasOwnProperty(stat)) {
                    player[stat] += value;
                }
            });
        }

        // Add class skills
        if (selectedClass.skills) {
            selectedClass.skills.forEach(skillId => {
                const existingSkill = player.skills.find(s => s.id === skillId);
                if (!existingSkill) {
                    player.skills.push({
                        id: skillId,
                        level: 1,
                        exp: 0,
                        expToNext: 100
                    });
                }
            });
        }

        // Add passive skills
        if (selectedClass.passiveSkills) {
            selectedClass.passiveSkills.forEach(skillId => {
                const existingSkill = player.passiveSkills.find(s => s.id === skillId);
                if (!existingSkill) {
                    player.passiveSkills.push({
                        id: skillId,
                        level: 1
                    });
                }
            });
        }

        // Recalculate stats
        const GameCore = require('./gameCore');
        const gameCore = new GameCore();
        gameCore.recalculateStats(player);

        await gameData.saveData('players.json', players);

        let awakenMessage = "=== THUC TINH THANH CONG! ===\n\n";
        awakenMessage += `Chuc mung! Ban da thuc tinh thanh ${selectedClass.name}!\n\n`;
        awakenMessage += `${selectedClass.description}\n\n`;

        if (selectedClass.bonuses) {
            awakenMessage += "Tang chi so:\n";
            Object.entries(selectedClass.bonuses).forEach(([stat, value]) => {
                awakenMessage += `- ${stat}: +${value}\n`;
            });
            awakenMessage += "\n";
        }

        if (selectedClass.skills && selectedClass.skills.length > 0) {
            awakenMessage += `Mo khoa Active Skills: ${selectedClass.skills.join(', ')}\n`;
        }

        if (selectedClass.passiveSkills && selectedClass.passiveSkills.length > 0) {
            awakenMessage += `Mo khoa Passive Skills: ${selectedClass.passiveSkills.join(', ')}\n`;
        }

        awakenMessage += "\nBan co the su dung 'slg skill' de xem cac ky nang moi!";

        return api.sendMessage(awakenMessage, threadID, messageID);
    }

    static async performReawakening(api, event, classId) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        if (!classId) {
            return api.sendMessage("Su dung: slg awaken reawaken <class_id>", threadID, messageID);
        }

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const classes = await gameData.loadData('classes.json');

        if (!player.awakened) {
            return api.sendMessage("Ban chua thuc tinh lan dau! Su dung 'slg awaken awaken' truoc", threadID, messageID);
        }

        if (player.level < 20) {
            return api.sendMessage("Ban can dat level 20 de co the thuc tinh lai!", threadID, messageID);
        }

        if (!player.inventory['awakening_stone'] || player.inventory['awakening_stone'] < 1) {
            return api.sendMessage("Ban can co Awakening Stone de thuc tinh lai!", threadID, messageID);
        }

        if (player.gold < 10000) {
            return api.sendMessage("Ban can co 10000 gold de thuc tinh lai!", threadID, messageID);
        }

        if (!classes[classId]) {
            return api.sendMessage("Class nay khong ton tai!", threadID, messageID);
        }

        const selectedClass = classes[classId];

        if (player.class === classId) {
            return api.sendMessage("Ban da la class nay roi!", threadID, messageID);
        }

        // Check class requirements
        if (!this.checkClassRequirements(player, selectedClass)) {
            return api.sendMessage("Ban chua du dieu kien de thuc tinh class nay!", threadID, messageID);
        }

        // Remove current class bonuses and skills
        const currentClass = classes[player.class];
        if (currentClass) {
            // Remove bonuses
            if (currentClass.bonuses) {
                Object.entries(currentClass.bonuses).forEach(([stat, value]) => {
                    if (stat === 'maxHp') {
                        player.maxHp = Math.max(100, player.maxHp - value);
                        player.hp = Math.min(player.hp, player.maxHp);
                    } else if (stat === 'maxMana') {
                        player.maxMana = Math.max(50, player.maxMana - value);
                        player.mana = Math.min(player.mana, player.maxMana);
                    } else if (player.hasOwnProperty(stat)) {
                        player[stat] = Math.max(0, player[stat] - value);
                    }
                });
            }

            // Remove skills
            if (currentClass.skills) {
                currentClass.skills.forEach(skillId => {
                    const index = player.skills.findIndex(s => s.id === skillId);
                    if (index > -1) {
                        player.skills.splice(index, 1);
                    }
                });
            }

            // Remove passive skills
            if (currentClass.passiveSkills) {
                currentClass.passiveSkills.forEach(skillId => {
                    const index = player.passiveSkills.findIndex(s => s.id === skillId);
                    if (index > -1) {
                        player.passiveSkills.splice(index, 1);
                    }
                });
            }
        }

        // Apply new class
        player.class = classId;
        player.awakeningLevel++;
        player.gold -= 10000;
        player.inventory['awakening_stone']--;

        // Apply new class bonuses and skills (same as first awakening)
        if (selectedClass.bonuses) {
            Object.entries(selectedClass.bonuses).forEach(([stat, value]) => {
                if (stat === 'maxHp') {
                    player.maxHp += value;
                    player.hp += value;
                } else if (stat === 'maxMana') {
                    player.maxMana += value;
                    player.mana += value;
                } else if (player.hasOwnProperty(stat)) {
                    player[stat] += value;
                }
            });
        }

        // Add skills
        if (selectedClass.skills) {
            selectedClass.skills.forEach(skillId => {
                const existingSkill = player.skills.find(s => s.id === skillId);
                if (!existingSkill) {
                    player.skills.push({
                        id: skillId,
                        level: 1,
                        exp: 0,
                        expToNext: 100
                    });
                }
            });
        }

        if (selectedClass.passiveSkills) {
            selectedClass.passiveSkills.forEach(skillId => {
                const existingSkill = player.passiveSkills.find(s => s.id === skillId);
                if (!existingSkill) {
                    player.passiveSkills.push({
                        id: skillId,
                        level: 1
                    });
                }
            });
        }

        const GameCore = require('./gameCore');
        const gameCore = new GameCore();
        gameCore.recalculateStats(player);

        await gameData.saveData('players.json', players);

        let reawakenMessage = "=== THUC TINH LAI THANH CONG! ===\n\n";
        reawakenMessage += `Ban da thuc tinh lai thanh ${selectedClass.name}!\n\n`;
        reawakenMessage += `Awakening Level: ${player.awakeningLevel}\n\n`;
        reawakenMessage += `${selectedClass.description}\n\n`;
        reawakenMessage += "Suc manh moi da duoc kich hoat!";

        return api.sendMessage(reawakenMessage, threadID, messageID);
    }

    static checkClassRequirements(player, classData) {
        if (!classData.requirements) return true;

        const req = classData.requirements;

        // Check level requirement
        if (req.level && player.level < req.level) return false;

        // Check quest requirement
        if (req.quest && !player.quests.completed.includes(req.quest)) return false;

        // Check item requirement
        if (req.item && (!player.inventory[req.item] || player.inventory[req.item] < 1)) return false;

        // Check previous class requirement
        if (req.class && player.class !== req.class) return false;

        // Check awakening level requirement
        if (req.awakeningLevel && player.awakeningLevel < req.awakeningLevel) return false;

        // Check statistics requirements
        if (req.monstersKilled && player.statistics.monstersKilled < req.monstersKilled) return false;
        if (req.dungeonsCleared && player.statistics.dungeonsCleared < req.dungeonsCleared) return false;

        return true;
    }

    static async showAwakenRequirements(api, event, classId) {
        const { threadID, messageID } = event;
        const gameData = new GameData();

        if (!classId) {
            return api.sendMessage("Su dung: slg awaken requirements <class_id>", threadID, messageID);
        }

        const classes = await gameData.loadData('classes.json');

        if (!classes[classId]) {
            return api.sendMessage("Class nay khong ton tai!", threadID, messageID);
        }

        const classData = classes[classId];

        let reqMessage = `=== YEU CAU CHO ${classData.name.toUpperCase()} ===\n\n`;
        reqMessage += `${classData.description}\n\n`;

        if (classData.requirements) {
            reqMessage += "YEU CAU:\n";
            Object.entries(classData.requirements).forEach(([key, value]) => {
                reqMessage += `- ${key}: ${value}\n`;
            });
            reqMessage += "\n";
        } else {
            reqMessage += "Khong co yeu cau dac biet\n\n";
        }

        if (classData.bonuses) {
            reqMessage += "BONUS STATS:\n";
            Object.entries(classData.bonuses).forEach(([stat, value]) => {
                reqMessage += `- ${stat}: +${value}\n`;
            });
            reqMessage += "\n";
        }

        if (classData.skills && classData.skills.length > 0) {
            reqMessage += `SKILLS: ${classData.skills.join(', ')}\n`;
        }

        if (classData.passiveSkills && classData.passiveSkills.length > 0) {
            reqMessage += `PASSIVE SKILLS: ${classData.passiveSkills.join(', ')}\n`;
        }

        reqMessage += `\nTYPE: ${classData.hidden ? "HIDDEN CLASS" : "NORMAL CLASS"}`;

        return api.sendMessage(reqMessage, threadID, messageID);
    }
}

module.exports = AwakenHandler;