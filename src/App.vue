<script setup lang="ts">
import NavBar from './components/NavBar.vue';
</script>

<template>
  <div class="app">
    <NavBar />
    <div class="content-container">
      <main>
        <RouterView />
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