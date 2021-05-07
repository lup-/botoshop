<template>
    <v-card v-if="card">
        <v-card-title v-if="title">{{title}}</v-card-title>
        <v-card-text>
            <plotly ref="plot" :data="items" :layout="layout"/>
        </v-card-text>
    </v-card>
    <plotly ref="plot" :data="items" :layout="layout" v-else/>
</template>

<script>
    import { Plotly } from 'vue-plotly';

    export default {
        props: {
            maxHeight: {type: Number, default: 250},
            data: {type: Array},
            title: {type: String},
            card: {type: Boolean, default: false}
        },
        components: {Plotly},
        data() {
            return {
            }
        },
        computed: {
            items() {
                return [{
                    values: this.data.map(item => item.value),
                    labels: this.data.map(item => item.name),
                    type: 'pie'
                }]
            },
            layout() {
                return {
                    autosize: true,
                    margin: 20
                }
            }
        }
    }
</script>

<style scoped>

</style>