<template>
    <v-container class="fill-height align-start">
        <v-row>
            <v-col cols="12">
                <v-card>
                    <v-card-title>{{isNew ? 'Новая воронка' : 'Редактирование воронки'}}</v-card-title>
                    <v-card-text>
                        <v-form autocomplete="off">

                            <v-row class="mt-4">
                                <v-col cols="12">
                                    <v-text-field
                                            v-model="item.title"
                                            hint="Название воронки"
                                            persistent-hint
                                    ></v-text-field>
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

                ACTION_LOAD: 'funnel/loadItems',
                ACTION_NEW: 'funnel/newItem',
                ACTION_SAVE: 'funnel/saveItem',
                ACTION_SET_EDIT_ITEM: 'funnel/setEditItem',
                ROUTE_LIST: 'funnelsList',
                STORE_MODULE: 'funnel'
            }
        }
    }
</script>

<style scoped>

</style>