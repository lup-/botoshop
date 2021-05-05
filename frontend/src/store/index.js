import Vue from 'vue';
import Vuex from 'vuex';

import shop from "./modules/shop";
import mailing from "./modules/mailing";
import stats from "./modules/stats";
import user from "./modules/user";
import owner from "./modules/owner";
import category from "./modules/category";
import payment from "./modules/payment";
import product from "./modules/product";
import chat from "./modules/chat";

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        appError: false,
        appMessage: false,
        loading: false,
        routes: [
            {code: 'statsDetails', title: 'Статистика', icon: 'mdi-database'},
            {code: 'chats', title: 'Переписка', icon: 'mdi-chat'},
            {code: 'mailingsList', title: 'Рассылки', icon: 'mdi-email'},
            {code: 'categoriesList', title: 'Категории', icon: 'mdi-tag-multiple'},
            {code: 'productsList', title: 'Товары', icon: 'mdi-cart'},
            {code: 'paymentsList', title: 'Платежи', icon: 'mdi-cash'},
            {code: 'usersList', title: 'Пользователи', icon: 'mdi-account'},
            {code: 'settings', title: 'Настройки', icon: 'mdi-cog'},
        ],
        showChatsList: true,
    },
    getters: {
        allowedRoutes(state, getters) {
            return state.routes.filter(route => getters.userHasRights(route.code));
        },
        botId(state, getters, rootState) {
            let bot = rootState.shop.bot || {};
            return bot && bot.id ? bot.id : false;
        }
    },
    mutations: {
        setLoading(state, newLoadingState) {
            state.loading = newLoadingState;
        },
        setAppError(state, error) {
            state.appError = error;
        },
        setErrorMessage(state, text) {
            state.appMessage = {text, color: 'error'};
        },
        setSuccessMessage(state, text) {
            state.appMessage = {text, color: 'success'};
        },
        setInfoMessage(state, text) {
            state.appMessage = {text, color: 'info'};
        },
        setShowChatsList(state, newShowState) {
            state.showChatsList = newShowState;
        }
    },
    actions: {},
    modules: {
        shop,
        mailing,
        stats,
        user,
        payment,
        product,
        chat,
        owner,
        category
    }
})
