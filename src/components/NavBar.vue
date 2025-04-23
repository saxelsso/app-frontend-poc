<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<template>
  <nav class="navbar">
    <div class="nav-container">
      <div class="nav-logo">App</div>
      <div class="nav-links">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/todos">Todos</RouterLink>
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