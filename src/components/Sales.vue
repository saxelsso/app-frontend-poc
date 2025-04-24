<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { Schema } from '../../amplify/data/resource';
import { generateClient } from 'aws-amplify/data';

const client = generateClient<Schema>();

// Create reactive references for form inputs
const companyName = ref<string>('');
const contactName = ref<string>('');
const value = ref<number | null>(null);
const showForm = ref<boolean>(false);
const formError = ref<string>('');

// Create a reactive reference to the array of sales opportunities
const salesOpportunities = ref<Array<Schema['SalesOpportunity']["type"]>>([]);

function listSalesOpportunities() {
  client.models.SalesOpportunity.observeQuery().subscribe({
    next: ({ items, isSynced }) => {
      salesOpportunities.value = items;
    },
  });
}

function validateForm(): boolean {
  if (!companyName.value.trim()) {
    formError.value = 'Company name is required';
    return false;
  }
  if (!contactName.value.trim()) {
    formError.value = 'Contact name is required';
    return false;
  }
  if (value.value === null || isNaN(value.value) || value.value <= 0) {
    formError.value = 'Value must be a positive number';
    return false;
  }
  formError.value = '';
  return true;
}

function createSalesOpportunity() {
  if (!validateForm()) return;

  client.models.SalesOpportunity.create({
    companyName: companyName.value,
    contactName: contactName.value,
    value: value.value as number,
  }).then(() => {
    // After creating a new opportunity, update the list
    listSalesOpportunities();
    // Reset form
    resetForm();
    // Hide form
    showForm.value = false;
  });
}

function resetForm() {
  companyName.value = '';
  contactName.value = '';
  value.value = null;
  formError.value = '';
}

function toggleForm() {
  showForm.value = !showForm.value;
  if (showForm.value === false) {
    resetForm();
  }
}

// Fetch sales opportunities when the component is mounted
onMounted(() => {
  listSalesOpportunities();
});
</script>

<template>
  <div class="sales-container">
    <button @click="toggleForm">{{ showForm ? 'Cancel' : '+ Add Sales Opportunity' }}</button>
    
    <div v-if="showForm" class="form-container">
      <h3>New Sales Opportunity</h3>
      
      <div class="form-group">
        <label for="companyName">Company Name</label>
        <input 
          id="companyName" 
          v-model="companyName" 
          type="text" 
          placeholder="Enter company name"
          required
        />
      </div>
      
      <div class="form-group">
        <label for="contactName">Contact Name</label>
        <input 
          id="contactName" 
          v-model="contactName" 
          type="text" 
          placeholder="Enter contact name"
          required
        />
      </div>
      
      <div class="form-group">
        <label for="value">Value (EUR)</label>
        <input 
          id="value" 
          v-model="value" 
          type="number" 
          min="0" 
          step="1000" 
          placeholder="Enter opportunity value"
          required
        />
      </div>
      
      <div v-if="formError" class="error-message">{{ formError }}</div>
      
      <div class="form-actions">
        <button @click="createSalesOpportunity" class="submit-btn">Save Opportunity</button>
      </div>
    </div>

    <h3 v-if="!showForm">Sales Opportunities</h3>
    <ul v-if="salesOpportunities.length > 0">
      <li 
        v-for="opportunity in salesOpportunities" 
        :key="opportunity.id">
        <div class="opportunity-details">
          <div class="opportunity-company">{{ opportunity.companyName }}</div>
          <div class="opportunity-contact">Contact: {{ opportunity.contactName }}</div>
          <div class="opportunity-value">€{{ opportunity.value?.toLocaleString() ?? '0' }}</div>
        </div>
      </li>
    </ul>
    <p v-else-if="!showForm">No sales opportunities yet. Add one!</p>
  </div>
</template>

<style scoped>
.sales-container {
  width: 100%;
  margin: 0 auto;
}

button {
  margin-bottom: 16px;
}

.form-container {
  background-color: #f8fafc;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  padding: 20px;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
}

input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1em;
}

.submit-btn {
  background-color: #4a5568;
}

.error-message {
  color: #e53e3e;
  margin-bottom: 10px;
}

.opportunity-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.opportunity-company {
  font-weight: bold;
  font-size: 1.1em;
}

.opportunity-value {
  font-weight: 500;
  color: #4a5568;
}
</style>