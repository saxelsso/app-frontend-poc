
<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import Quagga, { type QuaggaJSConfigObject } from '@ericblade/quagga2';

const isScanning = ref(false);
const scannedData = ref<string>('');
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
      return; // Early return instead of throwing
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
          { format: "code_128", config: { supplements: [] } },
          { format: "ean", config: { supplements: [] } },
          { format: "ean_8", config: { supplements: [] } },
          { format: "code_39", config: { supplements: [] } },
          { format: "code_39_vin", config: { supplements: [] } },
          { format: "codabar", config: { supplements: [] } },
          { format: "upc", config: { supplements: [] } },
          { format: "upc_e", config: { supplements: [] } },
          { format: "i2of5", config: { supplements: [] } }
        ]
      },
      locate: true
    };

    return new Promise<void>((resolve, reject) => {
      Quagga.init(config, (err: any) => {
        if (err) {
          console.error('Error initializing Quagga:', err);
          reject(err);
          return;
        }

        console.log("Initialization finished. Ready to start");
        Quagga.start();
        isInitialized.value = true;

        // Set up the detection handler
        Quagga.onDetected((data: any) => {
          console.log('Barcode detected:', data);
          scannedData.value = data.codeResult.code;
          stopScanner();
        });

        resolve();
      });
    });
  } catch (error) {
    console.error('Error starting scanner:', error);
    errorMessage.value = error instanceof Error ? error.message : 'Failed to start scanner';
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

// Reset the scanner for a new scan
const resetScanner = () => {
  scannedData.value = '';
  errorMessage.value = '';
  stopScanner();
};

// Check if the device supports camera
const checkCameraSupport = () => {
  if (typeof window !== 'undefined' &&
      (!window.navigator?.mediaDevices || !window.navigator?.mediaDevices?.getUserMedia)) {
    errorMessage.value = 'Camera is not supported on this device';
    return false;
  }
  return true;
};

// Copy to clipboard function
const copyToClipboard = async () => {
  try {
    if (typeof window !== 'undefined' && window.navigator?.clipboard) {
      await window.navigator.clipboard.writeText(scannedData.value);
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = scannedData.value;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
  }
};

onMounted(() => {
  checkCameraSupport();
});

onUnmounted(() => {
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