import Vue from 'vue';
import VueRouter from 'vue-router';

import Home from "../components/Home";
import Details from "../components/Stats/Details";
import MailingsList from "../components/Mailings/List";
import MailingEdit from "../components/Mailings/Edit";
import PaymentsList from "../components/Payments/List";
import Login from '../components/Users/Login';
import UsersEdit from '../components/Users/Edit';
import UsersList from '../components/Users/List';
import BotsEdit from '../components/Bots/Edit';
import BotsList from '../components/Bots/List';
import FunnelsEdit from '../components/Funnels/Edit';
import FunnelBuilder from '../components/Funnels/Builder';
import FunnelsList from '../components/Funnels/List';
import PollsEdit from '../components/Polls/Edit';
import PollsList from '../components/Polls/List';
import PollStat from '../components/Polls/Stat';
import StagesEdit from '../components/Stages/Edit';
import StagesList from '../components/Stages/List';
import DirectChat from "@/components/Chats/DirectChat";
import Export from "@/components/Export/List";

import store from "../store";

Vue.use(VueRouter);

const routes = [
    { name: 'home', path: '/', component: Home, meta: {requiresAuth: true, group: 'home'} },
    { name: 'login', path: '/login', component: Login },
    { name: 'statsDetails', path: '/stats/', component: Details, meta: {requiresAuth: true, group: 'statsDetails'} },
    { name: 'mailingsList', path: '/mailings/', component: MailingsList, meta: {requiresAuth: true, group: 'mailingsList'} },
    { name: 'mailingNew', path: '/mailings/new', component: MailingEdit, meta: {requiresAuth: true, group: 'mailingsList'} },
    { name: 'mailingEdit', path: '/mailings/:id', component: MailingEdit, meta: {requiresAuth: true, group: 'mailingsList'} },
    { name: 'paymentsList', path: '/payments/', component: PaymentsList, meta: {requiresAuth: true, group: 'paymentsList'} },
    { name: 'usersList', path: '/users/', component: UsersList, meta: {requiresAuth: true, group: 'usersList'} },
    { name: 'userNew', path: '/users/new', component: UsersEdit, meta: {requiresAuth: true, group: 'usersList'} },
    { name: 'userEdit', path: '/users/:id', component: UsersEdit, meta: {requiresAuth: true, group: 'usersList'} },
    { name: 'botsList', path: '/bots/', component: BotsList, meta: {requiresAuth: true, group: 'botsList'} },
    { name: 'botNew', path: '/bots/new', component: BotsEdit, meta: {requiresAuth: true, group: 'botsList'} },
    { name: 'botEdit', path: '/bots/:id', component: BotsEdit, meta: {requiresAuth: true, group: 'botsList'} },
    { name: 'funnelsList', path: '/funnels/', component: FunnelsList, meta: {requiresAuth: true, group: 'funnelsList'} },
    { name: 'funnelNew', path: '/funnels/new', component: FunnelsEdit, meta: {requiresAuth: true, group: 'funnelsList'} },
    { name: 'funnelEdit', path: '/funnels/:id', component: FunnelsEdit, meta: {requiresAuth: true, group: 'funnelsList'} },
    { name: 'funnelBuilderNew', path: '/funnels/builder/new', component: FunnelBuilder, meta: {requiresAuth: true, group: 'funnelsList'} },
    { name: 'funnelBuilderEdit', path: '/funnels/builder/:id', component: FunnelBuilder, meta: {requiresAuth: true, group: 'funnelsList'} },
    { name: 'pollsList', path: '/polls/', component: PollsList, meta: {requiresAuth: true, group: 'pollsList'} },
    { name: 'pollNew', path: '/polls/new', component: PollsEdit, meta: {requiresAuth: true, group: 'pollsList'} },
    { name: 'pollEdit', path: '/polls/:id', component: PollsEdit, meta: {requiresAuth: true, group: 'pollsList'} },
    { name: 'pollStat', path: '/polls/stat/:id', component: PollStat, meta: {requiresAuth: true, group: 'pollsList'} },
    { name: 'stagesList', path: '/funnels/:funnelId/stages/', component: StagesList, meta: {requiresAuth: true, group: 'funnelsList'} },
    { name: 'stageNew', path: '/funnels/:funnelId/stages/new', component: StagesEdit, meta: {requiresAuth: true, group: 'funnelsList'} },
    { name: 'stageEdit', path: '/funnels/:funnelId/stages/:id', component: StagesEdit, meta: {requiresAuth: true, group: 'funnelsList'} },
    { name: 'chats', path: '/chats', component: DirectChat, meta: {requiresAuth: true, group: 'chats'} },
    { name: 'export', path: '/export', component: Export, meta: {requiresAuth: true, group: 'export'} },
]

const router = new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    routes
});

router.beforeEach(async (to, from, next) => {
    if (to.matched.some(record => record.meta.requiresAuth)) {
        await store.dispatch('loginLocalUser');
        let isNotLoggedIn = !store.getters.isLoggedIn;
        let loginTo = {
            path: '/login',
            query: { redirect: to.fullPath }
        };

        if (isNotLoggedIn) {
            next(loginTo);
        }
        else {
            let routeGroup = to.matched && to.matched[0] ? to.matched[0].meta.group : false;

            if (routeGroup && store.getters.userHasRights(routeGroup)) {
                next();
            }
            else {
                store.commit('setErrorMessage', 'Не достаточно прав!');
                next(loginTo);
            }
        }
    }
    else {
        next();
    }
})

export {router, store};