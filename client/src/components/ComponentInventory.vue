<template>
    <div>
        <p>{{turn}}</p>
        <button v-on:click="addNewItem()"> Add item </button>
        <button v-on:click="PlayerMove()"> Move Player </button>

        <div style="padding: 10px; border: 1px solid black;">
            <img :src="'https://www.tibiawiki.com.br/images/'+(enemy.image||'')">
            <p><b>{{enemy.name || '-'}}</b></p>
            <p>{{enemy.health || '-'}}</p>
        </div>

        <div style="padding: 10px; border: 1px solid black;">
            <p><b>{{player.name || '-'}} | {{player.level}} ({{player.experience}}/{{player.experienceNextLevel}})</b></p>
            <p>{{player.health || '-'}}</p>
        </div>

        <li v-for="(item, index) in player.inventory" v-bind:key="'inventory_slot_'+index">
            <img :src="'https://www.tibiawiki.com.br/images/'+item.image" :title="item.name">
        </li>
    </div>
</template>

<script>
    import io from "socket.io-client"

    export default {
        name: 'ComponentInventory',
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
            this.socket.on("update", data => {
                this.player = data.player;
                this.enemy = data.enemy;
                this.turn = data.globalTurns;
            });
        },
        methods: {
            addNewItem(){
                this.socket.emit("actionAddNewItem");
            },
            PlayerMove(){
                this.socket.emit("ActionPlayerMove");
            }
        }
    }
</script>

<style scoped></style>
