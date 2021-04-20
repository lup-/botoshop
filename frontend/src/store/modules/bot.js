import Crud from "./baseCrud";
import axios from "axios";

const API_LIST_URL = `/api/bots/list`;
const API_ADD_URL = `/api/bots/add`;
const API_UPDATE_URL = `/api/bots/update`;
const API_DELETE_URL = `/api/bots/delete`;

const NAME_ITEMS = 'bots';
const NAME_ITEM = 'bot';

export default new Crud({
    API_LIST_URL,
    API_ADD_URL,
    API_UPDATE_URL,
    API_DELETE_URL,

    NAME_ITEMS,
    NAME_ITEM
}, {
    actions: {
        async restartBot({commit}, bot) {
            let {data} = await axios.post(`/api/bots/restart`, {bot});
            if (data && data.bot && data.bot.username === bot.username) {
                commit('setSuccessMessage', 'Бот перезапущен!', { root: true });
            }
            else {
                let error = data.error ? data.error.message || '<данных об ошибке нет>' : '<данных об ошибке нет>';
                commit('setErrorMessage', `Ошибка перезагрузки бота: ${error}!`, { root: true });
            }
            return data;
        },
    }
});