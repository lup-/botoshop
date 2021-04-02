<template>
    <v-container class="fill-height align-start content-container" fluid app style="position: relative">
        <v-navigation-drawer absolute :permanent="isWideDisplay" v-model="showSidebar">
            <v-expansion-panels accordion class="chat-list">
                <v-expansion-panel v-for="data in grouppedChats" :key="data.funnelId">
                    <v-expansion-panel-header>
                        {{data.funnel ? data.funnel.title || 'Без названия' : 'Без воронки'}}
                    </v-expansion-panel-header>
                    <v-expansion-panel-content>
                        <v-list>
                            <v-list-item-group color="primary">
                                <v-list-item v-for="chat in data.chats" :key="chat.id" @click="selectChat(chat)">
                                    <v-list-item-content>
                                        <v-list-item-title v-if="chat.unreadMessages && chat.unreadMessages.length > 0">
                                            <v-badge color="error" :content="chat.unreadMessages.length">{{getChatTitle(chat.user)}}</v-badge>
                                        </v-list-item-title>
                                        <v-list-item-title v-else>{{getChatTitle(chat.user)}}</v-list-item-title>
                                    </v-list-item-content>
                                    <v-list-item-action>
                                        <v-btn icon @click.stop="markRead(chat)"><v-icon>mdi-eye-off</v-icon></v-btn>
                                    </v-list-item-action>
                                </v-list-item>
                            </v-list-item-group>
                        </v-list>
                    </v-expansion-panel-content>
                </v-expansion-panel>
            </v-expansion-panels>
        </v-navigation-drawer>

        <v-btn fab bottom right fixed large color="primary" @click="showChatSearch = true">
            <v-icon>mdi-plus</v-icon>
        </v-btn>

        <v-row class="fill-height">
            <v-col cols="12" md="3">
            </v-col>
            <v-col cols="12" md="9" class="d-flex flex-column message-list" v-if="selectedChat">
                <v-card v-for="message in chatMessages" :key="message.messageId"
                        class="mb-2"
                        width="70%"
                        :class="{'my align-self-end': selectedChat.id !== message.message.from.id}"
                        :color="selectedChat.id === message.message.from.id ? 'white' : 'blue'"
                        :dark="selectedChat.id !== message.message.from.id"
                >
                    <v-card-text class="pb-0 d-flex">
                        <b>{{getChatTitle(message.message.from)}}</b>
                        <small class="ml-4">{{getMessageTime(message.message)}}</small>
                        <v-spacer></v-spacer>
                        <small>{{getStageName(message)}}</small>
                    </v-card-text>

                    <v-card-text v-html="message.message.text" class="pt-0"></v-card-text>
                </v-card>
                <div class="scroll-holder" v-if="selectedChat"></div>

                <v-sheet class="message-block white" v-if="selectedChat">
                    <v-row>
                        <v-col cols="12">
                            <v-textarea v-model="reply[selectedChat.id+':'+selectedChat.botId]" label="Сообщение"></v-textarea>
                        </v-col>
                    </v-row>
                    <v-row>
                        <v-col cols="12">
                            <v-btn @click="sendReply">Отправить<v-icon>mdi-telegram</v-icon></v-btn>
                        </v-col>
                    </v-row>
                </v-sheet>
            </v-col>
            <v-col cols="12" md="9" class="d-flex flex-column pt-4 text-center" v-else>
                Чат не выбран
            </v-col>
        </v-row>
        <chat-search-dialog
            v-model="newChat"
            :show-input="showChatSearch"
            @cancel="showChatSearch = false"
            @save="addChat"
        ></chat-search-dialog>
    </v-container>
</template>

<script>
    import moment from "moment";
    import ChatSearchDialog from "@/components/Chats/ChatSearchDialog";

    export default {
        name: "DirectChat",
        components: {ChatSearchDialog},
        async mounted() {
            await this.loadBots();
            await this.loadFunnels();
            await this.loadUnreadChats();
            this.startHistoryPolling();
        },
        beforeDestroy () {
            this.stopHistoryPolling();
        },
        data() {
            return {
                selectedChat: null,
                reply: {},
                pollIntervalId: false,
                pollMs: 10000,
                showChatSearch: false,
                newChat: false,
            }
        },
        methods: {
            async addChat() {
                if (!this.newChat) {
                    return;
                }

                await this.$store.dispatch('addChat', this.newChat);
                let {funnelId} = this.newChat.profile;
                this.selectedFunnelIndex = this.activeFunnels.findIndex(funnel => funnel.id === funnelId);
                this.selectedChatIndex = this.unreadChats.length - 1;
                this.showChatSearch = false;
            },
            loadFunnels() {
                return this.$store.dispatch('funnel/loadItems');
            },
            loadBots() {
                return this.$store.dispatch('bot/loadItems');
            },
            loadUnreadChats() {
                return this.$store.dispatch('loadUnreadChats');
            },
            startHistoryPolling() {
                this.pollIntervalId = setInterval(() => {
                    this.loadChatHistory();
                    this.loadUnreadChats();
                }, this.pollMs);
            },
            stopHistoryPolling() {
                if (this.pollIntervalId) {
                    clearInterval(this.pollIntervalId);
                }
            },
            loadChatHistory() {
                if (!this.selectedChat) {
                    return;
                }

                return this.$store.dispatch('loadChatHistory', this.selectedChat);
            },
            selectChat(chat) {
                this.selectedChat = chat;
                this.loadChatHistory();
            },
            getChatTitle(user) {
                if (!user) {
                    return '@';
                }
                return user.first_name
                    ? user.first_name+(user.last_name ? ' '+user.last_name : '')
                    : '@'+(user.username || user.id)
            },
            getMessageTime(message) {
                let time = moment.unix(message.date);
                return time.fromNow();
            },
            getStageName(message) {
                let {funnelId, stageId} = message;
                let stage = this.$store.getters['stage/byFunnelAndId'](funnelId, stageId);
                if (stage) {
                    return stage.title;
                }
            },
            sendReply() {
                let key = this.selectedChat.id+':'+this.selectedChat.botId;
                let text = this.reply[key];
                let funnelId = this.selectedFunnel ? this.selectedFunnel.id : null;
                this.reply[key] = '';

                this.$store.dispatch('reply', {id: this.selectedChat.id, botId: this.selectedChat.botId, funnelId, text})
            },
            markRead(chat) {
                this.selectedChatIndex = null;
                this.$store.dispatch('markRead', {chatId: chat.id, botId: chat.botId});
            }
        },
        computed: {
            unreadChats() {
                return this.$store.state.chat.unread;
            },
            grouppedChats() {
                if (!this.unreadChats) {
                    return [];
                }

                let chatsHash = {};
                for (let chat of this.unreadChats) {
                    for (let funnelId of chat.funnelIds) {
                        if (!chatsHash[funnelId]) {
                            chatsHash[funnelId] = [];
                        }

                        chatsHash[funnelId].push(chat);
                    }
                }

                let grouppedChats = [];
                for (let funnelId in chatsHash) {
                    let funnel = this.$store.getters['funnel/byId'](funnelId);
                    let chats = chatsHash[funnelId];
                    grouppedChats.push({funnelId, funnel, chats});
                }

                return grouppedChats;
            },
            chatMessages() {
                let history = this.$store.state.chat.chatHistory;
                if (this.selectedFunnel) {
                    history = history.filter(chat => chat.funnelId === this.selectedFunnel.id || !chat.funnelId);
                }

                return history;
            },
            activeFunnels() {
                let botIds = this.unreadChats
                    .map(chat => chat.botId)
                    .filter( (id, index, all) =>  all.indexOf(id) === index );

                let bots = this.$store.state.bot.list.filter(bot => botIds.indexOf(bot.botId) !== -1);
                let funnelsIds = bots
                    .reduce( (funnels, bot) => funnels.concat(bot.funnels || []), [] )
                    .filter( (id, index, all) =>  all.indexOf(id) === index );

                let funnels = this.$store.state.funnel.list.filter(funnel => funnelsIds.indexOf(funnel.id) !== -1);

                return funnels;
            },
            selectedFunnel() {
                if (this.activeFunnels.length === 0) {
                    return null;
                }

                if (this.selectedFunnelIndex === null) {
                    return null;
                }

                return this.activeFunnels[this.selectedFunnelIndex];
            },
            isWideDisplay() {
                let alwaysShowBreakpoints = ['md', 'lg', 'xl'];
                let breakpoint = this.$vuetify.breakpoint.name;
                return alwaysShowBreakpoints.indexOf(breakpoint) !== -1;
            },
            showSidebar() {
                if (this.isWideDisplay) {
                    return true;
                }

                return this.$store.state.showChatsList;
            }
        }
    }
</script>

<style scoped>
    .message-list {
    }
    .message-block {
        position: fixed;
        bottom: 0;
        width: 75%;
        padding: 0 74px 24px 0;
        height: 250px;
    }

    .scroll-holder {
        width: 100%;
        height: 250px;
    }

    @media (max-width: 960px) {
        .message-block {
            width: 100%;
            padding: 0 80px 24px 0;
        }
    }
</style>

<style>
    .chat-list .v-expansion-panel-content__wrap {padding: 0 0 16px;}
</style>