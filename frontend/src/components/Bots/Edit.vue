<template>
    <v-container class="fill-height align-start">
        <v-row>
            <v-col cols="12">
                <v-card>
                    <v-card-title>{{isNew ? 'Новый бот' : 'Редактирование бота'}}</v-card-title>
                    <v-card-text>
                        <v-form autocomplete="off">

                            <v-row class="mt-4">
                                <v-col cols="12">
                                    <v-text-field
                                            v-model="item.token"
                                            hint="Токен бота"
                                            persistent-hint
                                    ></v-text-field>
                                </v-col>
                            </v-row>

                            <v-row class="mt-4">
                                <v-col cols="12">
                                    <v-select
                                        label="Воронки в боте"
                                        :items="allFunnels"
                                        item-text="title"
                                        item-value="id"
                                        v-model="item.funnels"
                                        multiple
                                        chips
                                        deletable-chips
                                        hint="Если на одном боте используются несколько воронок, доступ к ним будет по разным реферальным ссылкам"
                                    ></v-select>
                                </v-col>
                            </v-row>

                            <v-row class="mt-4" v-if="item.funnels && item.funnels.length > 1 && item.username">
                                <v-col cols="12" v-for="funnelId in item.funnels" :key="funnelId">
                                    <v-text-field disabled :value="getFunnelLink(funnelId)" :label="getFunnelName(funnelId)"></v-text-field>
                                </v-col>
                            </v-row>

                        </v-form>
                    </v-card-text>
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

                ACTION_LOAD: 'bot/loadItems',
                ACTION_NEW: 'bot/newItem',
                ACTION_SAVE: 'bot/saveItem',
                ACTION_SET_EDIT_ITEM: 'bot/setEditItem',
                ROUTE_LIST: 'botsList',
                STORE_MODULE: 'bot'
            }
        },
        async created() {
            if (this.allFunnels.length === 0) {
                await this.$store.dispatch('funnel/loadItems');
            }

            if (this.itemId) {
                if (this.allItems.length === 0) {
                    await this.$store.dispatch(this.ACTION_LOAD);
                }

                this.$store.dispatch(this.ACTION_SET_EDIT_ITEM, this.itemId);
            }
        },
        methods: {
            getFunnelName(funnelId) {
                let funnel = this.$store.getters["funnel/byId"](funnelId);
                return funnel ? funnel.title : '-';
            },
            getFunnelLink(funnelId) {
                return `https://t.me/${this.item.username}/?start=${funnelId}`
            }
        },
        computed: {
            allFunnels() {
                return this.$store.state.funnel.list;
            },
        }
    }
</script>

<style scoped>

</style>