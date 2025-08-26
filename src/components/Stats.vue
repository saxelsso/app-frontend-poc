<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue';
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

// Notes functionality
const currentNote = ref<Schema['Notes']['type'] | null>(null);
const noteText = ref('');
const isEditingNote = ref(false);
const maxNoteLength = 200;

// Watch for selectedDate changes to load the note for that date
watch(selectedDate, async (newDate) => {
  await loadNoteForDate(newDate);
});

// Load note for the given date
async function loadNoteForDate(date: string) {
  try {
    const noteResponse = await client.models.Notes.get({ date });
    if (noteResponse.data) {
      currentNote.value = noteResponse.data;
      noteText.value = noteResponse.data.noteText || '';
    } else {
      currentNote.value = null;
      noteText.value = '';
    }
  } catch (error) {
    console.log('No note found for date:', date);
    currentNote.value = null;
    noteText.value = '';
  }
  isEditingNote.value = false;
}

// Save or update note
async function saveNote() {
  if (noteText.value.trim().length === 0) {
    // If note is empty, delete it if it exists
    if (currentNote.value) {
      await deleteNote();
    }
    return;
  }

  if (noteText.value.length > maxNoteLength) {
    alert(`Note cannot exceed ${maxNoteLength} characters.`);
    return;
  }

  try {
    const now = Date.now();

    if (currentNote.value) {
      // Update existing note
      const updatedNote = await client.models.Notes.update({
        date: selectedDate.value,
        noteText: noteText.value.trim(),
        updatedAt: now,
      });
      currentNote.value = updatedNote.data;
    } else {
      // Create new note
      const newNote = await client.models.Notes.create({
        date: selectedDate.value,
        noteText: noteText.value.trim(),
        createdAt: now,
        updatedAt: now,
      });
      currentNote.value = newNote.data;
    }

    isEditingNote.value = false;
  } catch (error) {
    console.error('Error saving note:', error);
    alert('Error saving note. Please try again.');
  }
}

// Delete note
async function deleteNote() {
  if (!currentNote.value) return;

  try {
    await client.models.Notes.delete({ date: selectedDate.value });
    currentNote.value = null;
    noteText.value = '';
    isEditingNote.value = false;
  } catch (error) {
    console.error('Error deleting note:', error);
    alert('Error deleting note. Please try again.');
  }
}

// Start editing note
function startEditingNote() {
  isEditingNote.value = true;
}

// Cancel editing note
function cancelEditingNote() {
  if (currentNote.value) {
    noteText.value = currentNote.value.noteText || '';
  } else {
    noteText.value = '';
  }
  isEditingNote.value = false;
}

// Computed property for remaining characters
const remainingChars = computed(() => {
  return maxNoteLength - noteText.value.length;
});

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

onMounted(async () => {
  listOrders();
  listOrderItems();
  listInventory();
  await loadNoteForDate(selectedDate.value);
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

    <!-- Daily Note Card -->
    <div class="note-card">
      <div class="note-header">
        <h4>Daily Note</h4>
        <div class="note-date">{{ selectedDate }}</div>
      </div>

      <div v-if="!isEditingNote && !currentNote" class="no-note">
        <p>No note for this date.</p>
        <button @click="startEditingNote" class="btn btn-primary">Add Note</button>
      </div>

      <div v-if="!isEditingNote && currentNote" class="note-display">
        <p class="note-text">{{ currentNote.noteText }}</p>
        <div class="note-actions">
          <button @click="startEditingNote" class="btn btn-secondary">Edit</button>
          <button @click="deleteNote" class="btn btn-danger">Delete</button>
        </div>
      </div>

      <div v-if="isEditingNote" class="note-edit">
        <textarea
            v-model="noteText"
            :maxlength="maxNoteLength"
            placeholder="Enter your daily note..."
            class="note-textarea"
            rows="4"
        ></textarea>
        <div class="note-edit-footer">
          <div class="char-counter" :class="{ 'char-limit-warning': remainingChars < 20 }">
            {{ remainingChars }} characters remaining
          </div>
          <div class="note-edit-actions">
            <button @click="cancelEditingNote" class="btn btn-secondary">Cancel</button>
            <button @click="saveNote" class="btn btn-primary">Save</button>
          </div>
        </div>
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

/* Note Card Styles */
.note-card {
  background-color: #f8fafc;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  padding: 24px;
  border: 1px solid #e5e7eb;
  margin-bottom: 32px;
}

.note-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.note-header h4 {
  margin: 0;
  color: #4a5568;
  font-size: 1.3em;
}

.note-date {
  font-size: 0.9em;
  color: #666;
  font-weight: 500;
}

.no-note {
  text-align: center;
  color: #666;
  padding: 20px;
}

.no-note p {
  margin-bottom: 16px;
  font-style: italic;
}

.note-display {
  color: #4a5568;
}

.note-text {
  background-color: white;
  padding: 16px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  margin-bottom: 16px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.note-actions {
  display: flex;
  gap: 8px;
}

.note-edit {
  width: 100%;
}

.note-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.95em;
  color: #4a5568;
  background-color: white;
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
  line-height: 1.5;
}

.note-textarea:focus {
  outline: none;
  border-color: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
}

.note-edit-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.char-counter {
  font-size: 0.85em;
  color: #6b7280;
}

.char-limit-warning {
  color: #dc2626;
  font-weight: 500;
}

.note-edit-actions {
  display: flex;
  gap: 8px;
}

/* Button Styles */
.btn {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 0.9em;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.2s ease;
}

.btn-primary {
  background-color: #16a34a;
  color: white;
  border-color: #16a34a;
}

.btn-primary:hover {
  background-color: #15803d;
  border-color: #15803d;
}

.btn-secondary {
  background-color: #6b7280;
  color: white;
  border-color: #6b7280;
}

.btn-secondary:hover {
  background-color: #4b5563;
  border-color: #4b5563;
}

.btn-danger {
  background-color: #dc2626;
  color: white;
  border-color: #dc2626;
}

.btn-danger:hover {
  background-color: #b91c1c;
  border-color: #b91c1c;
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

  .note-card,
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

  .note-header {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .note-actions,
  .note-edit-actions {
    justify-content: center;
  }

  .note-edit-footer {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .char-counter {
    text-align: center;
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
