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

// Selected date for the chart (defaults to today)
const selectedDate = ref(new Date().toISOString().split('T')[0]);

// Chart data computed from orders for the selected date
const chartData = computed(() => {
  // Get completed orders for the selected date
  const selectedDateObj = new Date(selectedDate.value);
  const startOfDay = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate(), 0, 0, 0);
  const endOfDay = new Date(selectedDateObj.getFullYear(), selectedDateObj.getMonth(), selectedDateObj.getDate(), 23, 59, 59);

  const completedOrders = orders.value
      .filter(order => {
        if (order.status?.toLowerCase() !== 'completed' || !order.orderDate) return false;
        const orderDate = new Date(order.orderDate);
        return orderDate >= startOfDay && orderDate <= endOfDay;
      })
      .sort((a, b) => (a.orderDate ?? 0) - (b.orderDate ?? 0));

  // Create hourly buckets (0-23)
  const salesByHour = new Map<number, number>();
  for (let hour = 0; hour < 24; hour++) {
    salesByHour.set(hour, 0);
  }

  // Group sales by hour
  completedOrders.forEach(order => {
    if (order.orderDate && order.totalAmount) {
      const date = new Date(order.orderDate);
      const hour = date.getHours();
      const currentAmount = salesByHour.get(hour) ?? 0;
      salesByHour.set(hour, currentAmount + order.totalAmount);
    }
  });

  // Create labels and data arrays
  const labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
  const data = Array.from({ length: 24 }, (_, i) => {
    const value = salesByHour.get(i) ?? 0;
    return Math.round(value * 100) / 100;
  });

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
        text: 'Hour of Day',
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
        maxTicksLimit: 24,
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
      <div class="chart-header">
        <h4>Hourly Sales Trend</h4>
        <div class="date-picker-container">
          <label for="date-picker">Select Date:</label>
          <input
              id="date-picker"
              type="date"
              v-model="selectedDate"
              class="date-picker"
          />
        </div>
      </div>
      <div class="chart-wrapper">
        <Line
            :data="chartData"
            :options="chartOptions"
        />
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

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.chart-header h4 {
  margin: 0;
  color: #4a5568;
  font-size: 1.3em;
}

.date-picker-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-picker-container label {
  font-size: 0.9em;
  color: #4a5568;
  font-weight: 500;
}

.date-picker {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9em;
  color: #4a5568;
  background-color: white;
  min-width: 140px;
}

.date-picker:focus {
  outline: none;
  border-color: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
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

  .chart-header {
    flex-direction: column;
    align-items: stretch;
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

  .date-picker-container {
    flex-direction: column;
    align-items: stretch;
  }

  .date-picker {
    width: 100%;
  }
}
</style>
