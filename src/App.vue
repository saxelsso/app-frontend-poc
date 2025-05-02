<script setup lang="ts">
import NavBar from './components/NavBar.vue';
import { Authenticator } from "@aws-amplify/ui-vue";
import "@aws-amplify/ui-vue/styles.css";
import { computed } from 'vue';
import { useRoute } from 'vue-router';

// Define auth services configuration that excludes sign up
const authServices = {
  signUp: {
    isEnabled: false
  }
};

const route = useRoute();
const requiresAuth = computed(() => route.meta.requiresAuth === true);
</script>

<template>
  <div class="app">
    <NavBar />
    <div class="content-container">
      <main>
        <!-- For routes that require authentication -->
        <template v-if="requiresAuth">
            <authenticator
                :services="authServices"
                :hide-sign-up="true">
              <template v-slot="{ signOut }">
                <RouterView />
                <button @click="signOut">Sign Out</button>
              </template>
            </authenticator>
        </template>
        <!-- For public routes -->
        <template v-else>
          <RouterView />
        </template>
      </main>
    </div>
  </div>
</template>

<style>
:root {
  /* Primary colors - change these to match your app's color scheme */
  --amplify-colors-brand-primary-10: #f5f5f5;
  --amplify-colors-brand-primary-20: #e0e0e0;
  --amplify-colors-brand-primary-40: #9e9e9e;
  --amplify-colors-brand-primary-60: #757575;
  --amplify-colors-brand-primary-80: #424242;
  --amplify-colors-brand-primary-90: #212121;
  --amplify-colors-brand-primary-100: #000000;

  /* Button styles */
  --amplify-components-button-primary-background-color: #424242;
  --amplify-components-button-primary-hover-background-color: #212121;

  /* Form field styles */
  --amplify-components-fieldcontrol-border-color: #9e9e9e;
  --amplify-components-fieldcontrol-focus-border-color: #424242;

  /* Header/Footer styles */
  --amplify-components-authenticator-router-border-width: 0;
  --amplify-components-authenticator-container-background-color: #ffffff;

  /* Text colors */
  --amplify-colors-font-primary: #212121;
  --amplify-colors-font-secondary: #757575;
  --amplify-colors-font-interactive: #424242;
}

.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
  overflow-x: hidden;
}

.content-container {
  display: flex;
  justify-content: center;
  width: 100%;
  overflow-x: hidden;
}

main {
  flex: 1;
  padding: 20px;
  max-width: 800px;
  width: 100%;
}
</style>