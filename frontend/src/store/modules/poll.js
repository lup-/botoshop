import Crud from "./baseCrud";
import axios from "axios";

const API_LIST_URL = `/api/polls/list`;
const API_ADD_URL = `/api/polls/add`;
const API_UPDATE_URL = `/api/polls/update`;
const API_DELETE_URL = `/api/polls/delete`;

const NAME_ITEMS = 'polls';
const NAME_ITEM = 'poll';

export default new Crud({
    API_LIST_URL,
    API_ADD_URL,
    API_UPDATE_URL,
    API_DELETE_URL,

    NAME_ITEMS,
    NAME_ITEM
});