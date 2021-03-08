<template>
    <v-dialog v-model="show" width="500">
        <v-card>
            <v-card-title>Редактирование этапа</v-card-title>
            <v-card-text>
                <v-form autocomplete="off">
                    <v-row class="mt-4">
                        <v-col cols="12">
                            <v-text-field
                                    v-model="item.title"
                                    label="Краткое название"
                            ></v-text-field>
                        </v-col>
                    </v-row>
                    <v-row class="mt-4">
                        <v-col cols="12">
                            <vue-trix
                                    v-model="item.text"
                                    placeholder="Текст сообщения"
                            ></vue-trix>
                        </v-col>
                    </v-row>
                    <v-row class="mt-4" v-if="showLink">
                        <v-col cols="12" md="6">
                            <v-select
                                    label="Привязать к этапу"
                                    :items="nextStages"
                                    item-text="title"
                                    item-value="id"
                                    v-model="previousStageId"
                            ></v-select>
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-text-field
                                    label="Текст на кнопке"
                                    v-model="buttonText"
                            ></v-text-field>
                        </v-col>
                    </v-row>
                </v-form>
            </v-card-text>

            <v-divider></v-divider>

            <v-card-actions>
                <v-btn @click="gotoEditStage">Полный редактор</v-btn>
                <v-spacer></v-spacer>
                <v-btn @click="cancel">Отмена</v-btn>
                <v-btn large color="primary" @click="save">Сохранить</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script>
    export default {
        props: ['value', 'show', 'showLink', 'funnelId', 'selectedNode'],
        data() {
            return {
                item: this.value,
                previousStageId: this.value.previousStageId || false,
                buttonText: '',
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
            gotoEditStage() {
                let stageId = this.selectedNode;
                this.$router.push({name: 'stageEdit', params: {id: stageId, funnelId: this.funnelId}});
            },
            getEditItem() {
                let item = this.item;
                if (this.previousStageId) {
                    item.previousStage = {
                        id: this.previousStageId,
                        buttonText: this.buttonText,
                    }
                }

                return item;
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
            nextStages() {
                return this.allStages.filter(stage => stage.id !== this.itemId);
            },
        }
    }
</script>

<style scoped>

</style>