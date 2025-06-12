const GameData = require('../../utils/slg/gameData');

class TradingHandler {
    static async handleTrade(api, event, args) {
        const { threadID, messageID, senderID } = event;

        if (!args[1]) {
            return this.showTradeMenu(api, event);
        }

        const action = args[1].toLowerCase();

        switch (action) {
            case 'offer':
                return this.createTradeOffer(api, event, args[2], args.slice(3));
            case 'accept':
                return this.acceptTrade(api, event, args[2]);
            case 'decline':
                return this.declineTrade(api, event, args[2]);
            case 'cancel':
                return this.cancelTrade(api, event, args[2]);
            case 'list':
                return this.listActiveTrades(api, event);
            case 'history':
                return this.showTradeHistory(api, event);
            case 'market':
                return this.showMarket(api, event);
            case 'sell':
                return this.sellToMarket(api, event, args[2], args[3], args[4]);
            case 'buy':
                return this.buyFromMarket(api, event, args[2]);
            default:
                return this.showTradeMenu(api, event);
        }
    }

    static async showTradeMenu(api, event) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const trades = await gameData.loadData('trades.json');

        if (!player) {
            return api.sendMessage("Ban chua tham gia game! Su dung 'slg start'", threadID, messageID);
        }

        let tradeMessage = "=== HE THONG GIAO DICH ===\n\n";

        // Show pending trades involving this player
        const pendingTrades = Object.values(trades).filter(trade =>
            (trade.sender === senderID || trade.receiver === senderID) &&
            trade.status === 'pending'
        );

        if (pendingTrades.length > 0) {
            tradeMessage += "GIAO DICH CHO XU LY:\n";
            pendingTrades.forEach((trade, index) => {
                const isReceiver = trade.receiver === senderID;
                const otherPlayer = players[isReceiver ? trade.sender : trade.receiver];

                tradeMessage += `${index + 1}. ${isReceiver ? 'Nhan tu' : 'Gui den'}: ${otherPlayer?.name || 'Unknown'}\n`;
                tradeMessage += `   Offer: ${trade.offer.items ? Object.entries(trade.offer.items).map(([item, qty]) => `${item} x${qty}`).join(', ') : 'Khong co'}\n`;
                tradeMessage += `   Gold: ${trade.offer.gold || 0}\n`;
                tradeMessage += `   ID: ${trade.id}\n\n`;
            });
        }

        tradeMessage += "LENH GIAO DICH:\n";
        tradeMessage += "slg trade offer <player_name> <item1:qty1> [item2:qty2] [gold:amount] - Gui yeu cau giao dich\n";
        tradeMessage += "slg trade accept <trade_id> - Chap nhan giao dich\n";
        tradeMessage += "slg trade decline <trade_id> - Tu choi giao dich\n";
        tradeMessage += "slg trade cancel <trade_id> - Huy giao dich\n";
        tradeMessage += "slg trade list - Xem tat ca giao dich dang cho\n";
        tradeMessage += "slg trade history - Lich su giao dich\n\n";

        tradeMessage += "CHO MARKET:\n";
        tradeMessage += "slg trade market - Xem cho market\n";
        tradeMessage += "slg trade sell <item> <quantity> <price> - Ban len market\n";
        tradeMessage += "slg trade buy <listing_id> - Mua tu market\n\n";

        tradeMessage += "LUU Y:\n";
        tradeMessage += "- Giao dich co phi 5% gia tri\n";
        tradeMessage += "- Giao dich tu dong huy sau 24 gio\n";
        tradeMessage += "- Kiem tra ky truoc khi giao dich";

        return api.sendMessage(tradeMessage, threadID, messageID);
    }

    static async createTradeOffer(api, event, targetPlayerName, offerItems) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        if (!targetPlayerName) {
            return api.sendMessage(
                "Su dung: slg trade offer <player_name> <item1:qty1> [item2:qty2] [gold:amount]\n\n" +
                "Vi du: slg trade offer john iron_sword:1 health_potion:5 gold:100",
                threadID, messageID
            );
        }

        const players = await gameData.loadData('players.json');
        const player = players[senderID];

        // Find target player
        let targetPlayer = null;
        let targetId = null;

        for (const [id, p] of Object.entries(players)) {
            if (p.name.toLowerCase().includes(targetPlayerName.toLowerCase()) || id === targetPlayerName) {
                targetPlayer = p;
                targetId = id;
                break;
            }
        }

        if (!targetPlayer) {
            return api.sendMessage("Khong tim thay nguoi choi nay!", threadID, messageID);
        }

        if (targetId === senderID) {
            return api.sendMessage("Ban khong the giao dich voi chinh minh!", threadID, messageID);
        }

        // Parse offer items
        const offer = {
            items: {},
            gold: 0
        };

        let totalValue = 0;
        const items = await gameData.loadData('items.json');

        for (const itemStr of offerItems) {
            if (!itemStr.includes(':')) continue;

            const [itemPart, qtyPart] = itemStr.split(':');

            if (itemPart === 'gold') {
                const goldAmount = parseInt(qtyPart);
                if (isNaN(goldAmount) || goldAmount <= 0) continue;

                if (player.gold < goldAmount) {
                    return api.sendMessage(`Ban khong du gold! Can ${goldAmount}, co ${player.gold}`, threadID, messageID);
                }

                offer.gold = goldAmount;
                totalValue += goldAmount;
                continue;
            }

            const quantity = parseInt(qtyPart);
            if (isNaN(quantity) || quantity <= 0) continue;

            const itemId = itemPart.toLowerCase();

            if (!player.inventory[itemId] || player.inventory[itemId] < quantity) {
                return api.sendMessage(
                    `Ban khong du ${itemId}! Can ${quantity}, co ${player.inventory[itemId] || 0}`,
                    threadID, messageID
                );
            }

            offer.items[itemId] = quantity;

            if (items[itemId]) {
                totalValue += (items[itemId].price || 10) * quantity;
            }
        }

        if (Object.keys(offer.items).length === 0 && offer.gold === 0) {
            return api.sendMessage("Giao dich phai co it nhat 1 vat pham hoac gold!", threadID, messageID);
        }

        // Calculate trade fee (5% of total value)
        const tradeFee = Math.floor(totalValue * 0.05);

        if (player.gold < tradeFee) {
            return api.sendMessage(`Ban can ${tradeFee} gold de tra phi giao dich!`, threadID, messageID);
        }

        // Create trade
        const trades = await gameData.loadData('trades.json');
        const tradeId = `trade_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        trades[tradeId] = {
            id: tradeId,
            sender: senderID,
            receiver: targetId,
            offer: offer,
            request: null, // Target player can specify what they want
            status: 'pending',
            createdAt: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
            tradeFee: tradeFee
        };

        // Reserve the offered items and gold
        for (const [itemId, quantity] of Object.entries(offer.items)) {
            player.inventory[itemId] -= quantity;
            if (player.inventory[itemId] <= 0) {
                delete player.inventory[itemId];
            }
        }

        if (offer.gold > 0) {
            player.gold -= offer.gold;
        }

        player.gold -= tradeFee;

        await gameData.saveData('trades.json', trades);
        await gameData.saveData('players.json', players);

        let offerMessage = `Da gui yeu cau giao dich den ${targetPlayer.name}!\n\n`;
        offerMessage += `Trade ID: ${tradeId}\n`;
        offerMessage += `Offer cua ban:\n`;

        if (Object.keys(offer.items).length > 0) {
            offerMessage += `Items: ${Object.entries(offer.items).map(([item, qty]) => `${item} x${qty}`).join(', ')}\n`;
        }

        if (offer.gold > 0) {
            offerMessage += `Gold: ${offer.gold}\n`;
        }

        offerMessage += `Phi giao dich: ${tradeFee} gold\n\n`;
        offerMessage += `Giao dich se tu dong huy sau 24 gio neu khong duoc chap nhan.`;

        return api.sendMessage(offerMessage, threadID, messageID);
    }

    static async acceptTrade(api, event, tradeId) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        if (!tradeId) {
            return api.sendMessage("Su dung: slg trade accept <trade_id>", threadID, messageID);
        }

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const trades = await gameData.loadData('trades.json');

        const trade = trades[tradeId];
        if (!trade) {
            return api.sendMessage("Khong tim thay giao dich nay!", threadID, messageID);
        }

        if (trade.receiver !== senderID) {
            return api.sendMessage("Ban khong phai nguoi nhan cua giao dich nay!", threadID, messageID);
        }

        if (trade.status !== 'pending') {
            return api.sendMessage("Giao dich nay da duoc xu ly roi!", threadID, messageID);
        }

        if (Date.now() > trade.expiresAt) {
            return api.sendMessage("Giao dich nay da het han!", threadID, messageID);
        }

        const senderPlayer = players[trade.sender];
        if (!senderPlayer) {
            return api.sendMessage("Nguoi gui khong ton tai!", threadID, messageID);
        }

        // Execute trade
        // Give offered items to receiver
        for (const [itemId, quantity] of Object.entries(trade.offer.items)) {
            player.inventory[itemId] = (player.inventory[itemId] || 0) + quantity;
        }

        if (trade.offer.gold > 0) {
            player.gold += trade.offer.gold;
        }

        // Mark trade as completed
        trade.status = 'completed';
        trade.completedAt = Date.now();

        // Update trade history
        if (!player.tradeHistory) player.tradeHistory = [];
        if (!senderPlayer.tradeHistory) senderPlayer.tradeHistory = [];

        const tradeRecord = {
            tradeId: tradeId,
            with: trade.sender,
            type: 'received',
            items: trade.offer.items,
            gold: trade.offer.gold,
            date: Date.now()
        };

        player.tradeHistory.push(tradeRecord);

        senderPlayer.tradeHistory.push({
            ...tradeRecord,
            with: senderID,
            type: 'sent'
        });

        await gameData.saveData('trades.json', trades);
        await gameData.saveData('players.json', players);

        let acceptMessage = `Da chap nhan giao dich thanh cong!\n\n`;
        acceptMessage += `Nhan duoc tu ${senderPlayer.name}:\n`;

        if (Object.keys(trade.offer.items).length > 0) {
            acceptMessage += `Items: ${Object.entries(trade.offer.items).map(([item, qty]) => `${item} x${qty}`).join(', ')}\n`;
        }

        if (trade.offer.gold > 0) {
            acceptMessage += `Gold: ${trade.offer.gold}\n`;
        }

        return api.sendMessage(acceptMessage, threadID, messageID);
    }

    static async sellToMarket(api, event, itemId, quantity, price) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        if (!itemId || !quantity || !price) {
            return api.sendMessage(
                "Su dung: slg trade sell <item> <quantity> <price>\n\n" +
                "Vi du: slg trade sell iron_sword 1 500",
                threadID, messageID
            );
        }

        const qty = parseInt(quantity);
        const sellPrice = parseInt(price);

        if (isNaN(qty) || qty <= 0 || isNaN(sellPrice) || sellPrice <= 0) {
            return api.sendMessage("So luong va gia phai la so duong!", threadID, messageID);
        }

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const items = await gameData.loadData('items.json');

        if (!player.inventory[itemId] || player.inventory[itemId] < qty) {
            return api.sendMessage(
                `Ban khong du ${itemId}! Can ${qty}, co ${player.inventory[itemId] || 0}`,
                threadID, messageID
            );
        }

        if (!items[itemId]) {
            return api.sendMessage("Vat pham nay khong the ban!", threadID, messageID);
        }

        // Market fee (10% of selling price)
        const marketFee = Math.floor(sellPrice * 0.1);

        if (player.gold < marketFee) {
            return api.sendMessage(`Ban can ${marketFee} gold de tra phi market!`, threadID, messageID);
        }

        // Create market listing
        const market = await gameData.loadData('market.json');
        const listingId = `listing_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        market[listingId] = {
            id: listingId,
            seller: senderID,
            itemId: itemId,
            quantity: qty,
            price: sellPrice,
            marketFee: marketFee,
            listedAt: Date.now(),
            expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
        };

        // Remove items from inventory and pay fee
        player.inventory[itemId] -= qty;
        if (player.inventory[itemId] <= 0) {
            delete player.inventory[itemId];
        }
        player.gold -= marketFee;

        await gameData.saveData('market.json', market);
        await gameData.saveData('players.json', players);

        return api.sendMessage(
            `Da dang ban ${items[itemId].name} x${qty} len market!\n\n` +
            `Gia ban: ${sellPrice} gold\n` +
            `Phi market: ${marketFee} gold\n` +
            `Listing ID: ${listingId}\n\n` +
            `San pham se tu dong bi go khoi market sau 7 ngay.`,
            threadID, messageID
        );
    }

    static async showMarket(api, event) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        const market = await gameData.loadData('market.json');
        const players = await gameData.loadData('players.json');
        const items = await gameData.loadData('items.json');

        // Filter active listings
        const activeListings = Object.values(market).filter(listing =>
            listing.expiresAt > Date.now() &&
            listing.seller !== senderID // Don't show own listings
        );

        if (activeListings.length === 0) {
            return api.sendMessage("Market hien tai trong! Hay quay lai sau.", threadID, messageID);
        }

        // Sort by price
        activeListings.sort((a, b) => a.price - b.price);

        let marketMessage = "=== MARKET ===\n\n";

        activeListings.slice(0, 15).forEach((listing, index) => {
            const item = items[listing.itemId];
            const seller = players[listing.seller];

            if (item) {
                marketMessage += `${index + 1}. ${item.name} x${listing.quantity}\n`;
                marketMessage += `   Gia: ${listing.price} gold\n`;
                marketMessage += `   Seller: ${seller?.name || 'Unknown'}\n`;
                marketMessage += `   Rarity: ${item.rarity}\n`;
                marketMessage += `   ID: ${listing.id}\n\n`;
            }
        });

        marketMessage += "Su dung 'slg trade buy <listing_id>' de mua vat pham\n";
        marketMessage += "Su dung 'slg trade sell' de ban vat pham len market";

        return api.sendMessage(marketMessage, threadID, messageID);
    }

    static async buyFromMarket(api, event, listingId) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        if (!listingId) {
            return api.sendMessage("Su dung: slg trade buy <listing_id>", threadID, messageID);
        }

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const market = await gameData.loadData('market.json');
        const items = await gameData.loadData('items.json');

        const listing = market[listingId];
        if (!listing) {
            return api.sendMessage("Khong tim thay listing nay!", threadID, messageID);
        }

        if (listing.seller === senderID) {
            return api.sendMessage("Ban khong the mua san pham cua chinh minh!", threadID, messageID);
        }

        if (listing.expiresAt <= Date.now()) {
            return api.sendMessage("Listing nay da het han!", threadID, messageID);
        }

        if (player.gold < listing.price) {
            return api.sendMessage(
                `Ban khong du gold!\nCan: ${listing.price} gold\nCo: ${player.gold} gold`,
                threadID, messageID
            );
        }

        const seller = players[listing.seller];
        if (!seller) {
            return api.sendMessage("Nguoi ban khong ton tai!", threadID, messageID);
        }

        // Execute purchase
        player.gold -= listing.price;
        player.inventory[listing.itemId] = (player.inventory[listing.itemId] || 0) + listing.quantity;

        // Give money to seller (minus market fee already paid)
        seller.gold += listing.price;

        // Remove listing
        delete market[listingId];

        // Update trade statistics
        if (!player.marketPurchases) player.marketPurchases = 0;
        if (!seller.marketSales) seller.marketSales = 0;

        player.marketPurchases++;
        seller.marketSales++;

        await gameData.saveData('market.json', market);
        await gameData.saveData('players.json', players);

        const item = items[listing.itemId];

        return api.sendMessage(
            `Da mua thanh cong!\n\n` +
            `${item?.name || listing.itemId} x${listing.quantity}\n` +
            `Gia: ${listing.price} gold\n` +
            `Tu: ${seller.name}\n\n` +
            `Gold con lai: ${player.gold}`,
            threadID, messageID
        );
    }

    static async listActiveTrades(api, event) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        const trades = await gameData.loadData('trades.json');
        const players = await gameData.loadData('players.json');

        const playerTrades = Object.values(trades).filter(trade =>
            (trade.sender === senderID || trade.receiver === senderID) &&
            trade.status === 'pending' &&
            trade.expiresAt > Date.now()
        );

        if (playerTrades.length === 0) {
            return api.sendMessage("Ban khong co giao dich nao dang cho xu ly!", threadID, messageID);
        }

        let tradesMessage = "=== GIAO DICH DANG CHO ===\n\n";

        playerTrades.forEach((trade, index) => {
            const isReceiver = trade.receiver === senderID;
            const otherPlayer = players[isReceiver ? trade.sender : trade.receiver];
            const timeLeft = Math.floor((trade.expiresAt - Date.now()) / (60 * 60 * 1000));

            tradesMessage += `${index + 1}. ${isReceiver ? 'Tu' : 'Den'}: ${otherPlayer?.name || 'Unknown'}\n`;
            tradesMessage += `   Offer: `;

            if (Object.keys(trade.offer.items).length > 0) {
                tradesMessage += Object.entries(trade.offer.items).map(([item, qty]) => `${item} x${qty}`).join(', ');
            }

            if (trade.offer.gold > 0) {
                tradesMessage += ` + ${trade.offer.gold} gold`;
            }

            tradesMessage += `\n   Thoi han: ${timeLeft} gio\n`;
            tradesMessage += `   ID: ${trade.id}\n\n`;
        });

        return api.sendMessage(tradesMessage, threadID, messageID);
    }
}

module.exports = TradingHandler;