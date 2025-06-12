const GameData = require('../../utils/slg/gameData');

class PartyHandler {
    static async handleParty(api, event, args) {
        const { threadID, messageID, senderID } = event;

        if (!args[1]) {
            return this.showPartyStatus(api, event);
        }

        const action = args[1].toLowerCase();

        switch (action) {
            case 'create':
                return this.createParty(api, event, args[2]);
            case 'join':
                return this.joinParty(api, event, args[2]);
            case 'leave':
                return this.leaveParty(api, event);
            case 'kick':
                return this.kickMember(api, event, args[2]);
            case 'invite':
                return this.invitePlayer(api, event, args[2]);
            case 'accept':
                return this.acceptInvite(api, event, args[2]);
            case 'decline':
                return this.declineInvite(api, event, args[2]);
            case 'disband':
                return this.disbandParty(api, event);
            case 'list':
                return this.listActiveParties(api, event);
            case 'hunt':
                return this.partyHunt(api, event, args[2]);
            case 'dungeon':
                return this.partyDungeon(api, event, args[2]);
            default:
                return this.showPartyStatus(api, event);
        }
    }

    static async showPartyStatus(api, event) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const parties = await gameData.loadData('parties.json');

        if (!player) {
            return api.sendMessage("Ban chua tham gia game! Su dung 'slg start'", threadID, messageID);
        }

        let partyMessage = "=== TRANG THAI PARTY ===\n\n";

        if (!player.party) {
            partyMessage += "Ban khong o trong party nao!\n\n";
            partyMessage += "LENH PARTY:\n";
            partyMessage += "slg party create <party_name> - Tao party moi\n";
            partyMessage += "slg party join <party_id> - Tham gia party\n";
            partyMessage += "slg party list - Xem cac party dang mo\n";
        } else {
            const party = parties[player.party];
            if (!party) {
                // Party not found, remove from player
                player.party = null;
                await gameData.saveData('players.json', players);
                return api.sendMessage("Party cua ban da bi xoa! Su dung 'slg party create' de tao party moi", threadID, messageID);
            }

            partyMessage += `Ten party: ${party.name}\n`;
            partyMessage += `Leader: ${party.leader}\n`;
            partyMessage += `Thanh vien: ${party.members.length}/${party.maxMembers}\n`;
            partyMessage += `Level trung binh: ${this.calculateAverageLevel(party, players)}\n\n`;

            partyMessage += "THANH VIEN:\n";
            party.members.forEach((memberId, index) => {
                const member = players[memberId];
                if (member) {
                    const isLeader = memberId === party.leader;
                    const status = member.lastActive && (Date.now() - member.lastActive < 5 * 60 * 1000) ? "Online" : "Offline";
                    partyMessage += `${index + 1}. ${member.name} (Level ${member.level}) ${isLeader ? "[LEADER]" : ""} - ${status}\n`;
                }
            });

            partyMessage += "\nLEnh PARTY:\n";
            if (player.id === party.leader) {
                partyMessage += "slg party invite <player_name> - Moi nguoi choi\n";
                partyMessage += "slg party kick <player_name> - Kick thanh vien\n";
                partyMessage += "slg party disband - Giai tan party\n";
            }
            partyMessage += "slg party leave - Roi party\n";
            partyMessage += "slg party hunt [monster] - San quai theo nhom\n";
            partyMessage += "slg party dungeon <dungeon_id> - Vao dungeon theo nhom";
        }

        // Show pending invites
        const invites = await gameData.loadData('party_invites.json');
        const playerInvites = Object.values(invites).filter(invite =>
            invite.invitedPlayer === senderID &&
            invite.status === 'pending' &&
            Date.now() - invite.createdAt < 5 * 60 * 1000 // 5 minutes timeout
        );

        if (playerInvites.length > 0) {
            partyMessage += "\n\nLOI MOI PARTY:\n";
            playerInvites.forEach((invite, index) => {
                const party = parties[invite.partyId];
                if (party) {
                    partyMessage += `${index + 1}. ${party.name} (Leader: ${party.leader})\n`;
                    partyMessage += `   Su dung 'slg party accept ${invite.id}' de chap nhan\n`;
                    partyMessage += `   Su dung 'slg party decline ${invite.id}' de tu choi\n`;
                }
            });
        }

        return api.sendMessage(partyMessage, threadID, messageID);
    }

    static async createParty(api, event, partyName) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        if (!partyName) {
            return api.sendMessage("Su dung: slg party create <party_name>", threadID, messageID);
        }

        if (partyName.length > 30) {
            return api.sendMessage("Ten party toi da 30 ky tu!", threadID, messageID);
        }

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const parties = await gameData.loadData('parties.json');

        if (player.party) {
            return api.sendMessage("Ban da o trong party roi! Su dung 'slg party leave' de roi party truoc", threadID, messageID);
        }

        // Check if party name already exists
        const existingParty = Object.values(parties).find(p => p.name.toLowerCase() === partyName.toLowerCase());
        if (existingParty) {
            return api.sendMessage("Ten party da ton tai! Chon ten khac", threadID, messageID);
        }

        // Create party
        const partyId = `party_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        const newParty = {
            id: partyId,
            name: partyName,
            leader: senderID,
            members: [senderID],
            maxMembers: 4, // Default max 4 members
            isPublic: true,
            createdAt: Date.now(),
            settings: {
                expShare: true,
                lootShare: true,
                autoAcceptInvites: false
            }
        };

        parties[partyId] = newParty;
        player.party = partyId;

        await gameData.saveData('parties.json', parties);
        await gameData.saveData('players.json', players);

        return api.sendMessage(
            `Da tao party "${partyName}" thanh cong!\n\n` +
            `Party ID: ${partyId}\n` +
            `Ban la leader cua party nay.\n` +
            `Su dung 'slg party invite <player_name>' de moi nguoi khac tham gia!`,
            threadID, messageID
        );
    }

    static async joinParty(api, event, partyId) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        if (!partyId) {
            return api.sendMessage("Su dung: slg party join <party_id>", threadID, messageID);
        }

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const parties = await gameData.loadData('parties.json');

        if (player.party) {
            return api.sendMessage("Ban da o trong party roi!", threadID, messageID);
        }

        const party = parties[partyId];
        if (!party) {
            return api.sendMessage("Khong tim thay party nay!", threadID, messageID);
        }

        if (!party.isPublic) {
            return api.sendMessage("Party nay khong cong khai! Can loi moi de tham gia", threadID, messageID);
        }

        if (party.members.length >= party.maxMembers) {
            return api.sendMessage("Party da day! Khong the tham gia", threadID, messageID);
        }

        // Add player to party
        party.members.push(senderID);
        player.party = partyId;

        await gameData.saveData('parties.json', parties);
        await gameData.saveData('players.json', players);

        // Notify party members
        const joinMessage = `${player.name} (Level ${player.level}) da tham gia party "${party.name}"!`;

        return api.sendMessage(
            `Da tham gia party "${party.name}" thanh cong!\n\n` +
            `Leader: ${party.leader}\n` +
            `Thanh vien: ${party.members.length}/${party.maxMembers}\n` +
            `Su dung 'slg party' de xem thong tin chi tiet`,
            threadID, messageID
        );
    }

    static async leaveParty(api, event) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const parties = await gameData.loadData('parties.json');

        if (!player.party) {
            return api.sendMessage("Ban khong o trong party nao!", threadID, messageID);
        }

        const party = parties[player.party];
        if (!party) {
            player.party = null;
            await gameData.saveData('players.json', players);
            return api.sendMessage("Party khong ton tai!", threadID, messageID);
        }

        // Remove player from party
        party.members = party.members.filter(id => id !== senderID);
        player.party = null;

        // If player was leader and there are still members, transfer leadership
        if (party.leader === senderID && party.members.length > 0) {
            party.leader = party.members[0];

            const newLeader = players[party.leader];
            if (newLeader) {
                // You would notify the new leader here if you had a notification system
            }
        }

        // If no members left, delete party
        if (party.members.length === 0) {
            delete parties[player.party];
        }

        await gameData.saveData('parties.json', parties);
        await gameData.saveData('players.json', players);

        return api.sendMessage(
            `Da roi party "${party.name}"!\n` +
            (party.leader === senderID && party.members.length > 0 ?
                `Quyen leader da chuyen cho ${players[party.leader]?.name || 'thanh vien khac'}` : ''),
            threadID, messageID
        );
    }

    static async invitePlayer(api, event, playerName) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        if (!playerName) {
            return api.sendMessage("Su dung: slg party invite <player_name>", threadID, messageID);
        }

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const parties = await gameData.loadData('parties.json');

        if (!player.party) {
            return api.sendMessage("Ban khong o trong party nao!", threadID, messageID);
        }

        const party = parties[player.party];
        if (party.leader !== senderID) {
            return api.sendMessage("Chi leader moi co the moi nguoi khac!", threadID, messageID);
        }

        if (party.members.length >= party.maxMembers) {
            return api.sendMessage("Party da day!", threadID, messageID);
        }

        // Find target player
        let targetPlayer = null;
        let targetId = null;

        for (const [id, p] of Object.entries(players)) {
            if (p.name.toLowerCase().includes(playerName.toLowerCase()) || id === playerName) {
                targetPlayer = p;
                targetId = id;
                break;
            }
        }

        if (!targetPlayer) {
            return api.sendMessage("Khong tim thay nguoi choi nay!", threadID, messageID);
        }

        if (targetPlayer.party) {
            return api.sendMessage("Nguoi choi nay da o trong party khac!", threadID, messageID);
        }

        // Create invite
        const invites = await gameData.loadData('party_invites.json');
        const inviteId = `invite_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        invites[inviteId] = {
            id: inviteId,
            partyId: player.party,
            invitedBy: senderID,
            invitedPlayer: targetId,
            status: 'pending',
            createdAt: Date.now()
        };

        await gameData.saveData('party_invites.json', invites);

        return api.sendMessage(
            `Da gui loi moi party den ${targetPlayer.name}!\n` +
            `Loi moi se het han sau 5 phut.\n` +
            `Nguoi duoc moi co the su dung 'slg party accept ${inviteId}' de chap nhan.`,
            threadID, messageID
        );
    }

    static async partyHunt(api, event, monsterName) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();

        const players = await gameData.loadData('players.json');
        const player = players[senderID];
        const parties = await gameData.loadData('parties.json');

        if (!player.party) {
            return api.sendMessage("Ban can o trong party de san quai theo nhom!", threadID, messageID);
        }

        const party = parties[player.party];
        if (!party) {
            return api.sendMessage("Party khong ton tai!", threadID, messageID);
        }

        // Check if all party members are online and ready
        const onlineMembers = [];
        for (const memberId of party.members) {
            const member = players[memberId];
            if (member && member.hp > 0) {
                onlineMembers.push(member);
            }
        }

        if (onlineMembers.length < 2) {
            return api.sendMessage("Can it nhat 2 thanh vien online va con HP de san quai theo nhom!", threadID, messageID);
        }

        // Check cooldown for party hunt
        const now = Date.now();
        const partyHuntCooldown = 60000; // 1 minute
        if (party.lastHunt && now - party.lastHunt < partyHuntCooldown) {
            const remaining = Math.ceil((partyHuntCooldown - (now - party.lastHunt)) / 1000);
            return api.sendMessage(`Party can cho ${remaining} giay nua de san quai!`, threadID, messageID);
        }

        // Select target monster
        const monsters = await gameData.loadData('monsters.json');
        let targetMonster = null;

        if (monsterName) {
            for (const [id, monster] of Object.entries(monsters)) {
                if (id === monsterName.toLowerCase() || monster.name.toLowerCase().includes(monsterName.toLowerCase())) {
                    targetMonster = { id, ...monster };
                    break;
                }
            }
        } else {
            // Random monster based on party average level
            const avgLevel = this.calculateAverageLevel(party, players);
            const availableMonsters = Object.entries(monsters).filter(([id, monster]) => {
                return monster.level <= avgLevel + 3 && monster.level >= Math.max(1, avgLevel - 2);
            });

            if (availableMonsters.length > 0) {
                const randomIndex = Math.floor(Math.random() * availableMonsters.length);
                const [id, monster] = availableMonsters[randomIndex];
                targetMonster = { id, ...monster };
            }
        }

        if (!targetMonster) {
            return api.sendMessage("Khong tim thay quai vat phu hop!", threadID, messageID);
        }

        // Simulate party combat
        const combatResult = await this.simulatePartyCombat(onlineMembers, targetMonster);

        // Update party last hunt time
        party.lastHunt = now;

        let combatMessage = `=== PARTY HUNT: ${targetMonster.name.toUpperCase()} ===\n\n`;
        combatMessage += `Thanh vien tham gia: ${onlineMembers.length}\n`;
        combatMessage += `Target: ${targetMonster.name} (Level ${targetMonster.level})\n\n`;

        if (combatResult.victory) {
            combatMessage += "CHIEN THANG!\n\n";

            // Distribute rewards
            const baseExpPerMember = Math.floor(combatResult.rewards.exp / onlineMembers.length);
            const baseGoldPerMember = Math.floor(combatResult.rewards.gold / onlineMembers.length);

            combatMessage += "PHAN THUONG (moi thanh vien):\n";
            combatMessage += `- EXP: ${baseExpPerMember}\n`;
            combatMessage += `- Gold: ${baseGoldPerMember}\n`;

            // Apply rewards to all party members
            for (const member of onlineMembers) {
                member.exp += baseExpPerMember;
                member.gold += baseGoldPerMember;
                member.statistics.monstersKilled++;

                // Distribute items randomly
                if (combatResult.rewards.items.length > 0) {
                    const randomItem = combatResult.rewards.items[Math.floor(Math.random() * combatResult.rewards.items.length)];
                    member.inventory[randomItem] = (member.inventory[randomItem] || 0) + 1;
                    combatMessage += `${member.name} nhan duoc: ${randomItem}\n`;
                }

                // Check level up
                const PlayerUtils = require('../../utils/slg/playerUtils');
                const playerUtils = new PlayerUtils();
                const levelUpResult = await playerUtils.checkLevelUp(member);

                if (levelUpResult.leveledUp) {
                    combatMessage += `${member.name} da len cap ${member.level}!\n`;
                }

                // Give exp to summoned shadows
                const ShadowHandler = require('./shadowHandler');
                if (member.class === 'shadow_monarch') {
                    ShadowHandler.giveShadowExp(member, baseExpPerMember);
                }
            }

        } else {
            combatMessage += "THUA CUOC!\n\n";
            combatMessage += `Party da bi ${targetMonster.name} danh bai!\n`;
            combatMessage += "Tat ca thanh vien bi mat HP!";

            // Reduce HP for all members
            for (const member of onlineMembers) {
                member.hp = Math.max(1, Math.floor(member.hp * 0.7));
            }
        }

        await gameData.saveData('parties.json', parties);
        await gameData.saveData('players.json', players);

        return api.sendMessage(combatMessage, threadID, messageID);
    }

    static async simulatePartyCombat(partyMembers, monster) {
        // Create combat instances
        const partyCombat = partyMembers.map(member => ({
            ...member,
            originalHp: member.hp
        }));

        const monsterCombat = {
            hp: monster.hp * Math.max(1, partyMembers.length * 0.8), // Scale monster HP
            maxHp: monster.hp * Math.max(1, partyMembers.length * 0.8),
            attack: monster.attack,
            defense: monster.defense,
            agility: monster.agility || 10
        };

        let rounds = 0;
        const maxRounds = 20;

        while (rounds < maxRounds && monsterCombat.hp > 0) {
            rounds++;

            // Party attacks
            let totalDamage = 0;
            for (const member of partyCombat) {
                if (member.hp > 0) {
                    let damage = member.attack;
                    damage = Math.max(1, damage - Math.floor(monsterCombat.defense / 2));

                    // Party coordination bonus
                    damage = Math.floor(damage * 1.1);

                    // Critical hit check
                    if (Math.random() * 100 < member.critRate) {
                        damage = Math.floor(damage * (member.critDamage / 100));
                    }

                    totalDamage += damage;
                }
            }

            monsterCombat.hp -= totalDamage;

            if (monsterCombat.hp <= 0) break;

            // Monster attacks (targets random party member)
            const aliveMembersIndices = partyCombat
                .map((member, index) => member.hp > 0 ? index : -1)
                .filter(index => index !== -1);

            if (aliveMembersIndices.length === 0) break;

            const targetIndex = aliveMembersIndices[Math.floor(Math.random() * aliveMembersIndices.length)];
            const target = partyCombat[targetIndex];

            let damage = monsterCombat.attack;
            damage = Math.max(1, damage - Math.floor(target.defense / 2));
            damage = Math.floor(damage * (0.8 + Math.random() * 0.4));

            target.hp -= damage;
        }

        // Update original player HP
        partyCombat.forEach((member, index) => {
            partyMembers[index].hp = Math.max(0, member.hp);
        });

        const victory = monsterCombat.hp <= 0;

        if (victory) {
            // Calculate rewards (bonus for party)
            const baseExp = monster.expReward || monster.level * 15;
            const baseGold = monster.goldReward || monster.level * 10;

            // Party bonus
            const partyBonus = 1 + (partyMembers.length - 1) * 0.2;

            const rewards = {
                exp: Math.floor(baseExp * partyBonus),
                gold: Math.floor(baseGold * partyBonus),
                items: []
            };

            // Item drops
            if (monster.drops && monster.drops.length > 0) {
                monster.drops.forEach(drop => {
                    if (Math.random() < (drop.chance || 0.3)) {
                        rewards.items.push(drop.itemId);
                    }
                });
            }

            return {
                victory: true,
                rounds: rounds,
                rewards: rewards
            };
        } else {
            return {
                victory: false,
                rounds: rounds,
                rewards: null
            };
        }
    }

    static calculateAverageLevel(party, players) {
        const totalLevel = party.members.reduce((sum, memberId) => {
            const member = players[memberId];
            return sum + (member ? member.level : 0);
        }, 0);

        return Math.floor(totalLevel / party.members.length);
    }

    static async listActiveParties(api, event) {
        const { threadID, messageID } = event;
        const gameData = new GameData();

        const parties = await gameData.loadData('parties.json');
        const players = await gameData.loadData('players.json');

        const publicParties = Object.values(parties).filter(party =>
            party.isPublic &&
            party.members.length < party.maxMembers &&
            Date.now() - party.createdAt < 24 * 60 * 60 * 1000 // Less than 24 hours old
        );

        if (publicParties.length === 0) {
            return api.sendMessage("Khong co party cong khai nao dang mo!", threadID, messageID);
        }

        let listMessage = "=== DANH SACH PARTY CONG KHAI ===\n\n";

        publicParties.slice(0, 10).forEach((party, index) => {
            const leader = players[party.leader];
            const avgLevel = this.calculateAverageLevel(party, players);

            listMessage += `${index + 1}. ${party.name}\n`;
            listMessage += `   Leader: ${leader ? leader.name : 'Unknown'} (Level ${leader ? leader.level : '?'})\n`;
            listMessage += `   Thanh vien: ${party.members.length}/${party.maxMembers}\n`;
            listMessage += `   Level TB: ${avgLevel}\n`;
            listMessage += `   ID: ${party.id}\n\n`;
        });

        listMessage += "Su dung 'slg party join <party_id>' de tham gia party";

        return api.sendMessage(listMessage, threadID, messageID);
    }
}

module.exports = PartyHandler;