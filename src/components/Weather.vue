<script setup lang="ts">
import { ref, onMounted } from 'vue';

// Type definitions for weather data
interface WeatherData {
  location: {
    name: string;
    region: string;
    country: string;
    localtime: string;
  };
  current: {
    temp_c: number;
    temp_f: number;
    condition: {
      text: string;
      icon: string;
    };
    wind_kph: number;
    wind_dir: string;
    humidity: number;
    feelslike_c: number;
    feelslike_f: number;
    uv: number;
  };
}

// Reactive references
const weatherData = ref<WeatherData | null>(null);
const loading = ref<boolean>(false);
const error = ref<string | null>(null);
const city = ref<string>('');

// Function to fetch weather data
const fetchWeather = async (location: string = 'Stockholm') => {
  if (!location.trim()) return;
  
  loading.value = true;
  error.value = null;
  
  try {
    // Using environment variable for API key
    const apiKey = import.meta.env.VITE_WEATHER_API_KEY;
    
    if (!apiKey) {
      throw new Error('Weather API key is missing. Please check your environment variables.');
    }
    
    const response = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(location)}&aqi=no`
    );
    
    if (!response.ok) {
      throw new Error(`Error fetching weather data: ${response.statusText}`);
    }
    
    const data = await response.json();
    weatherData.value = data;
  } catch (err: any) {
    error.value = err.message || 'Failed to fetch weather data';
    console.error('Weather API error:', err);
  } finally {
    loading.value = false;
  }
};

// Handle form submission
const handleSubmit = () => {
  fetchWeather(city.value);
};

// Fetch default weather on component mount
onMounted(() => {
  fetchWeather();
});
</script>

<template>
  <div class="weather-container">
    <!-- Search form -->
    <div class="search-container">
      <form @submit.prevent="handleSubmit">
        <input 
          v-model="city" 
          type="text" 
          placeholder="Enter city name" 
          class="city-input"
        />
        <button type="submit" class="search-button">Get Weather</button>
      </form>
    </div>
    
    <!-- Loading state -->
    <div v-if="loading" class="loading">
      <p>Loading weather data...</p>
    </div>
    
    <!-- Error state -->
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
    </div>
    
    <!-- Weather data display -->
    <div v-else-if="weatherData" class="weather-card">
      <div class="location">
        <h2>{{ weatherData.location.name }}</h2>
        <p>{{ weatherData.location.region }}, {{ weatherData.location.country }}</p>
        <p class="time">{{ weatherData.location.localtime }}</p>
      </div>
      
      <div class="current-weather">
        <div class="temperature">
          <span class="temp">{{ weatherData.current.temp_c }}°C</span>
          <span class="feels-like">Feels like {{ weatherData.current.feelslike_c }}°C</span>
        </div>
        
        <div class="condition">
          <img 
            :src="weatherData.current.condition.icon" 
            :alt="weatherData.current.condition.text" 
            class="condition-icon" 
          />
          <p>{{ weatherData.current.condition.text }}</p>
        </div>
      </div>
      
      <div class="weather-details">
        <div class="detail">
          <span class="label">Wind:</span>
          <span class="value">{{ weatherData.current.wind_kph }} km/h {{ weatherData.current.wind_dir }}</span>
        </div>
        
        <div class="detail">
          <span class="label">Humidity:</span>
          <span class="value">{{ weatherData.current.humidity }}%</span>
        </div>
        
        <div class="detail">
          <span class="label">UV Index:</span>
          <span class="value">{{ weatherData.current.uv }}</span>
        </div>
      </div>
    </div>
    
    <!-- No data state -->
    <div v-else class="no-data">
      <p>No weather data available. Please search for a city.</p>
    </div>
    

  </div>
</template>

<style scoped>
.weather-container {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}

.search-container {
  margin-bottom: 20px;
}

.search-container form {
  display: flex;
  gap: 10px;
}

.city-input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 16px;
}

.search-button {
  padding: 10px 15px;
  background-color: #4a5568;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s;
}

.search-button:hover {
  background-color: #2d3748;
}

.weather-card {
  background-color: #f8fafc;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  padding: 20px;
  margin-bottom: 20px;
}

.location {
  margin-bottom: 20px;
}

.location h2 {
  margin: 0 0 5px 0;
  font-size: 1.8rem;
}

.location p {
  margin: 0;
  color: #4a5568;
}

.time {
  font-size: 0.9rem;
  color: #718096;
}

.current-weather {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.temperature {
  display: flex;
  flex-direction: column;
}

.temp {
  font-size: 2.5rem;
  font-weight: bold;
}

.feels-like {
  font-size: 0.9rem;
  color: #718096;
}

.condition {
  text-align: center;
}

.condition-icon {
  width: 64px;
  height: 64px;
}

.condition p {
  margin: 5px 0 0 0;
}

.weather-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px solid #e2e8f0;
  padding-top: 15px;
}

.detail {
  display: flex;
  justify-content: space-between;
}

.label {
  font-weight: bold;
  color: #4a5568;
}

.loading, .error, .no-data {
  text-align: center;
  padding: 20px;
  background-color: #f8fafc;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.error {
  color: #e53e3e;
}

.api-notice {
  margin-top: 30px;
  padding: 15px;
  background-color: #edf2f7;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #4a5568;
}

.api-notice a {
  color: #4299e1;
  text-decoration: none;
}

.api-notice a:hover {
  text-decoration: underline;
}

@media (max-width: 500px) {
  .search-container form {
    flex-direction: column;
  }
  
  .current-weather {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  
  .temperature {
    align-items: center;
  }
}
</style>