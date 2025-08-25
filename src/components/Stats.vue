<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import type { Schema } from '../../amplify/data/resource';
import { generateClient } from 'aws-amplify/data';

const client = generateClient<Schema>();

// Data collections
const orders = ref<Array<Schema['Order']['type']>>([]);
const orderItems = ref<Array<Schema['OrderItem']['type']>>([]);
const inventory = ref<Array<Schema['Inventory']['type']>>([]);

// Sparkline data computed from orders (always use hourly buckets)
const sparklineData = computed(() => {
  // Get completed orders and sort by date
  const completedOrders = orders.value
      .filter(order => order.status?.toLowerCase() === 'completed' && order.orderDate)
      .sort((a, b) => (a.orderDate ?? 0) - (b.orderDate ?? 0));

  if (completedOrders.length === 0) return [];

  // Group by hour
  const salesByBucket = new Map<string, number>();

  completedOrders.forEach(order => {
    if (order.orderDate && order.totalAmount) {
      const date = new Date(order.orderDate);
      // Always use hourly buckets for data
      const bucketKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
      const currentAmount = salesByBucket.get(bucketKey) ?? 0;
      salesByBucket.set(bucketKey, currentAmount + order.totalAmount);
    }
  });

  const data = Array.from(salesByBucket.values()).map(value => Math.round(value * 100) / 100);
  return data;
});

const sparklineLabels = computed(() => {
  const completedOrders = orders.value
      .filter(order => order.status?.toLowerCase() === 'completed' && order.orderDate)
      .sort((a, b) => (a.orderDate ?? 0) - (b.orderDate ?? 0));

  if (completedOrders.length === 0) return [];

  const salesByBucket = new Map<string, number>();
  completedOrders.forEach(order => {
    if (order.orderDate && order.totalAmount) {
      const date = new Date(order.orderDate);
      // Always use hourly buckets for data
      const bucketKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
      const currentAmount = salesByBucket.get(bucketKey) ?? 0;
      salesByBucket.set(bucketKey, currentAmount + order.totalAmount);
    }
  });

  // Format labels to show only day (MM-DD format)
  return Array.from(salesByBucket.keys()).map(k => {
    // "YYYY-MM-DD HH:00" -> "MM-DD"
    const [datePart] = k.split(' ');
    const [, month, day] = datePart.split('-');
    return `${month}-${day}`;
  });
});

// Statistics computed from orders
const totalSales = computed(() => {
  return orders.value
      .filter(order => order.status?.toLowerCase() === 'completed')
      .reduce((sum, order) => sum + (order.totalAmount ?? 0), 0);
});

const totalOrders = computed(() => {
  return orders.value.filter(order => order.status?.toLowerCase() === 'completed').length;
});

const averageOrderValue = computed(() => {
  const completed = orders.value.filter(order => order.status?.toLowerCase() === 'completed');
  if (completed.length === 0) return 0;
  return totalSales.value / completed.length;
});

const totalProfit = computed(() => {
  const completedOrders = orders.value.filter(order => order.status?.toLowerCase() === 'completed');
  if (completedOrders.length === 0) return 0;

  let totalProfitAmount = 0;

  // Create a map of latest inventory by productId for purchase prices
  const latestInventoryByProduct = new Map<string, Schema['Inventory']['type']>();
  inventory.value.forEach(inv => {
    const existing = latestInventoryByProduct.get(inv.productId);
    if (!existing || (inv.lastUpdated ?? 0) > (existing.lastUpdated ?? 0)) {
      latestInventoryByProduct.set(inv.productId, inv);
    }
  });

  // Calculate profit for each order item
  const completedOrderIds = new Set(completedOrders.map(o => o.id));
  const relevantOrderItems = orderItems.value.filter(item => completedOrderIds.has(item.orderId));

  relevantOrderItems.forEach(item => {
    const unitPrice = item.unitPrice ?? 0;
    const quantity = item.quantity ?? 0;
    const purchasePrice = latestInventoryByProduct.get(item.productId)?.purchasePrice ?? 0;

    const profitPerUnit = unitPrice - purchasePrice;
    totalProfitAmount += profitPerUnit * quantity;
  });

  return totalProfitAmount;
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

function listInventory() {
  client.models.Inventory.observeQuery().subscribe({
    next: ({ items }) => {
      inventory.value = items;
    },
  });
}

function formatCurrency(amount: number | null | undefined): string {
  return `${(amount ?? 0).toFixed(2)} kr`;
}

onMounted(() => {
  listOrders();
  listOrderItems();
  listInventory();
});
</script>

<template>
  <div class="stats-container">
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-value">{{ formatCurrency(totalSales) }}</div>
        <div class="stat-label">Total Sales</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">{{ formatCurrency(totalProfit) }}</div>
        <div class="stat-label">Total Profit</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">{{ totalOrders }}</div>
        <div class="stat-label">Completed Orders</div>
      </div>

      <div class="stat-card">
        <div class="stat-value">{{ formatCurrency(averageOrderValue) }}</div>
        <div class="stat-label">Average Order Value</div>
      </div>

    </div>

    <div class="sparkline-container">
      <h4>Hourly Sales Trend</h4>
      <div v-if="sparklineData.length > 0">

        <div class="sparkline-chart">
          <v-sparkline
              :model-value="sparklineData"
              :labels="sparklineLabels"
              show-labels
              label-size="6"
              color="#16a34a"
              height="120"
              line-width="1"
              smooth
              stroke-linecap="round"
              :gradient="['#16a34a', '#22c55e']"
              gradient-direction="top"
              fill
          />
        </div>
      </div>
      <div v-else class="no-data">
        <p>No sales data available yet. Complete some orders to see the sales trend!</p>
      </div>
    </div>


  </div>
</template>

<style scoped>
.stats-container {
  width: 100%;
  margin: 0 auto;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 32px;
}

.stat-card {
  background-color: #f8fafc;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  padding: 16px;
  border: 1px solid #e5e7eb;
  text-align: center;
}

.stat-value {
  font-size: 1.8em;
  font-weight: bold;
  color: #4a5568;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 0.8em;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sparkline-container {
  background-color: #f8fafc;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  padding: 24px;
  border: 1px solid #e5e7eb;
}

.sparkline-container h4 {
  margin: 0 0 20px 0;
  color: #4a5568;
  font-size: 1.3em;
}

.sparkline-chart {
  width: 100%;
}

/* Optional: slightly reduce label font on small screens */
@media (max-width: 768px) {
  :deep(.v-sparkline__labels text) {
    font-size: 8px;
  }

}

.no-data {
  text-align: center;
  color: #666;
  font-style: italic;
  padding: 40px 20px;
  background-color: #fff;
  border-radius: 6px;
  border: 1px solid #f3f4f6;
}

/* Responsive design */
@media (max-width: 1024px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
}
@media (max-width: 768px) {
  .stats-cards {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .stat-card {
    padding: 12px;
  }

  .stat-value {
    font-size: 1.5em;
  }

  .stat-label {
    font-size: 0.75em;
  }

  .sparkline-container {
    padding: 16px;
  }

}

@media (max-width: 480px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }

  .stat-card {
    padding: 16px;
  }

  .stat-value {
    font-size: 1.8em;
  }
}

</style>
