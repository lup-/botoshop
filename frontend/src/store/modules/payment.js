import axios from "axios";

export default {
    state: {
        list: [],
        currentFilter: false,
    },
    actions: {
        async loadPayments({commit, rootState}, filter = {}) {
            let shop = rootState.shop.current;
            let response = await axios.post(`/api/payment/list`, {filter, shop});
            await commit('setFilter', filter);
            return commit('setPayments', response.data.payments);
        },
    },
    mutations: {
        setPayments(state, payments) {
            state.list = payments;
        },
        setFilter(state, filter) {
            state.currentFilter = filter;
        }
    }
}