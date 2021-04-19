<template>
    <div class="row">
        <div class="col-12 d-flex justify-content-center">
            <canvas class="img-fluid" ref="domCanvas" width="320" height="320" style="transform:scale(1);image-rendering: pixelated;">
                Canvas not supported
            </canvas>
        </div>
    </div>
</template>

<script>

    export default {
        name: 'Canvas',

        data (){
            return {
                context: {},

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
                sprite_char: new Image(),
                sprite_enemy: new Image(),
            }
        },

        props: {
            gameState: Object,
            playerId: String
        },

        created() {
            this.background.src = require("../assets/map.jpeg");
            this.sprite_char.className += "char_"

            console.log(this.background)
        },

        mounted() {
            this.canvas = this.$refs.domCanvas;
            this.context = this.canvas.getContext('2d');

            var that = this;

            window.addEventListener('keydown', e => {
                let keypressed = e.key;
                this.$emit("clientKeyPressed", keypressed);
            });

            // this.canvas.addEventListener('click', function(e) {
            //     console.log("Click")
            //     const canvasRect = that.canvas.getBoundingClientRect();
            //     const position = {
            //         x: e.clientX - canvasRect.left,
            //         y: e.clientY - canvasRect.top 
            //     } 
            //     that.socket.emit('clientMouseClicked', position)
            // })

            this.loop();
        },
        methods: {
            render(){
                // Não sei pra que serve mas tem que usar
                this.context.save();

                // Atualiza a posicao da camera do player
                var playerCam = this.gameState.players[this.playerId].cam;
                this.context.translate(-playerCam.x, -playerCam.y);

                // Desenha o background antes pra ficar atras dos players
                this.context.drawImage(this.background, 0, 0);   

                for( const [key, player] of Object.entries(this.gameState.players)){
                    this.sprite_char.src = this.playerSprites[player.sprite];
                    this.context.drawImage(this.sprite_char, 0, 0, 16, 16, player.position.x, player.position.y, 16, 16);   
                }

                for( const [key, enemy] of Object.entries(this.gameState.enemies)){
                    this.sprite_enemy.src = this.enemySprites[enemy.sprite];
                    this.context.drawImage(this.sprite_enemy, 0, 0, 16, 16, enemy.position.x, enemy.position.y, 16, 16);   
                }

                // Não sei pra que serve mas tem que usar
                this.context.restore();
            },

            loop() {
                this.render();
                setTimeout(this.loop, 33);
            },
        }

    }
</script>

<style scoped>

.char_ {
    width: 50px;
}

</style>