
<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import type { Schema } from '../../amplify/data/resource';
import { generateClient } from 'aws-amplify/data';

const client = generateClient<Schema>();

// Data collections
const orders = ref<Array<Schema['Order']['type']>>([]);
const orderItems = ref<Array<Schema['OrderItem']['type']>>([]);
const products = ref<Array<Schema['Product']['type']>>([]);

// Search state
const orderNumberSearch = ref<string>('');
const searching = ref<boolean>(false);
const searchError = ref<string>('');

// Helper to get product names
const productNameById = computed(() => {
  const map = new Map<string, string>();
  for (const p of products.value) {
    if (p.productId) map.set(p.productId, p.productName ?? p.productId);
  }
  return map;
});

// Group order items by orderId
const itemsByOrderId = computed(() => {
  const map = new Map<string, Array<Schema['OrderItem']['type']>>();
  for (const item of orderItems.value) {
    if (!map.has(item.orderId)) {
      map.set(item.orderId, []);
    }
    map.get(item.orderId)!.push(item);
  }
  return map;
});

// Filter orders based on search
const filteredOrders = computed(() => {
  let filtered = [...orders.value];

  if (orderNumberSearch.value.trim()) {
    const searchTerm = orderNumberSearch.value.trim();

    if (searchTerm.includes('*')) {
      // Wildcard search - convert asterisks to regex
      const regexPattern = searchTerm
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
          .replace(/\\\*/g, '.*'); // Convert \* back to .*

      try {
        const regex = new RegExp(regexPattern, 'i'); // Case insensitive
        filtered = filtered.filter(order =>
            regex.test(order.orderNumber || order.id)
        );
      } catch (e) {
        // If regex is invalid, fall back to simple contains search
        filtered = filtered.filter(order =>
            (order.orderNumber || order.id).toLowerCase().includes(searchTerm.toLowerCase().replace(/\*/g, ''))
        );
      }
    } else {
      // Exact or partial match without wildcards
      filtered = filtered.filter(order =>
          (order.orderNumber || order.id).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
  }

  return filtered;
});

// Sort filtered orders by date (most recent first)
const sortedOrders = computed(() => {
  return [...filteredOrders.value].sort((a, b) => (b.orderDate ?? 0) - (a.orderDate ?? 0));
});

// Search function
async function searchOrders() {
  if (!orderNumberSearch.value.trim()) {
    searchError.value = '';
    return;
  }

  searching.value = true;
  searchError.value = '';

  try {
    // The filtering is handled by the computed property
    // This function mainly provides user feedback
    if (filteredOrders.value.length === 0) {
      searchError.value = `No orders found matching "${orderNumberSearch.value}"`;
    } else {
      searchError.value = '';
    }
  } catch (err: any) {
    console.error('❌ Error during search:', err);
    searchError.value = 'Search failed. Please try again.';
  } finally {
    searching.value = false;
  }
}

// Clear search
function clearSearch() {
  orderNumberSearch.value = '';
  searchError.value = '';
}

function listOrders() {
  client.models.Order.observeQuery().subscribe({
    next: ({ items }) => {
      orders.value = items;
    },
  });
}

function listOrderItems() {
  client.models.OrderItem.observeQuery().subscribe({
    next: ({ items }) => {
      orderItems.value = items;
    },
  });
}

function listProducts() {
  client.models.Product.observeQuery().subscribe({
    next: ({ items }) => {
      products.value = items;
    },
  });
}

function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString();
}

function formatCurrency(amount: number | null | undefined): string {
  return `${(amount ?? 0).toFixed(2)} kr`;
}

function getStatusColor(status: string | null | undefined): string {
  switch (status?.toLowerCase()) {
    case 'completed': return '#16a34a';
    case 'pending': return '#ca8a04';
    case 'cancelled': return '#dc2626';
    default: return '#6b7280';
  }
}

onMounted(() => {
  listOrders();
  listOrderItems();
  listProducts();
});
</script>

<template>
  <div class="order-history-container">
    <h3>Order History</h3>

    <!-- Search Section -->
    <div class="search-section">
      <div class="search-form">
        <div class="field">
          <label>Search Orders</label>
          <div class="search-input-group">
            <input
                v-model="orderNumberSearch"
                type="text"
                placeholder="Enter order number (use * for wildcards, e.g., 250828* or *-14354200)..."
                @keyup.enter="searchOrders"
                @input="searchOrders"
            >
            <button
                @click="searchOrders"
                :disabled="searching"
                class="search-btn"
            >
              {{ searching ? 'Searching...' : 'Search' }}
            </button>
            <button
                v-if="orderNumberSearch"
                @click="clearSearch"
                class="clear-btn"
                title="Clear search"
            >
              ×
            </button>
          </div>
          <div v-if="orderNumberSearch" class="search-help">
            Use * as wildcard (e.g., "250828*" finds all orders starting with 250828)
          </div>
        </div>
      </div>

      <!-- Search Error -->
      <div v-if="searchError" class="search-error">
        {{ searchError }}
      </div>

      <!-- Search Results Summary -->
      <div v-if="orderNumberSearch && !searchError" class="search-results-summary">
        Found {{ filteredOrders.length }} order{{ filteredOrders.length !== 1 ? 's' : '' }}
        matching "{{ orderNumberSearch }}"
      </div>
    </div>

    <div v-if="sortedOrders.length > 0" class="orders-list">
      <div
          v-for="order in sortedOrders"
          :key="order.id"
          class="order-card"
      >
        <div class="order-header">
          <div class="order-info">
            <div class="order-id">Order #{{ order.orderNumber ?? order.id }}</div>
            <div class="order-date">{{ formatDate(order.orderDate) }}</div>
          </div>
          <div class="order-summary">
            <div class="order-total">{{ formatCurrency(order.totalAmount) }}</div>
            <div
                class="order-status"
                :style="{ color: getStatusColor(order.status) }"
            >
              {{ order.status ?? 'Unknown' }}
            </div>
          </div>
        </div>

        <div
            v-if="itemsByOrderId.get(order.id as string)?.length"
            class="order-items"
        >
          <div class="items-header">Items:</div>
          <div
              v-for="item in itemsByOrderId.get(order.id as string)"
              :key="item.id"
              class="order-item"
          >
            <div class="item-details">
              <div class="product-name">
                {{ productNameById.get(item.productId) ?? item.productId }}
              </div>
              <div class="product-id">ID: {{ item.productId }}</div>
            </div>
            <div class="item-quantity">
              Qty: {{ item.quantity }}
            </div>
            <div class="item-price">
              {{ formatCurrency(item.unitPrice) }} each
            </div>
            <div class="item-subtotal">
              {{ formatCurrency(item.subtotal) }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <p v-else-if="!orderNumberSearch" class="no-orders">No orders found. Start by creating your first sale!</p>
    <p v-else class="no-orders">No orders match your search criteria.</p>
  </div>
</template>

<style scoped>
.order-history-container {
  width: 100%;
  margin: 0 auto;
}

.search-section {
  margin-bottom: 24px;
  padding: 20px;
  background-color: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.search-form {
  margin-bottom: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field label {
  font-weight: 500;
  color: #4a5568;
}

.search-input-group {
  display: flex;
  gap: 8px;
  align-items: center;
}

.search-input-group input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
}

.search-input-group input:focus {
  outline: none;
  border-color: rgb(25, 118, 210);
  box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.1);
}

.search-btn {
  padding: 10px 16px;
  background-color: rgb(25, 118, 210);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background-color 0.2s;
}

.search-btn:hover:not(:disabled) {
  background-color: rgb(21, 101, 192);
}

.search-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.clear-btn {
  padding: 10px 12px;
  background-color: #6b7280;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: bold;
  transition: background-color 0.2s;
  min-width: 40px;
}

.clear-btn:hover {
  background-color: #4b5563;
}

.search-help {
  font-size: 12px;
  color: #6b7280;
  font-style: italic;
}

.search-error {
  padding: 12px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #dc2626;
  font-size: 14px;
}

.search-results-summary {
  padding: 8px 12px;
  background-color: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  color: #0369a1;
  font-size: 14px;
  font-weight: 500;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.order-card {
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  padding: 20px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

/* Vuetify theme color hover effect */
.order-card:hover {
  box-shadow: 0 4px 8px rgba(25, 118, 210, 0.15);
  border-color: rgb(25, 118, 210, 0.3);
  transform: translateY(-2px);
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.order-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.order-id {
  font-weight: bold;
  font-size: 1.1em;
  color: #4a5568;
}

.order-date {
  font-size: 0.9em;
  color: #666;
}

.order-summary {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.order-total {
  font-weight: bold;
  font-size: 1.2em;
  color: #4a5568;
}

.order-status {
  font-weight: 500;
  text-transform: capitalize;
  font-size: 0.9em;
}

.order-items {
  background: #fff;
  border-radius: 6px;
  padding: 16px;
  border: 1px solid #f3f4f6;
  margin-top: 10px;
}

.items-header {
  font-weight: 500;
  margin-bottom: 12px;
  color: #4a5568;
}

.order-item {
  display: grid;
  grid-template-columns: 1.4fr 0.6fr 0.8fr 0.6fr;
  gap: 12px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}

.order-item:last-child {
  border-bottom: none;
}

.item-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-name {
  font-weight: 500;
  color: #4a5568;
}

.product-id {
  font-size: 0.9em;
  color: #666;
}

.item-quantity {
  font-weight: 500;
  color: #4a5568;
}

.item-price {
  font-size: 0.9em;
  color: #666;
}

.item-subtotal {
  font-weight: 500;
  text-align: right;
  color: #4a5568;
}

.no-orders {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 40px 20px;
  background-color: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

/* Responsive design */
@media (max-width: 768px) {
  .search-input-group {
    flex-direction: column;
    align-items: stretch;
  }

  .search-btn, .clear-btn {
    align-self: stretch;
  }

  .order-header {
    flex-direction: column;
    gap: 12px;
  }

  .order-summary {
    align-items: flex-start;
  }

  .order-item {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 12px 0;
  }

  .item-subtotal {
    text-align: left;
    font-size: 1.1em;
  }
}
</style>