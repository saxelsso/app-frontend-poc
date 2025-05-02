import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import TodosView from '../views/TodosView.vue';
import SalesView from '../views/SalesView.vue';
import { getCurrentUser } from 'aws-amplify/auth';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { requiresAuth: false } // Public route
  },
  {
    path: '/todos',
    name: 'todos',
    component: TodosView,
    meta: { requiresAuth: true } // Protected route
  },
  {
    path: '/sales',
    name: 'sales',
    component: SalesView,
    meta: { requiresAuth: true } // Protected route
  }
];


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

// Navigation guard
router.beforeEach(async (to, from, next) => {
  // Check if route requires authentication
  if (to.meta.requiresAuth) {
    try {
      // Check if user is signed in using Amplify v6 auth
      await getCurrentUser();
      // If we get here without throwing an error, user is authenticated
      next();
    } catch (error) {
      // User is not authenticated, redirect to home page
      next('/');
    }
  } else {
    // Route doesn't require authentication
    next();
  }
});

export default router;