<template>
    <v-container class="fill-height align-start">
        <v-row>
            <v-col cols="12">
                <v-card>
                    <v-card-title>{{isNew ? 'Новый опрос' : 'Редактирование опроса'}}</v-card-title>
                    <v-card-text>
                        <v-form autocomplete="off">

                            <v-row class="mt-4">
                                <v-col cols="12">
                                    <v-text-field
                                            v-model="item.title"
                                            label="Название опроса"
                                    ></v-text-field>
                                </v-col>
                            </v-row>

                            <v-row class="mt-4 no-files">
                                <v-col cols="12">
                                    <vue-trix
                                            v-model="item.text"
                                            placeholder="Пояснения к опросу"
                                    ></vue-trix>
                                </v-col>
                            </v-row>

                            <v-row class="mt-4">
                                <v-col cols="12">
                                    <v-text-field
                                            v-model="item.buttonText"
                                            label="Тест на кнопке"
                                            hint='Текст на кнопке начала опроса. "Начать опрос", если пусто'
                                            placeholder="Начать опрос"
                                            persistent-hint
                                    ></v-text-field>
                                </v-col>
                            </v-row>
                        </v-form>
                    </v-card-text>
                    <v-expansion-panels accordion inset focusable flat v-model="panel">
                        <v-expansion-panel v-for="(question, index) in item.questions" :key="index" :class="index === panel ? 'elevation-2' : 'elevation-0'">
                            <v-divider v-if="index === 0" :key="index"></v-divider>
                            <v-expansion-panel-header><div v-html="question.text || 'Новый вопрос'"></div></v-expansion-panel-header>
                            <v-expansion-panel-content class="mt-4">
                                <question v-model="item.questions[index]"></question>
                            </v-expansion-panel-content>
                            <v-divider :key="index+1"></v-divider>
                        </v-expansion-panel>
                    </v-expansion-panels>
                    <v-card-actions class="mt-4">
                        <v-btn @click="addQuestion">Добавить вопрос</v-btn>
                        <v-spacer></v-spacer>
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
    import Question from "@/components/Polls/Question";

    export default {
        extends: CrudEdit,
        components: {Question},
        data() {
            return {
                item: {},
                panel: null,

                ACTION_LOAD: 'poll/loadItems',
                ACTION_NEW: 'poll/newItem',
                ACTION_SAVE: 'poll/saveItem',
                ACTION_SET_EDIT_ITEM: 'poll/setEditItem',
                ROUTE_LIST: 'pollsList',
                STORE_MODULE: 'poll'
            }
        },
        methods: {
            addQuestion() {
                if (!this.item.questions) {
                    this.$set(this.item, 'questions', []);
                }

                this.item.questions.push({});
                this.panel = this.item.questions.length-1;
                this.$nextTick(() => window.scrollTo(0, document.body.scrollHeight));
            }
        },
        computed: {
            allOtherFunnels() {
                return this.$store.state.poll.list.filter(poll => poll.id !== this.item.id);
            },
        }
    }
</script>

<style>
    .no-files .trix-button-group--file-tools {display: none}
</style>