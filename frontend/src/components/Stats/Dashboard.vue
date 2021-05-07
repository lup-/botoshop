<template>
    <v-container class="fill-height align-start" fluid>
        <v-row align="start" justify="start" dense>
            <v-col cols="12" md="4">
                <v-card>
                    <v-card-title>
                        <v-icon class="mr-12" size="64">mdi-account-multiple</v-icon>
                        <v-row align="start" class="flex-column">
                            <div class="caption grey--text text-uppercase">Пользователи</div>
                            <div class="display-1 font-weight-black d-flex align-baseline">
                                {{lastNum(users)}}
                                <v-icon v-if="isLastStepGrowing(users) === true" color="green">mdi-arrow-up-bold</v-icon>
                                <v-icon v-if="isLastStepGrowing(users) === false" color="red">mdi-arrow-down-bold</v-icon>
                                <span :class="isLastStepGrowing(users) ? 'green--text subtitle-1 ml-2' : 'red--text subtitle-1 ml-2'">
                                    {{growPercent(users)}}%
                                </span>
                            </div>
                        </v-row>
                        <v-spacer></v-spacer>
                        <v-btn icon class="align-self-start" size="28" @click="$router.push({name: 'statUsers'})">
                            <v-icon>mdi-arrow-right-thick</v-icon>
                        </v-btn>
                    </v-card-title>

                    <v-sheet color="transparent">
                        <v-sparkline
                                :smooth="16"
                                :value="users"
                                :color="isPositive(users) ? 'green' : 'red'"
                                fill
                                padding="0"
                                stroke-linecap="round"
                        ></v-sparkline>
                    </v-sheet>
                </v-card>
            </v-col>

            <v-col cols="12" md="4">
                <v-card>
                    <v-card-title>
                        <v-icon class="mr-12" size="64">mdi-cash</v-icon>
                        <v-row align="start" class="flex-column">
                            <div class="caption grey--text text-uppercase">Платежи</div>
                            <div class="display-1 font-weight-black d-flex align-baseline">
                                {{lastNum(sales)}}
                                <v-icon v-if="isLastStepGrowing(sales) === true" color="green">mdi-arrow-up-bold</v-icon>
                                <v-icon v-if="isLastStepGrowing(sales) === false" color="red">mdi-arrow-down-bold</v-icon>
                                <span :class="isLastStepGrowing(sales) ? 'green--text subtitle-1 ml-2' : 'red--text subtitle-1 ml-2'">
                                    {{growPercent(sales)}}%
                                </span>
                            </div>
                        </v-row>
                        <v-spacer></v-spacer>
                        <v-btn icon class="align-self-start" size="28" @click="$router.push({name: 'statSales'})">
                            <v-icon>mdi-arrow-right-thick</v-icon>
                        </v-btn>
                    </v-card-title>

                    <v-sheet color="transparent">
                        <v-sparkline
                                :smooth="16"
                                :value="sales"
                                :color="isPositive(sales) ? 'green' : 'red'"
                                fill
                                padding="0"
                                stroke-linecap="round"
                        ></v-sparkline>
                    </v-sheet>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
    import axios from "axios";

    export default {
        data() {
            return {
                data: {sales: [], users: []},
            }
        },
        created() {
            this.loadStats();
        },
        methods: {
            async loadStats() {
                let shop = this.$store.state.shop.current;
                let {data} = await axios.post('/api/stats/dashboard', {shop});
                this.data.sales = data.sales || [];
                this.data.users = data.users || [];
            },
            isPositive(data) {
                if (data.length <= 1) {
                    return false;
                }

                return data[data.length-1] > data[0];
            },
            isLastStepGrowing(data) {
                if (data.length < 2) {
                    return null;
                }

                return data[data.length-1] !== data[data.length-2]
                    ? data[data.length-1] > data[data.length-2]
                    : null;
            },
            growPercent(data) {
                if (data.length < 2) {
                    return 0;
                }

                let last = data[data.length-1];
                let preLast = data[data.length-2];
                let percent = preLast > 0 ? (last-preLast)/preLast * 100 : 0;
                let strPercent = Math.round(percent).toString();
                return percent > 0 ? strPercent : strPercent.replace('-', '');
            },
            formatNum(number) {
                return Math.round(number).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
            },
            lastNum(data) {
                return data.length > 0 ? this.formatNum(data[data.length-1]) : 0;
            }
        },
        computed: {
            users() {
                return this.data.users.map(data => data.users);
            },
            sales() {
                return this.data.sales.map(data => data.sum);
            }
        }
    }
</script>

<style scoped>

</style>