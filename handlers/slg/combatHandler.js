const GameData = require('../../utils/slg/gameData');
const PlayerUtils = require('../../utils/slg/playerUtils');

class CombatHandler {
    static async startHunt(api, event, args) {
        const { threadID, messageID, senderID } = event;
        const gameData = new GameData();
        const playerUtils = new PlayerUtils();

        const players = await gameData.loadData('players.json');
        const player = players[senderID];

        if (!player) {
            return api.sendMessage("Ban chua tham gia game! Su dung 'slg start'", threadID, messageID);
        }

        // Check cooldown
        const now = Date.now();
        const huntCooldown = 30000; // 30 seconds
        if (now - player.lastHunt < huntCooldown) {
            const remaining = Math.ceil((huntCooldown - (now - player.lastHunt)) / 1000);
            return api.sendMessage(`Ban can cho ${remaining} giay nua de san quai tiep theo!`, threadID, messageID);
        }

        // Check if player is alive
        if (player.hp <= 0) {
            return api.sendMessage("Ban da chet! Su dung potion hoac nghi ngoi de hoi phuc!", threadID, messageID);
        }

        const monsters = await gameData.loadData('monsters.json');
        let targetMonster = null;

        if (args[1]) {
            // Hunt specific monster
            const monsterName = args[1].toLowerCase();
            for (const [id, monster] of Object.entries(monsters)) {
                if (id === monsterName || monster.name.toLowerCase().includes(monsterName)) {
                    targetMonster = { id, ...monster };
                    break;
                }
            }

            if (!targetMonster) {
                return api.sendMessage("Khong tim thay quai vat nay!", threadID, messageID);
            }
        } else {
            // Random monster based on player level
            const availableMonsters = Object.entries(monsters).filter(([id, monster]) => {
                return monster.level <= player.level + 3 && monster.level >= Math.max(1, player.level - 2);
            });

            if (availableMonsters.length === 0) {
                return api.sendMessage("Khong co quai vat phu hop voi level cua ban!", threadID, messageID);
            }

            const randomIndex = Math.floor(Math.random() * availableMonsters.length);
            const [id, monster] = availableMonsters[randomIndex];
            targetMonster = { id, ...monster };
        }

        // Start combat
        const combatResult = await this.simulateCombat(player, targetMonster);

        // Update last hunt time
        player.lastHunt = now;

        let combatMessage = `=== CHIEN DAU VOI ${targetMonster.name.toUpperCase()} ===\n\n`;
        combatMessage += `${targetMonster.name} (Level ${targetMonster.level})\n`;
        combatMessage += `HP: ${targetMonster.hp} | ATK: ${targetMonster.attack} | DEF: ${targetMonster.defense}\n\n`;

        if (combatResult.victory) {
            combatMessage += "CHIEN THANG!\n\n";

            // Apply rewards
            player.exp += combatResult.rewards.exp;
            player.gold += combatResult.rewards.gold;
            player.statistics.monstersKilled++;

            // Add items to inventory
            combatResult.rewards.items.forEach(itemId => {
                player.inventory[itemId] = (player.inventory[itemId] || 0) + 1;
            });

            combatMessage += `Phan thuong:\n`;
            combatMessage += `- EXP: ${combatResult.rewards.exp}\n`;
            combatMessage += `- Gold: ${combatResult.rewards.gold}\n`;

            if (combatResult.rewards.items.length > 0) {
                combatMessage += `- Items: ${combatResult.rewards.items.join(', ')}\n`;
            }

            // Check for level up
            const levelUpResult = await playerUtils.checkLevelUp(player);
            if (levelUpResult.leveledUp) {
                combatMessage += `\nCHUC MUNG! Ban da len cap ${player.level}!\n`;
                combatMessage += `Nhan duoc ${levelUpResult.statPoints} stat points va ${levelUpResult.skillPoints} skill points!`;
            }

            // Check for shadow extraction (Shadow Monarch only)
            if (player.class === "shadow_monarch" && Math.random() < 0.25) {
                combatMessage += `\nCo the trich xuat shadow tu ${targetMonster.name}!`;
                combatMessage += `\nSu dung 'slg shadow extract ${targetMonster.id}' de thu thap!`;
            }

        } else {
            combatMessage += "THUA CUOC!\n\n";
            combatMessage += `Ban da bi ${targetMonster.name} danh bai!\n`;
            combatMessage += `HP con lai: ${player.hp}/${player.maxHp}\n`;
            combatMessage += `Su dung potion de hoi phuc hoac nghi ngoi!`;
        }

        await gameData.saveData('players.json', players);
        return api.sendMessage(combatMessage, threadID, messageID);
    }

    static async simulateCombat(player, monster) {
        // Create combat instances
        const playerCombat = {
            hp: player.hp,
            maxHp: player.maxHp,
            attack: player.attack,
            defense: player.defense,
            critRate: player.critRate,
            critDamage: player.critDamage,
            agility: player.agility
        };

        const monsterCombat = {
            hp: monster.hp,
            maxHp: monster.hp,
            attack: monster.attack,
            defense: monster.defense,
            agility: monster.agility || 10
        };

        let rounds = 0;
        const maxRounds = 30;

        while (playerCombat.hp > 0 && monsterCombat.hp > 0 && rounds < maxRounds) {
            rounds++;

            // Determine turn order based on agility
            const playerFirst = playerCombat.agility >= monsterCombat.agility;

            if (playerFirst) {
                // Player attacks first
                this.attackTarget(playerCombat, monsterCombat);
                if (monsterCombat.hp <= 0) break;

                // Monster attacks back
                this.attackTarget(monsterCombat, playerCombat);
            } else {
                // Monster attacks first
                this.attackTarget(monsterCombat, playerCombat);
                if (playerCombat.hp <= 0) break;

                // Player attacks back
                this.attackTarget(playerCombat, monsterCombat);
            }
        }

        // Update player HP
        player.hp = Math.max(0, playerCombat.hp);

        if (monsterCombat.hp <= 0) {
            // Player victory
            const rewards = this.calculateRewards(player, monster);
            return {
                victory: true,
                rounds: rounds,
                rewards: rewards
            };
        } else {
            // Player defeat
            return {
                victory: false,
                rounds: rounds,
                rewards: null
            };
        }
    }

    static attackTarget(attacker, defender) {
        let damage = attacker.attack;

        // Apply defense
        damage = Math.max(1, damage - Math.floor(defender.defense / 2));

        // Check for critical hit (only for player)
        if (attacker.critRate && Math.random() * 100 < attacker.critRate) {
            damage = Math.floor(damage * (attacker.critDamage / 100));
        }

        // Apply damage with some randomness
        damage = Math.floor(damage * (0.8 + Math.random() * 0.4));

        defender.hp -= damage;
    }

    static calculateRewards(player, monster) {
        const baseExp = monster.expReward || monster.level * 15;
        const baseGold = monster.goldReward || monster.level * 10;

        // Level difference multiplier
        const levelDiff = monster.level - player.level;
        let expMultiplier = 1.0;
        let goldMultiplier = 1.0;

        if (levelDiff > 0) {
            expMultiplier = 1.0 + (levelDiff * 0.15);
            goldMultiplier = 1.0 + (levelDiff * 0.1);
        } else if (levelDiff < -3) {
            expMultiplier = Math.max(0.1, 1.0 + (levelDiff * 0.05));
            goldMultiplier = Math.max(0.1, 1.0 + (levelDiff * 0.03));
        }

        const rewards = {
            exp: Math.floor(baseExp * expMultiplier),
            gold: Math.floor(baseGold * goldMultiplier),
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

        return rewards;
    }
}

module.exports = CombatHandler;