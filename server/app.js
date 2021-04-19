const Express       = require("express")();
const Http          = require("http").Server(Express);
const SocketIo      = require("socket.io")(Http);
const Fs            = require('fs');
const JPEG          = require('jpeg-js');
var pf              = require('pathfinding')


function createGame()
{
    return {
        tileSize: 16,
        gridSize: 0,
        camera: {
            width: 320,
            height: 320
        },
        amountSpritesPlayer: 3,
        amountSpritesEnemy:  4,

        state: {

            socketPlayers: {},
            players: {},

            enemies: {},
            countEnemies: 0,  // Used to manage enemies id

            maps: {

                0: {
                    name: "main",
                    scenario: {
                        image: {
                            path: "../assets/map.png",
                            width: 640,
                            height: 640
                        },
                        collisionGrid: [],
                    }
                },

                1: {
                    name: "secondary",
                    scenario: {
                        image: {
                            path: "../assets/map.png",
                            width: 1248,
                            height: 1248
                        },
                        collisionGrid: [],
                    }
                },

            }
        },

        checkCollision(mapId, x, y) {
            if (this.state.maps[mapId].scenario.collisionGrid.length <= 0)
                return false;

            return this.state.maps[mapId].scenario.collisionGrid[Math.round( y / this.tileSize )][Math.round( x / this.tileSize )];
        },

        addPlayer(socket, mapId) {

            if (!this.state.maps[mapId])
            {
                console.log(`> Server: MapId ${mapId} não existe`);
                return;
            }

            let playerPosition = this.randomizePosition(mapId);
            let playerCamera = this.calculatePlayerCamera(mapId, playerPosition.x, playerPosition.y);

            console.log(`> Server: Player added. Position: ${playerPosition.x}, ${playerPosition.y}`)

            this.state.players[socket.id] = {
                mapId:    mapId,
                position: playerPosition,
                cam:      playerCamera,
                sprite:   Math.floor(Math.random() * this.amountSpritesPlayer),
            },

            this.state.socketPlayers[socket.id] = socket;

            this.notifyPlayersByMap(mapId, {
                event:     "ADD_PLAYER",
                playerId:  socket.id,
                player:    this.state.players[socket.id]
            })
        },

        removePlayer(socket) {
            console.log(`> Server: Removing player ${socket.id}`)

            let mapId = this.state.players[socket.id].mapId
            
            this.notifyPlayersByMap(mapId, {
                event:     "REMOVE_PLAYER",
                playerId:  socket.id
            })

            delete this.state.players[socket.id];
            delete this.state.socketPlayers[socket.id];
        },

        movePlayer(socket, keyPressed) {
            console.log(`Server: KeyPressed ${keyPressed}`)

            var player          = this.state.players[socket.id];
            let mapId           = player.mapId;

            switch(keyPressed){
                case "w":
                case "ArrowUp":

                    if(!this.checkCollision(mapId, player.position.x, player.position.y - this.tileSize))
                        player.position.y   -= this.tileSize;
                    
                    break;
                case "s":
                case "ArrowDown":

                    if(!this.checkCollision(mapId, player.position.x, player.position.y + this.tileSize))
                        player.position.y   += this.tileSize;

                    break;
                case "a":
                case "ArrowLeft":

                    if(!this.checkCollision(mapId, player.position.x - this.tileSize, player.position.y))
                        player.position.x   -= this.tileSize;

                    break;
                case "d":
                case "ArrowRight":

                    if(!this.checkCollision(mapId, player.position.x + this.tileSize, player.position.y))
                        player.position.x   += this.tileSize;

                    break;
                default:
                    console.log(`> Server: Unknown key: ${keyPressed}`);
                break;
            }

            player.cam = this.calculatePlayerCamera(mapId, player.position.x, player.position.y);

            this.notifyAllPlayers({
                event:    "PLAYER_MOVE",
                playerId: socket.id,
                position: player.position,
                camera:   player.cam
            })
        },

        addEnemy(mapId){

            let enemyPosition = this.randomizePosition(mapId);

            console.log(`Enemy Position: ${enemyPosition.x}, ${enemyPosition.y}`);

            // Adiciona o player no state do jogo
            this.state.enemies[this.state.countEnemies] = {
                position: enemyPosition,
                sprite: Math.floor(Math.random() * this.amountSpritesEnemy),
            }
            
            this.setCollisionMapValue(mapId, enemyPosition.x, enemyPosition.y, 1);

            this.notifyPlayersByMap(mapId, {
                event:    "ADD_ENEMY",
                enemyId:  this.state.countEnemies,
                enemy:    this.state.enemies[this.state.countEnemies]
            })

            this.state.countEnemies += 1
        },

        removeEnemy(enemyId) {
                        
            this.notifyPlayersByMap(mapId, {
                event:     "REMOVE_ENEMY",
                enemyId:   enemyId.id
            })

            delete this.state.enemies[enemyId]
        },

        notifyAllPlayers(command) {
            SocketIo.emit(command.event, command);
        },

        notifyPlayersByMap(mapId, command) {
            var that = this
            for( const [id, player] of Object.entries(this.state.players)){
                if (that.state.socketPlayers && player.mapId == mapId)
                    that.state.socketPlayers[id].emit(command.event, command);
            }
        },

        notifyPlayer(socket, command) {
            socket.emit(command.event, command);
        },

        showState() {
            console.table(this.state)
        },

        showPlayers() {
            console.log(`\n> Server: Players:\n`);
            console.table(this.state.players)
        },

        showEnemies() {
            console.log(`\n> Server: Enemies:\n`);
            console.table(this.state.enemies)
        },

        randomizePosition(mapId) {
            // Randomiza a posição de spawn do player no mapa
            var posX  = Math.floor(Math.random() * this.state.maps[mapId].scenario.image.width / this.tileSize) * this.tileSize;
            var posY  = Math.floor(Math.random() * this.state.maps[mapId].scenario.image.height / this.tileSize) * this.tileSize;

            // Reinicializa a posicao enquanto o spawn estiver em colisao com o mapa
            while (this.checkCollision(mapId, posX, posY)){
                console.log(`Server: Collision`)
                posX   = Math.floor(Math.random() * this.state.maps[mapId].scenario.image.width / this.tileSize) * this.tileSize;
                posY   = Math.floor(Math.random() * this.state.maps[mapId].scenario.image.height / this.tileSize) * this.tileSize;
            }

            return {x: posX, y: posY};
        },

        calculatePlayerCamera(mapId, playerX, playerY) {
            let camX = playerX - this.camera.width/2;
            let camY = playerY - this.camera.height/2;
        
            camX = camX < 0 ? 0 : camX;
            camY = camY < 0 ? 0 : camY;
        
            camX = camX + this.camera.width > this.state.maps[mapId].scenario.image.width ? this.state.maps[mapId].scenario.image.width - this.camera.width : camX;
            camY = camY + this.camera.height > this.state.maps[mapId].scenario.image.height ? this.state.maps[mapId].scenario.image.height - this.camera.height : camY;

            return {x: camX, y: camY};
        },

        setCollisionMapValue(mapId, x, y, value) {
            if (this.state.maps[mapId].scenario.collisionGrid.length > 0)
                this.state.maps[mapId].scenario.collisionGrid[Math.round( y / this.tileSize )][Math.round( x / this.tileSize )] = value
        },

        loadCollisionMap(mapId, pathCollisionMap)
        {
            console.log(`> Server: Loading Collision Map. MapId: ${mapId}`);

            var jpegDecoded    = JPEG.decode(Fs.readFileSync(pathCollisionMap));
            var pixels         = [...jpegDecoded.data];
            var row            = [];
            var rowSize        = this.gridSize;

            // A pixel equals to (R G B A). Get only R pixel
            for(var i = 0; i < pixels.length; i+= 4)
            {
                row.push(pixels[i] > 235 ? 0 : 1);
                if(row.length >= rowSize){
                    this.state.maps[mapId].scenario.collisionGrid.push(row);
                    row = [];
                }
            }
        },

        saveCollisionMap(mapId, pathToSave)
        {
            var file = Fs.createWriteStream(pathToSave);

            file.on('error', function (err) { 
                console.log(err); 
                return false;
            });

            this.state.maps[mapId].collisionGrid.forEach(function (row) { 
                file.write(row + '\n'); 
            })

            file.end();
        },

        showCollisionMap(mapId) {
            this.state.maps[mapId].scenario.collisionGrid.forEach(row => console.log(row + "\n") )
        },

        startGamePreset(mapId = 0) {
            this.loadCollisionMap(mapId, "assets/map_col.jpeg");

            this.addEnemy(mapId);
            this.addEnemy(mapId);
            this.addEnemy(mapId);
            this.addEnemy(mapId);
        }
    }
}


var Game = createGame();
Game.gridSize = Game.state.maps[0].scenario.image.width / Game.tileSize


Game.startGamePreset(0);

SocketIo.on("connection", socket => 
{
    console.log(`> Server: Player connected to server: ${socket.id}`)

    Game.addPlayer(socket, 0);

    Game.showPlayers();
    Game.showEnemies();


    var {players, enemies} = Game.state;
    socket.emit("GAME_STATE", { players, enemies } );

    socket.on('disconnect', () => {
        console.log(`> Server: Player disconnected: ${socket.id}`)
        Game.removePlayer(socket);
    })


    socket.on("ADMIN_ADD_ENEMY", () => {
        console.log(`> Server: Adding enemy`)
        Game.addEnemy(0);
    })

    socket.on('CLIENT_KEYPRESSED', keyPressed => Game.movePlayer(socket, keyPressed))

});


Http.listen(3000, () => {
    console.log("Server: Listening at: 3000...");
});
