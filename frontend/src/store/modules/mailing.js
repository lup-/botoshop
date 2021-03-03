import Crud from "./baseCrud";

const API_LIST_URL = `/api/mailing/list`;
const API_ADD_URL = `/api/mailing/add`;
const API_UPDATE_URL = `/api/mailing/update`;
const API_DELETE_URL = `/api/mailing/delete`;

const NAME_ITEMS = 'mailings';
const NAME_ITEM = 'mailing';

export default new Crud({
    API_LIST_URL,
    API_ADD_URL,
    API_UPDATE_URL,
    API_DELETE_URL,

    NAME_ITEMS,
    NAME_ITEM
});