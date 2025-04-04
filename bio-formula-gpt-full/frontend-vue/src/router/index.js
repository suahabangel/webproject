import { createRouter, createWebHistory } from 'vue-router';
import ChatPage from '../pages/ChatPage.vue';
import HistoryPage from '../pages/users/HistoryPage.vue';
import UserProfile from '../pages/users/UserProfile.vue';

const routes = [
  { path: '/', component: ChatPage },
  { path: '/history', component: HistoryPage },
  { path: '/profile', component: UserProfile },
];

export default createRouter({
  history: createWebHistory(),
  routes,
});
