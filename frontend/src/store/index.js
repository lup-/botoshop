import Vue from 'vue';
import Vuex from 'vuex';

import mailing from "./modules/mailing";
import stats from "./modules/stats";
import user from "./modules/user";
import payment from "./modules/payment";
import subscriber from "./modules/subscriber";

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        appError: false,
        appMessage: false,
        routes: [
            {code: 'statsDetails', title: 'Статистика', icon: 'mdi-database'},
            {code: 'mailingList', title: 'Рассылка сигналов', icon: 'mdi-email'},
            {code: 'subscribersList', title: 'Подписчики', icon: 'mdi-account-cash'},
            {code: 'paymentsList', title: 'Платежи', icon: 'mdi-cash'},
            {code: 'usersList', title: 'Пользователи админки', icon: 'mdi-account'},
        ]
    },
    getters: {
        allowedRoutes(state, getters) {
            return state.routes.filter(route => getters.userHasRights(route.code));
        }
    },
    mutations: {
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
    },
    actions: {},
    modules: {
        mailing,
        stats,
        user,
        payment,
        subscriber
    }
})
