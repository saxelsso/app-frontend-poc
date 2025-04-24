<script setup lang="ts">
</script>

<template>
  <div class="home">
    <div class="hero">
      <h1>Modern Serverless Application Development</h1>
      <p class="subtitle">A Proof-of-Concept Showcase</p>
    </div>
    
    <div class="content">
      <section class="info-section">
        <h2>About This Project</h2>
        <p>
          This application demonstrates how modern development tools can be combined to create 
          powerful serverless applications with AI integration — all without traditional server infrastructure.
        </p>
      </section>
      
      <section class="tech-stack">
        <h2>Technology Stack</h2>
        <div class="tech-grid">
          <div class="tech-card">
            <h3>Claude Code</h3>
            <p>AI-assisted development for faster implementation and problem-solving</p>
          </div>
          <div class="tech-card">
            <h3>AWS Amplify</h3>
            <p>Serverless backend with authentication and data storage capabilities</p>
          </div>
          <div class="tech-card">
            <h3>Vue 3</h3>
            <p>Modern reactive frontend framework with composition API</p>
          </div>
          <div class="tech-card">
            <h3>GitHub Codespaces</h3>
            <p>Cloud development environment for seamless collaboration</p>
          </div>
        </div>
      </section>
      
      <section class="benefits">
        <h2>Benefits Over Traditional Development</h2>
        <ul>
          <li>No server maintenance or infrastructure management</li>
          <li>Automatic scaling based on application load</li>
          <li>Reduced operational costs with pay-per-use model</li>
          <li>Faster development cycles with AI assistance</li>
          <li>Enhanced security through managed services</li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.home {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.hero {
  text-align: center;
  margin-bottom: 3rem;
  padding: 3rem 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 10px;
  color: white;
}

.hero h1 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.subtitle {
  font-size: 1.5rem;
  opacity: 0.9;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.info-section p {
  font-size: 1.1rem;
  line-height: 1.6;
}

h2 {
  margin-bottom: 1.5rem;
  color: #4a5568;
  font-size: 1.8rem;
}

.tech-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}

.tech-card {
  padding: 1.5rem;
  border-radius: 8px;
  background-color: #f8fafc;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s, box-shadow 0.2s;
}

.tech-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);
}

.tech-card h3 {
  margin-bottom: 0.75rem;
  color: #4a5568;
}

.benefits ul {
  padding-left: 1.5rem;
}

.benefits li {
  margin-bottom: 0.75rem;
  font-size: 1.1rem;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .hero h1 {
    font-size: 2rem;
  }
  
  .subtitle {
    font-size: 1.2rem;
  }
  
  .tech-grid {
    grid-template-columns: 1fr;
  }
}
</style>