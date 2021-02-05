import axios from "axios";

export default {
    state: {
        list: [],
        currentFilter: false,
    },
    actions: {
        async loadMailings({commit}, filter = {}) {
            let response = await axios.post(`/api/mailing/list`, {filter});
            await commit('setFilter', filter);
            return commit('setMailings', response.data.mailings);
        },
    },
    mutations: {
        setMailings(state, mailings) {
            state.list = mailings;
        },
        setFilter(state, filter) {
            state.currentFilter = filter;
        }
    }
}