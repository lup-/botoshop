import Vue from 'vue';
import VueRouter from 'vue-router';

import Home from "../components/Home";
import Details from "../components/Stats/Details";
import MailingsList from "../components/Mailings/List";
import PaymentsList from "../components/Payments/List";
import SubscribersList from "../components/Subscribers/List";
import Login from '../components/Users/Login';
import UsersEdit from '../components/Users/Edit';
import UsersList from '../components/Users/List';
import store from "../store";

Vue.use(VueRouter);

const routes = [
    { name: 'home', path: '/', component: Home, meta: {requiresAuth: true, group: 'home'} },
    { name: 'login', path: '/login', component: Login },
    { name: 'statsDetails', path: '/stats/', component: Details, meta: {requiresAuth: true, group: 'statsDetails'} },
    { name: 'mailingList', path: '/mailings/', component: MailingsList, meta: {requiresAuth: true, group: 'mailingList'} },
    { name: 'subscribersList', path: '/subscribers/', component: SubscribersList, meta: {requiresAuth: true, group: 'subscribersList'} },
    { name: 'paymentsList', path: '/payments/', component: PaymentsList, meta: {requiresAuth: true, group: 'paymentsList'} },
    { name: 'usersList', path: '/users/', component: UsersList, meta: {requiresAuth: true, group: 'usersList'} },
    { name: 'userNew', path: '/users/new', component: UsersEdit, meta: {requiresAuth: true, group: 'usersList'} },
    { name: 'userEdit', path: '/users/:id', component: UsersEdit, meta: {requiresAuth: true, group: 'usersList'} },
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