<template>
    <v-card flat class="question">
        <v-form>
            <v-row>
                <v-col cols="12">
                    <vue-trix
                            v-model="question.text"
                            placeholder="Текст вопроса"
                    ></vue-trix>
                </v-col>
            </v-row>
            <v-row>
                <v-col cols="12">
                    <v-switch v-model="question.isOpen" label="Открытый вопрос" hint="Пользователь должен написать ответ для перехода к следующему вопросу" persistent-hint></v-switch>
                    <v-switch v-model="question.useScore" v-if="!question.isOpen" label="Считать баллы" hint="Каждому ответу можно назначить баллы" persistent-hint></v-switch>
                </v-col>
            </v-row>

            <div class="mt-4" v-if="!question.isOpen && question.answers && question.answers.length > 0">
                <v-divider class="my-4"></v-divider>
                <v-row v-for="(answer, index) in question.answers" :key="index">
                    <v-col cols="12" :md="question.useScore ? 5 : 11">
                        <v-text-field
                                label="Текст ответа"
                                v-model="answer.text"
                        ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="5" v-if="question.useScore">
                        <v-text-field
                                label="Баллы за ответ"
                                v-model.number="answer.score"
                                type="number"
                        ></v-text-field>
                    </v-col>
                    <v-col cols="12" md="1">
                        <v-btn @click="removeAnswer(index)" text><v-icon>mdi-delete</v-icon></v-btn>
                    </v-col>
                </v-row>
            </div>
        </v-form>
        <v-divider class="my-4" v-if="!question.isOpen"></v-divider>
        <v-card-actions>
            <v-btn @click="addAnswer" v-if="!question.isOpen">Добавить ответ</v-btn>
        </v-card-actions>
    </v-card>
</template>

<script>
    export default {
        name: "Question",
        props: ['value'],
        data() {
            return {
                question: this.value || {}
            }
        },
        watch: {
            value() {
                this.question = this.value;
            },
            item() {
                this.$emit('input', this.question);
            }
        },
        methods: {
            addAnswer() {
                if (!this.question.answers) {
                    this.$set(this.question, 'answers', []);
                }

                this.question.answers.push({});
            },
            removeAnswer(index) {
                this.question.answers.splice(index, 1);
            }
        }
    }
</script>

<style>
    .question .trix-button-group--file-tools {display: none}
</style>