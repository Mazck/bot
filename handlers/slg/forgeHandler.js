const GameData = require('../../utils/slg/gameData');

class ForgeHandler {
    static async handleForge(api, event, args) {
        const { threadID, messageID, senderID } = event;

        if (!args[1]) {
            return this.showForgeMenu(api, event);
        }

        const action = args[1].toLowerCase();

        switch (action) {
            case 'upgrade':
                return this.upgradeItem(api, event, args[2]);
            case 'enchant':
                return this.enchantItem(api, event, args[2], args[3]);
            case 'repair':
                return this.repairItem(api, event, args[2]);
            case 'dismantle':
                return this.dismantleItem(api, event, args[2]);
            case 'craft':
                return this.craftItem(api, event, args[2]);
            case 'recipes':
                return this.showRecipes(api, event);
            default:
                return this.showForgeMenu(api, event);
        }
    }

    static async showForgeMenu(api, event) {
        const { threadID, messageID } = event;

        const forgeMessage =
            "=== REN CHE ===\n\n" +
            "Noi ban co the nang cap va cai thien trang bi!\n\n" +
            "DICH VU:\n" +
            "slg forge upgrade <item_id> - Nang cap trang bi (+1 -> +15)\n" +
            "slg forge enchant <item_id> <enchant_type> - Pha ngoc/enchant\n" +
            "slg forge repair <item_id> - Sua chua trang bi bi hong\n" +
            "slg forge dismantle <item_id> - Pha huy de lay nguyen lieu\n" +
            "slg forge craft <recipe_id> - Ren tao vat pham moi\n" +
            "slg forge recipes - Xem cong thuc ren tao\n\n" +
            "LUU Y:\n" +
            "- Nang cap co the that bai va lam hong trang bi\n" +
            "- Enchant them hieu ung dac biet cho trang bi\n" +
            "- Can nguyen lieu va gold de thuc hien\n" +
            "- Vat pham pha huy se khong the khoi phuc";

        return api.sendMessage(forgeMessage, threadID, messageID);
    }

    static async upgradeItem(api, event, itemId) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        if (!itemId) {
            return api.sendMessage("Su dung: slg forge upgrade <item_id>", threadID, messageID);
        }

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const items = await gameData.loadData('items.json');

        if (!player) {
            return api.sendMessage("Ban chua tham gia game! Su dung 'slg start'", threadID, messageID);
        }

        if (!player.inventory[itemId] || player.inventory[itemId] <= 0) {
            return api.sendMessage("Ban khong co vat pham nay!", threadID, messageID);
        }

        if (!items[itemId]) {
            return api.sendMessage("Khong tim thay thong tin vat pham!", threadID, messageID);
        }

        const item = items[itemId];

        if (!item.equipable) {
            return api.sendMessage("Chi co the nang cap trang bi!", threadID, messageID);
        }

        const currentUpgrade = item.upgrade || 0;
        const maxUpgrade = item.maxUpgrade || 15;

        if (currentUpgrade >= maxUpgrade) {
            return api.sendMessage("Trang bi da dat cap nang cap toi da!", threadID, messageID);
        }

        // Calculate upgrade cost and materials needed
        const upgradeCost = this.calculateUpgradeCost(item, currentUpgrade);
        const materialsNeeded = this.getUpgradeMaterials(item, currentUpgrade);

        // Check if player has enough gold
        if (player.gold < upgradeCost.gold) {
            return api.sendMessage(
                `Khong du gold de nang cap!\n` +
                `Can: ${upgradeCost.gold} gold\n` +
                `Co: ${player.gold} gold`,
                threadID, messageID
            );
        }

        // Check if player has required materials
        for (const [materialId, amount] of Object.entries(materialsNeeded)) {
            if (!player.inventory[materialId] || player.inventory[materialId] < amount) {
                return api.sendMessage(
                    `Thieu nguyen lieu!\n` +
                    `Can: ${amount} ${materialId}\n` +
                    `Co: ${player.inventory[materialId] || 0}`,
                    threadID, messageID
                );
            }
        }

        // Calculate success rate
        const successRate = this.calculateUpgradeSuccessRate(currentUpgrade);
        const breakRate = this.calculateBreakRate(currentUpgrade);

        // Consume resources
        player.gold -= upgradeCost.gold;
        for (const [materialId, amount] of Object.entries(materialsNeeded)) {
            player.inventory[materialId] -= amount;
            if (player.inventory[materialId] <= 0) {
                delete player.inventory[materialId];
            }
        }

        let resultMessage = `=== NANG CAP TRANG BI ===\n\n`;
        resultMessage += `${item.name} (+${currentUpgrade} -> +${currentUpgrade + 1})\n`;
        resultMessage += `Ty le thanh cong: ${Math.floor(successRate * 100)}%\n`;
        resultMessage += `Ty le pha huy: ${Math.floor(breakRate * 100)}%\n`;
        resultMessage += `Chi phi: ${upgradeCost.gold} gold\n\n`;

        const random = Math.random();

        if (random < successRate) {
            // Success!
            items[itemId].upgrade = currentUpgrade + 1;

            // Increase item stats
            if (items[itemId].stats) {
                Object.keys(items[itemId].stats).forEach(stat => {
                    const increase = Math.floor(items[itemId].stats[stat] * 0.1) || 1;
                    items[itemId].stats[stat] += increase;
                });
            }

            resultMessage += "THANH CONG!\n";
            resultMessage += `${item.name} da duoc nang cap len +${currentUpgrade + 1}!\n`;
            resultMessage += `Tat ca chi so tang them 10%!`;

            // Update items data
            await gameData.saveData('items.json', items);

        } else if (random < successRate + breakRate) {
            // Item breaks!
            player.inventory[itemId]--;
            if (player.inventory[itemId] <= 0) {
                delete player.inventory[itemId];
            }

            resultMessage += "PHA HUY!\n";
            resultMessage += `${item.name} da bi pha huy trong qua trinh nang cap!`;

        } else {
            // Safe failure
            resultMessage += "THAT BAI!\n";
            resultMessage += `Nang cap that bai nhung trang bi van an toan.`;
        }

        // Update statistics
        player.statistics.itemsForged++;

        await gameData.saveData('players.json', players);

        return api.sendMessage(resultMessage, threadID, messageID);
    }

    static async enchantItem(api, event, itemId, enchantType) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        if (!itemId || !enchantType) {
            return api.sendMessage(
                "Su dung: slg forge enchant <item_id> <enchant_type>\n\n" +
                "Cac loai enchant:\n" +
                "- fire: Tang fire damage\n" +
                "- ice: Tang ice damage\n" +
                "- poison: Tang poison damage\n" +
                "- lifesteal: Hut mau\n" +
                "- critical: Tang chi mang\n" +
                "- defense: Tang phong thu",
                threadID, messageID
            );
        }

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const items = await gameData.loadData('items.json');

        if (!player.inventory[itemId] || player.inventory[itemId] <= 0) {
            return api.sendMessage("Ban khong co vat pham nay!", threadID, messageID);
        }

        const item = items[itemId];
        if (!item || !item.equipable) {
            return api.sendMessage("Chi co the enchant trang bi!", threadID, messageID);
        }

        // Check if item already has this enchant
        if (!item.enchants) item.enchants = {};
        if (item.enchants[enchantType]) {
            return api.sendMessage("Trang bi da co enchant nay roi!", threadID, messageID);
        }

        // Check max enchants (max 3)
        if (Object.keys(item.enchants).length >= 3) {
            return api.sendMessage("Trang bi da dat toi da enchant (3)!", threadID, messageID);
        }

        const enchantCost = this.getEnchantCost(item, enchantType);

        // Check costs
        if (player.gold < enchantCost.gold) {
            return api.sendMessage(`Khong du gold! Can ${enchantCost.gold} gold`, threadID, messageID);
        }

        if (enchantCost.diamonds && player.diamonds < enchantCost.diamonds) {
            return api.sendMessage(`Khong du diamonds! Can ${enchantCost.diamonds} diamonds`, threadID, messageID);
        }

        // Check materials
        for (const [materialId, amount] of Object.entries(enchantCost.materials || {})) {
            if (!player.inventory[materialId] || player.inventory[materialId] < amount) {
                return api.sendMessage(
                    `Thieu nguyen lieu: ${materialId}\n` +
                    `Can: ${amount}, Co: ${player.inventory[materialId] || 0}`,
                    threadID, messageID
                );
            }
        }

        // Calculate success rate (higher level items harder to enchant)
        const baseSuccessRate = 0.7;
        const levelPenalty = (item.levelRequired || 1) * 0.01;
        const successRate = Math.max(0.3, baseSuccessRate - levelPenalty);

        // Consume resources
        player.gold -= enchantCost.gold;
        if (enchantCost.diamonds) player.diamonds -= enchantCost.diamonds;

        for (const [materialId, amount] of Object.entries(enchantCost.materials || {})) {
            player.inventory[materialId] -= amount;
            if (player.inventory[materialId] <= 0) {
                delete player.inventory[materialId];
            }
        }

        let enchantMessage = `=== ENCHANT TRANG BI ===\n\n`;
        enchantMessage += `${item.name}\n`;
        enchantMessage += `Enchant: ${enchantType}\n`;
        enchantMessage += `Ty le thanh cong: ${Math.floor(successRate * 100)}%\n\n`;

        if (Math.random() < successRate) {
            // Success!
            const enchantEffect = this.getEnchantEffect(enchantType);
            items[itemId].enchants[enchantType] = enchantEffect;

            enchantMessage += "THANH CONG!\n";
            enchantMessage += `Da them enchant ${enchantType} vao ${item.name}!\n`;
            enchantMessage += `Hieu ung: ${enchantEffect.description}`;

            await gameData.saveData('items.json', items);

        } else {
            enchantMessage += "THAT BAI!\n";
            enchantMessage += "Enchant that bai nhung trang bi van an toan.";
        }

        await gameData.saveData('players.json', players);

        return api.sendMessage(enchantMessage, threadID, messageID);
    }

    static async craftItem(api, event, recipeId) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        if (!recipeId) {
            return api.sendMessage("Su dung: slg forge craft <recipe_id>\nSu dung 'slg forge recipes' de xem cong thuc", threadID, messageID);
        }

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const recipes = await gameData.loadData('recipes.json');

        if (!recipes[recipeId]) {
            return api.sendMessage("Khong tim thay cong thuc nay!", threadID, messageID);
        }

        const recipe = recipes[recipeId];

        // Check requirements
        if (recipe.requirements) {
            if (recipe.requirements.level && player.level < recipe.requirements.level) {
                return api.sendMessage(`Can level ${recipe.requirements.level} de ren vat pham nay!`, threadID, messageID);
            }
            if (recipe.requirements.class && player.class !== recipe.requirements.class) {
                return api.sendMessage(`Chi ${recipe.requirements.class} moi co the ren vat pham nay!`, threadID, messageID);
            }
        }

        // Check materials
        for (const [materialId, amount] of Object.entries(recipe.materials)) {
            if (!player.inventory[materialId] || player.inventory[materialId] < amount) {
                return api.sendMessage(
                    `Thieu nguyen lieu!\n` +
                    `Can: ${amount} ${materialId}\n` +
                    `Co: ${player.inventory[materialId] || 0}`,
                    threadID, messageID
                );
            }
        }

        // Check gold
        if (player.gold < recipe.cost) {
            return api.sendMessage(`Khong du gold! Can ${recipe.cost} gold`, threadID, messageID);
        }

        // Consume materials and gold
        player.gold -= recipe.cost;
        for (const [materialId, amount] of Object.entries(recipe.materials)) {
            player.inventory[materialId] -= amount;
            if (player.inventory[materialId] <= 0) {
                delete player.inventory[materialId];
            }
        }

        // Calculate success rate
        const successRate = recipe.successRate || 0.8;

        let craftMessage = `=== REN TAO VAT PHAM ===\n\n`;
        craftMessage += `Cong thuc: ${recipe.name}\n`;
        craftMessage += `Ty le thanh cong: ${Math.floor(successRate * 100)}%\n\n`;

        if (Math.random() < successRate) {
            // Success!
            const resultItem = recipe.result;
            const quantity = recipe.quantity || 1;

            player.inventory[resultItem.id] = (player.inventory[resultItem.id] || 0) + quantity;

            craftMessage += "THANH CONG!\n";
            craftMessage += `Da ren tao: ${resultItem.name} x${quantity}`;

        } else {
            craftMessage += "THAT BAI!\n";
            craftMessage += "Ren tao that bai! Nguyen lieu da bi mat.";
        }

        await gameData.saveData('players.json', players);

        return api.sendMessage(craftMessage, threadID, messageID);
    }

    static async showRecipes(api, event) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const recipes = await gameData.loadData('recipes.json');

        let recipesMessage = "=== CONG THUC REN TAO ===\n\n";

        const availableRecipes = Object.entries(recipes).filter(([id, recipe]) => {
            if (recipe.requirements) {
                if (recipe.requirements.level && player.level < recipe.requirements.level) return false;
                if (recipe.requirements.class && player.class !== recipe.requirements.class) return false;
            }
            return true;
        });

        if (availableRecipes.length === 0) {
            recipesMessage += "Ban chua mo khoa cong thuc nao!";
        } else {
            availableRecipes.forEach(([id, recipe], index) => {
                recipesMessage += `${index + 1}. ${recipe.name}\n`;
                recipesMessage += `   Ket qua: ${recipe.result.name} x${recipe.quantity || 1}\n`;
                recipesMessage += `   Chi phi: ${recipe.cost} gold\n`;
                recipesMessage += `   Nguyen lieu can:\n`;

                Object.entries(recipe.materials).forEach(([materialId, amount]) => {
                    const hasAmount = player.inventory[materialId] || 0;
                    const status = hasAmount >= amount ? "✓" : "✗";
                    recipesMessage += `     - ${materialId}: ${hasAmount}/${amount} ${status}\n`;
                });

                recipesMessage += `   Ty le thanh cong: ${Math.floor((recipe.successRate || 0.8) * 100)}%\n`;
                recipesMessage += `   ID: ${id}\n\n`;
            });
        }

        recipesMessage += "Su dung 'slg forge craft <recipe_id>' de ren tao";

        return api.sendMessage(recipesMessage, threadID, messageID);
    }

    static calculateUpgradeCost(item, currentUpgrade) {
        const baseGold = (item.price || 100) * 0.2;
        const multiplier = Math.pow(1.5, currentUpgrade);

        return {
            gold: Math.floor(baseGold * multiplier)
        };
    }

    static getUpgradeMaterials(item, currentUpgrade) {
        const materials = {};

        if (currentUpgrade < 5) {
            materials['iron_ore'] = 1 + currentUpgrade;
        } else if (currentUpgrade < 10) {
            materials['steel_ore'] = 1 + Math.floor(currentUpgrade / 2);
            materials['magic_crystal'] = 1;
        } else {
            materials['mithril_ore'] = 1;
            materials['magic_crystal'] = 2;
            materials['rare_gem'] = 1;
        }

        return materials;
    }

    static calculateUpgradeSuccessRate(currentUpgrade) {
        if (currentUpgrade < 5) return 0.9 - (currentUpgrade * 0.1);
        if (currentUpgrade < 10) return 0.7 - ((currentUpgrade - 5) * 0.08);
        return 0.3 - ((currentUpgrade - 10) * 0.04);
    }

    static calculateBreakRate(currentUpgrade) {
        if (currentUpgrade < 10) return 0;
        if (currentUpgrade < 13) return 0.05;
        return 0.1 + ((currentUpgrade - 13) * 0.05);
    }

    static getEnchantCost(item, enchantType) {
        const baseCost = {
            gold: (item.price || 100) * 0.5,
            materials: {}
        };

        switch (enchantType) {
            case 'fire':
                baseCost.materials['fire_essence'] = 3;
                break;
            case 'ice':
                baseCost.materials['ice_essence'] = 3;
                break;
            case 'poison':
                baseCost.materials['poison_essence'] = 3;
                break;
            case 'lifesteal':
                baseCost.materials['blood_crystal'] = 2;
                baseCost.diamonds = 1;
                break;
            case 'critical':
                baseCost.materials['sharp_stone'] = 5;
                break;
            case 'defense':
                baseCost.materials['guard_crystal'] = 3;
                break;
        }

        return baseCost;
    }

    static getEnchantEffect(enchantType) {
        const effects = {
            'fire': {
                type: 'damage_bonus',
                value: 10,
                description: 'Tang 10% fire damage'
            },
            'ice': {
                type: 'damage_bonus',
                value: 10,
                description: 'Tang 10% ice damage, co the lam cham'
            },
            'poison': {
                type: 'damage_over_time',
                value: 5,
                description: 'Gay 5% poison damage moi turn'
            },
            'lifesteal': {
                type: 'lifesteal',
                value: 15,
                description: 'Hoi 15% damage gay ra thanh HP'
            },
            'critical': {
                type: 'crit_rate',
                value: 10,
                description: 'Tang 10% chi mang'
            },
            'defense': {
                type: 'defense_bonus',
                value: 15,
                description: 'Tang 15% phong thu'
            }
        };

        return effects[enchantType] || effects['fire'];
    }
}

module.exports = ForgeHandler;