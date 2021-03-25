const Express       = require("express")();
const Http          = require("http").Server(Express);
const SocketIo      = require("socket.io")(Http);
const Fs            = require('fs');
const JPEG          = require('jpeg-js');


const GameRules = {
    tileSize: 16,
    camera: {
        width: 320,
        height: 320
    },
    amountSpritesPlayer: 3,
    amountSpritesEnemy: 4
}


var Game = {
    state: {
        players: {},
        enemies: {},
        countEnemies: 0,
        scenario: {
            image: {
                path: "../assets/map.png",
                width: 640,
                height: 640
            },
            collisionGrid: []
        }
    },
    gridSize: 0
}

Game.gridSize = Game.state.scenario.image.width / GameRules.tileSize


function checkCollision(x, y)
{
    // console.log(Game.state.scenario.collisionGrid[Math.round(y/16)][Math.round(x/16)])
    return Game.state.scenario.collisionGrid[Math.round(y/16)][Math.round(x/16)]
}


function addPlayer(socket)
{
    console.log(`Server: Adding player ${socket.id}`)

    // Randomiza a posição de spawn do player no mapa
    var playerX = Math.floor(Math.random() * Game.state.scenario.image.width / GameRules.tileSize) * GameRules.tileSize;
    var playerY = Math.floor(Math.random() * Game.state.scenario.image.height / GameRules.tileSize) * GameRules.tileSize;

    // Reinicializa a posicao enquanto o spawn estiver em colisao com o mapa
    while (checkCollision(playerX, playerY)){
        playerX = Math.floor(Math.random() * Game.state.scenario.image.width / GameRules.tileSize) * GameRules.tileSize;
        playerY = Math.floor(Math.random() * Game.state.scenario.image.height / GameRules.tileSize) * GameRules.tileSize;
        console.log(`Server: Spawn Collision! Checking position ${playerX}, ${playerY}`);
    }

    console.log(`Server: Player added. Position: ${playerX}, ${playerY}`)

    var camPlayerX = playerX - GameRules.camera.width/2;
    var camPlayerY = playerY - GameRules.camera.height/2;

    Game.state.players[socket.id] = {
        position: {
            x: playerX,
            y: playerY
        },
        cam: {
            x: camPlayerX,
            y: camPlayerY
        },
        sprite: Math.floor(Math.random() * GameRules.amountSpritesPlayer),
    }
    console.log(`Server: Camera Position ${camPlayerX}, ${camPlayerY}`)
}

function removePlayer(socket)
{
    console.log(`Server: Removing player ${socket.id}`)

    delete Game.state.players[socket.id]
}

function movePlayer(socket, keyPressed) 
{
    console.log(`Server: KeyPressed ${keyPressed}`)

    var player          = Game.state.players[socket.id];
    var camDifferenceX  = Math.abs(player.position.x - player.cam.x)/ GameRules.tileSize;
    var camDifferenceY  = Math.abs(player.position.y - player.cam.y)/ GameRules.tileSize;

    console.log(`Server: Current Player ${player.position.x}, ${player.position.y}`)

    switch(keyPressed){
        case "w":
        case "ArrowUp":
            if(!checkCollision(player.position.x, player.position.y - GameRules.tileSize)){
                player.position.y   -= GameRules.tileSize;
                player.cam.y        -= camDifferenceY == 10 ? GameRules.tileSize : 0;
            }
            break;
        case "s":
        case "ArrowDown":
            if(!checkCollision(player.position.x, player.position.y + GameRules.tileSize)){
                player.position.y   += GameRules.tileSize;
                player.cam.y        += camDifferenceY == 10 ? GameRules.tileSize : 0;
            }
            break;
        case "a":
        case "ArrowLeft":
            if(!checkCollision(player.position.x - GameRules.tileSize, player.position.y)){
                player.position.x   -= GameRules.tileSize;
                player.cam.x        -= camDifferenceX == 10 ? GameRules.tileSize : 0;
            }
            break;
        case "d":
        case "ArrowRight":
            if(!checkCollision(player.position.x + GameRules.tileSize, player.position.y)){
                player.position.x   += GameRules.tileSize;
                player.cam.x        += camDifferenceX == 10 ? GameRules.tileSize : 0;
            }
            break;
        default:
            console.log(`Server: Unkown key: ${keyPressed}`);
        break;
    }

    console.log(`Server: After Player ${player.position.x}, ${player.position.y}`)

    player.cam.y = player.cam.y > 0 ? player.cam.y : 0;
    player.cam.x = player.cam.x > 0 ? player.cam.x : 0;

    player.cam.y = player.cam.y < Game.state.scenario.image.height/2 ? player.cam.y : Game.state.scenario.image.height/2;
    player.cam.x = player.cam.x < Game.state.scenario.image.width/2 ? player.cam.x : Game.state.scenario.image.width/2;
}


function loadScenario(pathCollisionMap)
{
    console.log(`Server: Loading scenario`)

    var jpegDecoded    = JPEG.decode(Fs.readFileSync(pathCollisionMap));
    var pixels         = [...jpegDecoded.data];
    var row            = [];
    var rowSize        = Game.gridSize;

    for(var i = 0; i < pixels.length; i+= 4){
        row.push(pixels[i] > 240 ? 0 : 1);
        if(row.length >= rowSize){
            Game.state.scenario.collisionGrid.push(row);
            row = [];
        }
    }
}


function sendGameState()
{
    SocketIo.emit("serverUpdate", {playerList: Game.state.players, enemyList: Game.state.enemies});
}

// class Game
// {
//     constructor()
//     {
//         this.deltaPosition = GameRules.tileSize;
//         this.screen = GameRules.camera;

//         // Estado do jogo.
//         // Contem as informacoes necessarias pra inicar o canvas no client
//         this.state = {
//             players: {},
//             enemies: {},
//             countEnemies: 0,
//             scenario: {
//                 image: {
//                     path: "../assets/map.png",
//                     width: 640,
//                     height: 640
//                 },
//                 collisionGrid: []
//             },
//         };

//         this.gridSize = this.state.scenario.image.width / this.deltaPosition;


//         this.loadCollisionMap("assets/map_col.jpeg");
//         setInterval(this.intervalUpdatePlayersList, 0.5, this);
//     }


//     intervalUpdatePlayersList(that){
//         SocketIo.emit("serverUpdate", {playerList: that.state.players, enemyList: that.state.enemies});
//     }

//     addPlayer(socket)
//     {
//         // Randomiza a posição de spawn do player no mapa
//         var playerX     = Math.floor(Math.random() * this.state.scenario.image.width / this.deltaPosition) * this.deltaPosition;
//         var playerY     = Math.floor(Math.random() * this.state.scenario.image.height / this.deltaPosition) * this.deltaPosition;

//         // Reinicializa a posicao enquanto o spawn estiver em colisao com o mapa
//         while (this.checkCollision(playerX, playerY)){
//             console.log("Spawn collision!")
//             playerX     = Math.floor(Math.random() * this.state.scenario.image.width / this.deltaPosition) * this.deltaPosition;
//             playerY     = Math.floor(Math.random() * this.state.scenario.image.height / this.deltaPosition) * this.deltaPosition;
//         }

//         var camPlayerX  = playerX - this.screen.width/2;
//         var camPlayerY  = playerY - this.screen.height/2;

//         // Adiciona o player no state do jogo
//         this.state.players[socket.id] = {
//             x:      playerX,
//             y:      playerY,
//             sprite: Math.floor(Math.random()*3),
//             cam: {
//                 x:  camPlayerX,
//                 y:  camPlayerY
//             }
//         }
//     }

//     removePlayer(socket) {
//         delete this.state.players[socket.id];
//     }

//     movePlayer(socket, keyPressed) 
//     {
//         var player          = this.state.players[socket.id];
//         var camDifferenceX  = Math.abs(player.x - player.cam.x)/this.deltaPosition;
//         var camDifferenceY  = Math.abs(player.y - player.cam.y)/this.deltaPosition;
    
//         switch(keyPressed){
//             case "w":
//             case "ArrowUp":
//                 if(!this.checkCollision(player.x, player.y - this.deltaPosition)){
//                     player.y        -= this.deltaPosition;
//                     player.cam.y    -= camDifferenceY == 10 ? this.deltaPosition : 0;
//                 }
//                 break;
//             case "s":
//             case "ArrowDown":
//                 if(!this.checkCollision(player.x, player.y + this.deltaPosition)){
//                     player.y        += this.deltaPosition;
//                     player.cam.y    += camDifferenceY == 10 ? this.deltaPosition : 0;
//                 }
//                 break;
//             case "a":
//             case "ArrowLeft":
//                 if(!this.checkCollision(player.x - this.deltaPosition, player.y)){
//                     player.x        -= this.deltaPosition;
//                     player.cam.x    -= camDifferenceX == 10 ? this.deltaPosition : 0;
//                 }
//                 break;
//             case "d":
//             case "ArrowRight":
//                 if(!this.checkCollision(player.x + this.deltaPosition, player.y)){
//                     player.x        += this.deltaPosition;
//                     player.cam.x    += camDifferenceX == 10 ? this.deltaPosition : 0;
//                 }
//                 break;
//             default:
//                 console.log('Unknow key: '+keyPressed);
//             break;
//         }

//         player.cam.y = player.cam.y > 0 ? player.cam.y : 0;
//         player.cam.x = player.cam.x > 0 ? player.cam.x : 0;

//         player.cam.y = player.cam.y < this.state.scenario.image.height/2 ? player.cam.y : this.state.scenario.image.height/2;
//         player.cam.x = player.cam.x < this.state.scenario.image.width/2 ? player.cam.x : this.state.scenario.image.width/2;
//     }


//     addEnemy()
//     {
//         // Randomiza a posição de spawn do player no mapa
//         var enemyX  = Math.floor(Math.random() * this.state.scenario.image.width / this.deltaPosition) * this.deltaPosition;
//         var enemyY  = Math.floor(Math.random() * this.state.scenario.image.height / this.deltaPosition) * this.deltaPosition;

//         // Reinicializa a posicao enquanto o spawn estiver em colisao com o mapa
//         while (this.checkCollision(enemyX, enemyY)){
//             console.log("Enemy Spawn Collision!")
//             enemyX   = Math.floor(Math.random() * this.state.scenario.image.width / this.deltaPosition) * this.deltaPosition;
//             enemyY   = Math.floor(Math.random() * this.state.scenario.image.height / this.deltaPosition) * this.deltaPosition;
//         }

//         console.log("Enemy Position: ", enemyX, enemyY);

//         // Adiciona o player no state do jogo
//         this.state.enemies[this.state.countEnemies] = {
//             x:      enemyX,
//             y:      enemyY,
//             sprite: Math.floor(Math.random()*4),
//         }
//         this.state.countEnemies += 1
        
//         this.setCollisionMapValue(enemyX, enemyY, 1);
//     }


//     checkCollision(x, y)
//     {
//         return this.state.collisionGrid? this.state.collisionGrid[Math.round(y/16)][Math.round(x/16)] : 0
//     }

//     setCollisionMapValue(x, y, value)
//     {
//         this.state.collisionGrid[Math.round(y/16)][Math.round(x/16)] = value
//     }

//     loadCollisionMap(filepath){
//         this.state.collisionGrid    = [];
//         var jpegDecoded             = JPEG.decode(Fs.readFileSync(filepath));
//         var pixels                  = [...jpegDecoded.data];
//         var row                     = [];
//         var rowSize                 = this.gridSize;
//         for(var i = 0; i < pixels.length; i+= 4){
//             row.push(pixels[i] > 240 ? 0 : 1);
//             if(row.length >= rowSize){
//                 this.state.collisionGrid.push(row);
//                 row = [];
//             }
//         }
//     }

//     saveCollisionMap(filepath)
//     {
//         var fs = require('fs');

//         var file = fs.createWriteStream(filepath);

//         file.on('error', function (err) { 
//             console.log(err); 
//             return false;
//         });

//         this.collision_array.forEach(function (v) { 
//             file.write(v + '\n'); 
//         })

//         file.end();
//     }
// }

setInterval(sendGameState, 100);

SocketIo.on("connection", socket => 
{
    console.log(`Server: Player connected to server: ${socket.id}`)

    loadScenario("assets/map_col.jpeg");

    // checkCollision("130", "130");

    addPlayer(socket);


    socket.on('disconnect', () => {
        console.log(`Server: Player disconnected: ${socket.id}`)
        removePlayer(socket);
        socket.disconnect()
    })

    socket.on('clientKeyPressed', (keyPressed) => {    
        movePlayer(socket, keyPressed);    
    })
});


Http.listen(3000, () => {
    console.log("Server: Listening at: 3000...");
});
