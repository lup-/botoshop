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
            let isSuccess = response && response.data && response.data.shop;
            let isSyncSuccess = response && response.data && response.data.restart && !response.data.restart.error;

            if (isSuccess && isSyncSuccess) {
                commit('setSuccessMessage', 'Данные сохранены!', { root: true });
            }
            else if (isSuccess) {
                commit('setWarnMessage', 'Данные сохранены, но бот не перезапущен!', { root: true });
            }
            else {
                commit('setErrorMessage', 'Ошибка сохранения данных!', { root: true });
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