<template>
    <v-container class="align-start">
        <v-row>
            <v-col cols="12">
                <days-selector
                    title="Статистика продаж"
                    v-model="days">
                </days-selector>
            </v-col>
        </v-row>

        <v-row>
            <v-col cols="12">
                <v-expansion-panels :value="[0]" multiple class="align-self-start justify-start mb-4">
            <v-expansion-panel>
                <v-expansion-panel-header>Продажи</v-expansion-panel-header>
                <v-expansion-panel-content>
                    <plotly :data="salesData" :layout="salesLayout"/>
                </v-expansion-panel-content>
            </v-expansion-panel>
            <v-expansion-panel>
                <v-expansion-panel-header>Категории</v-expansion-panel-header>
                <v-expansion-panel-content>
                    <pie-card :max-height="248" :data="categories" title="Категории"></pie-card>
                </v-expansion-panel-content>
            </v-expansion-panel>
            <v-expansion-panel>
                <v-expansion-panel-header>Товары</v-expansion-panel-header>
                <v-expansion-panel-content>
                    <pie-card :max-height="248" :data="products" title="Товары"></pie-card>
                </v-expansion-panel-content>
            </v-expansion-panel>
        </v-expansion-panels>
            </v-col>
        </v-row>

        <v-row>
            <v-col cols="12">
                <v-card>
                    <v-data-table
                            dense
                            :headers="tableHeaders"
                            :items="tableData"
                            :items-per-page="50"
                    ></v-data-table>
                </v-card>
            </v-col>
        </v-row>

    </v-container>
</template>

<script>
    import PieCard from "@/components/Stats/Cards/PieCard";
    import DaysSelector from "@/components/Stats/Cards/DaysSelector";
    import { Plotly } from 'vue-plotly';
    import axios from "axios";

    export default {
        components: {DaysSelector, PieCard, Plotly},
        data() {
            return {
                days: 15,
                topCourses: [],
                sales: {
                    labels: [],
                    series:[]
                },
                salesLayout: {
                    margin: 20,
                },
                categories: [],
                products: [],
                tableHeaders: [
                    {text: 'Дата', value: 'date'},
                    {text: 'Платежей', value: 'totalSum'},
                    {text: 'Покупок', value: 'ordersCount'},
                    {text: 'Курсов', value: 'productCount'},
                ],
                tableData: []
            }
        },
        created() {
            this.loadStats();
        },
        watch: {
            days() {
                this.loadStats();
            }
        },
        methods: {
            async loadStats() {
                let shop = this.$store.state.shop.current;
                let {data: stats} = await axios.post('/api/stats/sales', {days: this.days, shop});
                this.categories = stats.categories;
                this.products = stats.products;
                this.tableData = stats.sales;
                this.sales.labels = stats.sales.map(item => item.date);
                this.sales.series = [ stats.sales.map(item => item.totalSum) ];
            }
        },
        computed: {
            isSmallDisplay() {
                return ['xs', 'sm', 'md'].indexOf(this.$vuetify.breakpoint.name) !== -1;
            },
            mainChartHeight() {
                return this.isSmallDisplay ? 560 : 500;
            },
            salesOptions() {
                return {
                    fullWidth: true,
                    lineSmooth: false,
                    height: (this.isSmallDisplay ? 168 : 440) + 'px'
                }
            },
            salesData() {
                return [{
                    x: this.tableData.map(item => item.date),
                    y: this.tableData.map(item => item.totalSum),
                    type: 'scatter'
                }];
            }
        }
    }
</script>

<style lang="scss">
    .v-btn.v-btn--active:before {
        background-color: transparent;
    }
</style>