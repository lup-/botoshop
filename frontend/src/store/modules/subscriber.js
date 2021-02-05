import axios from "axios";

export default {
    state: {
        list: [],
        currentFilter: false,
    },
    actions: {
        async loadSubscribers({commit}, filter = {}) {
            let response = await axios.post(`/api/subscriber/list`, {filter});
            await commit('setFilter', filter);
            return commit('setSubscribers', response.data.subscribers);
        },
    },
    mutations: {
        setSubscribers(state, subscribers) {
            state.list = subscribers;
        },
        setFilter(state, filter) {
            state.currentFilter = filter;
        }
    }
}