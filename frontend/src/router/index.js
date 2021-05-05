import Vue from 'vue';
import VueRouter from 'vue-router';

import Home from "../components/Home";
import Details from "../components/Stats/Details";
import MailingsList from "../components/Mailings/List";
import MailingEdit from "../components/Mailings/Edit";
import PaymentsList from "../components/Payments/List";
import Login from '../components/Users/Login';
import Register from '../components/Users/Register';
import ProductsEdit from '../components/Products/Edit';
import ProductsList from '../components/Products/List';
import DirectChat from "@/components/Chats/DirectChat";
import CategoriesList from '../components/Categories/List';
import CategoryEdit from '../components/Categories/Edit';
import UsersList from "../components/Users/List";
import SettingsEdit from "../components/Shop/Settings";

import store from "../store";

Vue.use(VueRouter);

const routes = [
    { name: 'home', path: '/', component: Home, meta: {requiresAuth: true, group: 'home'} },
    { name: 'login', path: '/login', component: Login },
    { name: 'register', path: '/register', component: Register },
    { name: 'settings', path: '/settings', component: SettingsEdit, meta: {requiresAuth: true, group: 'settings'}},
    { name: 'statsDetails', path: '/stats/', component: Details, meta: {requiresAuth: true, group: 'statsDetails'} },
    { name: 'mailingsList', path: '/mailings/', component: MailingsList, meta: {requiresAuth: true, group: 'mailingsList'} },
    { name: 'mailingNew', path: '/mailings/new', component: MailingEdit, meta: {requiresAuth: true, group: 'mailingsList'} },
    { name: 'mailingEdit', path: '/mailings/:id', component: MailingEdit, meta: {requiresAuth: true, group: 'mailingsList'} },
    { name: 'paymentsList', path: '/payments/', component: PaymentsList, meta: {requiresAuth: true, group: 'paymentsList'} },
    { name: 'categoriesList', path: '/categories/', component: CategoriesList, meta: {requiresAuth: true, group: 'categoriesList'} },
    { name: 'categoryNew', path: '/categories/new', component: CategoryEdit, meta: {requiresAuth: true, group: 'categoriesList'} },
    { name: 'categoryEdit', path: '/categories/:id', component: CategoryEdit, meta: {requiresAuth: true, group: 'categoriesList'} },
    { name: 'productsList', path: '/products/', component: ProductsList, meta: {requiresAuth: true, group: 'productsList'} },
    { name: 'productNew', path: '/products/new', component: ProductsEdit, meta: {requiresAuth: true, group: 'productsList'} },
    { name: 'productEdit', path: '/products/:id', component: ProductsEdit, meta: {requiresAuth: true, group: 'productsList'} },
    { name: 'usersList', path: '/users/', component: UsersList, meta: {requiresAuth: true, group: 'usersList'} },
    { name: 'chats', path: '/chats', component: DirectChat, meta: {requiresAuth: true, group: 'chats'} },
]

const router = new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    routes
});

router.beforeEach(async (to, from, next) => {
    if (to.matched.some(record => record.meta.requiresAuth)) {
        await store.dispatch('loginLocalOwner');
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
                store.commit('setErrorMessage', 'Не достаточно прав!', {root: true});
                next(loginTo);
            }
        }
    }
    else {
        next();
    }
})

export {router, store};