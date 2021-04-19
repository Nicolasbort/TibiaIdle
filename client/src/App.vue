<template>
    <div class="container">
        <Canvas v-if="playerId && gameState" :gameState="gameState" :playerId="playerId" @clientKeyPressed="clientKeyPressed" />

        <AdminPanel @addEnemy="addEnemy" />
    </div>
</template>

<script>
import io from "socket.io-client"

import Canvas from './components/Canvas'
import AdminPanel from './components/AdminPanel'

export default {
    name: 'App',

    data() {
        return {
            socket: {},

            playerId: null,

            gameState: null,
        }
    },
    
    components: {
        Canvas,
        AdminPanel
    },

    created() {
        this.initSocket();
    },

    methods: {

        initSocket() {
            this.socket = io("http://localhost:3000", {transports:['websocket'], upgrade: false});

            this.socket.on("connect", () => {
                this.playerId = this.socket.id
                console.log("Connected! ", this.playerId);
            })

            this.socket.on("GAME_STATE", state => {
                console.log("GAME_STATE", state);
                this.gameState = state
            });

            this.socket.on("PLAYER_MOVE", command => {
                this.gameState.players[command.playerId].position = command.position
                this.gameState.players[command.playerId].cam      = command.camera
            })

            this.socket.on("ADD_ENEMY", command => {
                console.log('ADD_ENEMY', command)
                this.gameState.enemies[command.enemyId] = command.enemy
            })

            this.socket.on("ADD_PLAYER", command => {
                console.log("ADD_PLAYER", command);
                this.gameState.players[command.playerId] = command.player
            })


            this.socket.on("REMOVE_ENEMY", command => {
                console.log("REMOVE ENEMY", command);
                delete this.gameState.enemies[command.enemyId]
            })


            this.socket.on("REMOVE_PLAYER", command => {
                console.log("REMOVE_PLAYER", command);
                delete this.gameState.players[command.playerId]
            })
        },

        clientKeyPressed(key) {
            this.socket.emit("CLIENT_KEYPRESSED", key);
        },

        addEnemy() {
            this.socket.emit("ADMIN_ADD_ENEMY");
        }

    }
}
</script>
