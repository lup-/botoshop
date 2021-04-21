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
                    <template v-slot:item.username="{ item }">
                        @{{item.username}} <v-btn text small :href="`https://t.me/${item.username}`" target="_blank"><v-icon>mdi-open-in-new</v-icon></v-btn>
                    </template>
                    <template v-slot:item.funnels="{ item }">
                        <v-chip v-for="funnel in fullFunnels(item.funnels)" :key="funnel.id" class="mr-2 mb-2" x-small>
                            {{funnel.title}}
                        </v-chip>
                    </template>
                    <template v-slot:item.actions="{ item }">
                        <v-btn icon small @click="gotoEdit(item.id)"><v-icon>mdi-pencil</v-icon></v-btn>
                        <v-btn icon small @click="deleteItem(item)"><v-icon>mdi-delete</v-icon></v-btn>
                        <v-btn icon small @click="restartBot(item)"><v-icon>mdi-restart-alert</v-icon></v-btn>
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
                    {text: 'Имя', value: 'username'},
                    {text: 'Воронки', value: 'funnels'},
                    {text: 'Действия', value: 'actions', sortable: false},
                ],

                ACTION_LOAD: 'bot/loadItems',
                ACTION_DELETE: 'bot/deleteItem',
                ROUTE_EDIT: 'botEdit',
                ROUTE_NEW: 'botNew',
                STORE_MODULE: 'bot'
            }
        },
        async mounted() {
            await this.loadItems();
        },
        methods: {
            fullFunnels(funnelIds) {
                return funnelIds
                    ? funnelIds.map(funnelId => {
                        return this.$store.getters["funnel/byId"](funnelId);
                    }).filter(funnel => Boolean(funnel))
                    : [];
            },
            async loadItems() {
                this.isLoading = true;
                await this.$store.dispatch('funnel/loadItems');
                await this.$store.dispatch(this.ACTION_LOAD);
                this.isLoading = false;
            },
            async restartBot(bot) {
                await this.$store.dispatch('bot/restartBot', bot);
            }
        }
    }
</script>
