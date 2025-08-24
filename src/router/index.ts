
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import TodosView from '../views/TodosView.vue';
import SalesView from '../views/SalesView.vue';
import LoginView from '../views/LoginView.vue';
import PortfolioView from '../views/PortfolioView.vue';
import WeatherView from '../views/WeatherView.vue';
import TreeView from '../views/TreeView.vue';
import BarcodeView from '../views/BarcodeView.vue';
import ProductView from '../views/ProductView.vue';
import InventoryView from '../views/InventoryView.vue';
import OrderView from '../views/OrderView.vue';
import OrderHistoryView from '../views/OrderHistoryView.vue';
import StatsView from '../views/StatsView.vue';
import { getCurrentUser } from 'aws-amplify/auth';
//import { Auth } from 'aws-amplify';


const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { requiresAuth: false } // Public route
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
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
  },
  {
    path: '/portfolio',
    name: 'portfolio',
    component: PortfolioView,
    meta: { requiresAuth: true }
  },
  {
    path: '/weather',
    name: 'weather',
    component: WeatherView,
    meta: { requiresAuth: false } // Public route
  },
  {
    path: '/trees',
    name: 'trees',
    component: TreeView,
    meta: { requiresAuth: true } // Protected route
  },
    {
        path: '/barcode',
        name: 'barcode',
        component: BarcodeView,
        meta: { requiresAuth: false }
    },
    {
        path: '/product',
        name: 'product',
        component: ProductView,
        meta: { requiresAuth: true }
    },
    {
        path: '/inventory',
        name: 'inventory',
        component: InventoryView,
        meta: { requiresAuth: true }
    },
    {
        path: '/order',
        name: 'Order',
        component: OrderView,
        meta: { requiresAuth: true }
    },
    {
        path: '/orderhistory',
        name: 'OrderHistory',
        component: OrderHistoryView,
        meta: { requiresAuth: true }
    },
    {
        path: '/stats',
        name: 'Stats',
        component: StatsView,
        meta: { requiresAuth: true }
    },
];


const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
});

// Navigation guard to check authentication for protected routes
router.beforeEach(async (to, from, next) => {
  if (to.meta.requiresAuth) {
    try {
      // Check if user is authenticated
      await getCurrentUser();
      // User is authenticated, proceed to route
      next();
    } catch (error) {
      // User is not authenticated, redirect to login with the intended destination
      next({
        name: 'login',
        query: { redirect: to.fullPath }
      });
    }
  } else {
    // Route doesn't require auth, proceed
    next();
  }
});

export default router;
