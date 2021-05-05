import Crud from "./baseCrud";

const API_LIST_URL = `/api/category/list`;
const API_ADD_URL = `/api/category/add`;
const API_UPDATE_URL = `/api/category/update`;
const API_DELETE_URL = `/api/category/delete`;

const NAME_ITEMS = 'categories';
const NAME_ITEM = 'category';

export default new Crud({
    API_LIST_URL,
    API_ADD_URL,
    API_UPDATE_URL,
    API_DELETE_URL,

    NAME_ITEMS,
    NAME_ITEM
});