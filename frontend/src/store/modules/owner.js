import axios from "axios";
import moment from "moment";

const LOGIN_TTL_SECONDS = 86400;

export default {
    state: {
        list: [],
        localTried: false,
        edit: false,
        current: false,
        currentFilter: {}
    },
    getters: {
        isLoggedIn(state) {
            return state.current && state.current.id;
        },
        userHasRights(state) {
            return () => {
                return Boolean(state.current);
            }
        }
    },
    actions: {
        async loginLocalOwner({commit, state}) {
            if (state.localTried) {
                return;
            }

            await commit('setLocalTried', true);
            let savedOwner = localStorage.getItem('currentOwner');
            if (!savedOwner) {
                return;
            }

            let owner = JSON.parse(savedOwner);

            let lastLogin = moment.unix(owner.loggedIn);
            let secondsSinceLogin = moment().diff(lastLogin, 'seconds');
            if (secondsSinceLogin > LOGIN_TTL_SECONDS) {
                return;
            }

            let response = await axios.post(`/api/owner/check`, {id: owner.id});
            let isSuccess = response && response.data && response.data.success === true;
            if (isSuccess) {
                let shop = response.data.shop || {};
                let bot = response.data.bot || {};
                commit('shop/setShop', shop);
                commit('shop/setBot', bot);
                return commit('setCurrentOwner', owner);
            }
        },
        async saveLoggedInOwner(_, owner) {
            owner.loggedIn = moment().unix();
            localStorage.setItem('currentOwner', JSON.stringify(owner));
        },
        async loginOwner({dispatch, commit}, {login, password}) {
            try {
                let response = await axios.post(`/api/owner/login`, {login, password});
                let isSuccess = response && response.data && response.data.owner && response.data.owner.id;
                if (isSuccess) {
                    let owner = response.data.owner;
                    let shop = response.data.shop;
                    let bot = response.data.bot || {};

                    commit('setCurrentOwner', owner);
                    commit('shop/setShop', shop);
                    commit('shop/setBot', bot);
                    dispatch('saveLoggedInOwner', owner);
                    commit('setSuccessMessage', 'Вы вошли в систему', { root: true });
                }
                else {
                    commit('setErrorMessage', 'Ошибка входа!' + (response.data.error ? ' ' + response.data.error : ''), { root: true });
                }
            }
            catch (e) {
                commit('setErrorMessage', 'Ошибка входа!', { root: true })
            }
        },
        async registerOwner({dispatch, commit}, newOwner) {
            try {
                let response = await axios.post(`/api/owner/register`, newOwner);
                let isSuccess = response && response.data && response.data.owner && response.data.owner.id;
                if (isSuccess) {
                    let owner = response.data.owner;
                    let shop = response.data.shop;
                    let bot = response.data.bot || {};

                    commit('setCurrentOwner', owner);
                    commit('shop/setShop', shop);
                    commit('shop/setBot', bot);
                    dispatch('saveLoggedInOwner', owner);
                    commit('setSuccessMessage', 'Вы зарегистрировались!', { root: true });
                }
                else {
                    commit('setErrorMessage', 'Ошибка регистрации!' + (response.data.error ? ' ' + response.data.error : ''), { root: true });
                }
            }
            catch (e) {
                commit('setErrorMessage', 'Ошибка регистрации!', { root: true })
            }
        },
        async logoutOwner({commit}) {
            localStorage.removeItem('currentOwner');
            commit('shop/setShop', {});
            commit('shop/setBot', {})
            return commit('setCurrentOwner', false);
        },
    },
    mutations: {
        setCurrentOwner(state, owner) {
            state.current = owner;
        },
        setFilter(state, filter) {
            state.currentFilter = filter;
        },
        setLocalTried(state, tried) {
            state.localTried = tried;
        }
    }
}