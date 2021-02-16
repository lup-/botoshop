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
                        :item-class="itemClass"
                        locale="ru"
                >
                    <template v-slot:item.subscribed="{ item }">
                        <v-simple-checkbox
                                v-model="item.subscribed"
                                disabled
                        ></v-simple-checkbox>
                    </template>
                    <template v-slot:item.blocked="{ item }">
                        <v-simple-checkbox
                                v-model="item.blocked"
                                disabled
                        ></v-simple-checkbox>
                    </template>
                    <template v-slot:item.autoSubscribe="{ item }">
                        <v-simple-checkbox
                                v-model="item.autoSubscribe"
                                disabled
                        ></v-simple-checkbox>
                    </template>
                    <template v-slot:item.actions="{ item }">
                        <v-btn icon small @click="gotoSubscriberEdit(item.id)"><v-icon>mdi-pencil</v-icon></v-btn>
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
        name: "SubscribersList",
        data() {
            return {
                isLoading: false,
                headers: [
                    {text: 'Фамилия', value: 'lastName'},
                    {text: 'Имя', value: 'firstName'},
                    {text: 'Имя пользователя', value: 'userName'},
                    {text: 'Последний платеж', value: 'lastPayment'},
                    {text: 'Подписка', value: 'subscribed'},
                    {text: 'Подписка до', value: 'subscribedTill'},
                    {text: 'Автопродление', value: 'autoSubscribe'},
                    {text: 'Блокировка', value: 'blocked'},
                    {text: 'Действия', value: 'actions', sortable: false},
                ]
            }
        },
        async mounted() {
            await this.loadItems();
        },
        methods: {
            async loadItems() {
                this.isLoading = true;
                await this.$store.dispatch('loadSubscribers');
                this.isLoading = false;
            },
            itemClass(item) {
                let monthAgo = moment().subtract(1, 'month').unix();
                return item.lastPaymentTimestamp < monthAgo ? 'row-outdated' : '';
            },
            gotoSubscriberEdit(id) {
                this.$router.push({name: 'subscriberEdit', params: {id}});
            },
        },
        computed: {
            items() {
                return this.isLoading ? [] : this.$store.state.subscriber.list.map(item => {
                    let newItem = clone(item);
                    newItem.lastPaymentTimestamp = item.lastPayment;
                    newItem.lastPayment = item.lastPayment ? moment.unix(item.lastPayment).format('DD.MM.YYYY HH:mm') : '-';
                    newItem.subscribedTillTimestamp = item.subscribedTill;
                    newItem.subscribedTill = item.subscribedTill ? moment.unix(item.subscribedTill).format('DD.MM.YYYY HH:mm') : '-';
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
    .row-outdated {color: red}
</style>