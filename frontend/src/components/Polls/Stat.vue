<template>
    <v-container class="fill-height align-start">
        <v-row><v-col cols="12"><h1>{{poll ? poll.title : ''}}</h1></v-col></v-row>
        <v-row><v-col cols="12"><v-btn @click="gotoList" class="mb-4">К списку</v-btn></v-col></v-row>
        <v-row>
            <v-col cols="12" md="6" lg="4" v-for="stat in stats" :key="stat.question">
                <v-card>
                    <v-card-title v-html="stat.question"></v-card-title>
                    <plotly ref="plot" :data="getStatPlotly(stat)" :layout="layout"/>
                </v-card>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
    import { Plotly } from 'vue-plotly';
    import axios from "axios";

    export default {
        components: {Plotly},
        data() {
            return {
                stats: [],
                layout: {},
            }
        },
        async created() {
            this.loadStats();
            this.loadPolls();
        },
        watch: {
            pollId() {
                this.loadStats();
            },
        },
        methods: {
            async loadStats() {
                if (!this.pollId) {
                    return;
                }

                let {data} = await axios.post(`/api/polls/stats`, {pollId: this.pollId});
                this.stats = data.stats;
            },
            async loadPolls() {
                this.$store.dispatch('poll/loadItems');
            },
            getStatPlotly(stat) {
                return [{
                    values: stat.answers.map(answer => answer.count),
                    labels: stat.answers.map(answer => answer.answer),
                    type: 'pie'
                }]
            },
            gotoList() {
                this.$router.push({name: 'pollsList'});
            }
        },
        computed: {
            pollId() {
                return this.$route.params && this.$route.params.id
                    ? this.$route.params.id || false
                    : false;
            },
            poll() {
                return this.$store.getters['poll/byId'](this.pollId);
            }
        }
    }
</script>

<style scoped>

</style>