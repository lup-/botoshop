import axios from "axios";

const API_LIST_URL = `/api/funnel/:id/stages/list`;
const API_ADD_URL = `/api/funnel/:id/stages/add`;
const API_UPDATE_URL = `/api/funnel/:id/stages/update`;
const API_DELETE_URL = `/api/funnel/:id/stages/delete`;

const NAME_ITEMS = 'stages';
const NAME_ITEM = 'stage';

function getFinalUrl(url, funnelId) {
    return url.replace(':id', funnelId);
}

export default {
    namespaced: true,
    state: {
        list: [],
        edit: false,
        funnelId: false,
        currentFilter: false,
    },
    actions: {
        async loadItems({commit}, {funnelId, filter}) {
            filter = filter || {};
            let response = await axios.post(getFinalUrl(API_LIST_URL, funnelId), {filter});
            await commit('setFilter', filter);
            await commit('setFunnelId', funnelId);
            return commit('setItems', response.data[NAME_ITEMS]);
        },
        async setEditItem({commit, state}, itemId) {
            let item = state.list.find(item => item.id === itemId);
            if (item) {
                commit('setEditItem', item);
            }
        },
        async newItem({dispatch, state}, {item, funnelId}) {
            let query = {};
            query[NAME_ITEM] = item;

            let result = await axios.post(getFinalUrl(API_ADD_URL, funnelId), query);
            dispatch('setEditItem', result.data[NAME_ITEM]);
            return dispatch('loadItems', {funnelId, filter: state.currentFilter});
        },
        async saveItem({dispatch, commit, state}, {item, funnelId}) {
            try {
                let query = {};
                query[NAME_ITEM] = item;

                let response = await axios.post(getFinalUrl(API_UPDATE_URL, funnelId), query);
                let isSuccess = response && response.data && response.data[NAME_ITEM] && response.data[NAME_ITEM].id;
                if (isSuccess) {
                    commit('setSuccessMessage', 'Данные сохранены!');
                }
                else {
                    commit('setErrorMessage', 'Ошибка сохранения данных!');
                }
            }
            catch (e) {
                commit('setErrorMessage', 'Ошибка сохранения данных!')
            }

            return dispatch('loadItems', {funnelId, filter: state.currentFilter});
        },
        async deleteItem({dispatch, state}, {item, funnelId}) {
            let query = {};
            query[NAME_ITEM] = item;

            await axios.post(getFinalUrl(API_DELETE_URL, funnelId), query);
            return dispatch('loadItems', {funnelId, filter: state.currentFilter});
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
        setFunnelId(state, funnelId) {
            state.funnelId = funnelId;
        }
    }
}