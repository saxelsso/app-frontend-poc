<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router';
import { ref, onMounted } from 'vue';
//import { Auth } from '@aws-amplify/auth';
import { getCurrentUser } from 'aws-amplify/auth';
import { signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

const isAuthenticated = ref(false);
const router = useRouter();
const isMobileMenuOpen = ref(false);

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
      
      <!-- Mobile menu toggle button -->
      <div class="menu-toggle" @click="isMobileMenuOpen = !isMobileMenuOpen">
        <div class="hamburger" :class="{ 'active': isMobileMenuOpen }">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      <!-- Navigation links -->
      <div class="nav-links" :class="{ 'mobile-open': isMobileMenuOpen }">
        <RouterLink to="/" @click="isMobileMenuOpen = false">Home</RouterLink>
        <RouterLink to="/weather" @click="isMobileMenuOpen = false">Weather</RouterLink>
        <RouterLink to="/todos" @click="isMobileMenuOpen = false">Todos</RouterLink>
        <RouterLink to="/sales" @click="isMobileMenuOpen = false">Sales</RouterLink>
        <RouterLink to="/portfolio" @click="isMobileMenuOpen = false">Portfolio</RouterLink>

        <!-- Show login or logout based on authentication status -->
        <template v-if="isAuthenticated">
          <a href="#" @click.prevent="handleSignOut" class="auth-link">Sign Out</a>
        </template>
        <template v-else>
          <RouterLink to="/login" class="auth-link" @click="isMobileMenuOpen = false">Login</RouterLink>
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
  position: relative;
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

/* Hamburger menu styles */
.menu-toggle {
  display: none;
  cursor: pointer;
}

.hamburger {
  width: 24px;
  height: 24px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
}

.hamburger span {
  display: block;
  height: 2px;
  width: 100%;
  background-color: white;
  transition: all 0.3s ease;
}

.hamburger.active span:nth-child(1) {
  transform: translateY(8px) rotate(45deg);
}

.hamburger.active span:nth-child(2) {
  opacity: 0;
}

.hamburger.active span:nth-child(3) {
  transform: translateY(-8px) rotate(-45deg);
}

/* Responsive styles */
@media (max-width: 768px) {
  .menu-toggle {
    display: block;
  }
  
  .nav-links {
    position: absolute;
    top: 60px;
    left: 0;
    right: 0;
    flex-direction: column;
    background-color: #1a1a1a;
    padding: 0;
    gap: 0;
    height: 0;
    overflow: hidden;
    transition: height 0.3s ease;
    z-index: 10;
  }
  
  .nav-links.mobile-open {
    height: auto;
    padding: 10px 0;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  .nav-links a {
    width: 100%;
    padding: 12px 20px;
    border-radius: 0;
    display: block;
  }
  
  .nav-links a:hover, .nav-links a.router-link-active {
    background-color: #333;
  }
}
</style>
