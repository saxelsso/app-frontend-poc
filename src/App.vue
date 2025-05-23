<script setup lang="ts">
import NavBar from './components/NavBar.vue';
</script>

<template>
  <v-app>
    <NavBar />
    <v-main>
      <v-container>
        <RouterView />
      </v-container>
    </v-main>
  </v-app>
</template>

<style>
/* Vuetify handles the main layout now */
</style>
