<template>
    <v-container class="fill-height align-start">
        <v-row>
            <v-col cols="12">
                <v-card>
                    <v-card-title>Настройки магазина</v-card-title>
                    <v-card-text>
                        <v-form autocomplete="off">

                            <v-row class="mt-4 no-files">
                                <v-col cols="12">
                                    <v-text-field
                                            v-model="settings.name"
                                            label="Название магазина"
                                    ></v-text-field>
                                    <v-text-field
                                            v-model="settings.botToken"
                                            label="Токен бота"
                                            hint="Можно получить у @botfather. Например: 2292782939:HAA-MXY8OA0MGY-Bkv_MON8aeP0vYJoIYY4"
                                    ></v-text-field>
                                    <vue-trix
                                            placeholder="Текст-приветствие"
                                            v-model="settings.description"
                                    ></vue-trix>
                                </v-col>
                            </v-row>

                        </v-form>
                    </v-card-text>
                    <v-card-actions>
                        <v-btn large color="primary" @click="save">Сохранить</v-btn>
                    </v-card-actions>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
    export default {
        data() {
            return {
                settings: {},
            }
        },
        created() {
            this.settings = this.stateSettings;
        },
        methods: {
            async save() {
                await this.$store.dispatch('shop/saveSettings', this.settings);
            },
        },
        computed: {
            stateSettings() {
                return this.$store.state.shop.current && this.$store.state.shop.current.settings
                    ? this.$store.state.shop.current.settings
                    : {};
            },
        }
    }
</script>

<style scoped>
    .no-files .trix-button-group--file-tools {display: none}
</style>