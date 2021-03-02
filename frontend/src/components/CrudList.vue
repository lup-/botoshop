<template>
    <v-container class="fill-height align-start">
        <v-row :align="isEmpty || isLoading ? 'center' : 'start'" :justify="isEmpty || isLoading ? 'center' : 'start'">
            <v-col cols="12">
                <v-data-table
                        dense
                        :headers="headers"
                        :items="items"
                        :loading="isLoading"
                        :items-per-page="50"
                        multi-sort
                        :sort-by="['created']"
                        :sort-desc="[true]"
                        locale="ru"
                >
                    <template v-slot:item.actions="{ item }">
                        <v-btn icon small @click="gotoEdit(item.id)"><v-icon>mdi-pencil</v-icon></v-btn>
                        <v-btn icon small @click="deleteItem(item)"><v-icon>mdi-delete</v-icon></v-btn>
                    </template>
                </v-data-table>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    export default {
        data() {
            return {
                isLoading: false,
                headers: [
                    {text: 'Название', value: 'title'},
                    {text: 'Действия', value: 'actions', sortable: false},
                ],

                ACTION_LOAD: 'crud/loadItems',
                ACTION_DELETE: 'crud/deleteItem',
                ROUTE_EDIT: 'crudEdit',
                ROUTE_NEW: 'crudNew',
                STORE_MODULE: 'course'
            }
        },
        async mounted() {
            await this.loadItems();
        },
        methods: {
            async loadItems() {
                this.isLoading = true;
                await this.$store.dispatch(this.ACTION_LOAD);
                this.isLoading = false;
            },
            deleteItem(item) {
                this.$store.dispatch(this.ACTION_DELETE, item);
            },
            gotoEdit(id) {
                this.$router.push({name: this.ROUTE_EDIT, params: {id}});
            },
            gotoNew() {
                this.$router.push({name: this.ROUTE_NEW});
            },
            getNewItem(item) {
                return item;
            }
        },
        computed: {
            items() {
                return this.isLoading ? [] : this.$store.state[this.STORE_MODULE].list.map(item => {
                    let newItem = clone(item);
                    return this.getNewItem(newItem);
                });
            },
            isEmpty() {
                return this.items.length === 0 && this.isLoading === false;
            }
        }
    }
</script>

<style>
    .row-outdated {color: red}
</style>