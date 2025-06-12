const fs = require('fs-extra');
const path = require('path');

class GameData {
    constructor() {
        this.dataPath = path.join(__dirname, '../../handlers/slg/data');
        this.ensureDataDirectory();
    }

    ensureDataDirectory() {
        if (!fs.existsSync(this.dataPath)) {
            fs.mkdirSync(this.dataPath, { recursive: true });
        }
    }

    async loadData(filename) {
        try {
            const filePath = path.join(this.dataPath, filename);
            if (!fs.existsSync(filePath)) {
                await this.saveData(filename, {});
                return {};
            }
            return await fs.readJson(filePath);
        } catch (error) {
            console.error(`Error loading ${filename}:`, error);
            return {};
        }
    }

    loadDataSync(filename) {
        try {
            const filePath = path.join(this.dataPath, filename);
            if (!fs.existsSync(filePath)) {
                fs.writeJsonSync(filePath, {}, { spaces: 2 });
                return {};
            }
            return fs.readJsonSync(filePath);
        } catch (error) {
            console.error(`Error loading ${filename}:`, error);
            return {};
        }
    }

    async saveData(filename, data) {
        try {
            const filePath = path.join(this.dataPath, filename);
            await fs.writeJson(filePath, data, { spaces: 2 });
            return true;
        } catch (error) {
            console.error(`Error saving ${filename}:`, error);
            return false;
        }
    }

    saveDataSync(filename, data) {
        try {
            const filePath = path.join(this.dataPath, filename);
            fs.writeJsonSync(filePath, data, { spaces: 2 });
            return true;
        } catch (error) {
            console.error(`Error saving ${filename}:`, error);
            return false;
        }
    }

    initializeAllData() {
        // Initialize all required data files with default data
        this.initializeItems();
        this.initializeMonsters();
        this.initializeClasses();
        this.initializeSkills();
        this.initializeQuests();
        this.initializeDungeons();
        this.initializeRecipes();
        this.initializeEmptyFiles();
    }

    initializeItems() {
        const itemsPath = path.join(this.dataPath, 'items.json');
        if (!fs.existsSync(itemsPath)) {
            const defaultItems = {
                // Weapons
                "basic_sword": {
                    name: "Basic Sword",
                    type: "equipment",
                    equipSlot: "weapon",
                    equipable: true,
                    rarity: "common",
                    levelRequired: 1,
                    price: 100,
                    sellable: true,
                    stats: { attack: 15 },
                    upgrade: 0,
                    maxUpgrade: 15
                },
                "iron_sword": {
                    name: "Iron Sword",
                    type: "equipment",
                    equipSlot: "weapon",
                    equipable: true,
                    rarity: "rare",
                    levelRequired: 5,
                    price: 300,
                    sellable: true,
                    stats: { attack: 30 },
                    upgrade: 0,
                    maxUpgrade: 15
                },
                "steel_sword": {
                    name: "Steel Sword",
                    type: "equipment",
                    equipSlot: "weapon",
                    equipable: true,
                    rarity: "epic",
                    levelRequired: 10,
                    price: 800,
                    sellable: true,
                    stats: { attack: 50, critRate: 5 },
                    upgrade: 0,
                    maxUpgrade: 15
                },
                "shadow_blade": {
                    name: "Shadow Blade",
                    type: "equipment",
                    equipSlot: "weapon",
                    equipable: true,
                    rarity: "legendary",
                    levelRequired: 20,
                    classRequired: "shadow_monarch",
                    price: 5000,
                    sellable: true,
                    stats: { attack: 100, critRate: 15, critDamage: 30 },
                    upgrade: 0,
                    maxUpgrade: 15
                },

                // Armor
                "leather_armor": {
                    name: "Leather Armor",
                    type: "equipment",
                    equipSlot: "armor",
                    equipable: true,
                    rarity: "common",
                    levelRequired: 1,
                    price: 80,
                    sellable: true,
                    stats: { defense: 12, hp: 20 }
                },
                "iron_armor": {
                    name: "Iron Armor",
                    type: "equipment",
                    equipSlot: "armor",
                    equipable: true,
                    rarity: "rare",
                    levelRequired: 5,
                    price: 250,
                    sellable: true,
                    stats: { defense: 25, hp: 50 }
                },
                "steel_armor": {
                    name: "Steel Armor",
                    type: "equipment",
                    equipSlot: "armor",
                    equipable: true,
                    rarity: "epic",
                    levelRequired: 10,
                    price: 600,
                    sellable: true,
                    stats: { defense: 45, hp: 100, vitality: 5 }
                },

                // Accessories
                "power_ring": {
                    name: "Ring of Power",
                    type: "equipment",
                    equipSlot: "ring1",
                    equipable: true,
                    rarity: "rare",
                    levelRequired: 8,
                    price: 400,
                    sellable: true,
                    stats: { attack: 20, strength: 3 }
                },
                "mana_necklace": {
                    name: "Mana Necklace",
                    type: "equipment",
                    equipSlot: "necklace",
                    equipable: true,
                    rarity: "epic",
                    levelRequired: 12,
                    price: 700,
                    sellable: true,
                    stats: { mana: 50, intelligence: 5 }
                },

                // Consumables
                "health_potion": {
                    name: "Health Potion",
                    type: "consumable",
                    rarity: "common",
                    price: 25,
                    sellable: true,
                    effect: "heal",
                    value: 100,
                    description: "Hồi phục 100 HP"
                },
                "mana_potion": {
                    name: "Mana Potion",
                    type: "consumable",
                    rarity: "common",
                    price: 30,
                    sellable: true,
                    effect: "restore_mana",
                    value: 50,
                    description: "Hồi phục 50 Mana"
                },
                "exp_potion": {
                    name: "Experience Potion",
                    type: "consumable",
                    rarity: "rare",
                    price: 200,
                    sellable: true,
                    effect: "bonus_exp",
                    value: 500,
                    description: "Nhận thêm 500 EXP"
                },

                // Materials
                "iron_ore": {
                    name: "Iron Ore",
                    type: "material",
                    rarity: "common",
                    price: 10,
                    sellable: true,
                    description: "Nguyên liệu cơ bản để rèn trang bị"
                },
                "steel_ore": {
                    name: "Steel Ore",
                    type: "material",
                    rarity: "rare",
                    price: 30,
                    sellable: true,
                    description: "Nguyên liệu cao cấp để rèn trang bị"
                },
                "mithril_ore": {
                    name: "Mithril Ore",
                    type: "material",
                    rarity: "epic",
                    price: 100,
                    sellable: true,
                    description: "Nguyên liệu hiếm để rèn trang bị truyền thuyết"
                },
                "magic_crystal": {
                    name: "Magic Crystal",
                    type: "material",
                    rarity: "rare",
                    price: 50,
                    sellable: true,
                    description: "Tinh thể phép thuật"
                },
                "rare_gem": {
                    name: "Rare Gem",
                    type: "material",
                    rarity: "epic",
                    price: 150,
                    sellable: true,
                    description: "Ngọc quý hiếm"
                },
                "shadow_essence": {
                    name: "Shadow Essence",
                    type: "material",
                    rarity: "legendary",
                    price: 300,
                    sellable: true,
                    description: "Tinh chất của bóng tối"
                },

                // Special Items
                "awakening_stone": {
                    name: "Awakening Stone",
                    type: "special",
                    rarity: "legendary",
                    price: 1000,
                    sellable: false,
                    description: "Vật phẩm để thức tỉnh lại"
                },
                "stat_reset_stone": {
                    name: "Stat Reset Stone",
                    type: "special",
                    rarity: "epic",
                    price: 500,
                    sellable: false,
                    description: "Reset tất cả chỉ số"
                },
                "skill_book_rare": {
                    name: "Rare Skill Book",
                    type: "special",
                    rarity: "rare",
                    price: 300,
                    sellable: false,
                    description: "Học kỹ năng ngẫu nhiên"
                },
                "shadow_heart": {
                    name: "Shadow Heart",
                    type: "special",
                    rarity: "mythical",
                    price: 10000,
                    sellable: false,
                    description: "Trái tim của Bóng tối, cần thiết để trở thành Shadow Monarch"
                }
            };

            fs.writeJsonSync(itemsPath, defaultItems, { spaces: 2 });
        }
    }

    initializeMonsters() {
        const monstersPath = path.join(this.dataPath, 'monsters.json');
        if (!fs.existsSync(monstersPath)) {
            const defaultMonsters = {
                "goblin": {
                    name: "Goblin",
                    level: 1,
                    hp: 80,
                    attack: 20,
                    defense: 8,
                    agility: 15,
                    expReward: 15,
                    goldReward: 10,
                    drops: [
                        { itemId: "health_potion", chance: 0.4 },
                        { itemId: "iron_ore", chance: 0.3 },
                        { itemId: "basic_sword", chance: 0.1 }
                    ]
                },
                "orc": {
                    name: "Orc Warrior",
                    level: 3,
                    hp: 150,
                    attack: 35,
                    defense: 15,
                    agility: 10,
                    expReward: 35,
                    goldReward: 25,
                    drops: [
                        { itemId: "health_potion", chance: 0.5 },
                        { itemId: "iron_ore", chance: 0.4 },
                        { itemId: "iron_sword", chance: 0.15 },
                        { itemId: "leather_armor", chance: 0.2 }
                    ]
                },
                "skeleton": {
                    name: "Skeleton Soldier",
                    level: 5,
                    hp: 200,
                    attack: 45,
                    defense: 20,
                    agility: 20,
                    expReward: 50,
                    goldReward: 35,
                    drops: [
                        { itemId: "mana_potion", chance: 0.3 },
                        { itemId: "steel_ore", chance: 0.25 },
                        { itemId: "magic_crystal", chance: 0.2 },
                        { itemId: "iron_armor", chance: 0.15 }
                    ]
                },
                "shadow_beast": {
                    name: "Shadow Beast",
                    level: 8,
                    hp: 350,
                    attack: 60,
                    defense: 25,
                    agility: 30,
                    expReward: 80,
                    goldReward: 60,
                    drops: [
                        { itemId: "shadow_essence", chance: 0.3 },
                        { itemId: "steel_ore", chance: 0.4 },
                        { itemId: "rare_gem", chance: 0.15 },
                        { itemId: "steel_sword", chance: 0.1 }
                    ],
                    shadowSkills: ["shadow_strike"]
                },
                "dark_knight": {
                    name: "Dark Knight",
                    level: 12,
                    hp: 600,
                    attack: 85,
                    defense: 40,
                    agility: 25,
                    expReward: 120,
                    goldReward: 100,
                    drops: [
                        { itemId: "shadow_essence", chance: 0.4 },
                        { itemId: "mithril_ore", chance: 0.2 },
                        { itemId: "rare_gem", chance: 0.25 },
                        { itemId: "steel_armor", chance: 0.2 },
                        { itemId: "awakening_stone", chance: 0.05 }
                    ],
                    shadowSkills: ["shadow_strike", "shadow_defense"]
                },
                "elder_dragon": {
                    name: "Elder Dragon",
                    level: 20,
                    hp: 1500,
                    attack: 150,
                    defense: 60,
                    agility: 40,
                    expReward: 300,
                    goldReward: 500,
                    drops: [
                        { itemId: "shadow_heart", chance: 0.1 },
                        { itemId: "shadow_essence", chance: 0.8 },
                        { itemId: "mithril_ore", chance: 0.5 },
                        { itemId: "shadow_blade", chance: 0.15 },
                        { itemId: "stat_reset_stone", chance: 0.2 }
                    ],
                    shadowSkills: ["shadow_strike", "shadow_defense", "shadow_heal"]
                }
            };

            fs.writeJsonSync(monstersPath, defaultMonsters, { spaces: 2 });
        }
    }

    initializeClasses() {
        const classesPath = path.join(this.dataPath, 'classes.json');
        if (!fs.existsSync(classesPath)) {
            const defaultClasses = {
                "fighter": {
                    name: "Fighter",
                    description: "Chiến binh cận chiến với sức mạnh và sự bền bỉ",
                    requirements: { level: 5 },
                    bonuses: {
                        strength: 5,
                        vitality: 5,
                        maxHp: 50,
                        attack: 15,
                        defense: 10
                    },
                    skills: ["power_strike", "guard", "berserker_rage"],
                    passiveSkills: ["weapon_mastery"],
                    hidden: false
                },
                "mage": {
                    name: "Mage",
                    description: "Pháp sư lưu đãn với sức mạnh phép thuật vô cùng",
                    requirements: { level: 5 },
                    bonuses: {
                        intelligence: 8,
                        agility: 2,
                        maxMana: 80,
                        attack: 20,
                        critRate: 10
                    },
                    skills: ["fireball", "ice_shard", "magic_shield", "teleport"],
                    passiveSkills: ["mana_efficiency"],
                    hidden: false
                },
                "assassin": {
                    name: "Assassin",
                    description: "Sát thủ lạnh lùng, tấn công từ bóng tối",
                    requirements: { level: 8 },
                    bonuses: {
                        agility: 8,
                        luck: 3,
                        critRate: 20,
                        critDamage: 50,
                        attack: 10
                    },
                    skills: ["stealth", "critical_strike", "poison_blade", "shadow_step"],
                    passiveSkills: ["stealth_mastery", "critical_mastery"],
                    hidden: false
                },
                "healer": {
                    name: "Healer",
                    description: "Mục sư chữa lành và hỗ trợ đồng đội",
                    requirements: { level: 6 },
                    bonuses: {
                        intelligence: 5,
                        vitality: 5,
                        maxMana: 60,
                        maxHp: 40
                    },
                    skills: ["heal", "group_heal", "blessing", "purify"],
                    passiveSkills: ["healing_mastery", "mana_regeneration"],
                    hidden: false
                },

                // Hidden Classes
                "shadow_monarch": {
                    name: "Shadow Monarch",
                    description: "Chúa tể của bóng tối, chỉ huy quân đội bóng",
                    requirements: {
                        level: 20,
                        quest: "awaken_shadow",
                        item: "shadow_heart",
                        monstersKilled: 100,
                        awakeningLevel: 1
                    },
                    bonuses: {
                        strength: 10,
                        agility: 10,
                        intelligence: 10,
                        vitality: 8,
                        luck: 5,
                        maxHp: 100,
                        maxMana: 100,
                        attack: 50,
                        defense: 30,
                        critRate: 25,
                        critDamage: 75
                    },
                    skills: ["shadow_extraction", "shadow_army", "monarch_domain", "shadow_exchange", "ruler_authority"],
                    passiveSkills: ["shadow_mastery", "death_immunity", "army_commander"],
                    hidden: true
                },
                "necromancer": {
                    name: "Necromancer",
                    description: "Pháp sư bản tối chỉ huy sinh vật chết",
                    requirements: {
                        level: 15,
                        class: "mage",
                        quest: "embrace_darkness",
                        item: "necronomicon"
                    },
                    bonuses: {
                        intelligence: 12,
                        vitality: 3,
                        maxMana: 120,
                        attack: 30,
                        critRate: 15
                    },
                    skills: ["raise_undead", "death_magic", "soul_drain", "bone_prison"],
                    passiveSkills: ["undead_mastery", "death_resistance"],
                    hidden: true
                },
                "rogue_knight": {
                    name: "Rogue Knight",
                    description: "Hiệp sĩ sa ngã kết hợp sức mạnh và ma thuật bản tối",
                    requirements: {
                        level: 18,
                        class: "fighter",
                        quest: "fallen_knight",
                        dungeonsCleared: 10
                    },
                    bonuses: {
                        strength: 8,
                        agility: 6,
                        intelligence: 4,
                        vitality: 6,
                        maxHp: 80,
                        maxMana: 40,
                        attack: 35,
                        defense: 25
                    },
                    skills: ["dark_strike", "unholy_aura", "soul_blade", "nightmare"],
                    passiveSkills: ["dark_armor", "fear_immunity"],
                    hidden: true
                },
                "true_healer": {
                    name: "True Healer",
                    description: "Thánh nhân có khả năng chữa lành tuyệt đối",
                    requirements: {
                        level: 20,
                        class: "healer",
                        quest: "saint_awakening",
                        item: "holy_grail"
                    },
                    bonuses: {
                        intelligence: 8,
                        vitality: 10,
                        luck: 7,
                        maxMana: 150,
                        maxHp: 80
                    },
                    skills: ["divine_heal", "resurrection", "holy_light", "miracle"],
                    passiveSkills: ["divine_protection", "infinite_mana", "healing_aura"],
                    hidden: true
                },
                "beast_master": {
                    name: "Beast Master",
                    description: "Người cầm thú có khả năng chỉ huy mọi loại quái vật",
                    requirements: {
                        level: 16,
                        quest: "tame_the_wild",
                        monstersKilled: 50,
                        item: "beast_crystal"
                    },
                    bonuses: {
                        agility: 7,
                        vitality: 6,
                        luck: 5,
                        intelligence: 4,
                        maxHp: 60,
                        attack: 25
                    },
                    skills: ["beast_taming", "wild_instinct", "pack_leader", "animal_communication"],
                    passiveSkills: ["beast_bond", "nature_resistance"],
                    hidden: true
                }
            };

            fs.writeJsonSync(classesPath, defaultClasses, { spaces: 2 });
        }
    }

    initializeSkills() {
        const skillsPath = path.join(this.dataPath, 'skills.json');
        if (!fs.existsSync(skillsPath)) {
            const defaultSkills = {
                // Fighter Skills
                "power_strike": {
                    name: "Power Strike",
                    description: "Tấn công mạnh mẽ gây 200% damage",
                    type: "active",
                    cost: 15,
                    cooldown: 3,
                    damage: "2x attack",
                    class: "fighter"
                },
                "guard": {
                    name: "Guard",
                    description: "Tăng 50% defense trong 3 turn",
                    type: "active",
                    cost: 10,
                    cooldown: 5,
                    effect: "defense_boost",
                    duration: 3,
                    class: "fighter"
                },
                "berserker_rage": {
                    name: "Berserker Rage",
                    description: "Tăng 100% attack nhưng giảm 50% defense",
                    type: "active",
                    cost: 25,
                    cooldown: 10,
                    effect: "berserker_mode",
                    duration: 5,
                    class: "fighter"
                },
                "weapon_mastery": {
                    name: "Weapon Mastery",
                    description: "Tăng 15% damage khi sử dụng vũ khí",
                    type: "passive",
                    effect: "weapon_damage_boost",
                    value: 0.15,
                    class: "fighter"
                },

                // Mage Skills
                "fireball": {
                    name: "Fireball",
                    description: "Phóng cầu lửa gây damage phép thuật",
                    type: "active",
                    cost: 20,
                    cooldown: 2,
                    damage: "2.5x intelligence",
                    element: "fire",
                    class: "mage"
                },
                "ice_shard": {
                    name: "Ice Shard",
                    description: "Kiến băng gây damage và làm chậm",
                    type: "active",
                    cost: 18,
                    cooldown: 2,
                    damage: "2x intelligence",
                    element: "ice",
                    effect: "slow",
                    class: "mage"
                },
                "magic_shield": {
                    name: "Magic Shield",
                    description: "Tạo khiên phép thuật hấp thụ damage",
                    type: "active",
                    cost: 30,
                    cooldown: 8,
                    effect: "magic_shield",
                    duration: 5,
                    class: "mage"
                },
                "teleport": {
                    name: "Teleport",
                    description: "Dịch chuyển tức thời, tránh damage",
                    type: "active",
                    cost: 25,
                    cooldown: 6,
                    effect: "dodge_next_attack",
                    class: "mage"
                },
                "mana_efficiency": {
                    name: "Mana Efficiency",
                    description: "Giảm 20% chi phí mana cho tất cả skill",
                    type: "passive",
                    effect: "mana_cost_reduction",
                    value: 0.2,
                    class: "mage"
                },

                // Assassin Skills
                "stealth": {
                    name: "Stealth",
                    description: "Ẩn hình và next attack sẽ crit",
                    type: "active",
                    cost: 20,
                    cooldown: 8,
                    effect: "stealth_crit",
                    class: "assassin"
                },
                "critical_strike": {
                    name: "Critical Strike",
                    description: "Tấn công chắc chắn crit với 300% damage",
                    type: "active",
                    cost: 25,
                    cooldown: 5,
                    damage: "3x attack",
                    guaranteed_crit: true,
                    class: "assassin"
                },
                "poison_blade": {
                    name: "Poison Blade",
                    description: "Vũ khí gây thêm poison damage theo thời gian",
                    type: "active",
                    cost: 15,
                    cooldown: 4,
                    effect: "poison",
                    duration: 5,
                    class: "assassin"
                },
                "shadow_step": {
                    name: "Shadow Step",
                    description: "Di chuyển nhanh và tăng 30% dodge",
                    type: "active",
                    cost: 18,
                    cooldown: 6,
                    effect: "dodge_boost",
                    duration: 3,
                    class: "assassin"
                },

                // Healer Skills
                "heal": {
                    name: "Heal",
                    description: "Hồi phục HP cho bản thân hoặc đồng minh",
                    type: "active",
                    cost: 20,
                    cooldown: 2,
                    healing: "3x intelligence",
                    class: "healer"
                },
                "group_heal": {
                    name: "Group Heal",
                    description: "Hồi phục HP cho toàn bộ party",
                    type: "active",
                    cost: 40,
                    cooldown: 8,
                    healing: "2x intelligence",
                    target: "party",
                    class: "healer"
                },
                "blessing": {
                    name: "Blessing",
                    description: "Tăng tất cả stats cho party trong 10 turn",
                    type: "active",
                    cost: 35,
                    cooldown: 15,
                    effect: "stat_boost",
                    duration: 10,
                    target: "party",
                    class: "healer"
                },

                // Shadow Monarch Skills
                "shadow_extraction": {
                    name: "Shadow Extraction",
                    description: "Trích xuất shadow từ kẻ thù đã chết",
                    type: "special",
                    cost: 50,
                    cooldown: 0,
                    effect: "extract_shadow",
                    class: "shadow_monarch"
                },
                "shadow_army": {
                    name: "Shadow Army",
                    description: "Gọi tất cả shadow để chiến đấu",
                    type: "active",
                    cost: 80,
                    cooldown: 20,
                    effect: "summon_all_shadows",
                    duration: 10,
                    class: "shadow_monarch"
                },
                "monarch_domain": {
                    name: "Monarch Domain",
                    description: "Tạo vùng lực lượng tăng 100% sức mạnh",
                    type: "active",
                    cost: 100,
                    cooldown: 30,
                    effect: "domain_expansion",
                    duration: 15,
                    class: "shadow_monarch"
                },
                "shadow_exchange": {
                    name: "Shadow Exchange",
                    description: "Đổi chỗ vị trí với bất kỳ shadow nào",
                    type: "active",
                    cost: 30,
                    cooldown: 5,
                    effect: "position_swap",
                    class: "shadow_monarch"
                },
                "ruler_authority": {
                    name: "Ruler's Authority",
                    description: "Điều khiển vật thể bằng telekinesis",
                    type: "active",
                    cost: 40,
                    cooldown: 8,
                    damage: "4x intelligence",
                    class: "shadow_monarch"
                },

                // Shadow Pet Skills
                "shadow_strike": {
                    name: "Shadow Strike",
                    description: "Tấn công từ bóng tối",
                    type: "active",
                    cost: 10,
                    damage: "1.5x attack",
                    shadow_skill: true
                },
                "shadow_defense": {
                    name: "Shadow Defense",
                    description: "Tăng defense khi ở trong bóng tối",
                    type: "passive",
                    effect: "defense_boost",
                    value: 0.3,
                    shadow_skill: true
                },
                "shadow_speed": {
                    name: "Shadow Speed",
                    description: "Tăng tốc độ di chuyển",
                    type: "passive",
                    effect: "agility_boost",
                    value: 0.25,
                    shadow_skill: true
                },
                "shadow_heal": {
                    name: "Shadow Heal",
                    description: "Tự động hồi HP khi bị thương",
                    type: "passive",
                    effect: "auto_heal",
                    value: 0.1,
                    shadow_skill: true
                }
            };

            fs.writeJsonSync(skillsPath, defaultSkills, { spaces: 2 });
        }
    }

    initializeQuests() {
        const questsPath = path.join(this.dataPath, 'quests.json');
        if (!fs.existsSync(questsPath)) {
            const defaultQuests = {
                // Tutorial Quests
                "first_awakening": {
                    name: "Lần Thức Tỉnh Đầu Tiên",
                    description: "Chứng minh bạn có đủ sức mạnh để trở thành Hunter",
                    type: "chain",
                    steps: [
                        "Đánh bại 5 Goblin",
                        "Thu thập 3 Iron Ore",
                        "Đạt level 5"
                    ],
                    rewards: {
                        exp: 100,
                        gold: 200,
                        items: ["awakening_stone"],
                        skillPoints: 2
                    },
                    requirements: { level: 1 },
                    hidden: false
                },
                "first_equipment": {
                    name: "Trang Bị Đầu Tiên",
                    description: "Trang bị vũ khí và giáp áo để chuẩn bị cho hành trình",
                    type: "chain",
                    steps: [
                        "Trang bị 1 weapon",
                        "Trang bị 1 armor",
                        "Nâng cấp 1 item lên +1"
                    ],
                    rewards: {
                        exp: 75,
                        gold: 150,
                        items: ["iron_sword", "leather_armor"]
                    },
                    requirements: { level: 3 },
                    hidden: false
                },
                "party_formation": {
                    name: "Thành Lập Đội Nhóm",
                    description: "Học cách làm việc nhóm để tăng lòng dungeon",
                    type: "chain",
                    steps: [
                        "Tạo hoặc tham gia 1 party",
                        "Hoàn thành 1 party hunt",
                        "Hoàn thành 1 party dungeon"
                    ],
                    rewards: {
                        exp: 200,
                        gold: 300,
                        items: ["exp_potion"],
                        skillPoints: 1
                    },
                    requirements: { level: 8 },
                    hidden: false
                },

                // Main Story Quests
                "awaken_shadow": {
                    name: "Thức Tỉnh Sức Mạnh Bóng Tối",
                    description: "Khám phá bí mật về sức mạnh Shadow Monarch",
                    type: "chain",
                    steps: [
                        "Đánh bại 20 Shadow Beast",
                        "Thu thập 15 Shadow Essence",
                        "Hoàn thành Dark Dungeon",
                        "Tìm Shadow Heart trong Deep Abyss"
                    ],
                    rewards: {
                        exp: 1000,
                        gold: 5000,
                        items: ["shadow_heart"],
                        unlocks: ["class_shadow_monarch"],
                        skillPoints: 5
                    },
                    requirements: {
                        level: 15,
                        questCompleted: "first_awakening"
                    },
                    hidden: true,
                    hiddenRequirements: {
                        monstersKilled: 50,
                        dungeonsCleared: 3,
                        hasItem: "shadow_essence"
                    }
                },
                "embrace_darkness": {
                    name: "Đón Nhận Bóng Tối",
                    description: "Từ bỏ ánh sáng để có được sức mạnh tuyệt đối",
                    type: "chain",
                    steps: [
                        "Sử dụng Dark Magic 50 lần",
                        "Đánh bại 10 Undead monsters",
                        "Tìm Necronomicon trong Forbidden Library"
                    ],
                    rewards: {
                        exp: 800,
                        gold: 3000,
                        items: ["necronomicon"],
                        unlocks: ["class_necromancer"],
                        skillPoints: 4
                    },
                    requirements: {
                        level: 12,
                        class: "mage"
                    },
                    hidden: true
                },
                "fallen_knight": {
                    name: "Hiệp Sĩ Sa Ngã",
                    description: "Tìm hiểu về những hiệp sĩ đã rơi vào bóng tối",
                    type: "chain",
                    steps: [
                        "Đánh bại Dark Knight boss",
                        "Thu thập Cursed Armor pieces",
                        "Hoàn thành Corrupted Castle dungeon"
                    ],
                    rewards: {
                        exp: 600,
                        gold: 2500,
                        items: ["dark_armor_set"],
                        unlocks: ["class_rogue_knight"],
                        skillPoints: 3
                    },
                    requirements: {
                        level: 15,
                        class: "fighter",
                        dungeonsCleared: 8
                    },
                    hidden: true
                },
                "saint_awakening": {
                    name: "Thức Tỉnh Thánh Nhân",
                    description: "Đạt được sức mạnh chữa lành tuyệt đối",
                    type: "chain",
                    steps: [
                        "Chữa lành 100 người",
                        "Hồi sinh 1 người đã chết",
                        "Tìm Holy Grail trong Sacred Temple"
                    ],
                    rewards: {
                        exp: 1200,
                        gold: 4000,
                        items: ["holy_grail"],
                        unlocks: ["class_true_healer"],
                        skillPoints: 6
                    },
                    requirements: {
                        level: 18,
                        class: "healer"
                    },
                    hidden: true
                },

                // Side Quests
                "merchant_request": {
                    name: "Yêu Cầu Của Thương Gia",
                    description: "Giao hàng cho thương gia ở thành phố bên",
                    type: "delivery",
                    target: {
                        item: "rare_gem",
                        amount: 3,
                        npc: "merchant_bob"
                    },
                    rewards: {
                        exp: 150,
                        gold: 400,
                        items: ["steel_armor"]
                    },
                    requirements: { level: 10 },
                    hidden: false
                },
                "blacksmith_apprentice": {
                    name: "Học Việc Thợ Rèn",
                    description: "Học cách rèn tạo trang bị từ blacksmith",
                    type: "chain",
                    steps: [
                        "Rèn 5 Iron Sword",
                        "Nâng cấp 3 item lên +5",
                        "Tạo 1 Epic item"
                    ],
                    rewards: {
                        exp: 300,
                        gold: 600,
                        items: ["master_hammer"],
                        skillPoints: 2
                    },
                    requirements: { level: 12 },
                    hidden: false
                },

                // Weekly/Monthly Quests
                "weekly_hunting": {
                    name: "Săn Quái Hàng Tuần",
                    description: "Đánh bại 50 quái vật bất kỳ trong tuần",
                    type: "kill",
                    target: {
                        monster: "any",
                        amount: 50
                    },
                    rewards: {
                        exp: 500,
                        gold: 1000,
                        items: ["exp_potion", "rare_gem"],
                        eventTokens: 10
                    },
                    requirements: { level: 8 },
                    recurring: "weekly",
                    hidden: false
                },
                "monthly_dungeon": {
                    name: "Chinh Phục Dungeon",
                    description: "Hoàn thành 20 dungeon trong tháng",
                    type: "dungeon",
                    target: {
                        amount: 20
                    },
                    rewards: {
                        exp: 1000,
                        gold: 2500,
                        items: ["legendary_box", "skill_book_rare"],
                        diamonds: 5,
                        eventTokens: 25
                    },
                    requirements: { level: 15 },
                    recurring: "monthly",
                    hidden: false
                }
            };

            fs.writeJsonSync(questsPath, defaultQuests, { spaces: 2 });
        }
    }

    initializeDungeons() {
        const dungeonsPath = path.join(this.dataPath, 'dungeons.json');
        if (!fs.existsSync(dungeonsPath)) {
            const defaultDungeons = {
                "goblin_cave": {
                    name: "Goblin Cave",
                    description: "Hang động đầy Goblin hung dữ",
                    level: 3,
                    difficulty: "easy",
                    type: "normal",
                    floors: 3,
                    maxParty: 4,
                    monstersPerFloor: 2,
                    monsters: ["goblin", "goblin"],
                    boss: {
                        name: "Goblin King",
                        level: 5,
                        hp: 400,
                        attack: 50,
                        defense: 25,
                        agility: 15,
                        expReward: 100,
                        goldReward: 150,
                        drops: [
                            { itemId: "iron_sword", chance: 0.4 },
                            { itemId: "goblin_crown", chance: 0.2 },
                            { itemId: "steel_ore", chance: 0.6 }
                        ]
                    },
                    rewards: {
                        exp: 150,
                        gold: 200,
                        items: ["health_potion", "iron_ore"]
                    },
                    requirements: { level: 3 },
                    hidden: false
                },
                "skeleton_crypt": {
                    name: "Skeleton Crypt",
                    description: "Lăng mộ cổ đầy xương người",
                    level: 6,
                    difficulty: "normal",
                    type: "undead",
                    floors: 4,
                    maxParty: 4,
                    monstersPerFloor: 3,
                    monsters: ["skeleton", "skeleton"],
                    boss: {
                        name: "Skeleton Lord",
                        level: 8,
                        hp: 600,
                        attack: 70,
                        defense: 30,
                        agility: 20,
                        expReward: 150,
                        goldReward: 250,
                        drops: [
                            { itemId: "steel_sword", chance: 0.3 },
                            { itemId: "bone_armor", chance: 0.25 },
                            { itemId: "magic_crystal", chance: 0.5 }
                        ]
                    },
                    rewards: {
                        exp: 200,
                        gold: 300,
                        items: ["mana_potion", "steel_ore"]
                    },
                    requirements: { level: 6 },
                    hidden: false
                },
                "dark_forest": {
                    name: "Dark Forest",
                    description: "Khu rừng tối tăm đầy quái vật bóng tối",
                    level: 10,
                    difficulty: "hard",
                    type: "shadow",
                    floors: 5,
                    maxParty: 6,
                    monstersPerFloor: 4,
                    monsters: ["shadow_beast", "dark_knight"],
                    boss: {
                        name: "Forest Guardian",
                        level: 12,
                        hp: 1000,
                        attack: 95,
                        defense: 45,
                        agility: 35,
                        expReward: 300,
                        goldReward: 500,
                        drops: [
                            { itemId: "shadow_blade", chance: 0.15 },
                            { itemId: "shadow_essence", chance: 0.7 },
                            { itemId: "rare_gem", chance: 0.4 }
                        ]
                    },
                    rewards: {
                        exp: 400,
                        gold: 600,
                        items: ["shadow_essence", "mithril_ore"]
                    },
                    requirements: { level: 10 },
                    hidden: false
                },
                "deep_abyss": {
                    name: "Deep Abyss",
                    description: "Vực thẳm sâu nhất, nơi ẩn giấu Shadow Heart",
                    level: 18,
                    difficulty: "nightmare",
                    type: "special",
                    floors: 10,
                    maxParty: 4,
                    monstersPerFloor: 5,
                    monsters: ["shadow_beast", "dark_knight", "void_crawler"],
                    boss: {
                        name: "Abyss Lord",
                        level: 20,
                        hp: 2500,
                        attack: 150,
                        defense: 70,
                        agility: 50,
                        expReward: 800,
                        goldReward: 1500,
                        drops: [
                            { itemId: "shadow_heart", chance: 0.8 },
                            { itemId: "abyss_weapon", chance: 0.3 },
                            { itemId: "awakening_stone", chance: 0.5 }
                        ]
                    },
                    rewards: {
                        exp: 1000,
                        gold: 2000,
                        items: ["shadow_heart"]
                    },
                    requirements: {
                        level: 18,
                        questCompleted: "awaken_shadow"
                    },
                    hidden: true,
                    hiddenRequirements: {
                        questCompleted: "awaken_shadow",
                        dungeonsCleared: 15
                    }
                },
                "infinite_tower": {
                    name: "Infinite Tower",
                    description: "Tháp vô tận với thử thách không giới hạn",
                    level: 15,
                    difficulty: "expert",
                    type: "infinite",
                    floors: 999,
                    maxParty: 1,
                    monstersPerFloor: 3,
                    monsters: ["random"],
                    rewards: {
                        exp: "floor * 50",
                        gold: "floor * 100",
                        items: ["floor_rewards"]
                    },
                    requirements: {
                        level: 15,
                        awakened: true
                    },
                    special: true,
                    hidden: false
                },
                "raid_dragon_lair": {
                    name: "Dragon Lair Raid",
                    description: "Hang rồng Elder Dragon, cần nhiều người để thắng",
                    level: 22,
                    difficulty: "nightmare",
                    type: "raid",
                    floors: 1,
                    maxParty: 8,
                    monstersPerFloor: 0,
                    boss: {
                        name: "Elder Dragon",
                        level: 25,
                        hp: 5000,
                        attack: 200,
                        defense: 100,
                        agility: 60,
                        expReward: 2000,
                        goldReward: 5000,
                        drops: [
                            { itemId: "dragon_scale", chance: 0.9 },
                            { itemId: "dragon_weapon", chance: 0.4 },
                            { itemId: "legendary_box", chance: 0.6 }
                        ]
                    },
                    rewards: {
                        exp: 2000,
                        gold: 3000,
                        items: ["dragon_scale"]
                    },
                    requirements: {
                        level: 20,
                        awakeningLevel: 2
                    },
                    hidden: false
                }
            };

            fs.writeJsonSync(dungeonsPath, defaultDungeons, { spaces: 2 });
        }
    }

    initializeRecipes() {
        const recipesPath = path.join(this.dataPath, 'recipes.json');
        if (!fs.existsSync(recipesPath)) {
            const defaultRecipes = {
                "craft_iron_sword": {
                    name: "Rèn Iron Sword",
                    description: "Rèn tạo thanh kiếm bằng sắt",
                    result: {
                        id: "iron_sword",
                        name: "Iron Sword"
                    },
                    quantity: 1,
                    materials: {
                        "iron_ore": 5,
                        "magic_crystal": 1
                    },
                    cost: 200,
                    successRate: 0.8,
                    requirements: { level: 5 }
                },
                "craft_steel_armor": {
                    name: "Rèn Steel Armor",
                    description: "Rèn tạo giáp thép cao cấp",
                    result: {
                        id: "steel_armor",
                        name: "Steel Armor"
                    },
                    quantity: 1,
                    materials: {
                        "steel_ore": 8,
                        "magic_crystal": 2,
                        "rare_gem": 1
                    },
                    cost: 500,
                    successRate: 0.7,
                    requirements: { level: 10 }
                },
                "craft_shadow_blade": {
                    name: "Rèn Shadow Blade",
                    description: "Rèn tạo vũ khí truyền thuyết của Shadow Monarch",
                    result: {
                        id: "shadow_blade",
                        name: "Shadow Blade"
                    },
                    quantity: 1,
                    materials: {
                        "mithril_ore": 10,
                        "shadow_essence": 15,
                        "rare_gem": 5,
                        "dark_crystal": 3
                    },
                    cost: 2000,
                    successRate: 0.4,
                    requirements: {
                        level: 20,
                        class: "shadow_monarch"
                    }
                },
                "craft_health_potion": {
                    name: "Pha Health Potion",
                    description: "Pha chế thuốc hồi máu",
                    result: {
                        id: "health_potion",
                        name: "Health Potion"
                    },
                    quantity: 5,
                    materials: {
                        "herb": 3,
                        "water": 1
                    },
                    cost: 50,
                    successRate: 0.95,
                    requirements: { level: 1 }
                },
                "craft_awakening_stone": {
                    name: "Rèn Awakening Stone",
                    description: "Tạo ra đá thức tỉnh từ nguyên liệu hiếm",
                    result: {
                        id: "awakening_stone",
                        name: "Awakening Stone"
                    },
                    quantity: 1,
                    materials: {
                        "mithril_ore": 20,
                        "rare_gem": 10,
                        "magic_crystal": 15,
                        "dragon_scale": 5
                    },
                    cost: 5000,
                    successRate: 0.3,
                    requirements: {
                        level: 25,
                        awakeningLevel: 2
                    }
                },
                "craft_exp_potion": {
                    name: "Pha Experience Potion",
                    description: "Pha chế thuốc tăng kinh nghiệm",
                    result: {
                        id: "exp_potion",
                        name: "Experience Potion"
                    },
                    quantity: 3,
                    materials: {
                        "magic_crystal": 3,
                        "rare_herb": 2,
                        "monster_essence": 5
                    },
                    cost: 300,
                    successRate: 0.8,
                    requirements: { level: 8 }
                }
            };

            fs.writeJsonSync(recipesPath, defaultRecipes, { spaces: 2 });
        }
    }

    initializeEmptyFiles() {
        const emptyFiles = [
            'players.json',
            'parties.json',
            'trades.json',
            'party_invites.json',
            'market.json',
            'shop.json'
        ];

        emptyFiles.forEach(filename => {
            const filePath = path.join(this.dataPath, filename);
            if (!fs.existsSync(filePath)) {
                fs.writeJsonSync(filePath, {}, { spaces: 2 });
            }
        });
    }
}

module.exports = GameData;