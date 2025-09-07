<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { Schema } from '../../amplify/data/resource';
import { generateClient } from 'aws-amplify/data';

const client = generateClient<Schema>();

// create a reactive reference to the array of todos
const todos = ref<Array<Schema['Todo']["type"]>>([]);

function listTodos() {
  client.models.Todo.observeQuery().subscribe({
    next: ({ items, isSynced }) => {
      todos.value = items
     },
  });

  const response = client.mutations.echoService({
    echoString: "Amplify",
  });
  console.log(response);
}

function createTodo() {
  client.models.Todo.create({
    content: window.prompt("Todo content")
  }).then(() => {
    // After creating a new todo, update the list of todos
    listTodos();
  });
}
    
// fetch todos when the component is mounted
onMounted(() => {
  listTodos();
});
</script>

<template>
  <div class="todos-container">
    <button @click="createTodo">+ Add Todo</button>
    <ul v-if="todos.length > 0">
      <li 
        v-for="todo in todos" 
        :key="todo.id">
        {{ todo.content }}
      </li>
    </ul>
    <p v-else>No todos yet. Add one!</p>
  </div>
</template>

<style scoped>
.todos-container {
  width: 100%;
  margin: 0 auto;
}

button {
  margin-bottom: 16px;
}
</style>