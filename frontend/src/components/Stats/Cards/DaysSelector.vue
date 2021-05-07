<template>
    <v-card class="mb-2">
        <v-card-title>
            <v-btn icon class="align-self-start mr-4 mt-2" size="28" @click="$router.push({name: 'statDashboard'})">
                <v-icon>mdi-arrow-left-thick</v-icon>
            </v-btn>

            {{title}}

            <v-spacer></v-spacer>
            <v-btn-toggle v-model="days" tile group color="primary" background-color="white" v-ripple="false">
                <v-btn :value="0">Сегодня</v-btn>
                <v-btn :value="7">7д</v-btn>
                <v-btn :value="15">15д</v-btn>
                <v-btn :value="30">1м</v-btn>
                <v-btn :value="365">1г</v-btn>
            </v-btn-toggle>
        </v-card-title>
    </v-card>
</template>

<script>
    export default {
        props: ['value', 'title'],
        data() {
            return {
                days: this.value || 15,
            }
        },
        created() {
            this.$emit('input', this.days);
        },
        watch: {
            days() {
                this.$emit('input', this.days);
            }
        }

    }
</script>

<style scoped>

</style>