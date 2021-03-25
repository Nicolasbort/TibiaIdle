<template>
    <canvas ref="domCanvas" width="320" height="320" style="transform:scale(2);margin-top:150px;image-rendering: pixelated;">
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
                context: {},

                playerList: [],
                playerSprites: [
                    require('../assets/priest1/v1/priest1_v1_1.png'),
                    require('../assets/priest2/v1/priest2_v1_1.png'),
                    require('../assets/priest3/v1/priest3_v1_1.png'),
                ],
                enemySprites: [
                    require('../assets/skeleton/v1/skeleton2_v1_1.png'),
                    require('../assets/skeleton/v1/skeleton2_v1_2.png'),
                    require('../assets/skeleton/v1/skeleton2_v1_3.png'),
                    require('../assets/skeleton/v1/skeleton2_v1_4.png'),
                ],
                background: new Image(),
            }
        },
        created() {
            this.socket = io("http://localhost:3000", {transports:['websocket']});
            this.background.src = require("../assets/map.jpeg");
        },
        mounted() {
            this.context = this.$refs.domCanvas.getContext('2d');

            var that = this;
            this.socket.on("serverUpdate", data => {
                if("playerList" in data){
                    that.playerList = data.playerList;
                }
                if ("enemyList" in data){
                    that.enemyList = data.enemyList;
                }
                // console.log(data);
                that.render();
            });

            window.addEventListener('keypress', function(e){
                console.log(that.enemyList)
                var keypressed = e.key;
                that.socket.emit('clientKeyPressed', keypressed);
            });
        },
        methods: {
            render(){
                // Não sei pra que serve mas tem que usar
                this.context.save();

                // Atualiza a posicao da camera do player
                var playerCam = this.playerList[this.socket.id].cam;
                this.context.translate(-playerCam.x, -playerCam.y);

                // Desenha o background antes pra ficar atras dos players
                this.context.drawImage(this.background, 0, 0);   

                var sprite_char = new Image();
                var sprite_enemy = new Image();
                for( const [key, value] of Object.entries(this.playerList)){
                    // console.log(value)
                    // console.log(this.playerSprites[value.sprite])
                    sprite_char.src = this.playerSprites[value.sprite];
                    this.context.drawImage(sprite_char, 0, 0, 16, 16, value.position.x, value.position.y, 16, 16);   
                }

                for( const [key, value] of Object.entries(this.enemyList)){
                    sprite_enemy.src = this.enemySprites[value.sprite];
                    this.context.drawImage(sprite_enemy, 0, 0, 16, 16, value.position.x, value.position.y, 16, 16);   
                }


                // Não sei pra que serve mas tem que usar
                this.context.restore();
            }
        }

    }
</script>

<style scoped></style>