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
        lastSavedItem: false,
        edit: false,
        funnelId: false,
        currentFilter: false,
    },
    getters: {
        byId(state) {
            return itemId => {
                return state.list.find(item => item.id === itemId);
            }
        },
        byFunnelAndId(state, getters, rootState)  {
            return (funnelId, stageId) => {
                let funnel = rootState.funnel.list.find(funnel => funnel.id === funnelId);
                if (!funnel) {
                    return null;
                }

                return funnel.stages.find(item => item.id === stageId);
            }
        },
        byFunnelIds(state, getters, rootState) {
            return (funnelIds) => {
                if (!funnelIds) {
                    return [];
                }

                return rootState.funnel.list.reduce( (stages, funnel) => {
                    let skipFunnel = funnelIds.indexOf(funnel.id) === -1;
                    if (skipFunnel) {
                        return stages;
                    }

                    if (!funnel.stages) {
                        return stages;
                    }

                    return stages.concat( funnel.stages );
                }, [])
            }
        }
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
                return commit('setEditItem', item);
            }
        },
        async newItem({dispatch, commit, state}, {item, funnelId}) {
            let query = {};
            query[NAME_ITEM] = item;

            let result = await axios.post(getFinalUrl(API_ADD_URL, funnelId), query);
            await commit('setLastSavedItem', result.data[NAME_ITEM]);
            await dispatch('setEditItem', result.data[NAME_ITEM]);
            return dispatch('loadItems', {funnelId, filter: state.currentFilter});
        },
        async saveItemQuiet(_, {item, funnelId}) {
            try {
                let query = {};
                query[NAME_ITEM] = item;
                await axios.post(getFinalUrl(API_UPDATE_URL, funnelId), query);
            }
            catch (e) {
                //no-op
            }
        },
        async saveItem({dispatch, commit, state}, {item, funnelId}) {
            try {
                let query = {};
                query[NAME_ITEM] = item;

                let response = await axios.post(getFinalUrl(API_UPDATE_URL, funnelId), query);
                let isSuccess = response && response.data && response.data[NAME_ITEM] && response.data[NAME_ITEM].id;
                if (isSuccess) {
                    await commit('setLastSavedItem', response.data[NAME_ITEM]);
                    await commit('setSuccessMessage', 'Данные сохранены!', { root: true });
                }
                else {
                    await commit('setErrorMessage', 'Ошибка сохранения данных!', { root: true });
                }
            }
            catch (e) {
                await commit('setErrorMessage', 'Ошибка сохранения данных!', { root: true })
            }

            return dispatch('loadItems', {funnelId, filter: state.currentFilter});
        },
        async saveXYPosition({dispatch, commit, state, getters}, {stageId, x, y}) {
            let stage = getters.byId(stageId);
            if (stage) {
                stage.graph = {x, y}
                await dispatch('saveItemQuiet', {item: stage, funnelId: state.funnelId});
                commit('updateItem', stage);
            }
        },
        async saveLinkXYPosition({dispatch, commit, state, getters}, {stageId, linkIndex, x, y}) {
            let stage = getters.byId(stageId);
            let stageHasLinkAtIndex = stage && stage.buttons && stage.buttons[linkIndex].type === 'link';
            if (stageHasLinkAtIndex) {
                stage.buttons[linkIndex].graph = {x, y}
                await dispatch('saveItemQuiet', {item: stage, funnelId: state.funnelId});
                commit('updateItem', stage);
            }
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
        updateItem(state, newItem) {
            let index = state.list.findIndex(item => item.id === newItem.id);
            if (index !== -1) {
                state.list[index] = newItem;
            }
        },
        setFilter(state, filter) {
            state.currentFilter = filter;
        },
        setEditItem(state, item) {
            state.edit = item;
        },
        setFunnelId(state, funnelId) {
            state.funnelId = funnelId;
        },
        setLastSavedItem(state, lastSavedItem) {
            state.lastSavedItem = lastSavedItem;
        }
    }
}