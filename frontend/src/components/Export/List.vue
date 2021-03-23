<template>
    <v-container class="fill-height align-start">
        <v-row align="center" justify="center" class="mt-4">
            <v-expansion-panels>
                <v-expansion-panel>
                    <v-expansion-panel-header>Этапы</v-expansion-panel-header>
                    <v-expansion-panel-content>
                        <v-form>
                            <v-row>
                                <v-col cols="12">
                                    <v-select
                                            label="Воронки для экспорта"
                                            :items="allFunnels"
                                            item-text="title"
                                            item-value="id"
                                            v-model="stages.funnels"
                                            multiple
                                            chips
                                            deletable-chips
                                            hint="Если не указаны, будут выгружены все воронки"
                                    ></v-select>
                                </v-col>
                            </v-row>
                            <v-row>
                                <v-col cols="6">
                                    <date-editor
                                            v-model="stages.start"
                                            label="Выгрузить активность с"
                                    ></date-editor>
                                </v-col>
                                <v-col cols="6">
                                    <date-editor
                                            v-model="stages.end"
                                            label="по"
                                    ></date-editor>
                                </v-col>
                            </v-row>
                            <v-row>
                                <v-col cols="12">
                                    <v-switch
                                            v-model="stages.groupDays"
                                            label="Группировать по дням"
                                    ></v-switch>
                                </v-col>
                            </v-row>
                        </v-form>
                        <v-btn @click="fetchExport('stages')" class="mt-6">Экспорт</v-btn>
                    </v-expansion-panel-content>
                </v-expansion-panel>

                <v-expansion-panel>
                    <v-expansion-panel-header>Кнопки</v-expansion-panel-header>
                    <v-expansion-panel-content>
                        <v-form>
                            <v-row>
                                <v-col cols="12">
                                    <v-select
                                            label="Воронки для экспорта"
                                            :items="allFunnels"
                                            item-text="title"
                                            item-value="id"
                                            v-model="buttons.funnels"
                                            multiple
                                            chips
                                            deletable-chips
                                            hint="Если не указаны, будут выгружены все воронки"
                                    ></v-select>
                                </v-col>
                            </v-row>
                            <v-row>
                                <v-col cols="6">
                                    <date-editor
                                            v-model="buttons.start"
                                            label="Выгрузить активность с"
                                    ></date-editor>
                                </v-col>
                                <v-col cols="6">
                                    <date-editor
                                            v-model="buttons.end"
                                            label="по"
                                    ></date-editor>
                                </v-col>
                            </v-row>
                            <v-row>
                                <v-col cols="12">
                                    <v-switch
                                            v-model="buttons.groupDays"
                                            label="Группировать по дням"
                                    ></v-switch>
                                </v-col>
                            </v-row>
                        </v-form>
                        <v-btn @click="fetchExport('buttons')" class="mt-6">Экспорт</v-btn>
                    </v-expansion-panel-content>
                </v-expansion-panel>

                <v-expansion-panel>
                    <v-expansion-panel-header>Рефки</v-expansion-panel-header>
                    <v-expansion-panel-content>
                        <v-form>
                            <v-row>
                                <v-col cols="12" md="6">
                                    <v-select
                                            label="Боты для экспорта"
                                            :items="allBots"
                                            item-text="username"
                                            item-value="id"
                                            v-model="refs.bots"
                                            multiple
                                            chips
                                            deletable-chips
                                            hint="Если не указаны, будут выгружены данные по всем ботам"
                                    ></v-select>
                                </v-col>
                                <v-col cols="12" md="6">
                                    <v-select
                                            label="Воронки"
                                            :items="botsFunnels"
                                            item-text="title"
                                            item-value="id"
                                            v-model="refs.funnels"
                                            multiple
                                            chips
                                            deletable-chips
                                            hint="Если не указаны, будут выгружены все воронки"
                                    ></v-select>
                                </v-col>
                            </v-row>
                            <v-row>
                                <v-col cols="12" md="6">
                                    <date-editor
                                            v-model="refs.start"
                                            label="Выгрузить активность с"
                                    ></date-editor>
                                </v-col>
                                <v-col cols="12" md="6">
                                    <date-editor
                                            v-model="refs.end"
                                            label="по"
                                    ></date-editor>
                                </v-col>
                            </v-row>
                        </v-form>
                        <v-btn @click="fetchExport('refs')" class="mt-6">Экспорт</v-btn>
                    </v-expansion-panel-content>
                </v-expansion-panel>

            </v-expansion-panels>
        </v-row>
    </v-container>
</template>

<script>
    import DateEditor from "@/components/DateEditor";
    import axios from "axios";

    export default {
        components: {DateEditor},
        data() {
            return {
                stages: {
                    funnels: [],
                    start: null,
                    end: null
                },
                buttons: {
                    funnels: [],
                    start: null,
                    end: null
                },
                refs: {
                    bots: [],
                    funnels: [],
                    start: null,
                    end: null
                },
            }
        },
        async created() {
            if (this.allFunnels.length === 0) {
                await this.$store.dispatch('funnel/loadItems');
            }
            if (this.allBots.length === 0) {
                await this.$store.dispatch('bot/loadItems');
            }
        },
        computed: {
            allFunnels() {
                return this.$store.state.funnel.list;
            },
            allBots() {
                return this.$store.state.bot.list;
            },
            botsFunnels() {
                let botIds = this.refs.bots;
                let hasBots = botIds && botIds.length > 0;
                if (!hasBots) {
                    return this.allFunnels;
                }

                let funnelIds = this.$store.state.bot.list.reduce((funnelIds, bot) => {
                    if (botIds.indexOf(bot.id) === -1) {
                        return funnelIds;
                    }

                    return funnelIds.concat(bot.funnels || []);
                }, []).filter( (funnelId, index, allIds) => allIds.indexOf(funnelId) === index );

                return this.$store.state.funnel.list.filter(funnel => funnelIds.indexOf(funnel.id) !== -1);
            }
        },
        methods: {
            download(blob, fileName) {
                let url = URL.createObjectURL(blob);
                let a = document.createElement("a");
                document.body.appendChild(a);

                a.style = "display: none";
                a.href = url;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(url);
                a.remove();
            },

            async fetchExport(what) {
                let request = {};
                request[what] = this[what];
                let {data: blob} = await axios.post(`/api/export/${what}`, request, {responseType: "blob"});
                this.download(blob, `${what}.csv`);
            }
        }
    }
</script>

<style scoped>

</style>