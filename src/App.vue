<script setup lang="ts">
import NavBar from './components/NavBar.vue';
import { Authenticator } from "@aws-amplify/ui-vue";
import "@aws-amplify/ui-vue/styles.css";

// Define auth services configuration that excludes sign up
const authServices = {
  signUp: {
    isEnabled: false
  }
};

</script>

<template>
  <div class="app">
    <NavBar />
    <div class="content-container">
      <main>
        <authenticator :services="authServices">
        <template v-slot="{ signOut }">
            <RouterView />
            <button @click="signOut">Sign Out</button>
          </template>
        </authenticator>
      </main>
    </div>
  </div>
</template>

<style>
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