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
                    <template v-slot:item.progress="{ item }">
                        {{ item.processed && item.total ? (item.processed / item.total * 100).toFixed(2)+'%' : ''}}
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
    import moment from "moment";

    function trimHTML(html) {
        if (!html) {
            return '';
        }

        return html
            .replace(/<!--.*?-->/ig, ' ')
            .replace(/<\/*[a-z]+.*?>/ig, ' ')
            .replace(/ +/, ' ')
            .trim();
    }

    import CrudList from "@/components/CrudList";

    export default {
        extends: CrudList,
        data() {
            return {
                isLoading: false,
                refreshSeconds: 15,
                refreshIntervalId: false,
                headers: [
                    {text: 'Дата начала', value: 'startAt'},
                    {text: 'Текст', value: 'preview'},
                    {text: 'Статус', value: 'status'},
                    {text: 'Прогресс', value: 'progress'},
                    {text: 'Успешно', value: 'success'},
                    {text: 'Блокировок', value: 'blocks'},
                    {text: 'Ошибок', value: 'errors'},
                    {text: 'Отправлено', value: 'processed'},
                    {text: 'Очередь', value: 'total'},
                    {text: 'Действия', value: 'actions', sortable: false},
                ],

                ACTION_LOAD: 'mailing/loadItems',
                ACTION_DELETE: 'mailing/deleteItem',
                ROUTE_EDIT: 'mailingEdit',
                ROUTE_NEW: 'mailingNew',
                STORE_MODULE: 'mailing'
            }
        },
        async mounted() {
            await this.loadItems();
            this.startRefreshing();
        },
        beforeDestroy() {
            this.stopRefreshing();
        },
        methods: {
            getNewItem(item) {
                item.startAt = item.startAt ? moment.unix(item.startAt).format('DD.MM.YYYY HH:mm') : '-';
                item.preview = Array.from(trimHTML(item.message.text)).slice(0, 50).join('')+'...';
                return item;
            },
            async silentLoadMailings() {
                await this.$store.dispatch(this.ACTION_LOAD);
            },
            startRefreshing() {
                if (this.refreshSeconds > 0) {
                    this.refreshIntervalId = setInterval(this.silentLoadMailings, this.refreshSeconds * 1000);
                }
            },
            stopRefreshing() {
                if (this.refreshIntervalId) {
                    clearInterval(this.refreshIntervalId);
                }
            },

        },
    }
</script>

<style>
</style>