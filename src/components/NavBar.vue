<script setup lang="ts">
import { useRouter } from 'vue-router';
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
  <v-app-bar color="primary" dark>
    <v-app-bar-title>App</v-app-bar-title>
    
    <v-spacer></v-spacer>
    
    <!-- Desktop navigation -->
    <v-toolbar-items class="hidden-md-and-down">
      <v-btn text to="/">Home</v-btn>
      <!--
      <v-btn text to="/weather">Weather</v-btn>
      <v-btn text to="/todos">Todos</v-btn>
      <v-btn text to="/sales">Sales</v-btn>
      <v-btn text to="/portfolio">Portfolio</v-btn>
      <v-btn text to="/trees">Trees</v-btn>
      <v-btn text to="/barcode">Scan</v-btn>
      -->
      <v-btn text to="/product">Catalog</v-btn>
      <v-btn text to="/inventory">Inventory</v-btn>
      <v-btn text to="/order">Order</v-btn>
      <v-btn text to="/orderhistory">Order History</v-btn>
      <v-btn text to="/stats">Stats</v-btn>

      <template v-if="isAuthenticated">
        <v-btn text @click="handleSignOut">Sign Out</v-btn>
      </template>
      <template v-else>
        <v-btn text to="/login">Login</v-btn>
      </template>
    </v-toolbar-items>

    <!-- Mobile navigation -->
    <v-app-bar-nav-icon 
      class="hidden-lg-and-up" 
      @click="isMobileMenuOpen = !isMobileMenuOpen">
    </v-app-bar-nav-icon>
  </v-app-bar>

  <!-- Mobile navigation drawer -->
  <v-navigation-drawer v-model="isMobileMenuOpen" temporary>
    <v-list>
      <v-list-item to="/" @click="isMobileMenuOpen = false">
        <v-list-item-title>Home</v-list-item-title>
      </v-list-item>
      <!--
      <v-list-item to="/weather" @click="isMobileMenuOpen = false">
        <v-list-item-title>Weather</v-list-item-title>
      </v-list-item>
      <v-list-item to="/todos" @click="isMobileMenuOpen = false">
        <v-list-item-title>Todos</v-list-item-title>
      </v-list-item>
      <v-list-item to="/sales" @click="isMobileMenuOpen = false">
        <v-list-item-title>Sales</v-list-item-title>
      </v-list-item>
      <v-list-item to="/portfolio" @click="isMobileMenuOpen = false">
        <v-list-item-title>Portfolio</v-list-item-title>
      </v-list-item>
      <v-list-item to="/trees" @click="isMobileMenuOpen = false">
        <v-list-item-title>Trees</v-list-item-title>
      </v-list-item>
      <v-list-item to="/barcode" @click="isMobileMenuOpen = false">
        <v-list-item-title>Scan</v-list-item-title>
      </v-list-item> -->
      <v-list-item to="/product" @click="isMobileMenuOpen = false">
        <v-list-item-title>Catalog</v-list-item-title>
      </v-list-item>
      <v-list-item to="/inventory" @click="isMobileMenuOpen = false">
        <v-list-item-title>Inventory</v-list-item-title>
      </v-list-item>
      <v-list-item to="/order" @click="isMobileMenuOpen = false">
        <v-list-item-title>Order</v-list-item-title>
      </v-list-item>
      <v-list-item to="/orderhistory" @click="isMobileMenuOpen = false">
        <v-list-item-title>Order History</v-list-item-title>
      </v-list-item>
      <v-list-item to="/stats" @click="isMobileMenuOpen = false">
        <v-list-item-title>Stats</v-list-item-title>
      </v-list-item>
      
      <v-divider></v-divider>
      
      <template v-if="isAuthenticated">
        <v-list-item @click="handleSignOut">
          <v-list-item-title>Sign Out</v-list-item-title>
        </v-list-item>
      </template>
      <template v-else>
        <v-list-item to="/login" @click="isMobileMenuOpen = false">
          <v-list-item-title>Login</v-list-item-title>
        </v-list-item>
      </template>
    </v-list>
  </v-navigation-drawer>
</template>

<style scoped>
/* Vuetify handles all the styling */
</style>