<template>
    <v-container class="fill-height align-start">
        <v-row :align="isEmpty || isLoading ? 'center' : 'start'" :justify="isEmpty || isLoading ? 'center' : 'start'">
            <v-btn fab bottom right fixed large color="primary"
                    @click="gotoNew"
            >
                <v-icon>mdi-plus</v-icon>
            </v-btn>
            <v-col cols="12">
                <v-row class="text-h6 py-6">Воронка: {{funnel ? funnel.title : '-'}}</v-row>
                <v-row><v-btn @click="gotoBuilder">К конструктору</v-btn></v-row>
            </v-col>
            <v-col cols="12">
                <v-data-table
                        dense
                        :headers="headers"
                        :items="items"
                        :loading="isLoading"
                        :items-per-page="50"
                        sort-by="shows"
                        :sort-desc="[true]"
                        locale="ru"
                >
                    <template v-slot:item.isStarting="{ item }">
                        <v-simple-checkbox v-model="item.isStarting" disabled></v-simple-checkbox>
                    </template>
                    <template v-slot:item.needsAnswer="{ item }">
                        <v-simple-checkbox v-model="item.needsAnswer" disabled></v-simple-checkbox>
                    </template>
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
    import clone from "lodash.clonedeep"

    export default {
        data() {
            return {
                isLoading: false,
                headers: [
                    {text: 'Название', value: 'title'},
                    {text: 'Входной', value: 'isStarting'},
                    {text: 'Сбор ответов', value: 'needsAnswer'},
                    {text: 'Всего показов', value: 'shows'},
                    {text: 'Действия', value: 'actions', sortable: false},
                ],

                ACTION_LOAD: 'stage/loadItems',
                ACTION_DELETE: 'stage/deleteItem',
                ROUTE_EDIT: 'stageEdit',
                ROUTE_NEW: 'stageNew',
                STORE_MODULE: 'stage'
            }
        },
        async mounted() {
            await this.loadItems();
        },
        methods: {
            async loadItems() {
                this.isLoading = true;
                await this.$store.dispatch('funnel/loadItems');
                await this.$store.dispatch(this.ACTION_LOAD, {funnelId: this.funnelId});
                this.isLoading = false;
            },
            deleteItem(item) {
                this.$store.dispatch(this.ACTION_DELETE, {item, funnelId: this.funnelId});
            },
            gotoEdit(id) {
                this.$router.push({name: this.ROUTE_EDIT, params: {id}});
            },
            gotoNew() {
                this.$router.push({name: this.ROUTE_NEW, params: {funnelId: this.funnelId}});
            },
            gotoBuilder() {
                this.$router.push({name: 'funnelBuilderEdit', params: {id: this.funnelId}});
            },
            getNewItem(item) {
                return item;
            }
        },
        computed: {
            funnel() {
                if (!this.funnelId) {
                    return false;
                }

                return this.$store.getters["funnel/byId"](this.funnelId);
            },
            funnelId() {
                return this.$route.params && this.$route.params.funnelId
                    ? this.$route.params.funnelId || false
                    : false;
            },
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