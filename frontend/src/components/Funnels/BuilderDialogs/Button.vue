<template>
    <v-dialog v-model="show" width="500">
        <v-card>
            <v-card-title>Редактирование перехода</v-card-title>
            <v-card-text>
                <v-form autocomplete="off">
                    <v-row class="mt-4">
                        <v-col cols="12" md="6">
                            <v-text-field
                                    label="Текст на кнопке"
                                    v-model="item.buttonText"
                            ></v-text-field>
                        </v-col>
                    </v-row>
                    <v-row class="mt-4">
                        <v-col cols="12" md="6">
                            <v-select
                                    label="Откуда"
                                    :items="allStages"
                                    item-text="title"
                                    item-value="id"
                                    v-model="item.srcStageId"
                            ></v-select>
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-select
                                    label="Куда"
                                    :items="allStages"
                                    item-text="title"
                                    item-value="id"
                                    v-model="item.dstStageId"
                            ></v-select>
                        </v-col>
                    </v-row>
                </v-form>
            </v-card-text>

            <v-divider></v-divider>

            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn @click="cancel">Отмена</v-btn>
                <v-btn large color="primary" @click="save">Сохранить</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script>
    export default {
        props: ['value', 'show'],
        data() {
            return {
                item: this.value || {},
            }
        },
        watch: {
            value() {
                this.item = this.value;
            },
            item() {
                this.$emit('input', this.getEditItem());
            }
        },
        methods: {
            updateSrcDst() {
                if (this.selectedEdge) {
                    let [src, dst, edgeType] = this.selectedEdge.split(':');
                    if (this.item && edgeType === 'button') {
                        this.item.srcStageId = src;
                        this.item.dstStageId = dst;
                    }
                }
                else {
                    this.item = {};
                }
            },
            getEditItem() {
                return this.item;
            },
            cancel() {
                this.$emit('cancel');
            },
            save() {
                this.$emit('save', this.getEditItem());
            }
        },
        computed: {
            allStages() {
                return this.$store.state.stage.list;
            },
        }
    }
</script>

<style scoped>

</style>