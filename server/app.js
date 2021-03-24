const Express   = require("express")();
const Http      = require("http").Server(Express);
const SocketIo  = require("socket.io")(Http);


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
        this.gameRules = new GameRules();

        this.deltaPosition = this.gameRules.tile_size;
        this.screen = this.gameRules.camera;

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

    }

    addPlayer(command)
    {
        console.log("> Adding player ", command.playerId)
        const playerId = command.playerId;
        const playerX = 'playerX' in command ? command.playerX : Math.floor(Math.random() * this.state.scenario.image.width / this.deltaPosition) * this.deltaPosition;
        const playerY = 'playerY' in command ? command.playerY : Math.floor(Math.random() * this.state.scenario.image.height / this.deltaPosition) * this.deltaPosition;
        var camPlayerX = playerX - this.screen.width/2;
        var camPlayerY = playerY - this.screen.height/2;

        this.state.players[playerId] = {
            x: playerX,
            y: playerY,
            cam: {
                x: camPlayerX,
                y: camPlayerY
            }
        }
        // console.log(this.state.players[playerId])

        
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
                if (player.y - that.deltaPosition >= 0) {
                    player.y -= that.deltaPosition
                    player.cam.y -= that.deltaPosition
                }
            },
            ArrowRight(player) {
                if (player.x + that.deltaPosition < that.state.scenario.image.width) {
                    player.x += that.deltaPosition
                    player.cam.x += that.deltaPosition
                }else{
                    console.log("Limit " ,that.state.scenario.width)
                }
            },
            ArrowDown(player) {
                if (player.y + that.deltaPosition < that.state.scenario.image.height) {
                    player.y += that.deltaPosition
                    player.cam.y += that.deltaPosition
                }else{
                    console.log("Limit ", that.state.scenario.height)
                }
            },
            ArrowLeft(player) {
                if (player.x - that.deltaPosition >= 0) {
                    player.x -= that.deltaPosition
                    player.cam.x -= that.deltaPosition
                }
            }
        }

        const keyPressed = command.keyPressed
        const playerId = command.playerId
        const player = that.state.players[playerId]
        const moveFunction = acceptedMoves[keyPressed]

        console.log("Cam position: ", player.cam);

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
            // console.log("Player position: ", player.x, player.y)
        }
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

        new_command = {
            playerId: playerId,
            position: {
                x: game.state.players[playerId].x,
                y: game.state.players[playerId].y
            }
        }

        SocketIo.emit('move-player', new_command);
    })
});


Http.listen(3000, () => {
    console.log("Listening at :3000...");
});
