<template>
    <v-dialog v-model="show" width="500">
        <v-card>
            <v-card-title>Редактирование перехода</v-card-title>
            <v-card-text>
                <v-form autocomplete="off">
                    <v-row class="mt-4">
                        <v-col cols="12" md="6">
                            <v-select
                                    label="Фильтр по воронке"
                                    :items="allFunnels"
                                    multiple
                                    chips
                                    deletable-chips
                                    item-text="title"
                                    item-value="id"
                                    v-model="funnelIds"
                            ></v-select>
                        </v-col>
                        <v-col cols="12" md="6">
                            <v-select
                                    label="Фильтр по этапам"
                                    :items="allStages"
                                    multiple
                                    chips
                                    deletable-chips
                                    item-text="title"
                                    item-value="id"
                                    v-model="stageIds"
                            ></v-select>
                        </v-col>
                    </v-row>

                    <v-row class="mt-4">
                        <v-col cols="12">

                            <v-autocomplete
                                    :items="chats"
                                    v-model="chat"
                                    :loading="isLoading"
                                    :search-input.sync="search"
                                    return-object
                                    label="Пользователь"
                            ></v-autocomplete>

                        </v-col>
                    </v-row>

                </v-form>
            </v-card-text>

            <v-divider></v-divider>

            <v-card-actions>
                <v-spacer></v-spacer>
                <v-btn @click="cancel">Отмена</v-btn>
                <v-btn large color="primary" @click="save">Написать</v-btn>
            </v-card-actions>
        </v-card>
    </v-dialog>
</template>

<script>
    import axios from "axios";
    import cloneDeep from "lodash.clonedeep";

    export default {
        props: ['value', 'showInput'],
        data() {
            return {
                show: false,
                isLoading: false,
                chat: cloneDeep(this.value) || {},
                funnelIds: null,
                stageIds: null,
                profiles: [],
                search: null,
            }
        },
        mounted() {
            this.loadProfiles();
        },
        watch: {
            funnelIds() {
                this.loadProfiles();
            },
            stageIds() {
                this.loadProfiles();
            },
            value() {
                this.chat = this.value;
            },
            chat() {
                this.$emit('input', this.chat);
            },
            async search() {
                this.loadProfiles();
            },
            showInput() {
                this.show = this.showInput;
            },
            show() {
                if (this.show === false) {
                    this.$emit('hide');
                }
            }
        },
        methods: {
            getEditItem() {
                return this.chat;
            },
            cancel() {
                this.$emit('cancel');
            },
            save() {
                this.$emit('save', this.chat);
            },
            getProfileName(profile) {
                return profile.firstName
                    ? [profile.firstName, profile.lastName].join(' ')
                    : (profile.userName ? '@' + profile.userName : '@' + profile.id);
            },
            async loadProfiles() {
                if (this.isLoading) {
                    return;
                }

                this.isLoading = true;
                let text = this.search;
                let filter = {};
                if (this.funnelIds && this.funnelIds.length > 0) {
                    filter['funnelId'] = {$in: this.funnelIds};
                }

                if (this.stageIds && this.stageIds.length > 0) {
                    filter['stageId'] = {$in: this.stageIds};
                }

                if (text) {
                    let query = `.*?${text}.*`;

                    filter['$or'] = [
                        { firstName: { '$regex': query, '$options': 'i' } },
                        { lastName:  { '$regex': query, '$options': 'i' } },
                        { userName:  { '$regex': query, '$options': 'i' } },
                    ]
                }

                let response = await axios.post(`/api/profile/list`, {filter});
                this.profiles = response.data.profiles;
                this.isLoading = false;
            }
        },
        computed: {
            allFunnels() {
                return this.$store.state.funnel.list;
            },
            allStages() {
                return this.$store.getters['stage/byFunnelIds'](this.funnelIds);
            },
            chats() {
                return this.profiles.map(profile => {
                    return {
                        id: profile.id,
                        profile,
                        text: this.getProfileName(profile)
                    }
                });
            }
        }
    }
</script>