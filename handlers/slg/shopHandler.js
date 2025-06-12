const GameData = require('../../utils/slg/gameData');

class ShopHandler {
    static async handleShop(api, event, args) {
        const { threadID, messageID, senderID } = event;

        if (!args[1]) {
            return this.showShopCategories(api, event);
        }

        const action = args[1].toLowerCase();

        switch (action) {
            case 'weapons':
                return this.showShopCategory(api, event, 'weapon');
            case 'armor':
                return this.showShopCategory(api, event, 'armor');
            case 'accessories':
                return this.showShopCategory(api, event, 'accessory');
            case 'consumables':
                return this.showShopCategory(api, event, 'consumable');
            case 'materials':
                return this.showShopCategory(api, event, 'material');
            case 'secret':
                return this.showSecretShop(api, event);
            case 'refresh':
                return this.refreshShop(api, event);
            default:
                return this.showShopCategories(api, event);
        }
    }

    static async showShopCategories(api, event) {
        const { threadID, messageID } = event;

        const shopMessage =
            "=== CUA HANG TONG HOP ===\n\n" +
            "DANH MUC:\n" +
            "slg shop weapons - Vu khi\n" +
            "slg shop armor - Giap ao\n" +
            "slg shop accessories - Phu kien\n" +
            "slg shop consumables - Thuoc va vat pham tieu hao\n" +
            "slg shop materials - Nguyen lieu ren tao\n" +
            "slg shop secret - Cua hang bi mat (co the khong mo)\n\n" +
            "LENH MUA BAN:\n" +
            "slg buy <item_id> [quantity] - Mua vat pham\n" +
            "slg sell <item_id> [quantity] - Ban vat pham\n\n" +
            "DICH VU:\n" +
            "slg shop refresh - Lam moi cua hang (100 gold)\n" +
            "slg forge - Ren va nang cap trang bi\n\n" +
            "Su dung 'slg inventory' de xem vat pham ban co";

        return api.sendMessage(shopMessage, threadID, messageID);
    }

    static async showShopCategory(api, event, category) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const items = await gameData.loadData('items.json');

        if (!player) {
            return api.sendMessage("Ban chua tham gia game! Su dung 'slg start'", threadID, messageID);
        }

        // Get shop data or generate it
        let shopData = await gameData.loadData('shop.json');
        if (!shopData[senderID] || !shopData[senderID][category]) {
            shopData = this.generateShopData(player, items);
            await gameData.saveData('shop.json', shopData);
        }

        const categoryItems = shopData[senderID][category] || [];

        if (categoryItems.length === 0) {
            return api.sendMessage(`Khong co vat pham nao trong danh muc ${category}!`, threadID, messageID);
        }

        let shopMessage = `=== CUA HANG - ${category.toUpperCase()} ===\n\n`;
        shopMessage += `Gold cua ban: ${player.gold}\n`;
        shopMessage += `Diamonds cua ban: ${player.diamonds}\n\n`;

        categoryItems.forEach((shopItem, index) => {
            const item = items[shopItem.id];
            if (item) {
                shopMessage += `${index + 1}. ${item.name}\n`;
                shopMessage += `   Gia: ${shopItem.price} ${shopItem.currency}\n`;
                shopMessage += `   Rarity: ${item.rarity}\n`;

                if (item.stats) {
                    shopMessage += `   Stats: `;
                    Object.entries(item.stats).forEach(([stat, value]) => {
                        shopMessage += `${stat}+${value} `;
                    });
                    shopMessage += "\n";
                }

                if (item.levelRequired) shopMessage += `   Level can: ${item.levelRequired}\n`;
                if (item.classRequired) shopMessage += `   Class can: ${item.classRequired}\n`;

                shopMessage += `   ID: ${shopItem.id}\n`;
                shopMessage += `   Stock: ${shopItem.stock}\n\n`;
            }
        });

        shopMessage += "Su dung 'slg buy <item_id> [quantity]' de mua vat pham";

        return api.sendMessage(shopMessage, threadID, messageID);
    }

    static async buyItem(api, event, args) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        if (!args[1]) {
            return api.sendMessage("Su dung: slg buy <item_id> [quantity]", threadID, messageID);
        }

        const itemId = args[1].toLowerCase();
        const quantity = parseInt(args[2]) || 1;

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const items = await gameData.loadData('items.json');
        const shopData = await gameData.loadData('shop.json');

        if (!player) {
            return api.sendMessage("Ban chua tham gia game! Su dung 'slg start'", threadID, messageID);
        }

        if (!items[itemId]) {
            return api.sendMessage("Khong tim thay vat pham nay!", threadID, messageID);
        }

        // Find item in shop
        let shopItem = null;
        let category = null;

        for (const [cat, categoryItems] of Object.entries(shopData[senderID] || {})) {
            const foundItem = categoryItems.find(item => item.id === itemId);
            if (foundItem) {
                shopItem = foundItem;
                category = cat;
                break;
            }
        }

        if (!shopItem) {
            return api.sendMessage("Vat pham nay khong co ban trong cua hang!", threadID, messageID);
        }

        if (shopItem.stock < quantity) {
            return api.sendMessage(`Chi con ${shopItem.stock} ${items[itemId].name} trong kho!`, threadID, messageID);
        }

        const totalCost = shopItem.price * quantity;
        const currency = shopItem.currency || 'gold';

        if (player[currency] < totalCost) {
            return api.sendMessage(
                `Ban khong du ${currency}!\n` +
                `Can: ${totalCost} ${currency}\n` +
                `Co: ${player[currency]} ${currency}`,
                threadID, messageID
            );
        }

        // Check requirements
        const item = items[itemId];
        if (item.levelRequired && player.level < item.levelRequired) {
            return api.sendMessage(`Ban can level ${item.levelRequired} de mua vat pham nay!`, threadID, messageID);
        }

        if (item.classRequired && item.classRequired !== player.class && player.class !== 'none') {
            return api.sendMessage(`Chi ${item.classRequired} moi co the mua vat pham nay!`, threadID, messageID);
        }

        // Process purchase
        player[currency] -= totalCost;
        player.inventory[itemId] = (player.inventory[itemId] || 0) + quantity;
        shopItem.stock -= quantity;

        // Remove item from shop if out of stock
        if (shopItem.stock <= 0) {
            const itemIndex = shopData[senderID][category].findIndex(item => item.id === itemId);
            if (itemIndex > -1) {
                shopData[senderID][category].splice(itemIndex, 1);
            }
        }

        await gameData.saveData('players.json', players);
        await gameData.saveData('shop.json', shopData);

        return api.sendMessage(
            `Da mua thanh cong!\n\n` +
            `${item.name} x${quantity}\n` +
            `Tong tien: ${totalCost} ${currency}\n` +
            `${currency} con lai: ${player[currency]}`,
            threadID, messageID
        );
    }

    static async sellItem(api, event, args) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        if (!args[1]) {
            return api.sendMessage("Su dung: slg sell <item_id> [quantity]", threadID, messageID);
        }

        const itemId = args[1].toLowerCase();
        const quantity = parseInt(args[2]) || 1;

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const items = await gameData.loadData('items.json');

        if (!player.inventory[itemId] || player.inventory[itemId] < quantity) {
            return api.sendMessage("Ban khong co du vat pham nay!", threadID, messageID);
        }

        if (!items[itemId]) {
            return api.sendMessage("Vat pham nay khong the ban!", threadID, messageID);
        }

        const item = items[itemId];
        const sellPrice = Math.floor((item.price || 10) * 0.6); // Sell for 60% of buy price
        const totalEarn = sellPrice * quantity;

        // Process sale
        player.inventory[itemId] -= quantity;
        player.gold += totalEarn;

        if (player.inventory[itemId] <= 0) {
            delete player.inventory[itemId];
        }

        // Update statistics
        if (!player.statistics.goldEarned) player.statistics.goldEarned = 0;
        player.statistics.goldEarned += totalEarn;

        await gameData.saveData('players.json', players);

        return api.sendMessage(
            `Da ban thanh cong!\n\n` +
            `${item.name} x${quantity}\n` +
            `Nhan duoc: ${totalEarn} gold\n` +
            `Gold hien tai: ${player.gold}`,
            threadID, messageID
        );
    }

    static generateShopData(player, items) {
        const shopData = {};
        shopData[player.id] = {
            weapon: [],
            armor: [],
            accessory: [],
            consumable: [],
            material: []
        };

        // Generate shop items based on player level
        Object.entries(items).forEach(([id, item]) => {
            if (!item.sellable) return;

            // Check if item should appear in shop
            const levelRange = item.levelRequired || 1;
            if (levelRange <= player.level + 5 && levelRange >= Math.max(1, player.level - 3)) {

                const category = this.getItemCategory(item);
                if (shopData[player.id][category]) {

                    // Calculate price based on rarity and level
                    let price = item.price || this.calculateItemPrice(item);
                    let currency = 'gold';

                    // High rarity items may cost diamonds
                    if (item.rarity === 'legendary' || item.rarity === 'mythical') {
                        if (Math.random() < 0.3) {
                            price = Math.floor(price / 100);
                            currency = 'diamonds';
                        }
                    }

                    // Generate stock
                    let stock = 1;
                    if (item.type === 'consumable') {
                        stock = Math.floor(Math.random() * 10) + 5;
                    } else if (item.type === 'material') {
                        stock = Math.floor(Math.random() * 20) + 10;
                    }

                    shopData[player.id][category].push({
                        id: id,
                        price: price,
                        currency: currency,
                        stock: stock
                    });
                }
            }
        });

        return shopData;
    }

    static getItemCategory(item) {
        if (item.equipSlot === 'weapon') return 'weapon';
        if (['armor', 'helmet', 'gloves', 'boots'].includes(item.equipSlot)) return 'armor';
        if (['ring1', 'ring2', 'necklace'].includes(item.equipSlot)) return 'accessory';
        if (item.type === 'consumable') return 'consumable';
        if (item.type === 'material') return 'material';
        return 'consumable';
    }

    static calculateItemPrice(item) {
        let basePrice = 50;

        // Rarity multiplier
        const rarityMultipliers = {
            'common': 1,
            'rare': 2,
            'epic': 4,
            'legendary': 8,
            'mythical': 16
        };

        basePrice *= rarityMultipliers[item.rarity] || 1;

        // Level multiplier
        if (item.levelRequired) {
            basePrice *= (1 + item.levelRequired * 0.2);
        }

        // Stats multiplier
        if (item.stats) {
            const totalStats = Object.values(item.stats).reduce((sum, val) => sum + val, 0);
            basePrice *= (1 + totalStats * 0.1);
        }

        return Math.floor(basePrice);
    }

    static async showSecretShop(api, event) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        const players = await gameData.loadData('players.json');
        const player = players[senderID];

        if (!player) {
            return api.sendMessage("Ban chua tham gia game! Su dung 'slg start'", threadID, messageID);
        }

        // Check if secret shop is available
        const now = Date.now();
        const hour = new Date(now).getHours();

        // Secret shop available certain hours or with special conditions
        const isAvailable = (hour >= 22 || hour <= 6) || // Night time
            player.level >= 20 || // High level players
            player.awakeningLevel >= 2; // Multiple awakenings

        if (!isAvailable) {
            return api.sendMessage(
                "Cua hang bi mat chua mo!\n\n" +
                "DIEU KIEN MO:\n" +
                "- Gio 22:00 - 06:00 hang ngay\n" +
                "- Level >= 20\n" +
                "- Awakening Level >= 2",
                threadID, messageID
            );
        }

        let secretMessage = "=== CUA HANG BI MAT ===\n\n";
        secretMessage += "Cua hang dac biet ban cac vat pham hiem!\n\n";

        // Generate secret shop items
        const secretItems = [
            { id: 'awakening_stone', price: 5, currency: 'diamonds', stock: 1 },
            { id: 'skill_book_rare', price: 3, currency: 'diamonds', stock: 2 },
            { id: 'stat_reset_stone', price: 10, currency: 'diamonds', stock: 1 },
            { id: 'legendary_weapon_box', price: 15, currency: 'diamonds', stock: 1 },
            { id: 'shadow_essence', price: 500, currency: 'gold', stock: 5 }
        ];

        const items = await gameData.loadData('items.json');

        secretItems.forEach((shopItem, index) => {
            const item = items[shopItem.id];
            if (item) {
                secretMessage += `${index + 1}. ${item.name}\n`;
                secretMessage += `   Gia: ${shopItem.price} ${shopItem.currency}\n`;
                secretMessage += `   Stock: ${shopItem.stock}\n`;
                secretMessage += `   ID: ${shopItem.id}\n\n`;
            }
        });

        secretMessage += `Your Gold: ${player.gold}\n`;
        secretMessage += `Your Diamonds: ${player.diamonds}\n\n`;
        secretMessage += "Su dung 'slg buy <item_id>' de mua vat pham hiem";

        return api.sendMessage(secretMessage, threadID, messageID);
    }
}

module.exports = ShopHandler;