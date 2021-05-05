<template>
    <v-container class="fill-height align-start">
        <v-row>
            <v-col cols="12">
                <v-card>
                    <v-card-title>{{isNew ? 'Новая категория' : 'Редактирование категории'}}</v-card-title>
                    <v-card-text>
                        <v-form autocomplete="off">

                            <v-row class="mt-4">
                                <v-col cols="12">
                                    <v-text-field
                                            v-model="item.title"
                                            hint="Название категории"
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

                ACTION_LOAD: 'category/loadItems',
                ACTION_NEW: 'category/newItem',
                ACTION_SAVE: 'category/saveItem',
                ACTION_SET_EDIT_ITEM: 'category/setEditItem',
                ROUTE_LIST: 'categoriesList',
                STORE_MODULE: 'category'
            }
        }
    }
</script>

<style scoped>

</style>