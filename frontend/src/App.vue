<template>
    <v-app id="signals_bot">
        <v-alert type="error" v-model="showError" dismissible tile class="global-error">{{appError}}</v-alert>
        <v-navigation-drawer v-model="drawer" app clipped v-if="isLoggedIn">
            <v-list dense>
                <v-list-item v-for="route in routes" :key="route.code"
                        link
                        @click="$router.push({name: route.code})"
                        :disabled="$route.name === route.code"
                >
                    <v-list-item-action>
                        <v-icon v-text="route.icon"></v-icon>
                    </v-list-item-action>
                    <v-list-item-content>
                        <v-list-item-title>{{route.title}}</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
                <v-list-item v-if="$store.getters.isLoggedIn" link @click="logout">
                    <v-list-item-action>
                        <v-icon>mdi-logout</v-icon>
                    </v-list-item-action>
                    <v-list-item-content>
                        <v-list-item-title>Выход</v-list-item-title>
                    </v-list-item-content>
                </v-list-item>
            </v-list>
        </v-navigation-drawer>

        <v-app-bar app clipped-left>
            <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
            <v-toolbar-title>Бот сигналов</v-toolbar-title>
        </v-app-bar>

        <v-main>
            <router-view></router-view>
        </v-main>

        <v-snackbar v-model="showMessage" :timeout="5000" :color="appMessage.color">
            {{ appMessage.text }}
            <template v-slot:action="{ attrs }">
                <v-btn icon v-bind="attrs" @click="showMessage = false"> <v-icon>mdi-close</v-icon></v-btn>
            </template>
        </v-snackbar>
    </v-app>
</template>

<script>
    export default {
        name: 'App',
        data: () => ({
            drawer: null,
            showError: false,
            showMessage: false,
        }),
        watch: {
            appError() {
                this.showError = true;
            },
            appMessage() {
                this.showMessage = true;
            }
        },
        methods: {
            async logout() {
                await this.$store.dispatch('logoutUser');
                return this.$router.push({name: 'login'});
            }
        },
        computed: {
            appError() {
                return this.$store.state.appError;
            },
            appMessage() {
                return this.$store.state.appMessage;
            },
            routes() {
                return this.$store.getters.allowedRoutes;
            },
            isLoggedIn() {
                return this.$store.getters.isLoggedIn;
            }
        }
    }
</script>

<style>
    .v-application .error {z-index: 100}
</style>
