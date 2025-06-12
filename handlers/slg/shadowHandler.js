const GameData = require('../../utils/slg/gameData');

class ShadowHandler {
    static async handleShadow(api, event, args) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        const players = await gameData.loadData('players.json');
        const player = players[senderID];

        if (!player) {
            return api.sendMessage("Ban chua tham gia game! Su dung 'slg start'", threadID, messageID);
        }

        if (player.class !== "shadow_monarch") {
            return api.sendMessage(
                "Chi Shadow Monarch moi co the su dung chuc nang Shadow!\n\n" +
                "Thuc tinh thanh Shadow Monarch de mo khoa tinh nang nay.",
                threadID, messageID
            );
        }

        if (!args[1]) {
            return this.showShadowArmy(api, event);
        }

        const action = args[1].toLowerCase();

        switch (action) {
            case 'army':
            case 'list':
                return this.showShadowArmy(api, event);
            case 'extract':
                return this.extractShadow(api, event, args[2]);
            case 'summon':
                return this.summonShadow(api, event, args[2]);
            case 'dismiss':
                return this.dismissShadow(api, event, args[2]);
            case 'upgrade':
                return this.upgradeShadow(api, event, args[2]);
            case 'info':
                return this.showShadowInfo(api, event, args[2]);
            case 'release':
                return this.releaseShadow(api, event, args[2]);
            case 'rename':
                return this.renameShadow(api, event, args[2], args.slice(3).join(' '));
            default:
                return this.showShadowArmy(api, event);
        }
    }

    static async showShadowArmy(api, event) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        const players = await gameData.loadData('players.json');
        const player = players[senderID];

        if (!player.shadows || player.shadows.length === 0) {
            return api.sendMessage(
                "Ban chua co shadow nao!\n\n" +
                "CACH THU THAP SHADOW:\n" +
                "1. Sau khi danh bai quai vat, co co hoi xuat hien thong bao extract\n" +
                "2. Su dung 'slg shadow extract <monster_name>' ngay sau do\n" +
                "3. Co ty le thanh cong khac nhau tuy theo level\n\n" +
                "Shadow la dong minh manh me cua Shadow Monarch!\n" +
                "Hay di san quai de thu thap shadow dau tien!",
                threadID, messageID
            );
        }

        let shadowMessage = "=== SHADOW ARMY ===\n\n";
        shadowMessage += `Tong so shadow: ${player.shadows.length}/${this.getMaxShadows(player)}\n`;
        shadowMessage += `Shadow summoned: ${player.shadows.filter(s => s.summoned).length}/${this.getMaxSummoned(player)}\n\n`;

        player.shadows.forEach((shadow, index) => {
            shadowMessage += `${index + 1}. ${shadow.name || shadow.originalName}\n`;
            shadowMessage += `   Type: ${shadow.type}\n`;
            shadowMessage += `   Level: ${shadow.level}\n`;
            shadowMessage += `   HP: ${shadow.hp}/${shadow.maxHp}\n`;
            shadowMessage += `   Attack: ${shadow.attack} | Defense: ${shadow.defense}\n`;
            shadowMessage += `   EXP: ${shadow.exp}/${shadow.expToNext}\n`;
            shadowMessage += `   Status: ${shadow.summoned ? "SUMMONED" : "STORED"}\n`;

            if (shadow.skills && shadow.skills.length > 0) {
                shadowMessage += `   Skills: ${shadow.skills.join(', ')}\n`;
            }

            shadowMessage += `   ID: ${shadow.id}\n\n`;
        });

        shadowMessage += "LENH QUAN LY:\n";
        shadowMessage += "slg shadow extract <monster> - Trich xuat shadow\n";
        shadowMessage += "slg shadow summon <shadow_id> - Goi shadow\n";
        shadowMessage += "slg shadow dismiss <shadow_id> - Thu hoi shadow\n";
        shadowMessage += "slg shadow upgrade <shadow_id> - Nang cap shadow\n";
        shadowMessage += "slg shadow info <shadow_id> - Chi tiet shadow\n";
        shadowMessage += "slg shadow rename <shadow_id> <new_name> - Doi ten\n";
        shadowMessage += "slg shadow release <shadow_id> - Tha shadow (xoa vinh vien)";

        return api.sendMessage(shadowMessage, threadID, messageID);
    }

    static async extractShadow(api, event, targetName) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        if (!targetName) {
            return api.sendMessage("Su dung: slg shadow extract <monster_name>", threadID, messageID);
        }

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const monsters = await gameData.loadData('monsters.json');

        // Check if at shadow limit
        if (player.shadows.length >= this.getMaxShadows(player)) {
            return api.sendMessage(
                `Ban da dat gioi han shadow (${this.getMaxShadows(player)})!\n` +
                `Nang level hoac tha bot shadow de tang gioi han.`,
                threadID, messageID
            );
        }

        // Check mana cost
        const manaCost = 30 + (player.shadows.length * 5);
        if (player.mana < manaCost) {
            return api.sendMessage(`Ban can ${manaCost} mana de trich xuat shadow!`, threadID, messageID);
        }

        // Find target monster
        let targetMonster = null;
        for (const [id, monster] of Object.entries(monsters)) {
            if (id === targetName.toLowerCase() || monster.name.toLowerCase().includes(targetName.toLowerCase())) {
                targetMonster = { id, ...monster };
                break;
            }
        }

        if (!targetMonster) {
            return api.sendMessage("Khong tim thay quai vat nay!", threadID, messageID);
        }

        // Calculate extraction success rate
        const baseRate = 0.25; // 25% base rate
        const levelDiff = player.level - targetMonster.level;
        const levelBonus = levelDiff > 0 ? levelDiff * 0.05 : levelDiff * 0.02;
        const awakeningBonus = (player.awakeningLevel - 1) * 0.1;

        const successRate = Math.max(0.05, Math.min(0.8, baseRate + levelBonus + awakeningBonus));

        player.mana -= manaCost;

        let extractMessage = `=== SHADOW EXTRACTION ===\n\n`;
        extractMessage += `Target: ${targetMonster.name}\n`;
        extractMessage += `Level difference: ${levelDiff}\n`;
        extractMessage += `Success rate: ${Math.floor(successRate * 100)}%\n`;
        extractMessage += `Mana cost: ${manaCost}\n\n`;

        if (Math.random() < successRate) {
            // Success - create shadow
            const shadowId = `shadow_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
            const newShadow = {
                id: shadowId,
                name: null, // Can be renamed later
                originalName: `Shadow ${targetMonster.name}`,
                type: targetMonster.id,
                level: 1,
                exp: 0,
                expToNext: 100,

                // Stats (reduced from original)
                hp: Math.floor(targetMonster.hp * 0.7),
                maxHp: Math.floor(targetMonster.hp * 0.7),
                attack: Math.floor(targetMonster.attack * 0.8),
                defense: Math.floor(targetMonster.defense * 0.8),
                agility: targetMonster.agility || 10,

                // Shadow specific
                summoned: false,
                loyalty: 50, // Affects performance
                skills: [],
                equipment: {},

                // Metadata
                extractedFrom: targetMonster.name,
                extractedAt: Date.now(),
                extractedBy: player.id
            };

            // Some monsters give shadows special skills
            if (targetMonster.shadowSkills) {
                newShadow.skills = [...targetMonster.shadowSkills];
            }

            player.shadows.push(newShadow);

            extractMessage += "THANH CONG!\n";
            extractMessage += `Da trich xuat shadow tu ${targetMonster.name}!\n\n`;
            extractMessage += `Ten: ${newShadow.originalName}\n`;
            extractMessage += `Level: ${newShadow.level}\n`;
            extractMessage += `HP: ${newShadow.maxHp}\n`;
            extractMessage += `Attack: ${newShadow.attack}\n`;
            extractMessage += `Defense: ${newShadow.defense}\n`;

            if (newShadow.skills.length > 0) {
                extractMessage += `Skills: ${newShadow.skills.join(', ')}\n`;
            }

            extractMessage += `\nShadow ID: ${shadowId}\n`;
            extractMessage += "Su dung 'slg shadow summon' de goi shadow!";

        } else {
            extractMessage += "THAT BAI!\n";
            extractMessage += `Khong the trich xuat shadow tu ${targetMonster.name}.\n`;
            extractMessage += "Thu lai sau hoac nang cao level de tang ty le thanh cong!";
        }

        await gameData.saveData('players.json', players);
        return api.sendMessage(extractMessage, threadID, messageID);
    }

    static async summonShadow(api, event, shadowId) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        if (!shadowId) {
            return api.sendMessage("Su dung: slg shadow summon <shadow_id>", threadID, messageID);
        }

        const players = await gameData.loadData('players.json');
        const player = players[senderID];

        const shadow = player.shadows.find(s =>
            s.id === shadowId ||
            s.originalName.toLowerCase().includes(shadowId.toLowerCase()) ||
            (s.name && s.name.toLowerCase().includes(shadowId.toLowerCase()))
        );

        if (!shadow) {
            return api.sendMessage("Khong tim thay shadow nay!", threadID, messageID);
        }

        if (shadow.summoned) {
            return api.sendMessage("Shadow nay da duoc goi roi!", threadID, messageID);
        }

        // Check summon limit
        const currentSummoned = player.shadows.filter(s => s.summoned).length;
        const maxSummoned = this.getMaxSummoned(player);

        if (currentSummoned >= maxSummoned) {
            return api.sendMessage(
                `Ban chi co the goi toi da ${maxSummoned} shadow cung luc!\n` +
                `Hien tai da goi: ${currentSummoned}/${maxSummoned}`,
                threadID, messageID
            );
        }

        // Check mana cost
        const manaCost = 20 + (shadow.level * 5);
        if (player.mana < manaCost) {
            return api.sendMessage(`Can ${manaCost} mana de goi shadow level ${shadow.level}!`, threadID, messageID);
        }

        player.mana -= manaCost;
        shadow.summoned = true;
        shadow.hp = shadow.maxHp; // Full heal when summoned

        await gameData.saveData('players.json', players);

        const displayName = shadow.name || shadow.originalName;
        return api.sendMessage(
            `Da goi ${displayName}!\n\n` +
            `Level: ${shadow.level}\n` +
            `HP: ${shadow.hp}/${shadow.maxHp}\n` +
            `Attack: ${shadow.attack}\n` +
            `Mana cost: ${manaCost}\n` +
            `Summoned: ${currentSummoned + 1}/${maxSummoned}`,
            threadID, messageID
        );
    }

    static async dismissShadow(api, event, shadowId) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        if (!shadowId) {
            return api.sendMessage("Su dung: slg shadow dismiss <shadow_id>", threadID, messageID);
        }

        const players = await gameData.loadData('players.json');
        const player = players[senderID];

        const shadow = player.shadows.find(s =>
            s.id === shadowId ||
            (s.name && s.name.toLowerCase().includes(shadowId.toLowerCase())) ||
            s.originalName.toLowerCase().includes(shadowId.toLowerCase())
        );

        if (!shadow) {
            return api.sendMessage("Khong tim thay shadow nay!", threadID, messageID);
        }

        if (!shadow.summoned) {
            return api.sendMessage("Shadow nay chua duoc goi!", threadID, messageID);
        }

        shadow.summoned = false;

        await gameData.saveData('players.json', players);

        const displayName = shadow.name || shadow.originalName;
        return api.sendMessage(`Da thu hoi ${displayName} ve Shadow Realm!`, threadID, messageID);
    }

    static async upgradeShadow(api, event, shadowId) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        if (!shadowId) {
            return api.sendMessage("Su dung: slg shadow upgrade <shadow_id>", threadID, messageID);
        }

        const players = await gameData.loadData('players.json');
        const player = players[senderID];

        const shadow = player.shadows.find(s =>
            s.id === shadowId ||
            (s.name && s.name.toLowerCase().includes(shadowId.toLowerCase())) ||
            s.originalName.toLowerCase().includes(shadowId.toLowerCase())
        );

        if (!shadow) {
            return api.sendMessage("Khong tim thay shadow nay!", threadID, messageID);
        }

        // Check if shadow has enough exp
        if (shadow.exp < shadow.expToNext) {
            return api.sendMessage(
                `Shadow chua du EXP de len cap!\n` +
                `Hien tai: ${shadow.exp}/${shadow.expToNext} EXP\n\n` +
                `Shadow se tu dong nhan EXP khi ban:\n` +
                `- San quai (khi shadow duoc summon)\n` +
                `- Hoan thanh dungeon (khi shadow duoc summon)`,
                threadID, messageID
            );
        }

        // Check shadow essence cost
        const essenceCost = shadow.level * 3;
        if (!player.inventory['shadow_essence'] || player.inventory['shadow_essence'] < essenceCost) {
            return api.sendMessage(
                `Can ${essenceCost} Shadow Essence de nang cap shadow!\n` +
                `Hien co: ${player.inventory['shadow_essence'] || 0}`,
                threadID, messageID
            );
        }

        // Upgrade shadow
        player.inventory['shadow_essence'] -= essenceCost;
        shadow.exp -= shadow.expToNext;
        shadow.level++;

        // Calculate stat increases
        const hpIncrease = Math.floor(shadow.maxHp * 0.15) + 5;
        const attackIncrease = Math.floor(shadow.attack * 0.12) + 2;
        const defenseIncrease = Math.floor(shadow.defense * 0.1) + 1;

        shadow.maxHp += hpIncrease;
        shadow.hp += hpIncrease;
        shadow.attack += attackIncrease;
        shadow.defense += defenseIncrease;

        // Increase loyalty
        shadow.loyalty = Math.min(100, shadow.loyalty + 5);

        // Calculate next level exp requirement
        shadow.expToNext = Math.floor(100 * Math.pow(1.4, shadow.level - 1));

        // Check for new skills at certain levels
        let newSkills = [];
        if (shadow.level === 5 || shadow.level === 10 || shadow.level === 15) {
            const skillPool = ['shadow_strike', 'shadow_defense', 'shadow_speed', 'shadow_heal'];
            const availableSkills = skillPool.filter(skill => !shadow.skills.includes(skill));
            if (availableSkills.length > 0) {
                const newSkill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
                shadow.skills.push(newSkill);
                newSkills.push(newSkill);
            }
        }

        await gameData.saveData('players.json', players);

        const displayName = shadow.name || shadow.originalName;
        let upgradeMessage = `=== NANG CAP SHADOW ===\n\n`;
        upgradeMessage += `${displayName} da len cap ${shadow.level}!\n\n`;
        upgradeMessage += `Tang chi so:\n`;
        upgradeMessage += `- HP: +${hpIncrease} (${shadow.maxHp})\n`;
        upgradeMessage += `- Attack: +${attackIncrease} (${shadow.attack})\n`;
        upgradeMessage += `- Defense: +${defenseIncrease} (${shadow.defense})\n`;
        upgradeMessage += `- Loyalty: ${shadow.loyalty}/100\n\n`;

        if (newSkills.length > 0) {
            upgradeMessage += `Mo khoa skill moi: ${newSkills.join(', ')}\n\n`;
        }

        upgradeMessage += `Next level: ${shadow.exp}/${shadow.expToNext} EXP`;

        return api.sendMessage(upgradeMessage, threadID, messageID);
    }

    static async showShadowInfo(api, event, shadowId) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        if (!shadowId) {
            return api.sendMessage("Su dung: slg shadow info <shadow_id>", threadID, messageID);
        }

        const players = await gameData.loadData('players.json');
        const player = players[senderID];

        const shadow = player.shadows.find(s =>
            s.id === shadowId ||
            (s.name && s.name.toLowerCase().includes(shadowId.toLowerCase())) ||
            s.originalName.toLowerCase().includes(shadowId.toLowerCase())
        );

        if (!shadow) {
            return api.sendMessage("Khong tim thay shadow nay!", threadID, messageID);
        }

        const extractedDate = new Date(shadow.extractedAt).toLocaleDateString();
        const displayName = shadow.name || shadow.originalName;

        let infoMessage = `=== ${displayName.toUpperCase()} ===\n\n`;
        infoMessage += `Level: ${shadow.level}\n`;
        infoMessage += `EXP: ${shadow.exp}/${shadow.expToNext}\n`;
        infoMessage += `HP: ${shadow.hp}/${shadow.maxHp}\n`;
        infoMessage += `Attack: ${shadow.attack}\n`;
        infoMessage += `Defense: ${shadow.defense}\n`;
        infoMessage += `Agility: ${shadow.agility}\n`;
        infoMessage += `Loyalty: ${shadow.loyalty}/100\n\n`;

        infoMessage += `Type: ${shadow.type}\n`;
        infoMessage += `Status: ${shadow.summoned ? "SUMMONED" : "STORED"}\n`;
        infoMessage += `Extracted from: ${shadow.extractedFrom}\n`;
        infoMessage += `Extracted date: ${extractedDate}\n\n`;

        if (shadow.skills && shadow.skills.length > 0) {
            infoMessage += `Skills: ${shadow.skills.join(', ')}\n\n`;
        }

        if (Object.keys(shadow.equipment).length > 0) {
            infoMessage += `Equipment: ${Object.values(shadow.equipment).join(', ')}\n\n`;
        }

        infoMessage += `Shadow ID: ${shadow.id}`;

        return api.sendMessage(infoMessage, threadID, messageID);
    }

    static async renameShadow(api, event, shadowId, newName) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        if (!shadowId || !newName) {
            return api.sendMessage("Su dung: slg shadow rename <shadow_id> <new_name>", threadID, messageID);
        }

        if (newName.length > 20) {
            return api.sendMessage("Ten shadow toi da 20 ky tu!", threadID, messageID);
        }

        const players = await gameData.loadData('players.json');
        const player = players[senderID];

        const shadow = player.shadows.find(s => s.id === shadowId);

        if (!shadow) {
            return api.sendMessage("Khong tim thay shadow nay!", threadID, messageID);
        }

        const oldName = shadow.name || shadow.originalName;
        shadow.name = newName;

        await gameData.saveData('players.json', players);

        return api.sendMessage(
            `Da doi ten shadow thanh cong!\n\n` +
            `Ten cu: ${oldName}\n` +
            `Ten moi: ${newName}`,
            threadID, messageID
        );
    }

    static getMaxShadows(player) {
        // Base: 5 shadows, +2 every 10 levels, +1 per awakening level
        return 5 + Math.floor(player.level / 10) * 2 + (player.awakeningLevel - 1);
    }

    static getMaxSummoned(player) {
        // Base: 2 summoned, +1 every 15 levels
        return 2 + Math.floor(player.level / 15);
    }

    // Function to give EXP to summoned shadows
    static giveShadowExp(player, expAmount) {
        player.shadows.forEach(shadow => {
            if (shadow.summoned) {
                const shadowExpGain = Math.floor(expAmount * 0.4); // Shadows get 40% of player exp
                shadow.exp += shadowExpGain;
            }
        });
    }
}

module.exports = ShadowHandler;