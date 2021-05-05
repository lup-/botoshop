import axios from "axios";

export default {
    state: {
        chat: false,
        filter: false,
        chats: [],
        allChats: [],
        unread: [],
        newChats: [],
        chatHistory: [],
    },
    actions: {
        addChat({commit}, chat) {
            let profile = chat.profile;

            let newChat = {
                "botId": profile.botId,
                "id": profile.id,
                "chat":{
                    "id": profile.chatId,
                    "first_name": profile.firstName,
                    "last_name": profile.lastName,
                    "username": profile.userName,
                    "type":"private"
                },
                "lastMessage": false,
                "unread": true,
                "user": {
                    "id": profile.id,
                    "is_bot": false,
                    "first_name": profile.firstName,
                    "last_name": profile.lastName,
                    "username": profile.userName,
                    "language_code":"ru"
                }
            }

            commit('addUnreadChat', newChat);
        },
        async loadChat({commit, getters}, {chatId}) {
            let botId = getters.botId;
            if (!botId) {
                return;
            }

            let response = await axios.post(`/api/chat/${botId}/${chatId}`, {});

            return commit('setChat', response.data.chat);
        },
        async loadChats({commit, getters}, filter) {
            let botId = getters.botId;
            if (!botId) {
                return;
            }

            commit('setChatFilter', filter);
            let response = await axios.post(`/api/chat/list`, {filter, botId});
            return commit('setChats', response.data.chats);
        },
        async loadUnreadChats({commit, getters}) {
            let botId = getters.botId;
            if (!botId) {
                return;
            }

            let response = await axios.post(`/api/chat/unread`, {botId});
            return commit('setUnreadChats', response.data.chats);
        },
        async loadChatHistory({commit, getters}, {id}) {
            let botId = getters.botId;
            if (!botId) {
                return;
            }

            let response = await axios.post(`/api/chat/history`, {id, botId});
            return commit('setChatHistory', response.data.history);
        },
        async loadAllChats({commit, getters}) {
            let botId = getters.botId;
            if (!botId) {
                return;
            }

            let response = await axios.post(`/api/chat/list`, {botId});
            return commit('setAllChats', response.data.chats);
        },
        async reloadChats({dispatch, state}) {
            if (state.chats) {
                await dispatch('loadChats', state.filter);
            }

            if (state.chat) {
                await dispatch('loadChat', {chatId: state.chat.id, botId: state.chat.botId});
            }
        },
        async deleteUser({dispatch}, chat) {
            let emptyChat = !chat || (chat && Object.keys(chat).length === 0);
            if (emptyChat) {
                return;
            }

            await axios.post(`/api/chat/delete`, {id: chat.id, botId: chat.botId});

            return dispatch('reloadChats');
        },
        async reply({dispatch, state, getters}, {id, text}) {
            let botId = getters.botId;
            if (!botId) {
                return;
            }

            let data = {id, botId, text};
            let newChat = state.newChats.find(newChat => newChat.id === id && newChat.botId === botId);
            if (newChat) {
                data['newChat'] = newChat;
            }

            await axios.post(`/api/chat/reply`, data);
            return dispatch('loadChatHistory', {id});
        },
        async markRead({dispatch, getters}, {chatId}) {
            let botId = getters.botId;
            if (!botId) {
                return;
            }

            await axios.post(`/api/chat/read`, {chatId, botId});
            return dispatch('loadUnreadChats');
        }
    },
    mutations: {
        setChat(state, chat) {
            state.chat = chat;
        },
        setChats(state, chats) {
            state.chats = chats;
        },
        setAllChats(state, chats) {
            state.allChats = chats;
        },
        setUnreadChats(state, chats) {
            state.unread = chats;
            state.newChats = state.newChats.filter(newChat => {
                let receivedNewChat = chats.find(recChat => recChat.chat.id === newChat.chat.id && recChat.botId === newChat.botId);
                return !receivedNewChat;
            });

            if (state.newChats && state.newChats.length > 0) {
                state.unread = state.unread.concat(state.newChats);
            }
        },
        setChatFilter(state, filter) {
            state.filter = filter;
        },
        setChatHistory(state, history) {
            state.chatHistory = history;
        },
        addUnreadChat(state, chat) {
            state.unread.push(chat);
            state.newChats.push(chat);
        }
    }
}