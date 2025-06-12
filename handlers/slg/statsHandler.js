const GameData = require('../../utils/slg/gameData');

class StatsHandler {
    static async showPlayerStats(api, event) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        const players = await gameData.loadData('players.json');
        const player = players[senderID];

        if (!player) {
            return api.sendMessage("Ban chua tham gia game! Su dung 'slg start'", threadID, messageID);
        }

        const classes = await gameData.loadData('classes.json');
        let classInfo = "Chua thuc tinh";
        if (player.class !== "none" && classes[player.class]) {
            classInfo = classes[player.class].name;
        }

        // Calculate total stats from equipment
        let equipStats = {
            attack: 0,
            defense: 0,
            hp: 0,
            mana: 0,
            critRate: 0,
            critDamage: 0
        };

        const items = await gameData.loadData('items.json');
        Object.values(player.equipment).forEach(itemId => {
            if (itemId && items[itemId] && items[itemId].stats) {
                Object.entries(items[itemId].stats).forEach(([stat, value]) => {
                    if (equipStats.hasOwnProperty(stat)) {
                        equipStats[stat] += value;
                    }
                });
            }
        });

        let statsMessage = "=== THONG TIN NHAN VAT ===\n\n";

        // Basic Info
        statsMessage += `Ten: ${player.name}\n`;
        statsMessage += `Level: ${player.level} (${player.exp}/${player.expToNext} EXP)\n`;
        statsMessage += `Class: ${classInfo}\n`;
        statsMessage += `Awakened: ${player.awakened ? "Co" : "Chua"}\n`;
        statsMessage += `Awakening Level: ${player.awakeningLevel}\n\n`;

        // Primary Stats
        statsMessage += "CHI SO CHINH:\n";
        statsMessage += `Strength: ${player.strength}\n`;
        statsMessage += `Agility: ${player.agility}\n`;
        statsMessage += `Intelligence: ${player.intelligence}\n`;
        statsMessage += `Vitality: ${player.vitality}\n`;
        statsMessage += `Luck: ${player.luck}\n`;
        statsMessage += `Stat Points: ${player.statPoints}\n\n`;

        // Secondary Stats (including equipment)
        const totalAttack = player.attack + equipStats.attack;
        const totalDefense = player.defense + equipStats.defense;
        const totalHp = player.maxHp + equipStats.hp;
        const totalMana = player.maxMana + equipStats.mana;
        const totalCritRate = player.critRate + equipStats.critRate;
        const totalCritDamage = player.critDamage + equipStats.critDamage;

        statsMessage += "CHI SO CHIEN DAU:\n";
        statsMessage += `HP: ${player.hp}/${totalHp}`;
        if (equipStats.hp > 0) statsMessage += ` (+${equipStats.hp})`;
        statsMessage += "\n";

        statsMessage += `Mana: ${player.mana}/${totalMana}`;
        if (equipStats.mana > 0) statsMessage += ` (+${equipStats.mana})`;
        statsMessage += "\n";

        statsMessage += `Attack: ${totalAttack}`;
        if (equipStats.attack > 0) statsMessage += ` (+${equipStats.attack})`;
        statsMessage += "\n";

        statsMessage += `Defense: ${totalDefense}`;
        if (equipStats.defense > 0) statsMessage += ` (+${equipStats.defense})`;
        statsMessage += "\n";

        statsMessage += `Crit Rate: ${totalCritRate}%`;
        if (equipStats.critRate > 0) statsMessage += ` (+${equipStats.critRate}%)`;
        statsMessage += "\n";

        statsMessage += `Crit Damage: ${totalCritDamage}%`;
        if (equipStats.critDamage > 0) statsMessage += ` (+${equipStats.critDamage}%)`;
        statsMessage += "\n\n";

        // Currencies
        statsMessage += "TAI NGUYEN:\n";
        statsMessage += `Gold: ${player.gold}\n`;
        statsMessage += `Diamonds: ${player.diamonds}\n`;
        statsMessage += `Event Tokens: ${player.eventTokens}\n`;
        statsMessage += `Skill Points: ${player.skillPoints}\n\n`;

        // Statistics
        statsMessage += "THONG KE:\n";
        statsMessage += `Monsters Killed: ${player.statistics.monstersKilled}\n`;
        statsMessage += `Dungeons Cleared: ${player.statistics.dungeonsCleared}\n`;
        statsMessage += `Quests Completed: ${player.statistics.questsCompleted}\n`;
        statsMessage += `Items Forged: ${player.statistics.itemsForged}\n\n`;

        // Social
        if (player.party) {
            statsMessage += `Party: ${player.party}\n`;
        }
        if (player.shadows && player.shadows.length > 0) {
            const summonedShadows = player.shadows.filter(s => s.summoned).length;
            statsMessage += `Shadows: ${player.shadows.length} (${summonedShadows} summoned)\n`;
        }

        statsMessage += "\nLEnh CHI SO:\n";
        statsMessage += "slg stats add <stat> <amount> - Them diem chi so\n";
        statsMessage += "slg reset stats - Reset tat ca chi so (can Stat Reset Stone)";

        return api.sendMessage(statsMessage, threadID, messageID);
    }

    static async addStats(api, event, stat, amount) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        if (!stat || !amount) {
            return api.sendMessage(
                "Su dung: slg stats add <stat> <amount>\n\n" +
                "Cac stat co the them:\n" +
                "- strength (suc manh)\n" +
                "- agility (nhanh nhen)\n" +
                "- intelligence (tri thong minh)\n" +
                "- vitality (sinh menh)\n" +
                "- luck (may man)",
                threadID, messageID
            );
        }

        const players = await gameData.loadData('players.json');
        const player = players[senderID];

        const pointsToAdd = parseInt(amount);
        if (isNaN(pointsToAdd) || pointsToAdd <= 0) {
            return api.sendMessage("So diem phai la so duong!", threadID, messageID);
        }

        if (player.statPoints < pointsToAdd) {
            return api.sendMessage(
                `Ban khong du stat points!\n` +
                `Can: ${pointsToAdd}\n` +
                `Co: ${player.statPoints}`,
                threadID, messageID
            );
        }

        const validStats = ['strength', 'agility', 'intelligence', 'vitality', 'luck'];
        if (!validStats.includes(stat.toLowerCase())) {
            return api.sendMessage("Chi so khong hop le! Su dung: strength, agility, intelligence, vitality, luck", threadID, messageID);
        }

        const statName = stat.toLowerCase();

        // Apply stat points
        player[statName] += pointsToAdd;
        player.statPoints -= pointsToAdd;

        // Recalculate secondary stats
        const GameCore = require('./gameCore');
        const gameCore = new GameCore();
        gameCore.recalculateStats(player);

        await gameData.saveData('players.json', players);

        return api.sendMessage(
            `Da them ${pointsToAdd} diem vao ${statName}!\n\n` +
            `${statName}: ${player[statName]}\n` +
            `Stat points con lai: ${player.statPoints}\n\n` +
            `Chi so da duoc cap nhat!`,
            threadID, messageID
        );
    }

    static async resetStats(api, event, args) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        const players = await gameData.loadData('players.json');
        const player = players[senderID];

        // Check if player has reset stone
        if (!player.inventory['stat_reset_stone'] || player.inventory['stat_reset_stone'] < 1) {
            return api.sendMessage(
                "Ban can co Stat Reset Stone de reset chi so!\n\n" +
                "Co the mua tai cua hang bi mat hoac nhan tu quest dac biet.",
                threadID, messageID
            );
        }

        if (!args[1] || args[1].toLowerCase() !== 'confirm') {
            return api.sendMessage(
                "BAN CO CHAC CHAN MUON RESET TAT CA CHI SO?\n\n" +
                "Hanh dong nay se:\n" +
                "- Reset tat ca stat points ve 10\n" +
                "- Tra lai tat ca stat points da su dung\n" +
                "- Tieu hao 1 Stat Reset Stone\n\n" +
                "Su dung 'slg reset stats confirm' de xac nhan!",
                threadID, messageID
            );
        }

        // Calculate total stat points used
        const baseStats = 10; // Starting value for each stat
        const usedPoints = (player.strength - baseStats) +
            (player.agility - baseStats) +
            (player.intelligence - baseStats) +
            (player.vitality - baseStats) +
            (player.luck - 5); // Luck starts at 5

        // Reset all stats to base values
        player.strength = baseStats;
        player.agility = baseStats;
        player.intelligence = baseStats;
        player.vitality = baseStats;
        player.luck = 5;

        // Return stat points
        player.statPoints += usedPoints;

        // Consume reset stone
        player.inventory['stat_reset_stone']--;
        if (player.inventory['stat_reset_stone'] <= 0) {
            delete player.inventory['stat_reset_stone'];
        }

        // Recalculate secondary stats
        const GameCore = require('./gameCore');
        const gameCore = new GameCore();
        gameCore.recalculateStats(player);

        await gameData.saveData('players.json', players);

        return api.sendMessage(
            "DA RESET CHI SO THANH CONG!\n\n" +
            "Tat ca chi so da duoc reset ve gia tri ban dau.\n" +
            `Ban nhan lai ${usedPoints} stat points!\n\n` +
            "Su dung 'slg stats add' de phan bo lai chi so theo y muon!",
            threadID, messageID
        );
    }
}

module.exports = StatsHandler;