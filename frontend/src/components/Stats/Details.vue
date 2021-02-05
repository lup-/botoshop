<template>
    <v-container :class="{'align-start': !isLoading, 'fill-height': isLoading}">
        <v-row>
            <v-col cols="12" lg="6">
                <v-select v-model="preset" :items="presets" label="Период"></v-select>
            </v-col>
        </v-row>
        <v-row  v-if="preset === 'exact'">
            <v-col cols="12" lg="4">
                <v-menu
                    v-model="menuStart"
                    :close-on-content-click="false"
                    transition="scale-transition"
                    offset-y
                    max-width="290px"
                    min-width="290px"
                >
                    <template v-slot:activator="{ on, attrs }">
                        <v-text-field
                            v-model="rangeStartFormatted"
                            label="Начало"
                            hint="В формате 31.12.2020"
                            persistent-hint
                            prepend-icon="mdi-calendar"
                            v-bind="attrs"
                            @blur="rangeStart = parseDate(rangeStartFormatted)"
                            v-on="on"
                        ></v-text-field>
                    </template>
                    <v-date-picker
                        v-model="rangeStart"
                        no-title
                        @input="menuStart = false"
                    ></v-date-picker>
                </v-menu>
            </v-col>

            <v-col cols="12" lg="4">
                <v-menu
                    v-model="menuEnd"
                    :close-on-content-click="false"
                    transition="scale-transition"
                    offset-y
                    max-width="290px"
                    min-width="290px"
                >
                    <template v-slot:activator="{ on, attrs }">
                        <v-text-field
                            v-model="rangeEndFormatted"
                            label="Окончание"
                            hint="В формате 31.12.2020"
                            persistent-hint
                            prepend-icon="mdi-calendar"
                            v-bind="attrs"
                            @blur="rangeEnd = parseDate(rangeEndFormatted)"
                            v-on="on"
                        ></v-text-field>
                    </template>
                    <v-date-picker
                        v-model="rangeEnd"
                        no-title
                        @input="menuEnd = false"
                    ></v-date-picker>
                </v-menu>
            </v-col>
            <v-col cols="12" lg="4">
                <v-select v-model="scale" :items="scaleTypes" label="Группировка"></v-select>
            </v-col>
        </v-row>
        <v-row>
            <v-col>
                <v-btn @click="loadDetails">Показать</v-btn>
            </v-col>
        </v-row>
        <v-row>
            <v-col cols="12">
                <v-btn-toggle v-model="graphs" multiple dense color="primary">
                    <v-btn value="plotlyTotals">Всего пользователей</v-btn>
                    <v-btn value="plotlyActive">Активных</v-btn>
                    <v-btn value="plotlyNew">Новых</v-btn>
                    <v-btn value="plotlyRefs">Источники</v-btn>
                </v-btn-toggle>
                <plotly ref="plot" :data="data" :layout="layout" :displayModeBar="false"/>
            </v-col>
        </v-row>
        <v-row>
            <v-col cols="12">
                <v-data-table
                    dense
                    :headers="tableHeaders"
                    :items="tableData"
                    :items-per-page="50"
                ></v-data-table>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
    import { Plotly } from 'vue-plotly';
    import moment from 'moment';

    export default {
        name: "Details",
        components: {Plotly},
        data() {
            return {
                scale: 'H',
                preset: 'today',
                presets: [
                    {text: 'Сегодня', value: 'today'},
                    {text: 'За 7 дней', value: 'week'},
                    {text: 'За 30 дней', value: 'month'},
                    {text: 'Весь год', value: 'year'},
                    {text: 'Точные даты', value: 'exact'},
                ],
                range: {
                    start: moment().startOf('d').unix(),
                    end: moment().endOf('d').unix()
                },
                scaleTypes: [
                    {text: 'По годам', value: 'Y'},
                    {text: 'По месяцам', value: 'M'},
                    {text: 'По дням', value: 'D'},
                    {text: 'По часам', value: 'H'},
                ],
                rangeStart: moment().startOf('d').format('YYYY-MM-DD'),
                rangeEnd: moment().endOf('d').format('YYYY-MM-DD'),
                rangeStartFormatted: moment().startOf('d').format('DD.MM.YYYY'),
                rangeEndFormatted: moment().endOf('d').format('DD.MM.YYYY'),
                graphs: ['plotlyTotals'],
                isLoading: false,
                menuStart: false,
                menuEnd: false,
            }
        },
        watch: {
            preset() {
                this.updateRange();
            },
            rangeStart () {
                this.rangeStartFormatted = this.formatDate(this.rangeStart);
                this.range.start = moment( this.rangeStart ).startOf('d').unix();
            },
            rangeEnd () {
                this.rangeEndFormatted = this.formatDate(this.rangeEnd);
                this.range.end = moment( this.rangeEnd ).endOf('d').unix();
            },
            range() {
                this.rangeStart = moment.unix(this.range.start).format('YYYY-MM-DD')
                this.rangeEnd = moment.unix(this.range.end).format('YYYY-MM-DD')
            }
        },
        async mounted() {
            await this.loadDetails();
        },
        methods: {
            async loadDetails() {
                this.isLoading = true;
                await this.$store.dispatch('loadDetails', {
                    scale: this.scale,
                    range: this.range
                });
                this.isLoading = false;
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
            updateRange() {
                switch (this.preset) {
                    case 'today':
                        this.scale = 'H';
                        this.range = {
                            start: moment().startOf('d').unix(),
                            end: moment().endOf('d').unix()
                        };
                        break;
                    case 'week':
                        this.scale = 'D';
                        this.range = {
                            start: moment().startOf('d').subtract(7, 'd').unix(),
                            end: moment().endOf('d').unix()
                        };
                        break;
                    case 'month':
                        this.scale = 'D';
                        this.range = {
                            start: moment().startOf('d').subtract(30, 'd').unix(),
                            end: moment().endOf('d').unix()
                        };
                        break;
                    case 'year':
                        this.scale = 'M';
                        this.range = {
                            start: moment().startOf('d').subtract(365, 'd').unix(),
                            end: moment().endOf('d').unix()
                        };
                        break;
                }
            }
        },
        computed: {
            data() {
                return this.graphs.reduce( (lines, graph) => {
                    let graphLines = this.$store.getters[graph];
                    if (this.graphs.length > 1 && graph === 'plotlyTotals') {
                        graphLines = graphLines.map(line => {
                            line.yaxis = 'y2';
                            return line;
                        });
                    }

                    return lines.concat(graphLines);
                }, []);
            },
            layout() {
                let max = this.data.reduce((max, line) => {
                    let lineMax = Math.max.apply(null, line.y);
                    return lineMax > max ? lineMax : max;
                }, 0);

                let layout = {
                    xaxis: {},
                    yaxis: {},
                    legend: {orientation: 'h', x: 0.5, y: -0.5, xanchor: 'center', yanchor: 'top'}
                };

                if (this.graphs.indexOf('plotlyTotals') !== -1 && this.graphs.length > 1) {
                    layout.yaxis2 = {
                        title: 'Всего',
                        side: 'right',
                        overlaying: 'y',
                    }
                }

                if (max === 0) {
                    layout.yaxis.range = [0, 1];
                    layout.yaxis.dtick = 1;
                }

                return layout;
            },
            tableAll() {
                return this.$store.getters.statTable;
            },
            tableHeaders() {
                let {headers} = this.tableAll;
                let selectedBlocks = this.graphs.map(graph => graph.replace('plotly', '').toLowerCase());
                let filteredHeaders = headers.filter(header => selectedBlocks.indexOf(header.type) !== -1 || header.type === false);
                return filteredHeaders;
            },
            tableData() {
                let {rows} = this.tableAll;
                return rows;
            }
        }
    }
</script>

<style scoped>

</style>