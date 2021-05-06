<template>
    <v-container class="fill-height align-start">
        <v-row>
            <v-col cols="12">
                <v-card>
                    <v-card-title>{{'Заказ '+ item.id}}</v-card-title>
                    <v-card-text>
                        <v-form autocomplete="off">
                            <v-row class="mt-4">
                                <v-col cols="12">
                                    <v-select
                                            v-model="editItem.status"
                                            :items="statuses"
                                            label="Статус заказа"
                                    ></v-select>
                                </v-col>
                            </v-row>
                        </v-form>
                    </v-card-text>
                    <v-divider></v-divider>
                    <v-list subheader>
                        <v-subheader>Заказчик</v-subheader>
                        <v-list-item>
                            <v-list-item-content>
                                <v-list-item-title>Имя</v-list-item-title>
                                <v-list-item-subtitle>{{item.name || item.tgName}}</v-list-item-subtitle>
                            </v-list-item-content>
                        </v-list-item>

                        <v-list-item v-if="item.phone">
                            <v-list-item-content>
                                <v-list-item-title>Телефон</v-list-item-title>
                                <v-list-item-subtitle>{{item.phone}}</v-list-item-subtitle>
                            </v-list-item-content>
                        </v-list-item>

                        <v-list-item v-if="item.email">
                            <v-list-item-content>
                                <v-list-item-title>Электропочта</v-list-item-title>
                                <v-list-item-subtitle>{{item.email}}</v-list-item-subtitle>
                            </v-list-item-content>
                        </v-list-item>

                        <v-list-item v-if="item.address">
                            <v-list-item-content>
                                <v-list-item-title>Адрес доставки</v-list-item-title>
                                <v-list-item-subtitle>{{item.address}}</v-list-item-subtitle>
                            </v-list-item-content>
                        </v-list-item>
                    </v-list>
                    <v-divider></v-divider>
                    <v-list subheader>
                        <v-subheader>Заказ</v-subheader>
                        <v-list-item>
                            <v-list-item-content>
                                <v-list-item-title>Товар</v-list-item-title>
                                <v-list-item-subtitle>{{item.product ? item.product.title : '-'}}</v-list-item-subtitle>
                            </v-list-item-content>
                        </v-list-item>
                        <v-list-item>
                            <v-list-item-content>
                                <v-list-item-title>Оплачено, руб</v-list-item-title>
                                <v-list-item-subtitle>{{item.payedPrice}}</v-list-item-subtitle>
                            </v-list-item-content>
                        </v-list-item>
                    </v-list>
                    <v-divider></v-divider>
                    <v-card-actions>
                        <v-btn @click="gotoList">К списку</v-btn>
                        <v-btn large color="primary" @click="save">Сохранить</v-btn>
                    </v-card-actions>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
    import CrudEdit from '@/components/CrudEdit';

    export default {
        extends: CrudEdit,
        data() {
            return {
                item: {},
                editItem: {},
                statuses: [
                    {text: 'Новый', value: 'new'},
                    {text: 'Оплачен', value: 'payed'},
                    {text: 'В работе', value: 'progress'},
                    {text: 'Завершен', value: 'finished'},
                ],

                ACTION_LOAD: 'order/loadItems',
                ACTION_NEW: 'order/newItem',
                ACTION_SAVE: 'order/saveItem',
                ACTION_SET_EDIT_ITEM: 'order/setEditItem',
                ROUTE_LIST: 'ordersList',
                STORE_MODULE: 'order'
            }
        },
        async created() {
            if (this.itemId) {
                if (this.allItems.length === 0) {
                    await this.$store.dispatch(this.ACTION_LOAD);
                }

                this.$store.dispatch(this.ACTION_SET_EDIT_ITEM, this.itemId);
            }
        },
        watch: {
            storeItem() {
                if (this.storeItem) {
                    this.item = this.storeItem;
                    this.editItem = {id: this.storeItem.id, status: this.storeItem.status};
                }
            },
        },
        methods: {
            async save() {
                await this.$store.dispatch(this.ACTION_SAVE, this.editItem);
                return this.gotoList();
            },

        },
        computed: {
        }
    }
</script>

<style scoped>
</style>