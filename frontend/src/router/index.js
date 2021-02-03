import Vue from 'vue';
import VueRouter from 'vue-router';
import CvList from '../components/Cv/List';
import CvEdit from '../components/Cv/Edit';
import CvShow from '../components/Cv/Show';
import Home from '../components/Home';

Vue.use(VueRouter);

const routes = [
    { path: '/:slug', name: 'Show', component: CvShow },
    { path: '/', name: 'Home', component: Home },
    { path: '/cv/list', name: 'List', component: CvList },
    { path: '/cv/edit/:id', name: 'Edit', component: CvEdit },
    { path: '/cv/new', name: 'New', component: CvEdit },
]

const router = new VueRouter({
    mode: 'history',
    base: process.env.BASE_URL,
    routes
});

export default router;
