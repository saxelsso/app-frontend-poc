<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import type { Schema } from '../../amplify/data/resource';
import { generateClient } from 'aws-amplify/data';

type Product = Schema['Product']['type'];
type Order = Schema['Order']['type'];
type OrderItem = Schema['OrderItem']['type'];
type Return = Schema['Return']['type'];
type ReturnItem = Schema['ReturnItem']['type'];

const client = generateClient<Schema>();

// Data stores
const products = ref<Product[]>([]);
const selectedOrder = ref<Order | null>(null);
const orderItems = ref<OrderItem[]>([]);
const existingReturns = ref<Return[]>([]);
const existingReturnItems = ref<ReturnItem[]>([]);

// Search state
const orderIdSearch = ref<string>('');
const orderFound = ref<boolean>(false);

// For return form lines
type ReturnLine = {
  orderItemId: string;
  productId: string;
  productName: string;
  originalQuantity: number;
  maxReturnableQuantity: number;
  quantityToReturn: number | null;
  unitPrice: number;
  condition: string;
};

const returnLines = reactive<ReturnLine[]>([]);
const returnReason = ref<string>('');

// UI state
const submitting = ref(false);
const searching = ref(false);
const formError = ref<string>('');
const formSuccess = ref<string>('');

// Load products for reference
function listProducts() {
  client.models.Product.observeQuery().subscribe({
    next: ({ items }) => {
      products.value = items;
    },
  });
}

onMounted(() => {
  listProducts();
});

// Helper computed maps
const productById = computed(() => {
  const map = new Map<string, Product>();
  for (const p of products.value) {
    if (p.productId) map.set(p.productId, p);
  }
  return map;
});

// Calculate returned quantities per order item
const returnedQuantityByOrderItem = computed(() => {
  const map = new Map<string, number>();
  for (const returnItem of existingReturnItems.value) {
    const current = map.get(returnItem.orderItemId) || 0;
    map.set(returnItem.orderItemId, current + (returnItem.quantityReturned || 0));
  }
  return map;
});

// Calculate line refund amounts
const lineRefundAmounts = computed(() => {
  return returnLines.map(line => {
    const qty = Number.isFinite(line.quantityToReturn as number) ? (line.quantityToReturn as number) : 0;
    return +(line.unitPrice * qty).toFixed(2);
  });
});

const totalRefundAmount = computed(() => {
  return +lineRefundAmounts.value.reduce((sum, amount) => sum + amount, 0).toFixed(2);
});

// Helper functions for quantity stepper
function incrementReturnQuantity(index: number) {
  const line = returnLines[index];
  const current = line.quantityToReturn || 0;
  if (current < line.maxReturnableQuantity) {
    line.quantityToReturn = current + 1;
  }
}

function decrementReturnQuantity(index: number) {
  const line = returnLines[index];
  const current = line.quantityToReturn || 1;
  if (current > 1) {
    line.quantityToReturn = current - 1;
  }
}

// Search for order
async function searchOrder() {
  if (!orderIdSearch.value.trim()) {
    formError.value = 'Please enter an Order ID';
    return;
  }

  searching.value = true;
  formError.value = '';
  formSuccess.value = '';
  orderFound.value = false;

  try {
    console.log('🔍 Searching for order:', orderIdSearch.value);

    // Get the order
    const orderResult = await client.models.Order.get({ id: orderIdSearch.value.trim() });

    if (!orderResult.data) {
      formError.value = `Order ${orderIdSearch.value} not found`;
      return;
    }

    selectedOrder.value = orderResult.data;
    console.log('📋 Found order:', selectedOrder.value);

    // Get order items
    const orderItemsResult = await client.models.OrderItem.list({
      filter: { orderId: { eq: orderIdSearch.value.trim() } }
    });
    orderItems.value = orderItemsResult.data || [];
    console.log('📦 Order items:', orderItems.value);

    // Get existing returns for this order
    const returnsResult = await client.models.Return.list({
      filter: { orderId: { eq: orderIdSearch.value.trim() } }
    });
    existingReturns.value = returnsResult.data || [];

    // Get existing return items
    if (existingReturns.value.length > 0) {
      // Query each return individually and combine results
      const allReturnItems: ReturnItem[] = [];
      for (const returnRecord of existingReturns.value) {
        const returnItemsResult = await client.models.ReturnItem.list({
          filter: { returnId: { eq: returnRecord.id } }
        });
        if (returnItemsResult.data) {
          allReturnItems.push(...returnItemsResult.data);
        }
      }
      existingReturnItems.value = allReturnItems;
    } else {
      existingReturnItems.value = [];
    }


    // Build return lines from order items
    buildReturnLines();
    orderFound.value = true;

  } catch (err: any) {
    console.error('❌ Error searching for order:', err);
    formError.value = err?.message || 'Failed to search for order';
  } finally {
    searching.value = false;
  }
}

// Build return lines from order items
function buildReturnLines() {
  returnLines.splice(0, returnLines.length);

  for (const orderItem of orderItems.value) {
    const product = productById.value.get(orderItem.productId);
    const alreadyReturned = returnedQuantityByOrderItem.value.get(orderItem.id) || 0;
    const maxReturnable = (orderItem.quantity || 0) - alreadyReturned;

    if (maxReturnable > 0) {
      returnLines.push({
        orderItemId: orderItem.id,
        productId: orderItem.productId,
        productName: product?.productName || orderItem.productId,
        originalQuantity: orderItem.quantity || 0,
        maxReturnableQuantity: maxReturnable,
        quantityToReturn: null,
        unitPrice: orderItem.unitPrice || 0,
        condition: 'new'
      });
    }
  }

  console.log('📋 Built return lines:', returnLines);
}

// Remove line from returns (set quantity to 0)
function removeLine(index: number) {
  returnLines[index].quantityToReturn = null;
}

// Reset form
function resetForm() {
  selectedOrder.value = null;
  orderItems.value = [];
  existingReturns.value = [];
  existingReturnItems.value = [];
  returnLines.splice(0, returnLines.length);
  orderIdSearch.value = '';
  returnReason.value = '';
  orderFound.value = false;
  formError.value = '';
  formSuccess.value = '';
}

// Validation
function validate(): boolean {
  formError.value = '';

  if (!selectedOrder.value) {
    formError.value = 'Please search for and select an order first';
    return false;
  }

  // At least one item to return
  const itemsToReturn = returnLines.filter(line => line.quantityToReturn && line.quantityToReturn > 0);
  if (itemsToReturn.length === 0) {
    formError.value = 'Please select at least one item to return';
    return false;
  }

  // Validate each line
  for (const [idx, line] of returnLines.entries()) {
    if (line.quantityToReturn && line.quantityToReturn > 0) {
      if (!Number.isInteger(line.quantityToReturn) || line.quantityToReturn <= 0) {
        formError.value = `Line ${idx + 1}: Return quantity must be a positive integer`;
        return false;
      }

      if (line.quantityToReturn > line.maxReturnableQuantity) {
        formError.value = `Line ${idx + 1}: Cannot return ${line.quantityToReturn} items. Maximum returnable: ${line.maxReturnableQuantity}`;
        return false;
      }

      if (!line.condition) {
        formError.value = `Line ${idx + 1}: Please select item condition`;
        return false;
      }
    }
  }

  if (totalRefundAmount.value <= 0) {
    formError.value = 'Total refund amount must be greater than 0';
    return false;
  }

  return true;
}

// Submit return
async function submitReturn() {
  if (!validate()) return;

  submitting.value = true;
  formError.value = '';
  formSuccess.value = '';

  try {
    console.log('🔄 Starting return submission...');

    const itemsToReturn = returnLines.filter(line => line.quantityToReturn && line.quantityToReturn > 0);

    // Create the Return record
    const returnResult = await client.models.Return.create({
      orderId: selectedOrder.value!.id,
      returnDate: Date.now(),
      totalRefundAmount: totalRefundAmount.value,
      status: 'pending',
      reason: returnReason.value || 'Customer return'
    });

    const returnId = returnResult.data?.id;
    if (!returnId) {
      formError.value = 'Failed to create return record';
      return;
    }

    console.log(`📝 Created return with ID: ${returnId}`);

    // Create ReturnItem records
    for (const line of itemsToReturn) {
      const refundAmount = +(line.unitPrice * (line.quantityToReturn as number)).toFixed(2);

      await client.models.ReturnItem.create({
        returnId: returnId,
        orderItemId: line.orderItemId,
        productId: line.productId,
        quantityReturned: line.quantityToReturn as number,
        refundAmount: refundAmount,
        condition: line.condition
      });

      console.log(`✅ Created return item for ${line.productName}: ${line.quantityToReturn} units`);
    }

    formSuccess.value = `Return ${returnId} created successfully. Total refund: ${totalRefundAmount.value.toFixed(2)} kr`;

    // Refresh the order data to show updated returnable quantities
    await searchOrder();

  } catch (err: any) {
    console.error('❌ Return submission failed:', err);
    formError.value = err?.message || 'Failed to submit return. Please try again.';
  } finally {
    submitting.value = false;
  }
}

function formatDate(timestamp: number | null | undefined): string {
  if (!timestamp) return '—';
  return new Date(timestamp).toLocaleString();
}

function formatCurrency(amount: number | null | undefined): string {
  return `${(amount ?? 0).toFixed(2)} kr`;
}
</script>

<template>
  <div class="refund-container">
    <!-- Order Search Section -->
    <div class="search-section">
      <h3>Process Return</h3>
      <div class="search-form">
        <div class="field">
          <label>Order ID</label>
          <div class="search-input-group">
            <input
                v-model="orderIdSearch"
                type="text"
                placeholder="Enter Order ID to search..."
                @keyup.enter="searchOrder"
            >
            <button
                @click="searchOrder"
                :disabled="searching || !orderIdSearch.trim()"
                class="search-btn"
            >
              {{ searching ? 'Searching...' : 'Search' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Order Details Section -->
    <div v-if="selectedOrder" class="order-details">
      <h4>Order Details</h4>
      <div class="order-info">
        <div class="info-row">
          <span class="label">Order ID:</span>
          <span class="value">{{ selectedOrder.id }}</span>
        </div>
        <div class="info-row">
          <span class="label">Order Date:</span>
          <span class="value">{{ formatDate(selectedOrder.orderDate) }}</span>
        </div>
        <div class="info-row">
          <span class="label">Total Amount:</span>
          <span class="value">{{ formatCurrency(selectedOrder.totalAmount) }}</span>
        </div>
        <div class="info-row">
          <span class="label">Status:</span>
          <span class="value">{{ selectedOrder.status }}</span>
        </div>
      </div>
    </div>

    <!-- Return Form Section -->
    <div v-if="orderFound && returnLines.length > 0" class="return-form">
      <h4>Items Available for Return</h4>

      <div class="lines">
        <div
            class="line"
            v-for="(line, idx) in returnLines"
            :key="line.orderItemId"
        >
          <div class="product-info">
            <div class="product-name">{{ line.productName }}</div>
            <div class="product-details">
              ID: {{ line.productId }} •
              Original Qty: {{ line.originalQuantity }} •
              Max Returnable: {{ line.maxReturnableQuantity }}
            </div>
          </div>

          <div class="return-controls">
            <div class="field qty">
              <label>Return Qty</label>
              <div class="qty-stepper">
                <v-btn
                    icon
                    size="small"
                    variant="outlined"
                    @click="decrementReturnQuantity(idx)"
                    :disabled="(line.quantityToReturn || 1) <= 1"
                >
                  <v-icon>mdi-minus</v-icon>
                </v-btn>

                <v-text-field
                    v-model="line.quantityToReturn"
                    readonly
                    variant="outlined"
                    density="compact"
                    style="width: 60px"
                    class="text-center"
                    hide-details
                ></v-text-field>

                <v-btn
                    icon
                    size="small"
                    variant="outlined"
                    @click="incrementReturnQuantity(idx)"
                    :disabled="(line.quantityToReturn || 0) >= line.maxReturnableQuantity"
                >
                  <v-icon>mdi-plus</v-icon>
                </v-btn>
              </div>
            </div>

            <div class="field condition">
              <label>Condition</label>
              <select v-model="line.condition">
                <option value="new">New</option>
                <option value="used">Used</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>

            <div class="field refund">
              <label>Refund Amount</label>
              <div class="refund-value">
                {{ lineRefundAmounts[idx].toFixed(2) }} kr
              </div>
            </div>

            <button
                class="remove-btn"
                @click="removeLine(idx)"
                title="Remove from return"
                v-if="line.quantityToReturn && line.quantityToReturn > 0"
            >
              ×
            </button>
          </div>
        </div>
      </div>

      <div class="return-reason">
        <div class="field">
          <label>Return Reason (Optional)</label>
          <textarea
              v-model="returnReason"
              placeholder="Enter reason for return..."
              rows="3"
          ></textarea>
        </div>
      </div>

      <div class="summary">
        <div class="total">
          <strong>Total Refund Amount:</strong> {{ totalRefundAmount.toFixed(2) }} kr
        </div>
      </div>
    </div>

    <!-- No Items Message -->
    <div v-else-if="orderFound && returnLines.length === 0" class="no-items">
      <p>No items from this order are available for return. All items may have already been returned.</p>
    </div>

    <!-- Messages -->
    <div v-if="formError" class="error">{{ formError }}</div>
    <div v-if="formSuccess" class="success">{{ formSuccess }}</div>

    <!-- Action Buttons -->
    <div class="submit" v-if="orderFound && returnLines.length > 0">
      <button class="reset-btn" :disabled="submitting" @click="resetForm">Reset</button>
      <button
          class="submit-btn"
          :disabled="submitting || totalRefundAmount <= 0"
          @click="submitReturn"
      >
        {{ submitting ? 'Processing Return...' : 'Process Return' }}
      </button>
    </div>

  </div>
</template>

<style scoped>
.refund-container {
  width: 100%;
  margin: 0 auto;
  background-color: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  border: 1px solid #e5e7eb;
}

.search-section {
  margin-bottom: 20px;
}

.search-section h3 {
  margin-bottom: 16px;
  color: #4a5568;
}

.search-input-group {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.search-input-group input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
}

.search-btn {
  background-color: #1976D2;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  white-space: nowrap;
  transition: background-color 0.2s ease;
}

.search-btn:hover:not(:disabled) {
  background-color: #1565C0;
}

.search-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.order-details {
  background: #f8fafc;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 20px;
  border: 1px solid #e5e7eb;
}

.order-details h4 {
  margin-bottom: 12px;
  color: #4a5568;
}

.order-info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.info-row {
  display: flex;
  justify-content: space-between;
}

.label {
  font-weight: 500;
  color: #6b7280;
}

.value {
  font-weight: 500;
  color: #4a5568;
}

.return-form {
  margin-bottom: 20px;
}

.return-form h4 {
  margin-bottom: 16px;
  color: #4a5568;
}

.lines {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}

.line {
  background: #fff;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.line:hover {
  box-shadow: 0 4px 8px rgba(25, 118, 210, 0.15);
  border-color: rgb(25, 118, 210, 0.3);
  transform: translateY(-2px);
}

.product-info {
  margin-bottom: 12px;
}

.product-name {
  font-weight: 500;
  font-size: 1.1em;
  color: #4a5568;
  margin-bottom: 4px;
}

.product-details {
  font-size: 0.9em;
  color: #6b7280;
}

.return-controls {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 12px;
  align-items: end;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field select,
.field input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
}

.refund-value {
  padding: 8px 12px;
  background: #f3f4f6;
  border-radius: 4px;
  font-weight: 500;
  text-align: right;
  color: #16a34a;
}

.qty-stepper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.remove-btn {
  height: 36px;
  width: 36px;
  border-radius: 4px;
  background-color: #ef4444;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 18px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.remove-btn:hover {
  background-color: #dc2626;
}

.return-reason {
  margin-bottom: 16px;
}

.return-reason textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
}

.summary {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.total {
  font-size: 1.1em;
  color: #16a34a;
}

.no-items {
  text-align: center;
  padding: 40px 20px;
  background-color: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  color: #6b7280;
}

.error {
  color: #dc2626;
  margin-top: 8px;
  padding: 8px 12px;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 4px;
}

.success {
  color: #16a34a;
  margin-top: 8px;
  padding: 8px 12px;
  background-color: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 4px;
}

.submit {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.submit-btn {
  background-color: #3b82f6;
  color: #fff;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.submit-btn:hover:not(:disabled) {
  background-color: #2563eb;
}

.submit-btn:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
}

.reset-btn {
  background-color: #e5e7eb;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.reset-btn:hover {
  background-color: #d1d5db;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .refund-container {
    padding: 12px;
  }

  .order-info {
    grid-template-columns: 1fr;
  }

  .return-controls {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .search-input-group {
    flex-direction: column;
  }

  .submit {
    flex-direction: column;
  }

  .submit-btn,
  .reset-btn {
    width: 100%;
  }

  .qty-stepper {
    gap: 4px;
  }
}
</style>