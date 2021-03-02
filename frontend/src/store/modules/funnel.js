import Crud from "./baseCrud";

const API_LIST_URL = `/api/funnels/list`;
const API_ADD_URL = `/api/funnels/add`;
const API_UPDATE_URL = `/api/funnels/update`;
const API_DELETE_URL = `/api/funnels/delete`;

const NAME_ITEMS = 'funnels';
const NAME_ITEM = 'funnel';

export default new Crud({
    API_LIST_URL,
    API_ADD_URL,
    API_UPDATE_URL,
    API_DELETE_URL,

    NAME_ITEMS,
    NAME_ITEM
});