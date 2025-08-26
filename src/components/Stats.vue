<script setup lang="ts">
import { onMounted, ref, computed } from 'vue';
import type { Schema } from '../../amplify/data/resource';
import { generateClient } from 'aws-amplify/data';
import { Line } from 'vue-chartjs';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const client = generateClient<Schema>();

// Data collections
const orders = ref<Array<Schema['Order']['type']>>([]);
const orderItems = ref<Array<Schema['OrderItem']['type']>>([]);
const inventory = ref<Array<Schema['Inventory']['type']>>([]);

// Chart data computed from orders
// Chart data computed from orders
const chartData = computed(() => {
  // Get completed orders and sort by date
  const completedOrders = orders.value
      .filter(order => order.status?.toLowerCase() === 'completed' && order.orderDate)
      .sort((a, b) => (a.orderDate ?? 0) - (b.orderDate ?? 0));

  if (completedOrders.length === 0) {
    return {
      labels: [],
      datasets: []
    };
  }

  // Group by hour
  const salesByBucket = new Map<string, number>();
  const dateTracker = new Set<string>();

  completedOrders.forEach(order => {
    if (order.orderDate && order.totalAmount) {
      const date = new Date(order.orderDate);
      // Always use hourly buckets for data
      const bucketKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:00`;
      const currentAmount = salesByBucket.get(bucketKey) ?? 0;
      salesByBucket.set(bucketKey, currentAmount + order.totalAmount);

      // Track unique dates for label formatting
      const [datePart] = bucketKey.split(' ');
      dateTracker.add(datePart);
    }
  });

  // Format labels to avoid repeating dates
  const bucketKeys = Array.from(salesByBucket.keys());
  let lastDisplayedDate = '';

  const labels = bucketKeys.map(k => {
    const [datePart, timePart] = k.split(' ');
    const [, month, day] = datePart.split('-');
    const currentDate = `${month}-${day}`;

    // Only show date if it's different from the last one
    if (currentDate !== lastDisplayedDate) {
      lastDisplayedDate = currentDate;
      return `${currentDate}\n${timePart}`;
    } else {
      return timePart;
    }
  });

  const data = Array.from(salesByBucket.values()).map(value => Math.round(value * 100) / 100);

  return {
    labels,
    datasets: [
      {
        label: 'Sales (kr)',
        data,
        borderColor: '#16a34a',
        backgroundColor: 'rgba(22, 163, 74, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#16a34a',
        pointBorderColor: '#16a34a',
        pointRadius: 3,
        pointHoverRadius: 5,
      }
    ]
  };
});

// Chart options
const chartOptions = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      titleColor: '#fff',
      bodyColor: '#fff',
      borderColor: '#16a34a',
      borderWidth: 1,
      callbacks: {
        label: (context: any) => {
          return `Sales: ${context.parsed.y.toFixed(2)} kr`;
        }
      }
    }
  },
  scales: {
    x: {
      display: true,
      grid: {
        display: false
      },
      title: {
        display: true,
        text: 'Date & Time',
        color: '#4a5568',
        font: {
          size: 12,
          weight: 'bold' as const
        },
        padding: {
          top: 10
        }
      },
      ticks: {
        color: '#6b7280',
        font: {
          size: 10
        },
        maxTicksLimit: 10,
        maxRotation: 0,
        minRotation: 0
      }
    },
    y: {
      display: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.05)'
      },
      ticks: {
        color: '#6b7280',
        font: {
          size: 10
        },
        callback: (value: any) => {
          return `${value} kr`;
        }
      }
    }
  },
  elements: {
    point: {
      hoverRadius: 8
    }
  },
  interaction: {
    intersect: false,
    mode: 'index' as const
  }
}));


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

    <div class="chart-container">
      <h4>Hourly Sales Trend</h4>
      <div v-if="chartData.labels.length > 0" class="chart-wrapper">
        <Line
            :data="chartData"
            :options="chartOptions"
        />
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

.chart-container {
  background-color: #f8fafc;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  padding: 24px;
  border: 1px solid #e5e7eb;
}

.chart-container h4 {
  margin: 0 0 20px 0;
  color: #4a5568;
  font-size: 1.3em;
}

.chart-wrapper {
  width: 100%;
  height: 300px;
  position: relative;
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

  .chart-container {
    padding: 16px;
  }

  .chart-wrapper {
    height: 250px;
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

  .chart-wrapper {
    height: 200px;
  }
}

</style>
