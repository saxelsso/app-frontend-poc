<script setup lang="ts">
import { ref } from 'vue';
import jsPDF from 'jspdf';

async function sharePage() {
  // Generate a simple PDF receipt
  const doc = new jsPDF();
  doc.text('Receipt', 10, 10);
  doc.text('Date: ' + new Date().toLocaleString(), 10, 20);
  doc.text('Amount: $42.00', 10, 30);
  doc.text('Thank you for your purchase!', 10, 40);

  // Convert PDF to Blob
  const pdfBlob = doc.output('blob');
  const file = new File([pdfBlob], 'receipt.pdf', { type: 'application/pdf' });

  if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({
        title: 'Your Receipt',
        text: 'Here is your receipt as a PDF.',
        files: [file],
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  } else {
    alert('PDF sharing is not supported on this device/browser.');
  }
}

</script>

<template>
  <v-container>
    <v-card class="hero-card" color="primary" dark>
      <v-card-text class="text-center pa-8">
        <h1 class="display-2 mb-4">Modern Serverless Application Development</h1>
        <p class="headline font-weight-light">A Proof-of-Concept Showcase</p>
      </v-card-text>
    </v-card>
    
    <v-row class="mt-8">
      <v-col cols="12">
        <v-card>
            <v-row class="mb-4">
              <v-col cols="12" class="d-flex justify-end">
                <v-btn color="secondary" @click="sharePage">
                  <v-icon left>mdi-share-variant</v-icon>
                  Share This Page
                </v-btn>
              </v-col>
            </v-row>
          <v-card-title>
            <h2>About This Project</h2>
          </v-card-title>
          <v-card-text>
            <p class="text-body-1">
              This application demonstrates how modern development tools can be combined to create 
              powerful serverless applications with AI integration — all without traditional server infrastructure.
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    
    <v-row class="mt-6">
      <v-col cols="12">
        <h2 class="mb-4">Technology Stack</h2>
        <v-row>
          <v-col cols="12" sm="6" md="3">
            <v-card height="200" hover>
              <v-card-title class="primary--text">Claude Code</v-card-title>
              <v-card-text>
                AI-assisted development for faster implementation and problem-solving
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-card height="200" hover>
              <v-card-title class="primary--text">AWS Amplify</v-card-title>
              <v-card-text>
                Serverless backend with authentication and data storage capabilities
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-card height="200" hover>
              <v-card-title class="primary--text">Vue 3 + Vuetify</v-card-title>
              <v-card-text>
                Modern reactive frontend framework with Material Design components
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" sm="6" md="3">
            <v-card height="200" hover>
              <v-card-title class="primary--text">GitHub Codespaces</v-card-title>
              <v-card-text>
                Cloud development environment for seamless collaboration
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
    
    <v-row class="mt-6">
      <v-col cols="12">
        <v-card>
          <v-card-title>
            <h2>Benefits Over Traditional Development</h2>
          </v-card-title>
          <v-card-text>
            <v-simple-table>
              <tbody>
                <tr>
                  <td style="width:40px;">
                    <v-icon color="primary">mdi-check-circle</v-icon>
                  </td>
                  <td>No server maintenance or infrastructure management</td>
                </tr>
                <tr>
                  <td>
                    <v-icon color="primary">mdi-check-circle</v-icon>
                  </td>
                  <td>Automatic scaling based on application load</td>
                </tr>
                <tr>
                  <td>
                    <v-icon color="primary">mdi-check-circle</v-icon>
                  </td>
                  <td>Reduced operational costs with pay-per-use model</td>
                </tr>
                <tr>
                  <td>
                    <v-icon color="primary">mdi-check-circle</v-icon>
                  </td>
                  <td>Faster development cycles with AI assistance</td>
                </tr>
                <tr>
                  <td>
                    <v-icon color="primary">mdi-check-circle</v-icon>
                  </td>
                  <td>Enhanced security through managed services</td>
                </tr>
              </tbody>
            </v-simple-table>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<style scoped>
/* Vuetify handles the styling */
</style>