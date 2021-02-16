import axios from "axios";

export default {
    state: {
        list: [],
        edit: false,
        currentFilter: false,
    },
    actions: {
        async loadSubscribers({commit}, filter = {}) {
            let response = await axios.post(`/api/subscriber/list`, {filter});
            await commit('setFilter', filter);
            return commit('setSubscribers', response.data.subscribers);
        },
        async setEditSubscriber({commit, state}, subscriberId) {
            let subscriber = state.list.find(item => item.id === subscriberId);
            if (subscriber) {
                commit('setEditSubscriber', subscriber);
            }
        },
        async editSubscriber({dispatch, commit, state}, subscriber) {
            try {
                let response = await axios.post(`/api/subscriber/update`, {subscriber});
                let isSuccess = response && response.data && response.data.subscriber && response.data.subscriber.id;
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

            return dispatch('loadSubscribers', state.currentFilter);
        },
    },
    mutations: {
        setSubscribers(state, subscribers) {
            state.list = subscribers;
        },
        setFilter(state, filter) {
            state.currentFilter = filter;
        },
        setEditSubscriber(state, subscriber) {
            state.edit = subscriber;
        },
    }
}