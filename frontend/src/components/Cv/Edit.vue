<template>
    <v-container class="fill-height align-start">
        <v-row>
            <v-col cols="12">
                <v-card>
                    <v-card-title>{{isNew ? 'Новое резюме' : 'Редактирование резюме'}}</v-card-title>
                    <v-card-text>
                        <v-form autocomplete="off">
                            <v-text-field v-model="cv.name" label="ФИО"></v-text-field>

                            <v-textarea
                                    v-model="cv.about"
                                    label="Краткие сведения"
                            ></v-textarea>
                        </v-form>
                    </v-card-text>
                    <v-card-actions>
                        <v-btn @click="$router.push({name: 'List'})">К списку</v-btn>
                        <v-btn large color="primary" @click="save">Сохранить</v-btn>
                    </v-card-actions>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
    export default {
        name: "Edit",
        data() {
            return {
                cv: {},
                defaultCv: {},
            }
        },
        async created() {
            if (this.cvId) {
                if (this.allCvs.length === 0) {
                    await this.$store.dispatch('loadCvs');
                }

                this.$store.dispatch('setCurrentCv', this.cvId);
            }
        },
        watch: {
            cvId() {
                this.$store.dispatch('setCurrentCv', this.cvId);
            },
            allCvs: {
                deep: true,
                handler() {
                    if (this.cvId) {
                        this.$store.dispatch('setCurrentCv', this.cvId);
                    }
                }
            },
            storeCv() {
                if (this.storeCv) {
                    this.cv = this.storeCv;
                }
                else {
                    this.cv = this.defaultCv;
                }
            },
        },
        methods: {
            async save() {
                if (this.isNew) {
                    await this.$store.dispatch('newCv', this.cv);
                }
                else {
                    await this.$store.dispatch('editCv', this.cv);
                }

                await this.$router.push({name: 'List'});
            },
        },
        computed: {
            isNew() {
                return !(this.$route.params && this.$route.params.id);
            },
            cvId() {
                return (this.$route.params && this.$route.params.id) || false;
            },
            storeCv() {
                return this.$store.state.cv.current;
            },
            allCvs() {
                return this.$store.state.cv.list;
            },
        }
    }
</script>

<style scoped>

</style>