import axios from "axios";

export default {
    namespaced: true,
    state: {
        current: {},
        bot: {},
    },
    actions: {
        async saveSettings({commit, state}, settings = {}) {
            let shop = state.current;
            shop.settings = settings;

            let response = await axios.post(`/api/shop/update`, shop);
            if (response.data.bot) {
                commit('setBot', response.data.bot);
            }
            return commit('setShop', response.data.shop);
        },
    },
    mutations: {
        setBot(state, bot) {
            state.bot = bot;
        },
        setShop(state, shop) {
            state.current = shop;
        },
    }
}