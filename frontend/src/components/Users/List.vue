<template>
    <v-container class="fill-height align-start">
        <v-row :align="isEmpty || isLoading ? 'center' : 'start'" :justify="isEmpty || isLoading ? 'center' : 'start'">
            <v-btn fab bottom right fixed large color="primary"
                    @click="$router.push({name: 'userNew'})"
            >
                <v-icon>mdi-plus</v-icon>
            </v-btn>

            <v-col cols="12">
                <v-data-table
                        dense
                        :headers="headers"
                        :items="users"
                        :loading="isLoading"
                        :items-per-page="50"
                >
                    <template v-slot:item.blocked="{ item }">
                        <v-simple-checkbox
                                :value="item.blocked > 0"
                                disabled
                        ></v-simple-checkbox>
                    </template>
                </v-data-table>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
    export default {
        name: "UsersList",
        data() {
            return {
                isLoading: true,
                headers: [
                    {text: 'ФИО', value: 'name'},
                    {text: 'Логин', value: 'login'},
                    {text: 'Блокировка', value: 'blocked'},
                ]
            }
        },
        async mounted() {
            await this.loadUsers();
        },
        methods: {
            deleteUser(user) {
                this.$store.dispatch('user/deleteItem', user);
            },
            async loadUsers() {
                this.isLoading = true;
                await this.$store.dispatch('user/loadItems', {});
                this.isLoading = false;
            },
            gotoUserEdit(id) {
                this.$router.push({name: 'userEdit', params: {id}});
            },
        },
        computed: {
            users() {
                return this.isLoading ? [] : this.$store.state.user.list;
            },
            isEmpty() {
                return this.users.length === 0 && this.isLoading === false;
            }
        }
    }
</script>

<style scoped>

</style>