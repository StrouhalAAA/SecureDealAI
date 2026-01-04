import { createRouter, createWebHistory } from 'vue-router';

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../pages/Dashboard.vue'),
  },
  {
    path: '/opportunity/:id',
    name: 'Detail',
    component: () => import('../pages/Detail.vue'),
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
