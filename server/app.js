const Express   = require("express")();
const Http      = require("http").Server(Express);
const SocketIo  = require("socket.io")(Http);
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

        

        this.openCollisionMap("assets/map_col.png")
    }

    addPlayer(command)
    {
        console.log("> Adding player ", command.playerId)
        const playerId = command.playerId;

        // Randomiza a posição de spawn do player no mapa
        const playerX = 'playerX' in command ? command.playerX : Math.floor(Math.random() * this.state.scenario.image.width / this.deltaPosition) * this.deltaPosition;
        const playerY = 'playerY' in command ? command.playerY : Math.floor(Math.random() * this.state.scenario.image.height / this.deltaPosition) * this.deltaPosition;
        var camPlayerX = playerX - this.screen.width/2;
        var camPlayerY = playerY - this.screen.height/2;

        // Adiciona o player no state do jogo
        this.state.players[playerId] = {
            x: playerX,
            y: playerY,
            cam: {
                x: camPlayerX,
                y: camPlayerY
            }
        }

        // Notifica todos clients que tem um novo player
        this.notifyAll({
            type: 'add-player',
            playerId: command.playerId,
            position: {
                x: playerX,
                y: playerY,
            },
            cam: {
                x: camPlayerX,
                y: camPlayerY
            }
        });
    }

    removePlayer(command) {
        delete this.state.players[command.playerId];

        this.notifyAll({
            type: 'remove-player',
            playerId: command.playerId
        });
    }

    movePlayer(command) 
    {
        var that = this;
        const acceptedMoves = {
            ArrowUp(player) {
                var next_position = player.y - that.deltaPosition;
                if (next_position >= 0 && !that.checkCollision(player.x, next_position)) {
                    player.y = next_position
                    player.cam.y -= that.deltaPosition
                }
            },
            ArrowRight(player) {
                var next_position = player.x + that.deltaPosition;
                if (next_position < that.state.scenario.image.width && !that.checkCollision(next_position, player.y)) {
                    player.x = next_position
                    player.cam.x += that.deltaPosition
                }else{
                    console.log("Limit " ,that.state.scenario.width)
                }
            },
            ArrowDown(player) {
                var next_position = player.y + that.deltaPosition;
                if (player.y + that.deltaPosition < that.state.scenario.image.height && !that.checkCollision(player.x, next_position)) {
                    player.y = next_position
                    player.cam.y += that.deltaPosition
                }else{
                    console.log("Limit ", that.state.scenario.height)
                }
            },
            ArrowLeft(player) {
                var next_position = player.x - that.deltaPosition;
                if (player.x - that.deltaPosition >= 0 && !that.checkCollision(next_position, player.x)) {
                    player.x = next_position;
                    player.cam.x -= that.deltaPosition
                }
            }
        }

        const keyPressed = command.keyPressed
        const playerId = command.playerId
        const player = that.state.players[playerId]
        const moveFunction = acceptedMoves[keyPressed]

        // console.log("Cam position: ", player.cam);
        this.checkCollision()

        if (player && moveFunction) {
            moveFunction(player)
            this.notifyAll({
                type: 'move-player',
                playerId: command.playerId,
                position: {
                    x: player.x,
                    y: player.y
                },
                cam: player.cam
            });
            console.log("Player position: ", player.x, player.y)
        }
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
            console.log(collision_array)
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


    notifyAll(command){
        SocketIo.emit(command.type, command);
    }
}


const game = new Game();

SocketIo.on("connection", socket => {

    const playerId = socket.id
    console.log(`> Player connected to server: ${playerId}`)

    game.addPlayer({ playerId: playerId })

    socket.emit('setup', game.state)

    socket.on('disconnect', () => {
        console.log(`> Player disconnected: ${playerId}`)
        game.removePlayer({playerId:playerId})
        socket.disconnect()
    })

    socket.on('move-player', (command) => {
        command.playerId = playerId
        command.type = 'move-player'
        
        game.movePlayer(command)
    })
});


Http.listen(3000, () => {
    console.log("Listening at :3000...");
});
