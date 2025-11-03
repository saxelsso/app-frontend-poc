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
const errorType = ref<'error' | 'warning' | 'info' | 'debug'>('error');
const scannerContainer = ref<HTMLElement | null>(null);
const isInitialized = ref(false);

// Error message helper functions
const setError = (message: string, type: 'error' | 'warning' | 'info' | 'debug' = 'error') => {
  // Debug messages only appear in dev builds
  if (type === 'debug' && !import.meta.env.DEV) {
    return;
  }
  errorMessage.value = message;
  errorType.value = type;
};

const clearError = () => {
  errorMessage.value = '';
  errorType.value = 'error';
};

// Start the barcode scanner
const startScanner = async () => {
  try {
    clearError();
    isScanning.value = true;

    await nextTick(); // Wait for DOM updates

    if (!scannerContainer.value) {
      setError('Failed to initialize scanner: The camera container element is not available. Please try closing and reopening the scanner.', 'error');
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
          
          // Provide detailed error messages based on error type
          let detailedMessage = 'Failed to initialize the barcode scanner';
          
          if (err.name === 'NotAllowedError' || err.message?.includes('Permission denied')) {
            detailedMessage = 'Camera access denied. Please grant camera permissions in your browser settings and try again.';
          } else if (err.name === 'NotFoundError' || err.message?.includes('not found')) {
            detailedMessage = 'No camera detected. Please ensure your device has a camera and it is properly connected.';
          } else if (err.name === 'NotReadableError' || err.message?.includes('in use')) {
            detailedMessage = 'Camera is already in use by another application. Please close other apps using the camera and try again.';
          } else if (err.name === 'OverconstrainedError') {
            detailedMessage = 'Camera does not meet the required specifications. Try using a different camera or device.';
          } else if (err.name === 'TypeError' || err.message?.includes('constraints')) {
            detailedMessage = 'Invalid camera configuration. Please try again or contact support if the issue persists.';
          } else if (err.message) {
            detailedMessage = `Scanner initialization failed: ${err.message}`;
          }
          
          setError(detailedMessage, 'error');
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
    console.error('Error starting scanner:', error);
    
    // Provide user-friendly error messages
    let errorMsg = 'An unexpected error occurred while starting the scanner';
    
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        errorMsg = 'Camera permission was denied. Please allow camera access in your browser settings.';
      } else if (error.name === 'NotFoundError') {
        errorMsg = 'No camera found on this device. Please connect a camera and try again.';
      } else if (error.name === 'NotReadableError') {
        errorMsg = 'Cannot access camera - it may be in use by another application.';
      } else if (error.message) {
        errorMsg = `Scanner error: ${error.message}`;
      }
    }
    
    setError(errorMsg, 'error');
    isScanning.value = false;
    throw error;
  }
};

// Stop the barcode scanner
const stopScanner = () => {
  try {
    if (isInitialized.value) {
      Quagga.stop();
      isInitialized.value = false;
    }
    isScanning.value = false;
  } catch (error) {
    console.error('Error stopping scanner:', error);
    // Non-critical error - scanner will be cleaned up but log for debugging
    isInitialized.value = false;
    isScanning.value = false;
  }
};

// Close scanner and emit close event
const closeScanner = () => {
  stopScanner();
  emit('update:show', false);
  emit('close');
};

// Check if the device supports camera
const checkCameraSupport = () => {
  if (typeof window === 'undefined') {
    setError('Scanner cannot run in this environment. Camera access requires a browser environment.', 'error');
    return false;
  }
  
  if (!window.navigator?.mediaDevices) {
    setError('Camera API is not available. Please ensure you are using HTTPS or localhost, and your browser supports camera access.', 'error');
    return false;
  }
  
  if (!window.navigator.mediaDevices.getUserMedia) {
    setError('Your browser does not support camera access. Please update your browser or use a modern browser like Chrome, Firefox, or Safari.', 'error');
    return false;
  }
  
  return true;
};

// Watch for show prop changes
const handleShowChange = async () => {
  try {
    if (props.show && checkCameraSupport()) {
      await startScanner();
    } else if (!props.show) {
      stopScanner();
    }
  } catch (error) {
    console.error('Error handling scanner visibility change:', error);
    // Error already handled in startScanner, just ensure scanner is stopped
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
              :type="errorType === 'debug' ? 'info' : errorType"
              class="mt-4"
              :class="{ 'debug-alert': errorType === 'debug' }"
              border="start"
              density="compact"
              closable
              @click:close="clearError()"
          >
            <span v-if="errorType === 'debug'" class="debug-label">[DEBUG]</span>
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

/* Debug alert styling */
.debug-alert {
  opacity: 0.9;
  font-family: monospace;
}

.debug-label {
  font-weight: bold;
  margin-right: 8px;
  color: #1976d2;
}
</style>