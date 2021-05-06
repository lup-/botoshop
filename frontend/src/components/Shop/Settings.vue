<template>
    <v-container class="fill-height align-start">
        <v-row>
            <v-col cols="12">
                <v-card>
                    <v-card-title>Настройки магазина</v-card-title>
                    <v-card-text>
                        <v-row class="mt-4 no-files">
                            <v-col cols="12">
                                <v-text-field
                                        v-model="settings.name"
                                        label="Название магазина"
                                ></v-text-field>
                                <vue-trix
                                        class="mt-4"
                                        placeholder="Текст-приветствие"
                                        v-model="settings.description"
                                ></vue-trix>
                            </v-col>
                        </v-row>
                    </v-card-text>
                    <v-divider></v-divider>
                    <v-card-text>
                        <v-row>
                            <v-col cols="12">
                                <v-text-field
                                        class="mt-4"
                                        v-model="settings.botToken"
                                        label="Токен бота"
                                        persistent-hint
                                        hint="Можно получить у @botfather. Например: 2292782939:HAA-MXY8OA0MGY-Bkv_MON8aeP0vYJoIYY4"
                                ></v-text-field>
                                <v-text-field
                                        class="mt-4"
                                        v-model="settings.providerToken"
                                        label="Платежный токен"
                                        persistent-hint
                                        hint="Можно получить у @botfather при подключении к боту Оплаты. Например: 3187664674:TEST:25531"
                                ></v-text-field>
                            </v-col>
                        </v-row>
                    </v-card-text>
                    <v-divider></v-divider>
                    <v-card-text>
                        <v-row>
                            <v-col cols="12">
                                <v-switch
                                        class="mt-4"
                                        v-model="settings.needName"
                                        label="Спрашивать имя покупателя"
                                ></v-switch>
                                <v-switch
                                        class="mt-4"
                                        v-model="settings.needPhone"
                                        label="Спрашивать номер телефона при заказе"
                                ></v-switch>
                                <v-switch
                                        class="mt-4"
                                        v-model="settings.needEmail"
                                        label="Спрашивать электропочту при заказе"
                                ></v-switch>
                            </v-col>
                        </v-row>
                    </v-card-text>
                    <v-divider></v-divider>
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