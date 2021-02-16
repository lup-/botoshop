<template>
    <v-container class="fill-height align-start">
        <v-row>
            <v-col cols="12">
                <v-card>
                    <v-card-title>Редактирование подписчика</v-card-title>
                    <v-card-text>
                        <v-form autocomplete="off">
                            <v-switch
                                v-model="subscriber.blocked"
                                label="Блокировка"
                                hint="Заблокированный пользователь сразу перестает получать сигналы. Продление подписки перкращается"
                            ></v-switch>
                            <v-switch v-model="subscriber.subscribed" label="Подписка"></v-switch>
                            <v-switch v-model="noDateLimit" v-if="subscriber.subscribed" label="Без ограничения даты"></v-switch>
                            <v-menu
                                    v-if="subscriber.subscribed && !noDateLimit"
                                    v-model="menuSubscribedTill"
                                    :close-on-content-click="false"
                                    transition="scale-transition"
                                    offset-y
                                    max-width="290px"
                                    min-width="290px"
                            >
                                <template v-slot:activator="{ on, attrs }">
                                    <v-text-field
                                            v-model="subscribedTillText"
                                            label="Подписка действует до"
                                            hint="В формате 31.12.2020. До этой даты действует подписка. Если есть сохраненная карта, то в эту дату происходит оплата и подписка продлевается"
                                            persistent-hint
                                            prepend-icon="mdi-calendar"
                                            v-bind="attrs"
                                            @blur="subscribedTillDate = parseDate(subscribedTillText)"
                                            v-on="on"
                                    ></v-text-field>
                                </template>
                                <v-date-picker
                                        v-model="subscribedTillDate"
                                        no-title
                                        @input="menuSmenuSubscribedTilltart = false"
                                ></v-date-picker>
                            </v-menu>
                            <v-switch v-model="subscriber.autoSubscribe" v-if="subscriber.subscribed && !noDateLimit"
                                    label="Автопродление"
                                    hint="Автоматическое списание платежа за следующий период. Для работы данная опция должна быть включена в боте и пользователь должен совершить один платеж"
                            ></v-switch>
                        </v-form>
                    </v-card-text>
                    <v-card-actions>
                        <v-btn @click="$router.push({name: 'subscribersList'})">К списку</v-btn>
                        <v-btn large color="primary" @click="save">Сохранить</v-btn>
                    </v-card-actions>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
    import moment from 'moment';

    export default {
        data() {
            return {
                subscriber: {},
                menuSubscribedTill: false,
                subscribedTillDate: false,
                subscribedTillText: '',
                noDateLimit: false,
            }
        },
        async created() {
            if (this.subscriberId) {
                if (this.allSubscribers.length === 0) {
                    await this.$store.dispatch('loadSubscribers');
                }

                this.$store.dispatch('setEditSubscriber', this.subscriberId);
            }
        },
        watch: {
            subscriberId() {
                this.$store.dispatch('setEditSubscriber', this.subscriberId);
            },
            allSubscribers: {
                deep: true,
                handler() {
                    if (this.subscriberId) {
                        this.$store.dispatch('setEditSubscriber', this.subscriberId);
                    }
                }
            },
            storeSubscriber() {
                if (this.storeSubscriber) {
                    this.subscriber = this.storeSubscriber;
                    this.subscribedTillDate = this.subscriber.subscribedTill
                        ? moment.unix(this.subscriber.subscribedTill).format('YYYY-MM-DD')
                        : false;
                    this.noDateLimit = typeof(this.subscriber.subscribedTill) === 'boolean' && this.subscriber.subscribedTill === false;
                }
            },
            subscribedTillDate() {
                this.subscribedTillText = this.formatDate(this.subscribedTillDate);
            },
            subscribedTillText() {
                this.subscribedTillDate = this.parseDate(this.subscribedTillText);
            }
        },
        methods: {
            async save() {
                if (this.subscriber.subscribed) {
                    if (this.subscribedTillDate) {
                        this.subscriber.subscribedTill = moment(this.subscribedTillDate).endOf('d').unix() || false;
                    } else {
                        if (this.subscriber.subscribedTill) {
                            this.subscriber.subscribedTill = false;
                        }
                    }

                    if (this.noDateLimit) {
                        this.subscriber.subscribedTill = false;
                    }
                }

                await this.$store.dispatch('editSubscriber', this.subscriber);
                await this.$router.push({name: 'subscribersList'});
            },
            formatDate (date) {
                if (!date) return null

                const [year, month, day] = date.split('-')
                return `${day}.${month}.${year}`
            },
            parseDate (date) {
                if (!date) return null

                const [day, month, year] = date.split('.')
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
            },
        },
        computed: {
            subscriberId() {
                return this.$route.params && this.$route.params.id
                    ? parseInt(this.$route.params.id) || false
                    : false;
            },
            storeSubscriber() {
                return this.$store.state.subscriber.edit;
            },
            allSubscribers() {
                return this.$store.state.subscriber.list;
            },
        }
    }
</script>

<style scoped>

</style>