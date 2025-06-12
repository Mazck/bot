class PlayerUtils {
    async checkLevelUp(player) {
        let leveledUp = false;
        let totalStatPoints = 0;
        let totalSkillPoints = 0;

        while (player.exp >= player.expToNext) {
            player.exp -= player.expToNext;
            player.level++;
            leveledUp = true;

            // Calculate stat points gained (5 per level)
            const statPointsGained = 5;
            const skillPointsGained = Math.floor(player.level / 5); // 1 skill point every 5 levels

            totalStatPoints += statPointsGained;
            totalSkillPoints += skillPointsGained;

            // Increase base stats
            player.maxHp += 20 + (player.vitality * 2);
            player.maxMana += 10 + player.intelligence;

            // Full heal on level up
            player.hp = player.maxHp;
            player.mana = player.maxMana;

            // Recalculate combat stats
            player.attack += 3 + Math.floor(player.strength / 2);
            player.defense += 2 + Math.floor(player.vitality / 3);

            // Calculate next level exp requirement
            player.expToNext = Math.floor(100 * Math.pow(1.2, player.level - 1));
        }

        if (leveledUp) {
            player.statPoints += totalStatPoints;
            player.skillPoints += totalSkillPoints;
        }

        return {
            leveledUp: leveledUp,
            statPoints: totalStatPoints,
            skillPoints: totalSkillPoints,
            newLevel: player.level
        };
    }

    calculateCombatPower(player) {
        // Calculate total combat power including equipment
        let totalPower = 0;

        // Base stats power
        totalPower += player.attack * 2;
        totalPower += player.defense * 1.5;
        totalPower += player.maxHp * 0.1;
        totalPower += player.maxMana * 0.05;
        totalPower += player.critRate * 10;
        totalPower += player.critDamage * 2;

        // Equipment bonus
        // This would be calculated based on equipped items

        // Shadow army bonus (for Shadow Monarch)
        if (player.class === "shadow_monarch" && player.shadows) {
            const shadowPower = player.shadows.reduce((total, shadow) => {
                if (shadow.summoned) {
                    return total + (shadow.attack + shadow.defense + shadow.hp * 0.1);
                }
                return total;
            }, 0);
            totalPower += shadowPower * 0.5;
        }

        return Math.floor(totalPower);
    }

    calculateStatEfficiency(player) {
        // Calculate how efficiently stats are distributed
        const totalStats = player.strength + player.agility + player.intelligence + player.vitality + player.luck;
        const efficiency = {
            strength: player.strength / totalStats,
            agility: player.agility / totalStats,
            intelligence: player.intelligence / totalStats,
            vitality: player.vitality / totalStats,
            luck: player.luck / totalStats
        };

        return efficiency;
    }

    getRecommendedStats(player) {
        // Recommend stat distribution based on class
        const recommendations = {
            fighter: { strength: 0.4, vitality: 0.3, agility: 0.2, intelligence: 0.05, luck: 0.05 },
            mage: { intelligence: 0.5, agility: 0.2, vitality: 0.15, strength: 0.1, luck: 0.05 },
            assassin: { agility: 0.4, strength: 0.25, luck: 0.2, vitality: 0.1, intelligence: 0.05 },
            healer: { intelligence: 0.4, vitality: 0.3, agility: 0.15, strength: 0.05, luck: 0.1 },
            shadow_monarch: { strength: 0.3, agility: 0.25, intelligence: 0.25, vitality: 0.15, luck: 0.05 }
        };

        return recommendations[player.class] || recommendations.fighter;
    }

    canUseSkill(player, skill) {
        // Check if player can use a specific skill
        if (player.mana < skill.cost) return { canUse: false, reason: "Khong du mana" };
        if (skill.class && player.class !== skill.class) return { canUse: false, reason: "Khong dung class" };
        if (skill.requirements) {
            if (skill.requirements.level && player.level < skill.requirements.level) {
                return { canUse: false, reason: `Can level ${skill.requirements.level}` };
            }
            if (skill.requirements.awakened && !player.awakened) {
                return { canUse: false, reason: "Can thuc tinh truoc" };
            }
        }

        return { canUse: true };
    }

    getClassProgression(player) {
        // Show class progression and next milestones
        const progression = {
            currentClass: player.class,
            nextMilestones: [],
            availableClasses: [],
            hiddenClassHints: []
        };

        // Add logic for class progression recommendations
        if (player.level >= 20 && !player.awakened) {
            progression.nextMilestones.push("Thuc tinh class dau tien");
        }

        if (player.awakeningLevel >= 1 && player.level >= 25) {
            progression.nextMilestones.push("Co the thuc tinh lai class khac");
        }

        // Hidden class hints
        if (player.statistics.monstersKilled >= 50 && player.class !== "shadow_monarch") {
            progression.hiddenClassHints.push("Co gi do ve bong toi...");
        }

        return progression;
    }
}

module.exports = PlayerUtils;