const Express   = require("express")();
const Http      = require("http").Server(Express);
const SocketIo  = require("socket.io")(Http);

var VOCATIONS = {
    KNIGHT:     'knight',
    PALLADIN:   'palladin',
    SORCERER:   'sorcerer',
    DRUID:      'druid'
};

var ITEM_TYPE = {
    EQUIPMENT:      'equipment',
    WEAPON:         'weapon',
    CONSUMABLE:     'consumable',
    QUEST:          'quest',
    MATERIAL:       'material'
}

var WEAPON_TYPE = {
    AXE:        'axe',
    CLUB:       'club',
    SWORD:      'sword',
    ROD:        'rod',
    WAND:       'wand',
    DISTANCE:   'distance',
}

var EQUIP_SLOTS = {
    HEAD:       'head',
    CHEST:      'chest',
    LEGS:       'legs',
    BOOTS:      'boots',
    SHIELD:     'shield'
}

class Item{
    constructor(name, type, image){
        this.name   = name;
        this.image  = image;
        this.type   = type;
    }
}

class EquipItem extends Item{
    constructor(name, type, armor, slot, image){
        super(name, type, image);
        this.slot   = slot;
        this.armor  = armor;
    }
}

class WeaponItem extends Item{
    constructor(name, type, weaponType, attack, deffense, twoHands, image){
        super(name, type, image);
        this.weaponType = weaponType;
        this.twoHands   = twoHands;
        this.attack     = attack;
        this.deffense   = deffense;
    }
}

class Player{
    constructor(name){
        // Object info
        //this.socket     = socket;

        // Player info
        this.name                   = name;
        this.level                  = 0;
        this.experience             = 0;
        this.experienceNextLevel    = 0;
        this.vocation               = VOCATIONS.KNIGHT;

        // Mana & Health
        this.health = [150, 150];
        this.mana   = [55, 55];

        // Attributes
        this.attributes = {
            fist:       4,
            club:       4,
            sword:      4,
            axe:        4,
            distance:   4,
            magic:      1,
            shielding:  4
        };

        // Inventory & Equipment
        this.equipments = {
            head:       null,
            chest:      null,
            legs:       null,
            feet:       null,
            rightHand:  null,
            leftHand:   null
        };
        this.inventory  = [];
        this.capacity   = 400;

        // Status
        this.debuffs = [];
        this.healthRegen = 2;

        // Calcula os atributos a partir da vocação
        this.levelUp();
    }

    // Add experience
    addExperience(experienceAdded){
        this.experience += experienceAdded;
        if(this.experience >= this.experienceNextLevel){
            this.experience -= this.experienceNextLevel;
            this.levelUp();
        }
    }

    updateStatus(){
        this.health[0] += this.healthRegen;
    }

    // Calculate Attributes
    updateAtributes(){
        let newHealth   = 0;
        let newMana     = 0;
        switch(this.vocation){
            case VOCATIONS.KNIGHT:
                newHealth   = ((this.level - 8) * 15) + 185;
                newMana     = (this.level * 5)  + 50;
                this.capacity   = ((this.level - 8) * 25) + 470;
                break;
            case VOCATIONS.PALLADIN:
                newHealth   = ((this.level - 8) * 10) + 185;
                newMana     = ((this.level - 8) * 15) + 90;
                this.capacity   = ((this.level - 8) * 20) + 470;
                break;
            case VOCATIONS.SORCERER:
                newHealth   = (this.level * 5) + 145;
                newMana     = (this.level - 8) * 30 + 90;
                this.capacity   = (this.level * 10) + 400;
                break;
            case VOCATIONS.DRUID:
                newHealth   = (this.level * 5) + 145;
                newMana     = (this.level - 8) * 30 + 90;
                this.capacity   = (this.level * 10) + 400;
                break;
        }
        this.health = [newHealth, newHealth];
        this.mana   = [newMana, newMana];
    }

    // Level up
    levelUp(){
        this.level += 1;
        this.experienceNextLevel = 50*(Math.pow(this.level, 2)) - 150*this.level + 200;
        this.updateAtributes();
    }

    // Return player damage
    getAttack(){
        if(this.equipments.rightHand != null){
            let weaponType  = this.equipments.rightHand.weaponType;
            let weaponSkill = 0;
            switch(weaponType){
                case WEAPON_TYPE.AXE:       weaponSkill = this.attributes.axe;      break;
                case WEAPON_TYPE.CLUB:      weaponSkill = this.attributes.club;     break;
                case WEAPON_TYPE.SWORD:     weaponSkill = this.attributes.sword;    break;
                case WEAPON_TYPE.ROD:       weaponSkill = this.attributes.magic;    break;
                case WEAPON_TYPE.WAND:      weaponSkill = this.attributes.magic;    break;
                case WEAPON_TYPE.DISTANCE:  weaponSkill = this.attributes.distance; break;
            }
            if(weaponType == 'axe' || weaponType == 'sword' || weaponType == 'club'){   // Dano corpo a corpo
                let weaponAttack = this.equipments.rightHand.attack;
                return (0.085*weaponAttack*weaponSkill) + (this.level/5);
            }else if(weaponType == 'rod' || weaponType == 'wand'){                      // Dano mágico
                let weaponModifier = this.equipments.rightHand.attack;
                return ((2/3)*(weaponSkill+weaponModifier)) + (this.level/5) + (50/3);
            }else if(weaponType == 'distance'){                                         // Dano a distância
                let weaponAttack    = this.equipments.rightHand.attack;
                let minDamage       = this.level/5;
                let bonusDamage     = (0.09*weaponAttack*weaponSkill);
                return minDamage + (Math.random()*bonusDamage);
            }
        }else{
            return (0.085*this.attributes.fist) + (this.level/5);
        }
    }

    addDamage(damageValue){
        this.health[0] -= damageValue;
        return this.health[0] <= 0;
    }
}

class Enemy{
    constructor(name, health, experience, damageRange, dropTable, image){
        this.name = name;
        this.image = image;
        this.health = [health, health];
        this.experience = experience;
        this.damageRange = damageRange;
        this.dropTable = dropTable;
    }

    addDamage(damageValue){
        this.health[0] -= damageValue;
        return this.health[0] <= 0;
    }

    getAttack(){
        return this.damageRange[0] + Math.random()*this.damageRange[1];
    }

    generateDrop(){
        let drop = [];
        for(let item of this.dropTable){
            let diced = Math.random();
            if(Math.random() <= item[1]){
                drop.push(item[0]);
            }
        }
        return drop;
    }
}

var itemList = [
    // Leather set
    new EquipItem('Leather Helmet', ITEM_TYPE.EQUIPMENT,    1,    EQUIP_SLOTS.HEAD,   '2/29/Leather_Helmet.gif'),
    new EquipItem('Leather Armor',  ITEM_TYPE.EQUIPMENT,    4,    EQUIP_SLOTS.CHEST,  '0/0d/Leather_Armor.gif'),
    new EquipItem('Leather Legs',   ITEM_TYPE.EQUIPMENT,    1,    EQUIP_SLOTS.LEGS,   '0/07/Leather_Legs.gif'),
    new EquipItem('Leather Boots',  ITEM_TYPE.EQUIPMENT,    1,    EQUIP_SLOTS.BOOTS,  '9/94/Leather_Boots.gif'),
    // Swords
    new WeaponItem('Jagged Sword',  ITEM_TYPE.WEAPON,   WEAPON_TYPE.SWORD,  21, 4,  false,  'd/dd/Jagged_Sword.gif'),
    // Consumables
    new Item('Cheese', ITEM_TYPE.CONSUMABLE, '6/6a/Cheese.gif'),
];

var dropTableList = {
    troll: [
        [itemList[0], 0.5],
        [itemList[1], 0.4],
        [itemList[2], 0.3],
        [itemList[3], 0.2],
        [itemList[4], 0.2],
    ],
    rat: [
        [itemList[5], 0.2]
    ]
}

var playerStructure = {
    // Player info
    name                   : 'playername',
    level                  : 0,
    experience             : 0,
    experienceNextLevel    : 0,
    vocation               : VOCATIONS.KNIGHT,
    // Mana & Health
    health:         [150, 150],
    mana:           [55, 55],
    // Attributes
    attributes : {
        fist:       4,
        club:       4,
        sword:      4,
        axe:        4,
        distance:   4,
        magic:      1,
        shielding:  4
    },
    // Inventory & Equipment
    equipments : {
        head:       null,
        chest:      null,
        legs:       null,
        feet:       null,
        rightHand:  null,
        leftHand:   null
    },
    inventory:      [],
    capacity:       400,
    // Status
    debuffs:        [],
    healthRegen:    2
}

class PlayerController{
    addExperience(player, experienceAdded){
        player.experience += experienceAdded;
        if(player.experience >= player.experienceNextLevel){
            player.experience -= player.experienceNextLevel;
            player.levelUp();
        }
    }

    updateStatus(player){
        player.health[0] += player.healthRegen;
    }

    updateAtributes(player){
        let newHealth   = 0;
        let newMana     = 0;
        switch(player.vocation){
            case VOCATIONS.KNIGHT:
                newHealth   = ((player.level - 8) * 15) + 185;
                newMana     = (player.level * 5)  + 50;
                player.capacity   = ((player.level - 8) * 25) + 470;
                break;
            case VOCATIONS.PALLADIN:
                newHealth   = ((player.level - 8) * 10) + 185;
                newMana     = ((player.level - 8) * 15) + 90;
                player.capacity   = ((player.level - 8) * 20) + 470;
                break;
            case VOCATIONS.SORCERER:
                newHealth   = (player.level * 5) + 145;
                newMana     = (player.level - 8) * 30 + 90;
                player.capacity   = (player.level * 10) + 400;
                break;
            case VOCATIONS.DRUID:
                newHealth   = (player.level * 5) + 145;
                newMana     = (player.level - 8) * 30 + 90;
                player.capacity   = (player.level * 10) + 400;
                break;
        }
        player.health = [newHealth, newHealth];
        player.mana   = [newMana, newMana];
    }

    levelUp(player){
        player.level += 1;
        player.experienceNextLevel = 50*(Math.pow(player.level, 2)) - 150*player.level + 200;
        player.updateAtributes();
    }

    getAttack(player){
        if(player.equipments.rightHand != null){
            let weaponType  = player.equipments.rightHand.weaponType;
            let weaponSkill = 0;
            switch(weaponType){
                case WEAPON_TYPE.AXE:       weaponSkill = player.attributes.axe;      break;
                case WEAPON_TYPE.CLUB:      weaponSkill = player.attributes.club;     break;
                case WEAPON_TYPE.SWORD:     weaponSkill = player.attributes.sword;    break;
                case WEAPON_TYPE.ROD:       weaponSkill = player.attributes.magic;    break;
                case WEAPON_TYPE.WAND:      weaponSkill = player.attributes.magic;    break;
                case WEAPON_TYPE.DISTANCE:  weaponSkill = player.attributes.distance; break;
            }
            if(weaponType == 'axe' || weaponType == 'sword' || weaponType == 'club'){   // Dano corpo a corpo
                let weaponAttack = player.equipments.rightHand.attack;
                return (0.085*weaponAttack*weaponSkill) + (player.level/5);
            }else if(weaponType == 'rod' || weaponType == 'wand'){                      // Dano mágico
                let weaponModifier = player.equipments.rightHand.attack;
                return ((2/3)*(weaponSkill+weaponModifier)) + (player.level/5) + (50/3);
            }else if(weaponType == 'distance'){                                         // Dano a distância
                let weaponAttack    = player.equipments.rightHand.attack;
                let minDamage       = player.level/5;
                let bonusDamage     = (0.09*weaponAttack*weaponSkill);
                return minDamage + (Math.random()*bonusDamage);
            }
        }else{
            return (0.085*player.attributes.fist) + (player.level/5);
        }
    }

    addDamage(player, damageValue){
        player.health[0] -= damageValue;
        return player.health[0] <= 0;
    }
}

playerController = new PlayerController();

var testPlayer = JSON.parse(JSON.stringify(playerStructure));
playerController.addDamage(testPlayer, 30);
console.log(testPlayer.health);

/*
var enemyList = [
    new Enemy('Rat',    20, 5,  [0,8], dropTableList.troll,  'a/af/Rat.gif'),
    new Enemy('Troll',  50, 20, [0,24], dropTableList.rat,  '1/11/Troll.gif'),
]*/

//COMO EU FIZ novo_inimigo = new Enemy(enemyList[0][0], enemyList[0][1], enemyList[0][2], ...)
var enemyList = [
    ['Rat',    1, 5,  [0,8], dropTableList.rat,  'a/af/Rat.gif'],
    ['Troll',  50, 20, [0,24], dropTableList.troll,  '1/11/Troll.gif'],
]

var player = new Player('Iago');

var enemy = new Enemy(enemyList[0][0], enemyList[0][1], enemyList[0][2], enemyList[0][3], enemyList[0][4], enemyList[0][5], enemyList[0][6]);

var globalTurns = 0;

function executeTurn(){
    globalTurns += 1;

    player.updateStatus();

    var playerAttack = player.getAttack();
    if(enemy.addDamage(playerAttack)){
        player.addExperience(enemy.experience);
        var drop = enemy.generateDrop();
        for(let item of drop){
            player.inventory.push(item);
        }
        console.log(player.inventory);
        enemy = new Enemy(enemyList[0][0], enemyList[0][1], enemyList[0][2], enemyList[0][3], enemyList[0][4], enemyList[0][5], enemyList[0][6]);
    }

    var enemyAttack = enemy.getAttack();
    player.addDamage(enemyAttack);


    SocketIo.emit("update", { globalTurns: globalTurns, player: player, enemy: enemy });
}

setInterval(executeTurn, 1000)

Http.listen(3000, () => {
    console.log("Listening at :3000...");
});

SocketIo.on("connection", socket => {
    console.log("socket connected");
    
    socket.emit("update", globalTurns, player, enemy);

    socket.on("actionAddNewItem", data => {
        var random = Math.floor(Math.random() * itemList.length);
        player.inventory.push(itemList[random]);
        SocketIo.emit("update", { globalTurns: globalTurns, player: player, enemy: enemy });
    });
});
