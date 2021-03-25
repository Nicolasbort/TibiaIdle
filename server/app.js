const Express       = require("express")();
const Http          = require("http").Server(Express);
const SocketIo      = require("socket.io")(Http);
const Fs            = require('fs');
const JPEG          = require('jpeg-js');

class GameRules
{
    constructor()
    {
        this.tile_size = 16; // Pixels

        this.camera = {
            width: 320,
            height: 320
        }
    }
}


class Game
{
    constructor()
    {
        // Regras base do jogo
        this.gameRules = new GameRules();

        this.deltaPosition = this.gameRules.tile_size;
        this.screen = this.gameRules.camera;

        // Estado do jogo.
        // Contem as informacoes necessarias pra inicar o canvas no client
        this.state = {
            players: {},
            enemies: {},
            scenario: {
                image: {
                    path: "../assets/map.png",
                    width: 640,
                    height: 640
                },
                collisionGrid: []
            },
        };

        this.gridSize = this.state.scenario.image.width / this.deltaPosition;


        this.loadCollisionMap("assets/map_col.jpeg");
        setInterval(this.intervalUpdatePlayersList, 0.5, this);
    }


    intervalUpdatePlayersList(that){
        SocketIo.emit("serverUpdate", {playerList: that.state.players, collisionGrid: that.state.scenario.collisionGrid});
    }

    addPlayer(socket)
    {
        // Randomiza a posição de spawn do player no mapa
        var playerX     = Math.floor(Math.random() * this.state.scenario.image.width / this.deltaPosition) * this.deltaPosition;
        var playerY     = Math.floor(Math.random() * this.state.scenario.image.height / this.deltaPosition) * this.deltaPosition;

        // Reinicializa a posicao enquanto o spawn estiver em colisao com o mapa
        while (this.checkCollision(playerX, playerY)){
            console.log("Spawn collision!")
            playerX     = Math.floor(Math.random() * this.state.scenario.image.width / this.deltaPosition) * this.deltaPosition;
            playerY     = Math.floor(Math.random() * this.state.scenario.image.height / this.deltaPosition) * this.deltaPosition;
        }

        var camPlayerX  = playerX - this.screen.width/2;
        var camPlayerY  = playerY - this.screen.height/2;

        // Adiciona o player no state do jogo
        this.state.players[socket.id] = {
            x:      playerX,
            y:      playerY,
            sprite: Math.floor(Math.random()*2),
            cam: {
                x:  camPlayerX,
                y:  camPlayerY
            }
        }
    }

    removePlayer(socket) {
        delete this.state.players[socket.id];
    }

    movePlayer(socket, keyPressed) 
    {
        var player          = this.state.players[socket.id];
        var camDifferenceX  = Math.abs(player.x - player.cam.x)/this.deltaPosition;
        var camDifferenceY  = Math.abs(player.y - player.cam.y)/this.deltaPosition;
    
        switch(keyPressed){
            case "w":
            case "ArrowUp":
                if(!this.checkCollision(player.x, player.y - this.deltaPosition)){
                    player.y        -= this.deltaPosition;
                    player.cam.y    -= camDifferenceY == 10 ? this.deltaPosition : 0;
                }
                break;
            case "s":
            case "ArrowDown":
                if(!this.checkCollision(player.x, player.y + this.deltaPosition)){
                    player.y        += this.deltaPosition;
                    player.cam.y    += camDifferenceY == 10 ? this.deltaPosition : 0;
                }
                break;
            case "a":
            case "ArrowLeft":
                if(!this.checkCollision(player.x - this.deltaPosition, player.y)){
                    player.x        -= this.deltaPosition;
                    player.cam.x    -= camDifferenceX == 10 ? this.deltaPosition : 0;
                }
                break;
            case "d":
            case "ArrowRight":
                if(!this.checkCollision(player.x + this.deltaPosition, player.y)){
                    player.x        += this.deltaPosition;
                    player.cam.x    += camDifferenceX == 10 ? this.deltaPosition : 0;
                }
                break;
            default:
                console.log('Unknow key: '+keyPressed);
            break;
        }

        player.cam.y = player.cam.y > 0 ? player.cam.y : 0;
        player.cam.x = player.cam.x > 0 ? player.cam.x : 0;

        player.cam.y = player.cam.y < this.state.scenario.image.height/2 ? player.cam.y : this.state.scenario.image.height/2;
        player.cam.x = player.cam.x < this.state.scenario.image.width/2 ? player.cam.x : this.state.scenario.image.width/2;
    }

    checkCollision(x, y)
    {
        return this.state.collisionGrid? this.state.collisionGrid[Math.round(y/16)][Math.round(x/16)] : 0
    }

    loadCollisionMap(filepath){
        this.state.collisionGrid    = [];
        var jpegDecoded             = JPEG.decode(Fs.readFileSync(filepath));
        var pixels                  = [...jpegDecoded.data];
        var row                     = [];
        var rowSize                 = this.gridSize;
        for(var i = 0; i < pixels.length; i+= 4){
            row.push(pixels[i] > 240 ? 0 : 1);
            if(row.length >= rowSize){
                this.state.collisionGrid.push(row);
                row = [];
            }
        }
    }

    saveCollisionMap(filepath)
    {
        var fs = require('fs');

        var file = fs.createWriteStream(filepath);

        file.on('error', function (err) { 
            console.log(err); 
            return false;
        });

        this.collision_array.forEach(function (v) { 
            file.write(v + '\n'); 
        })

        file.end();
    }
}

const game = new Game();

SocketIo.on("connection", socket => {

    game.addPlayer(socket)
    console.log(`> Player connected to server: ${socket.id}`)

    socket.on('disconnect', () => {
        console.log(`> Player disconnected: ${socket.id}`)
        game.removePlayer(socket)
        socket.disconnect()
    })

    socket.on('clientKeyPressed', (keyPressed) => {        
        game.movePlayer(socket, keyPressed)
    })
});


Http.listen(3000, () => {
    console.log("Listening at :3000...");
});
