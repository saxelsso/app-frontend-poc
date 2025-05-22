<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router';
import { ref, onMounted } from 'vue';
//import { Auth } from '@aws-amplify/auth';
import { getCurrentUser } from 'aws-amplify/auth';
import { signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

const isAuthenticated = ref(false);
const router = useRouter();

// Function to check authentication status
const checkAuth = async () => {
  try {
    await getCurrentUser();
    isAuthenticated.value = true;
    console.log('User is authenticated');
  } catch (error) {
    isAuthenticated.value = false;
    console.log('User is not authenticated');
  }
};

// Check authentication status on component mount
onMounted(async () => {
  await checkAuth();

  // Listen for auth events
  Hub.listen('auth', ({ payload }) => {
    const { event } = payload;
    if (event === 'signedIn') {
      checkAuth();
    } else if (event === 'signedOut') {
      isAuthenticated.value = false;
    }
  });
});


// Handle sign out
const handleSignOut = async () => {
  try {
    await signOut();
    isAuthenticated.value = false;
    router.push('/');
  } catch (error) {
    console.error('Error signing out:', error);
  }
};
</script>

<template>
  <nav class="navbar">
    <div class="nav-container">
      <div class="nav-logo">App</div>
      <div class="nav-links">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/weather">Weather</RouterLink>
        <RouterLink to="/todos">Todos</RouterLink>
        <RouterLink to="/sales">Sales</RouterLink>
        <RouterLink to="/portfolio">Portfolio</RouterLink>


        <!-- Show login or logout based on authentication status -->
        <template v-if="isAuthenticated">
          <a href="#" @click.prevent="handleSignOut" class="auth-link">Sign Out</a>
        </template>
        <template v-else>
          <RouterLink to="/login" class="auth-link">Login</RouterLink>
        </template>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.navbar {
  display: flex;
  justify-content: center;
  background-color: #1a1a1a;
  color: white;
  width: 100%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.nav-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  max-width: 1000px;
  width: 100%;
}

.nav-logo {
  font-weight: bold;
  font-size: 1.2rem;
}

.nav-links {
  display: flex;
  gap: 20px;
}

.nav-links a {
  color: white;
  text-decoration: none;
  padding: 5px 10px;
  border-radius: 4px;
}

.nav-links a:hover, .nav-links a.router-link-active {
  background-color: #333;
}
</style>
