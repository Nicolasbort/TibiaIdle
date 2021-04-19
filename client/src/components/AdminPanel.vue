<template>
    <div class="row">
        <div class="col-12 d-flex justify-content-center">
            <button class="btn btn-primary" v-on:click="$emit('addEnemy')">Add Enemy</button>
        </div>
    </div>
</template>

<script>
export default {
    name: "AdminPanel",
}
</script>