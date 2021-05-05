import Crud from "./baseCrud";

const API_LIST_URL = `/api/user/list`;
const API_ADD_URL = `/api/user/add`;
const API_UPDATE_URL = `/api/user/update`;
const API_DELETE_URL = `/api/user/delete`;

const NAME_ITEMS = 'users';
const NAME_ITEM = 'user';

export default new Crud({
    API_LIST_URL,
    API_ADD_URL,
    API_UPDATE_URL,
    API_DELETE_URL,

    NAME_ITEMS,
    NAME_ITEM
});