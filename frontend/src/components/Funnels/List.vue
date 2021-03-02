<template>
    <v-container class="fill-height align-start">
        <v-row :align="isEmpty || isLoading ? 'center' : 'start'" :justify="isEmpty || isLoading ? 'center' : 'start'">
            <v-btn fab bottom right fixed large color="primary"
                    @click="gotoNew"
            >
                <v-icon>mdi-plus</v-icon>
            </v-btn>
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
                        <v-btn icon small @click="gotoStages(item.id)"><v-icon>mdi-format-list-numbered</v-icon></v-btn>
                        <v-btn icon small @click="gotoEdit(item.id)"><v-icon>mdi-pencil</v-icon></v-btn>
                        <v-btn icon small @click="deleteItem(item)"><v-icon>mdi-delete</v-icon></v-btn>
                    </template>
                </v-data-table>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
    import CrudList from "@/components/CrudList";

    export default {
        extends: CrudList,
        data() {
            return {
                isLoading: false,
                headers: [
                    {text: 'Название', value: 'title'},
                    {text: 'Действия', value: 'actions', sortable: false},
                ],

                ACTION_LOAD: 'funnel/loadItems',
                ACTION_DELETE: 'funnel/deleteItem',
                ROUTE_EDIT: 'funnelEdit',
                ROUTE_NEW: 'funnelNew',
                STORE_MODULE: 'funnel'
            }
        },
        methods: {
            gotoStages(funnelId) {
                this.$router.push({name: 'stagesList', params: {funnelId}});
            },
        }
    }
</script>
