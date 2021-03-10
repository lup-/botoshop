<template>
    <v-card>
        <v-card-title>
            {{chat.first_name}} {{chat.last_name}}
            <v-icon v-if="chat.blocked">mdi-skull</v-icon>
            <!--
            <v-btn icon small @click="isEditing = true" v-if="!isEditing"><v-icon small>mdi-pencil</v-icon></v-btn>
            <v-btn icon small @click="commitGroups" v-else><v-icon small>mdi-check</v-icon></v-btn>
            -->
        </v-card-title>
        <v-card-subtitle>
            <a :href="'https://t.me/'+(chat.username || chat.id)" target="_blank">@{{chat.username || chat.id}}</a>
        </v-card-subtitle>
        <v-card-text>
            <v-autocomplete v-if="isEditing"
                    v-model="chat.groups"
                    :items="allGroups"
                    chips
                    deletable-chips
                    clearable
                    label="Группы"
                    multiple
                    no-data-text="Групп не найдено"
            >
            </v-autocomplete>
            <v-chip v-for="group in chat.groups" :key="group.id">{{group.name}}</v-chip>
        </v-card-text>
    </v-card>
</template>

<script>
    export default {
        name: "ChatForm",
        props: ['chat'],
        data() {
            return {
                isEditing: false,
                groups: this.chat ? this.chat.groups || [] : [],
            }
        },
        methods: {
            commitGroups() {

            }
        },
        computed: {
            allGroups() {
                let stateGroups = this.$store.state.group.allGroups || [];
                return stateGroups.map((group) => {
                    return {
                        text: group.name,
                        value: group.id,
                    };
                });
            }
        }
    }
</script>

<style scoped>

</style>