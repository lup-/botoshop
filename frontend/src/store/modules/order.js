import Crud from "./baseCrud";

const API_LIST_URL = `/api/order/list`;
const API_UPDATE_URL = `/api/order/updateStatus`;
const API_DELETE_URL = `/api/order/finish`;

const NAME_ITEMS = 'orders';
const NAME_ITEM = 'order';

export default new Crud({
    API_LIST_URL,
    API_UPDATE_URL,
    API_DELETE_URL,

    NAME_ITEMS,
    NAME_ITEM
});