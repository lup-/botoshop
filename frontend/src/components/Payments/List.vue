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
                    <template v-slot:item.auto="{ item }">
                        <v-simple-checkbox
                                v-model="item.auto"
                                disabled
                        ></v-simple-checkbox>
                    </template>
                </v-data-table>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
    import moment from "moment";

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    export default {
        name: "PaymentsList",
        data() {
            return {
                isLoading: false,
                headers: [
                    {text: 'Пользователь', value: 'user'},
                    {text: 'Дата платежа', value: 'created'},
                    {text: 'Сумма', value: 'price'},
                    {text: 'Статус', value: 'status'},
                    {text: 'Автоматический', value: 'auto'},
                    {text: 'Дата проведения', value: 'finished'},
                ]
            }
        },
        async mounted() {
            await this.loadItems();
        },
        methods: {
            async loadItems() {
                this.isLoading = true;
                await this.$store.dispatch('loadPayments', {});
                this.isLoading = false;
            },
        },
        computed: {
            items() {
                return this.isLoading ? [] : this.$store.state.payment.list.map(item => {
                    let newItem = clone(item);
                    let userName = [item.profile.firstName, item.profile.lastName].join(' ');
                    if (item.profile.userName) {
                        userName += ` (@${item.profile.userName})`;
                    }

                    newItem.user = userName;
                    newItem.created = item.created ? moment.unix(item.created).format('DD.MM.YYYY HH:mm') : '-';
                    newItem.finished = item.finished ? moment.unix(item.finished).format('DD.MM.YYYY HH:mm') : '-';
                    return newItem;
                });
            },
            isEmpty() {
                return this.items.length === 0 && this.isLoading === false;
            }
        }
    }
</script>

<style>
    .row-archived {color: darkgray}
</style>