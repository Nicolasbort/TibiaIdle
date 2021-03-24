<template>
    <canvas width="320" height="320">
        Canvas not supported
    </canvas>
</template>

<script>
    import io from "socket.io-client"
    import {Entity, EntityListDict} from "../scripts/Entity.js"

    export default {
        name: 'ComponentCanvas',
        data (){
            return {
                socket: {},
                player: {},
                enemy:  {},
                turn: 0,
            }
        },
        created() {
            this.socket = io("http://localhost:3000", {transports:['websocket']});
        },
        mounted() {


            this.socket.on('connect', () => {
                const playerId = this.socket.id
                console.log("> Connected to Server: ", playerId);


                var canvas = document.querySelector('canvas');
                var context = canvas.getContext('2d');

                var entityList = new EntityListDict();

                entityList.print()

                var sprite_char = new Image();
                sprite_char.src = require('../assets/idle.png');

                // var background = new Image();
                // background.src = require('../assets/map.png');
                


                // var game_world  = new Entity(null, 0, 0, 595, 595, background, {x:0, y:0});
                var game_world;


                // sprite
                // entityList.add(game_world)

                var that = this
                window.addEventListener('keydown', function(e){
                    var keyPressed = e.key;

                    const command = {
                        type: 'move-player',
                        playerId: playerId,
                        keyPressed
                    }

                    that.socket.emit('move-player', command);

                }, false);

    

                function loop(){
                    window.requestAnimationFrame(loop, canvas);
                    render();
                }


                this.socket.on('setup', (command) => {
                    var background = new Image()
                    background.src = require("../assets/map.png");

                    game_world  = new Entity(null, 0, 0, command.scenario.image.width, command.scenario.image.height, background, {x:0, y:0});

                    Object.keys(command.players).forEach(function(key) {
                        entityList.add(new Entity(key, command.players[key].x, command.players[key].y, 16, 16, sprite_char, command.players[key].cam))
                    });

                })


                this.socket.on('move-player', (command) => {
                    updateSpecificPlayer(command.playerId, command.position, command.cam)
                });


                this.socket.on('add-player', (command) => {
                    entityList.add(new Entity(command.playerId, command.position.x, command.position.y, 16, 16, sprite_char, command.cam))
                });

                this.socket.on('remove-player', (command) => {
                    console.log("> Removing Player ", command.playerId);
                    entityList.remove(command.playerId)
                });


                function updateSpecificPlayer(playerId, position, cam){
                    entityList.entities.players[playerId].x = position.x;
                    entityList.entities.players[playerId].y = position.y;

                    entityList.entities.players[playerId].cam.x = cam.x;
                    entityList.entities.players[playerId].cam.y = cam.y;
                }



                function render()
                {
                    context.save();

                    var playerCam = entityList.entities.players[playerId].cam;
                    context.translate(-playerCam.x, -playerCam.y);

                    context.drawImage(game_world.sprite, 0, 0);   

                    for (const [key, value] of Object.entries(entityList.entities.players)) {
                        context.drawImage(value.sprite, 0, 0, value.width, value.height, value.x, value.y, value.width, value.height);   
                    }

                    context.restore();
                }

                loop()
            });




        }

    }
</script>

<style scoped></style>
