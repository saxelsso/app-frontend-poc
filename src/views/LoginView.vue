<script setup lang="ts">
import { Authenticator } from "@aws-amplify/ui-vue";
import "@aws-amplify/ui-vue/styles.css";
import { useRouter, useRoute } from 'vue-router';
import { onMounted } from 'vue';

// Define auth services configuration that excludes sign up
const authServices = {
  signUp: {
    isEnabled: false
  }
};

const router = useRouter();
const route = useRoute();

// Store the redirect path if it exists in the query parameters
let redirectPath = '/todos'; // Default redirect

onMounted(() => {
  // Check if there's a redirect path in the query parameters
  if (route.query.redirect && typeof route.query.redirect === 'string') {
    redirectPath = route.query.redirect;
  }
});

// Handle successful sign-in
const handleSignIn = () => {
  // Redirect to the intended route or default to todos
  router.push(redirectPath);
};
</script>

<template>
  <div class="login-container">
    <h1>Login</h1>
    <authenticator
      :services="authServices"
      :hide-sign-up="true"
      @authenticated="handleSignIn">
      <template v-slot="{ signOut, user }">
        <div class="authenticated-container">
          <h2>Welcome, {{ user.username }}</h2>
          <p>You are now signed in!</p>
          <div class="button-container">
            <button @click="router.push('/todos')">Go to Todos</button>
            <button @click="signOut">Sign Out</button>
          </div>
        </div>
      </template>
    </authenticator>
  </div>
</template>

<style>
:root {
  --amplify-components-button-primary-background-color: black;
}
</style>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 0 auto;
  padding: 20px;
}

.authenticated-container {
  text-align: center;
  padding: 20px;
}

.button-container {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 20px;
}

button {
  padding: 8px 16px;
  background-color: var(--amplify-components-button-primary-background-color, #424242);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: var(--amplify-components-button-primary-hover-background-color, #212121);
}

h1 {
  text-align: center;
  margin-bottom: 20px;
}
</style>
