import Vue from 'vue';
import Vuex from 'vuex';

import mailing from "./modules/mailing";
import stats from "./modules/stats";
import user from "./modules/user";
import payment from "./modules/payment";
import subscriber from "./modules/subscriber";
import funnel from "./modules/funnel";
import stage from "./modules/stage";
import bot from "./modules/bot";

Vue.use(Vuex);

export default new Vuex.Store({
    state: {
        appError: false,
        appMessage: false,
        loading: false,
        routes: [
            {code: 'statsDetails', title: 'Статистика', icon: 'mdi-database'},
            {code: 'mailingsList', title: 'Рассылки', icon: 'mdi-email'},
            {code: 'botsList', title: 'Боты', icon: 'mdi-robot'},
            {code: 'funnelsList', title: 'Воронки', icon: 'mdi-filter-variant'},
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
    },
    actions: {},
    modules: {
        mailing,
        stats,
        user,
        payment,
        subscriber,
        funnel,
        stage,
        bot
    }
})
