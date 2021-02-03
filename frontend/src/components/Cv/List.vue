<template>
    <v-container class="fill-height align-start">
        <v-row :align="isEmpty || isLoading ? 'center' : 'start'" :justify="isEmpty || isLoading ? 'center' : 'start'">
            <v-btn fab bottom right fixed large color="primary" @click="$router.push({name: 'New'})">
                <v-icon>mdi-plus</v-icon>
            </v-btn>

            <v-col cols="12">
                <v-data-table
                        dense
                        :headers="headers"
                        :items="cvs"
                        :loading="isLoading"
                        :items-per-page="50"
                >
                    <template v-slot:item.actions="{ item }">
                        <v-btn icon small @click="gotoCvEdit(item.id)"><v-icon>mdi-pencil</v-icon></v-btn>
                        <v-btn icon small @click="deleteCv(item)"><v-icon>mdi-delete</v-icon></v-btn>
                    </template>
                </v-data-table>
            </v-col>
        </v-row>
    </v-container>
</template>

<script>
    export default {
        name: "List",
        data() {
            return {
                isLoading: true,
                headers: [
                    {text: 'ФИО', value: 'name'},
                    {text: 'Действия', value: 'actions', sortable: false},
                ]
            }
        },
        async mounted() {
            await this.loadCvs();
        },
        methods: {
            deleteCv(cv) {
                this.$store.dispatch('deleteCv', cv);
            },
            async loadCvs() {
                this.isLoading = true;
                await this.$store.dispatch('loadCvs', {});
                this.isLoading = false;
            },
            gotoCvEdit(id) {
                this.$router.push({name: 'Edit', params: {id}});
            },
        },
        computed: {
            cvs() {
                return this.isLoading ? [] : this.$store.state.cv.list;
            },
            isEmpty() {
                return this.cvs.length === 0 && this.isLoading === false;
            }
        }
    }
</script>

<style scoped>

</style>