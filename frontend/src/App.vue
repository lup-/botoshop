<template>
    <v-app id="cvshow">
        <v-alert type="error" v-model="showError" dismissible tile class="global-error">{{appError}}</v-alert>

        <v-main>
            <router-view></router-view>
        </v-main>
    </v-app>
</template>

<script>
    export default {
        name: 'App',
        data: () => ({
            showError: false,
        }),
        watch: {
            appError() {
                this.showError = true;
            }
        },
        computed: {
            appError() {
                return this.$store.state.appError;
            },
        }
    }
</script>

<style>
    .v-application .error {z-index: 100}
</style>
