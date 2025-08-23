
<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import Quagga, { type QuaggaJSConfigObject } from '@ericblade/quagga2';

const isScanning = ref(false);
const scannedData = ref<string>('');
const errorMessage = ref<string>('');
const scannerContainer = ref<HTMLElement | null>(null);
const isInitialized = ref(false);
const debugMessages = ref<string[]>([]);
const showDebugPanel = ref(false);

// Debug helper function
const addDebugMessage = (message: string) => {
  const timestamp = new Date().toLocaleTimeString();
  debugMessages.value.unshift(`[${timestamp}] ${message}`);
  // Keep only last 20 messages
  if (debugMessages.value.length > 20) {
    debugMessages.value = debugMessages.value.slice(0, 20);
  }
  console.log(`DEBUG: ${message}`);
};

// Start the barcode scanner
const startScanner = async () => {
  try {
    errorMessage.value = '';
    isScanning.value = true;
    addDebugMessage('Starting scanner...');

    await nextTick(); // Wait for DOM updates

    if (!scannerContainer.value) {
      const error = 'Scanner container not found';
      errorMessage.value = error;
      addDebugMessage(`ERROR: ${error}`);
      isScanning.value = false;
      return;
    }

    addDebugMessage('Scanner container found, initializing Quagga...');

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

    addDebugMessage(`Config created with ${config.decoder?.readers?.length || 0} readers`);

    return new Promise<void>((resolve, reject) => {
      Quagga.init(config, (err: any) => {
        if (err) {
          const errorMsg = `Error initializing Quagga: ${err.message || err}`;
          console.error(errorMsg, err);
          addDebugMessage(`ERROR: ${errorMsg}`);
          reject(err);
          return;
        }

        addDebugMessage("Quagga initialization finished. Starting camera...");
        Quagga.start();
        isInitialized.value = true;

        // Add processing event listener for debugging
        Quagga.onProcessed((result: any) => {
          if (result && result.boxes) {
            addDebugMessage(`Processing frame: ${result.boxes.length} detection boxes found`);
          }
        });

        // Set up the detection handler
        Quagga.onDetected((data: any) => {
          addDebugMessage(`BARCODE DETECTED! Code: ${data.codeResult.code}, Format: ${data.codeResult.format}`);
          console.log('Barcode detected:', data);
          scannedData.value = data.codeResult.code;
          stopScanner();
        });

        addDebugMessage("Scanner started successfully. Camera should be active.");
        resolve();
      });
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to start scanner';
    console.error('Error starting scanner:', error);
    addDebugMessage(`ERROR: ${errorMsg}`);
    errorMessage.value = errorMsg;
    isScanning.value = false;
    throw error;
  }
};

// Stop the barcode scanner
const stopScanner = () => {
  if (isInitialized.value) {
    addDebugMessage('Stopping scanner...');
    Quagga.stop();
    isInitialized.value = false;
  }
  isScanning.value = false;
  addDebugMessage('Scanner stopped.');
};

// Reset the scanner for a new scan
const resetScanner = () => {
  addDebugMessage('Resetting scanner...');
  scannedData.value = '';
  errorMessage.value = '';
  stopScanner();
};

// Check if the device supports camera
const checkCameraSupport = () => {
  addDebugMessage('Checking camera support...');

  if (typeof window === 'undefined') {
    addDebugMessage('ERROR: Window object not available');
    return false;
  }

  if (!window.navigator) {
    addDebugMessage('ERROR: Navigator not available');
    errorMessage.value = 'Navigator is not supported on this device';
    return false;
  }

  if (!window.navigator.mediaDevices) {
    addDebugMessage('ERROR: MediaDevices not available');
    errorMessage.value = 'MediaDevices is not supported on this device';
    return false;
  }

  if (!window.navigator.mediaDevices.getUserMedia) {
    addDebugMessage('ERROR: getUserMedia not available');
    errorMessage.value = 'Camera access is not supported on this device';
    return false;
  }

  addDebugMessage('Camera support: OK');
  return true;
};

// Test camera permissions
const testCameraPermissions = async () => {
  try {
    addDebugMessage('Testing camera permissions...');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    });
    addDebugMessage('Camera permission: GRANTED');
    // Stop the test stream
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Camera permission denied';
    addDebugMessage(`Camera permission: DENIED - ${errorMsg}`);
    return false;
  }
};

// Clear debug messages
const clearDebugMessages = () => {
  debugMessages.value = [];
};

// Copy to clipboard function
const copyToClipboard = async () => {
  try {
    if (typeof window !== 'undefined' && window.navigator?.clipboard) {
      await window.navigator.clipboard.writeText(scannedData.value);
      addDebugMessage('Copied to clipboard successfully');
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = scannedData.value;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      addDebugMessage('Copied to clipboard (fallback method)');
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Failed to copy';
    console.error('Failed to copy to clipboard:', error);
    addDebugMessage(`ERROR copying to clipboard: ${errorMsg}`);
  }
};

onMounted(() => {
  addDebugMessage('Component mounted');
  checkCameraSupport();
});

onUnmounted(() => {
  addDebugMessage('Component unmounting...');
  stopScanner();
});
</script>

<template>
  <div class="barcode-view">
    <v-card class="mx-auto" max-width="800">
      <v-card-title class="text-h4 text-center">
        <v-icon class="me-2">mdi-barcode-scan</v-icon>
        Barcode Scanner
      </v-card-title>

      <v-card-text>
        <!-- Debug Panel Toggle -->
        <div class="mb-4">
          <v-btn
              @click="showDebugPanel = !showDebugPanel"
              color="info"
              variant="outlined"
              size="small"
          >
            <v-icon class="me-2">mdi-bug</v-icon>
            {{ showDebugPanel ? 'Hide' : 'Show' }} Debug Info
          </v-btn>
          <v-btn
              v-if="showDebugPanel"
              @click="testCameraPermissions"
              color="warning"
              variant="outlined"
              size="small"
              class="ml-2"
          >
            <v-icon class="me-2">mdi-camera-check</v-icon>
            Test Camera
          </v-btn>
        </div>

        <!-- Debug Panel -->
        <v-card
            v-if="showDebugPanel"
            variant="outlined"
            class="mb-4"
        >
          <v-card-title class="text-h6 d-flex align-center">
            <v-icon class="me-2">mdi-console</v-icon>
            Debug Messages
            <v-spacer></v-spacer>
            <v-btn
                @click="clearDebugMessages"
                color="error"
                variant="text"
                size="small"
            >
              Clear
            </v-btn>
          </v-card-title>
          <v-card-text>
            <div class="debug-messages">
              <div
                  v-for="(message, index) in debugMessages"
                  :key="index"
                  class="debug-message"
                  :class="{ 
                    'error-message': message.includes('ERROR'),
                    'success-message': message.includes('DETECTED') || message.includes('OK')
                  }"
              >
                {{ message }}
              </div>
              <div v-if="debugMessages.length === 0" class="text-grey">
                No debug messages yet...
              </div>
            </div>
          </v-card-text>
        </v-card>

        <!-- Scanner Container -->
        <div v-if="!scannedData" class="scanner-section">
          <div
              ref="scannerContainer"
              class="scanner-container"
              :class="{ 'scanning': isScanning }"
          >
            <div v-if="!isScanning" class="scanner-placeholder">
              <v-icon size="100" color="grey-lighten-1">mdi-camera</v-icon>
              <p class="text-h6 mt-4">Camera preview will appear here</p>
            </div>
          </div>

          <!-- Controls -->
          <div class="controls mt-4">
            <v-btn
                v-if="!isScanning"
                @click="startScanner"
                color="primary"
                size="large"
                block
                :disabled="!!errorMessage"
            >
              <v-icon class="me-2">mdi-camera</v-icon>
              Start Scanning
            </v-btn>

            <v-btn
                v-else
                @click="stopScanner"
                color="error"
                size="large"
                block
            >
              <v-icon class="me-2">mdi-stop</v-icon>
              Stop Scanning
            </v-btn>
          </div>

          <!-- Instructions -->
          <v-alert
              v-if="isScanning"
              type="info"
              class="mt-4"
              border="start"
          >
            <v-icon class="me-2">mdi-information</v-icon>
            Point your camera at a barcode. The scan will happen automatically when a barcode is detected.
          </v-alert>
        </div>

        <!-- Results Section -->
        <div v-if="scannedData" class="results-section">
          <v-alert
              type="success"
              class="mb-4"
              border="start"
          >
            <v-icon class="me-2">mdi-check-circle</v-icon>
            Barcode scanned successfully!
          </v-alert>

          <v-card variant="outlined" class="mb-4">
            <v-card-title class="text-h6">
              Scanned Data
            </v-card-title>
            <v-card-text>
              <div class="scanned-data">
                <v-chip
                    color="success"
                    size="large"
                    class="ma-1"
                    label
                >
                  {{ scannedData }}
                </v-chip>
              </div>

              <!-- Additional actions -->
              <div class="mt-4">
                <v-btn
                    @click="copyToClipboard"
                    color="primary"
                    variant="outlined"
                    class="me-2"
                >
                  <v-icon class="me-2">mdi-content-copy</v-icon>
                  Copy to Clipboard
                </v-btn>
              </div>
            </v-card-text>
          </v-card>

          <v-btn
              @click="resetScanner"
              color="primary"
              size="large"
              block
          >
            <v-icon class="me-2">mdi-barcode-scan</v-icon>
            Scan Another Barcode
          </v-btn>
        </div>

        <!-- Error Messages -->
        <v-alert
            v-if="errorMessage"
            type="error"
            class="mt-4"
            border="start"
            closable
            @click:close="errorMessage = ''"
        >
          <v-icon class="me-2">mdi-alert-circle</v-icon>
          {{ errorMessage }}
        </v-alert>

        <!-- Browser Compatibility Info -->
        <v-expansion-panels class="mt-4">
          <v-expansion-panel>
            <v-expansion-panel-title>
              <v-icon class="me-2">mdi-information</v-icon>
              Browser & Device Requirements
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-list density="compact">
                <v-list-item>
                  <v-list-item-title>📱 Mobile devices work best for barcode scanning</v-list-item-title>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>📷 Camera access permission is required</v-list-item-title>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>🔒 HTTPS connection is required for camera access</v-list-item-title>
                </v-list-item>
                <v-list-item>
                  <v-list-item-title>🌐 Modern browsers (Chrome, Firefox, Safari, Edge)</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
    </v-card>
  </div>
</template>

<style scoped>
.barcode-view {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.scanner-container {
  position: relative;
  width: 100%;
  max-width: 640px;
  height: 480px;
  margin: 0 auto;
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

.scanned-data {
  word-break: break-all;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.debug-messages {
  max-height: 300px;
  overflow-y: auto;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.4;
  padding: 8px;
  background-color: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.debug-message {
  margin-bottom: 4px;
  padding: 2px 4px;
  border-radius: 2px;
}

.debug-message.error-message {
  background-color: #ffebee;
  color: #c62828;
}

.debug-message.success-message {
  background-color: #e8f5e8;
  color: #2e7d32;
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

/* Mobile responsiveness */
@media (max-width: 600px) {
  .barcode-view {
    padding: 1rem;
  }

  .scanner-container {
    height: 300px;
  }
}
</style>