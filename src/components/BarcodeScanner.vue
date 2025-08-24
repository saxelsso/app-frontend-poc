<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import Quagga, { type QuaggaJSConfigObject } from '@ericblade/quagga2';

// Props and emits
interface Props {
  show: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:show': [value: boolean];
  'barcode-scanned': [barcode: string];
  'close': [];
}>();

// Reactive state
const isScanning = ref(false);
const errorMessage = ref<string>('');
const scannerContainer = ref<HTMLElement | null>(null);
const isInitialized = ref(false);

// Start the barcode scanner
const startScanner = async () => {
  try {
    errorMessage.value = '';
    isScanning.value = true;

    await nextTick(); // Wait for DOM updates

    if (!scannerContainer.value) {
      errorMessage.value = 'Scanner container not found';
      isScanning.value = false;
      return;
    }

    const config: QuaggaJSConfigObject = {
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: scannerContainer.value,
        constraints: {
          width: { min: 640, ideal: 1280 },
          height: { min: 480, ideal: 720 },
          facingMode: "environment", // Use back camera
          aspectRatio: { min: 1, max: 2 }
        }
      },
      locator: {
        patchSize: "medium",
        halfSample: true
      },
      numOfWorkers: 2,
      decoder: {
        readers: [
          { format: "code_128_reader", config: { supplements: [] } },
          { format: "ean_reader", config: { supplements: [] } },
          { format: "ean_8_reader", config: { supplements: [] } },
          { format: "code_39_reader", config: { supplements: [] } },
          { format: "code_39_vin_reader", config: { supplements: [] } },
          { format: "codabar_reader", config: { supplements: [] } },
          { format: "upc_reader", config: { supplements: [] } },
          { format: "upc_e_reader", config: { supplements: [] } },
          { format: "i2of5_reader", config: { supplements: [] } }
        ]
      },
      locate: true
    };

    return new Promise<void>((resolve, reject) => {
      Quagga.init(config, (err: any) => {
        if (err) {
          console.error('Error initializing Quagga:', err);
          errorMessage.value = `Error initializing scanner: ${err.message || err}`;
          reject(err);
          return;
        }

        Quagga.start();
        isInitialized.value = true;

        // Set up the detection handler
        Quagga.onDetected((data: any) => {
          const scannedCode = data.codeResult.code;
          console.log('Barcode detected:', scannedCode);

          // Emit the scanned barcode and close the scanner
          emit('barcode-scanned', scannedCode);
          closeScanner();
        });

        resolve();
      });
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to start scanner';
    console.error('Error starting scanner:', error);
    errorMessage.value = errorMsg;
    isScanning.value = false;
    throw error;
  }
};

// Stop the barcode scanner
const stopScanner = () => {
  if (isInitialized.value) {
    Quagga.stop();
    isInitialized.value = false;
  }
  isScanning.value = false;
};

// Close scanner and emit close event
const closeScanner = () => {
  stopScanner();
  emit('update:show', false);
  emit('close');
};

// Check if the device supports camera
const checkCameraSupport = () => {
  if (typeof window === 'undefined' || !window.navigator?.mediaDevices?.getUserMedia) {
    errorMessage.value = 'Camera access is not supported on this device';
    return false;
  }
  return true;
};

// Watch for show prop changes
const handleShowChange = async () => {
  if (props.show && checkCameraSupport()) {
    await startScanner();
  } else if (!props.show) {
    stopScanner();
  }
};

// Watch for prop changes
onMounted(() => {
  if (props.show) {
    handleShowChange();
  }
});

onUnmounted(() => {
  stopScanner();
});

// Reactive effect for show prop
import { watch } from 'vue';
watch(() => props.show, handleShowChange);
</script>

<template>
  <v-dialog
      :model-value="show"
      @update:model-value="$emit('update:show', $event)"
      max-width="600"
      persistent
  >
    <v-card>
      <v-card-title class="d-flex align-center">
        <v-icon class="me-2">mdi-barcode-scan</v-icon>
        Scan Barcode
        <v-spacer></v-spacer>
        <v-btn
            icon="mdi-close"
            variant="text"
            @click="closeScanner"
        ></v-btn>
      </v-card-title>

      <v-card-text>
        <!-- Scanner Container -->
        <div class="scanner-section">
          <div
              ref="scannerContainer"
              class="scanner-container"
              :class="{ 'scanning': isScanning }"
          >
            <div v-if="!isScanning" class="scanner-placeholder">
              <v-icon size="60" color="grey-lighten-1">mdi-camera</v-icon>
              <p class="text-body-1 mt-2">Camera preview will appear here</p>
            </div>
          </div>

          <!-- Instructions -->
          <v-alert
              v-if="isScanning"
              type="info"
              class="mt-4"
              border="start"
              density="compact"
          >
            Point your camera at a barcode. The scan will happen automatically.
          </v-alert>

          <!-- Error Messages -->
          <v-alert
              v-if="errorMessage"
              type="error"
              class="mt-4"
              border="start"
              density="compact"
          >
            {{ errorMessage }}
          </v-alert>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
            color="grey"
            variant="text"
            @click="closeScanner"
        >
          Cancel
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.scanner-container {
  position: relative;
  width: 100%;
  height: 300px;
  border: 2px dashed #ccc;
  border-radius: 8px;
  overflow: hidden;
  background-color: #f5f5f5;
}

.scanner-container.scanning {
  border-color: #1976d2;
  background-color: #000;
}

.scanner-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
}

/* Quagga specific styles */
:deep(.scanner-container canvas) {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover;
}

:deep(.scanner-container video) {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover;
}
</style>