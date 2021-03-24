const Express   = require("express")();
const Http      = require("http").Server(Express);
const SocketIo  = require("socket.io")(Http);



class Game
{
    constructor(width, height)
    {
        this.deltaPosition = 3;
        this.state = {
            players: {},
        };
        this.screen = {
            width: width,
            height: height
        };
        this.map = {
            width: 595,
            height: 595
        }
    }

    addPlayer(command)
    {
        console.log("> Adding player ", command.playerId)
        const playerId = command.playerId;
        const playerX = 'playerX' in command ? command.playerX : Math.floor(Math.random() * this.screen.width);
        const playerY = 'playerY' in command ? command.playerY : Math.floor(Math.random() * this.screen.height);
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
                if (player.x + that.deltaPosition < that.map.width) {
                    player.x += that.deltaPosition
                    player.cam.x += that.deltaPosition
                }
            },
            ArrowDown(player) {
                if (player.y + that.deltaPosition < that.map.height) {
                    player.y += that.deltaPosition
                    player.cam.y += that.deltaPosition
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


const game = new Game(300, 300);

SocketIo.on("connection", socket => {

    const playerId = socket.id
    console.log(`> Player connected to server: ${playerId}`)

    game.addPlayer({ playerId: playerId })

    setup = {
        state: game.state,
        scenario: {
            image: {
                width: 595,
                height: 595
            }
        }
    }

    socket.emit('setup', setup)

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
