<template>
    <v-container class="fill-height align-center justify-center">
        <v-card>
            <v-card-text>
                <v-form ref="form" v-model="valid">
                    <v-text-field
                            v-model="login"
                            :rules="loginRules"
                            label="Электропочта"
                            hint="Например: anna.ahmatova@mail.ru"
                            required
                    ></v-text-field>

                    <v-text-field
                            v-model="name"
                            :rules="nameRules"
                            label="Полное имя"
                            hint="Например: Анна Ахматова"
                            required
                    ></v-text-field>

                    <v-text-field
                            v-model="password"
                            :append-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                            :rules="passwordRules"
                            :type="showPassword ? 'text' : 'password'"
                            hint="Не меньше 6 символов"
                            label="Пароль"
                            required
                            counter
                            @click:append="showPassword = !showPassword"
                    ></v-text-field>

                </v-form>
            </v-card-text>
            <v-card-actions>
                <v-btn :disabled="!valid" color="success" @click="doRegister">
                    Зарегистрироваться
                </v-btn>
                <v-spacer></v-spacer>
                <v-btn
                        text
                        x-small
                        @click="$router.push({name: 'login'})"
                >Вход</v-btn>
            </v-card-actions>
        </v-card>
    </v-container>
</template>

<script>
    export default {
        data() {
            return {
                login: '',
                password: '',
                name: '',
                valid: false,
                showPassword: false,

                loginRules: [
                    v => Boolean(v) || 'Обязательное поле',
                    v => v && /.+@.+\..+/.test(v) || 'Ошибка в адресе',
                ],
                passwordRules: [
                    v => Boolean(v) || 'Обязательное поле',
                    v => v && v.length >= 6 || 'Не меньше 6 символов',
                ],
                nameRules: [
                    v => Boolean(v) || 'Обязательное поле',
                    v => v && v.indexOf(' ') !== -1 || 'Укажите имя и фамилию'
                ],
            }
        },
        watch: {
            login() {
                this.validate();
            },
            name() {
                this.validate();
            },
            password() {
                this.validate();
            }
        },
        methods: {
            validate() {
                this.$refs.form.validate();
            },
            async doRegister() {

                await this.$store.dispatch('registerOwner', {login: this.login, name: this.name, password: this.password});
                if (this.$store.getters.isLoggedIn) {
                    let nextRoute = '/';
                    return this.$router.push({path: nextRoute});
                }
            }
        }
    }
</script>

<style scoped>

</style>