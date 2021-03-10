import axios from "axios";

export default {
    state: {
        chat: false,
        filter: false,
        chats: [],
        allChats: [],
        unread: [],
        chatHistory: [],
    },
    actions: {
        async loadChat({commit}, {chatId, botId}) {
            let response = await axios.post(`/api/chat/${botId}/${chatId}`, {});

            return commit('setChat', response.data.chat);
        },
        async loadChats({commit}, filter) {
            commit('setChatFilter', filter);
            let response = await axios.post(`/api/chat/list`, {filter});
            return commit('setChats', response.data.chats);
        },
        async loadUnreadChats({commit}) {
            let response = await axios.post(`/api/chat/unread`, {});
            return commit('setUnreadChats', response.data.chats);
        },
        async loadChatHistory({commit}, {id, botId}) {
            let response = await axios.post(`/api/chat/history`, {id, botId});
            return commit('setChatHistory', response.data.history);
        },
        async loadAllChats({commit}) {
            let response = await axios.post(`/api/chat/list`, {});
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
        async reply({dispatch}, {id, botId, funnelId, text}) {
            await axios.post(`/api/chat/reply`, {id, botId, funnelId, text});
            return dispatch('loadChatHistory', {id, botId});
        },
        async markRead({dispatch}, {chatId, botId}) {
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
        },
        setChatFilter(state, filter) {
            state.filter = filter;
        },
        setChatHistory(state, history) {
            state.chatHistory = history;
        },
    }
}