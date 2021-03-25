const Express   = require("express")();
const Http      = require("http").Server(Express);
const SocketIo  = require("socket.io")(Http);
const { Socket } = require("dgram");
const PNG       = require('png-js');

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
            scenario: {
                image: {
                    path: "../assets/map.png",
                    width: 640,
                    height: 640
                }
            }
        };
        
        this.grid_size = this.state.scenario.image.width / this.deltaPosition;


        this.openCollisionMap("assets/map_col.png");
        setInterval(this.intervalUpdatePlayersList, 100, this);
    }


    intervalUpdatePlayersList(gameController){
        var playerList = gameController.state.players;
        SocketIo.emit("serverUpdatePlayerList", {playerList: playerList});
    }

    addPlayer(socket)
    {
        // Randomiza a posição de spawn do player no mapa
        var playerX     = Math.floor(Math.random() * this.state.scenario.image.width / this.deltaPosition) * this.deltaPosition;
        var playerY     = Math.floor(Math.random() * this.state.scenario.image.height / this.deltaPosition) * this.deltaPosition;
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
        var camLimitX       = this.state.scenario.image.height - 20*this.deltaPosition;
        var camLimitY       = this.state.scenario.image.width - 20*this.deltaPosition;
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

        player.cam.y = player.cam.y < camLimitY ? player.cam.y : camLimitY;
        player.cam.x = player.cam.x < camLimitX ? player.cam.x : camLimitX;

        SocketIo.emit("serverUpdatePlayersList", {playerList: this.state.players});
    }

    checkCollision(x, y)
    {
        return false;
    }


    openCollisionMap(filepath)
    {

        var collision_array = new Array(this.grid_size);

        var that = this
        PNG.decode(filepath, function (pixels) {
            for (var i=0; i<that.grid_size; i++)
            {
                var grid_pixels = that.grid_size*4;
                var row_pixels = pixels.slice(grid_pixels*i, grid_pixels*(i+1))
                var new_row = [];
                
                for (var j=0; j<row_pixels.length; j+= 4)
                {
                    if (row_pixels[j] >= 240){
                        row_pixels[j] = 1;
                    }
                    new_row.push(row_pixels[j]);
                }
                collision_array[i] = new_row;
            }
            
            // Aqui funciona, tirando o return
            //console.log(collision_array)
            // return collision_array 
        });

        // Aqui nao funciona
        // console.log(collision_array)
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
