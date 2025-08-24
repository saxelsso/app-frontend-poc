<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import type { Schema } from '../../amplify/data/resource';
import { generateClient } from 'aws-amplify/data';

const client = generateClient<Schema>();

// Data collections
const orders = ref<Array<Schema['Order']['type']>>([]);
const orderItems = ref<Array<Schema['OrderItem']['type']>>([]);
const products = ref<Array<Schema['Product']['type']>>([]);

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

// Sort orders by date (most recent first)
const sortedOrders = computed(() => {
  return [...orders.value].sort((a, b) => (b.orderDate ?? 0) - (a.orderDate ?? 0));
});

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

    <div v-if="sortedOrders.length > 0" class="orders-list">
      <div
          v-for="order in sortedOrders"
          :key="order.id"
          class="order-card"
      >
        <div class="order-header">
          <div class="order-info">
            <div class="order-id">Order #{{ order.id }}</div>
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

    <p v-else class="no-orders">No orders found. Start by creating your first sale!</p>
  </div>
</template>

<style scoped>
.order-history-container {
  width: 100%;
  margin: 0 auto;
}

.orders-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.order-card {
  background-color: #f8fafc;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  padding: 20px;
  border: 1px solid #e5e7eb;
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