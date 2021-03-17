import axios from "axios";

export default {
    namespaced: true,
    state: {
        list: [],
        currentFilter: false,
    },
    getters: {
        byId(state) {
            return itemId => {
                return state.list.find(item => item.id === itemId);
            }
        }
    },
    actions: {
        async loadItems({commit}, filter = {}) {
            let response = await axios.post(`/api/profile/list`, {filter});
            await commit('setFilter', filter);
            return commit('setItems', response.data.profiles);
        },
    },
    mutations: {
        setItems(state, items) {
            state.list = items;
        },
        setFilter(state, filter) {
            state.currentFilter = filter;
        },
    }
}