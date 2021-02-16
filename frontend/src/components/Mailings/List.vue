<template>
    <v-container class="fill-height align-start">
        <v-row :align="isEmpty || isLoading ? 'center' : 'start'" :justify="isEmpty || isLoading ? 'center' : 'start'">
            <v-col cols="12">
                <v-data-table
                        dense
                        :headers="headers"
                        :items="mailings"
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
                </v-data-table>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
    import moment from "moment";

    function trimHTML(html) {
        return html
            .replace(/<!--.*?-->/ig, ' ')
            .replace(/<\/*[a-z]+.*?>/ig, ' ')
            .replace(/ +/, ' ')
            .trim();
    }

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    export default {
        name: "MailingsList",
        data() {
            return {
                refreshSeconds: 15,
                refreshIndervalId: false,
                isLoading: false,
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
                ]
            }
        },
        async mounted() {
            await this.loadMailings();
            this.startRefreshing();
        },
        beforeDestroy() {
            this.stopRefreshing();
        },
        methods: {
            async loadMailings() {
                this.isLoading = true;
                await this.$store.dispatch('loadMailings', {});
                this.isLoading = false;
            },
            async silentLoadMailings() {
                await this.$store.dispatch('loadMailings', {});
            },
            startRefreshing() {
                if (this.refreshSeconds > 0) {
                    this.refreshIndervalId = setInterval(this.silentLoadMailings, this.refreshSeconds * 1000);
                }
            },
            stopRefreshing() {
                if (this.refreshIndervalId) {
                    clearInterval(this.refreshIndervalId);
                }
            },
        },
        computed: {
            mailings() {
                return this.isLoading ? [] : this.$store.state.mailing.list.map(mailing => {
                    let newMailing = clone(mailing);
                    newMailing.startAt = mailing.startAt ? moment.unix(mailing.startAt).format('DD.MM.YYYY HH:mm') : '-';
                    newMailing.preview = Array.from(trimHTML(mailing.message.text)).slice(0, 50).join('')+'...';
                    return newMailing;
                });
            },
            isEmpty() {
                return this.mailings.length === 0 && this.isLoading === false;
            }
        }
    }
</script>

<style>
</style>