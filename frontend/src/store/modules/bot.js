import Crud from "./baseCrud";

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
});