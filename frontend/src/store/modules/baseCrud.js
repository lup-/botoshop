import axios from "axios";
import merge from "lodash.merge";

export default function (params, extra = {}) {
    const {
        API_LIST_URL,
        API_ADD_URL,
        API_UPDATE_URL,
        API_DELETE_URL,

        NAME_ITEMS,
        NAME_ITEM
    } = params;

    return merge({
        namespaced: true,
        state: {
            list: [],
            edit: false,
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
                if (!API_LIST_URL) {
                    return;
                }

                let response = await axios.post(API_LIST_URL, {filter});
                await commit('setFilter', filter);
                return commit('setItems', response.data[NAME_ITEMS]);
            },
            async setEditItem({commit, state}, itemId) {
                let item = state.list.find(item => item.id === itemId);
                if (item) {
                    commit('setEditItem', item);
                }
            },
            async newItem({dispatch, state}, item) {
                if (!API_ADD_URL) {
                    return;
                }

                let query = {};
                query[NAME_ITEM] = item;

                let result = await axios.post(API_ADD_URL, query);
                dispatch('setEditItem', result.data[NAME_ITEM]);
                return dispatch('loadItems', state.filter);
            },
            async saveItem({dispatch, commit, state}, item) {
                if (!API_UPDATE_URL) {
                    return;
                }

                try {
                    let query = {};
                    query[NAME_ITEM] = item;

                    let response = await axios.post(API_UPDATE_URL, query);
                    let isSuccess = response && response.data && response.data[NAME_ITEM] && response.data[NAME_ITEM].id;
                    if (isSuccess) {
                        commit('setSuccessMessage', 'Данные сохранены!', { root: true });
                    }
                    else {
                        commit('setErrorMessage', 'Ошибка сохранения данных!', { root: true });
                    }
                }
                catch (e) {
                    commit('setErrorMessage', 'Ошибка сохранения данных!', { root: true })
                }

                return dispatch('loadItems', state.currentFilter);
            },
            async deleteItem({dispatch, state}, item) {
                if (!API_DELETE_URL) {
                    return;
                }

                let query = {};
                query[NAME_ITEM] = item;

                await axios.post(API_DELETE_URL, query);
                return dispatch('loadItems', state.filter);
            },
        },
        mutations: {
            setItems(state, items) {
                state.list = items;
            },
            setFilter(state, filter) {
                state.currentFilter = filter;
            },
            setEditItem(state, item) {
                state.edit = item;
            },
        }
    }, extra);
}