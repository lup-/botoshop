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
                        :sort-by="['updated']"
                        :sort-desc="[true]"
                        locale="ru"
                >
                    <template v-slot:item.actions="{ item }">
                        <v-btn icon small @click="gotoEdit(item.id)"><v-icon>mdi-eye</v-icon></v-btn>
                        <v-btn icon small @click="deleteItem(item)"><v-icon>mdi-archive-arrow-down</v-icon></v-btn>
                    </template>
                </v-data-table>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
    import CrudList from "@/components/CrudList";
    import moment from "moment";

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    export default {
        extends: CrudList,
        data() {
            return {
                isLoading: false,
                statuses: [
                    {text: 'Новый', value: 'new'},
                    {text: 'Оплачен', value: 'payed'},
                    {text: 'В работе', value: 'progress'},
                    {text: 'Завершен', value: 'finished'},
                ],
                headers: [
                    {text: 'Дата платежа', value: 'created'},
                    {text: 'Заказчик', value: 'user'},
                    {text: 'Статус', value: 'status'},
                    {text: 'Товар', value: 'productTitle'},
                    {text: 'Оплачено', value: 'payedPrice'},
                    {text: 'Действия', value: 'actions', sortable: false},
                ],

                ACTION_LOAD: 'order/loadItems',
                ACTION_DELETE: 'order/deleteItem',
                ROUTE_EDIT: 'orderEdit',
                STORE_MODULE: 'order'
            }
        },
        computed: {
            items() {
                return this.isLoading ? [] : this.$store.state.order.list.map(item => {
                    let newItem = clone(item);
                    let userName = item.name || item.tgName;
                    let status = this.statuses.find(status => status.value === item.status);

                    newItem.user = userName;
                    newItem.status = status.text || null;
                    newItem.created = item.created ? moment.unix(item.created).format('DD.MM.YYYY HH:mm') : '-';
                    newItem.productTitle = item.product.title;

                    return newItem;
                });
            },
            isEmpty() {
                return this.items.length === 0 && this.isLoading === false;
            }
        }
    }
</script>
