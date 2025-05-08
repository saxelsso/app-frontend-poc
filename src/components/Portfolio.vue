<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { Schema } from '../../amplify/data/resource';
import { generateClient } from 'aws-amplify/data';

const client = generateClient<Schema>();

// Create reactive references for form inputs
const ticker = ref<string>('');
const amount = ref<number | null>(null);
const purchaseDate = ref<string>('');
const purchasePrice = ref<number | null>(null);
const showForm = ref<boolean>(false);
const formError = ref<string>('');

// Create a reactive reference to the array of portfolio items
const portfolioItems = ref<Array<Schema['Portfolio']["type"]>>([]);

function listPortfolioItems() {
  client.models.Portfolio.observeQuery().subscribe({
    next: ({ items, isSynced }) => {
      portfolioItems.value = items;
    },
  });
}

function validateForm(): boolean {
  if (!ticker.value.trim()) {
    formError.value = 'Ticker symbol is required';
    return false;
  }
  if (amount.value === null || isNaN(amount.value) || amount.value <= 0) {
    formError.value = 'Amount must be a positive number';
    return false;
  }
  if (!purchaseDate.value) {
    formError.value = 'Purchase date is required';
    return false;
  }
  if (purchasePrice.value === null || isNaN(purchasePrice.value) || purchasePrice.value <= 0) {
    formError.value = 'Purchase price must be a positive number';
    return false;
  }
  formError.value = '';
  return true;
}

function createPortfolioItem() {
  if (!validateForm()) return;

  client.models.Portfolio.create({
    ticker: ticker.value,
    amount: amount.value as number,
    purchaseDate: purchaseDate.value, // Pass the string date directly
    purchasePrice: purchasePrice.value as number,
  }).then(() => {
    // After creating a new item, update the list
    listPortfolioItems();
    // Reset form
    resetForm();
    // Hide form
    showForm.value = false;
  });
}

function resetForm() {
  ticker.value = '';
  amount.value = null;
  purchaseDate.value = '';
  purchasePrice.value = null;
  formError.value = '';
}

function toggleForm() {
  showForm.value = !showForm.value;
  if (showForm.value === false) {
    resetForm();
  }
}

// Format date for display
function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString();
}

// Calculate total value
function calculateTotalValue(item: Schema['Portfolio']["type"]): number {
  if (!item.amount || !item.purchasePrice) return 0;
  return item.amount * item.purchasePrice;
}

// Fetch portfolio items when the component is mounted
onMounted(() => {
  listPortfolioItems();
});
</script>

<template>
  <div class="portfolio-container">
    <button @click="toggleForm">{{ showForm ? 'Cancel' : '+ Add Portfolio Item' }}</button>

    <div v-if="showForm" class="form-container">
      <h3>New Portfolio Item</h3>

      <div class="form-group">
        <label for="ticker">Ticker Symbol</label>
        <input
            id="ticker"
            v-model="ticker"
            type="text"
            placeholder="Enter ticker symbol (e.g., AAPL)"
            required
        />
      </div>

      <div class="form-group">
        <label for="amount">Number of Shares</label>
        <input
            id="amount"
            v-model="amount"
            type="number"
            min="1"
            step="1"
            placeholder="Enter number of shares"
            required
        />
      </div>

      <div class="form-group">
        <label for="purchaseDate">Purchase Date</label>
        <input
            id="purchaseDate"
            v-model="purchaseDate"
            type="date"
            required
        />
      </div>

      <div class="form-group">
        <label for="purchasePrice">Purchase Price per Share (EUR)</label>
        <input
            id="purchasePrice"
            v-model="purchasePrice"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="Enter price per share"
            required
        />
      </div>

      <div v-if="formError" class="error-message">{{ formError }}</div>

      <div class="form-actions">
        <button @click="createPortfolioItem" class="submit-btn">Save Portfolio Item</button>
      </div>
    </div>

    <h3 v-if="!showForm">Portfolio Items</h3>
    <ul v-if="portfolioItems.length > 0">
      <li
          v-for="item in portfolioItems"
          :key="item.id">
        <div class="portfolio-item-details">
          <div class="portfolio-ticker">{{ item.ticker }}</div>
          <div class="portfolio-amount">Shares: {{ item.amount }}</div>
          <div class="portfolio-date">Purchase Date: {{ formatDate(item.purchaseDate) }}</div>
          <div class="portfolio-price">Price: €{{ item.purchasePrice?.toFixed(2) ?? '0.00' }} per share</div>
          <div class="portfolio-total">Total Value: €{{ calculateTotalValue(item).toFixed(2) }}</div>
        </div>
      </li>
    </ul>
    <p v-else-if="!showForm">No portfolio items yet. Add one!</p>
  </div>
</template>

<style scoped>
.portfolio-container {
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

.portfolio-item-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  background-color: #f8fafc;
  border-radius: 8px;
  margin-bottom: 10px;
}

.portfolio-ticker {
  font-weight: bold;
  font-size: 1.1em;
}

.portfolio-total {
  font-weight: 500;
  color: #4a5568;
  margin-top: 5px;
}

ul {
  list-style-type: none;
  padding: 0;
}
</style>