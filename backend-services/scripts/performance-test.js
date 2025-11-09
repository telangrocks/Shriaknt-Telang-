const http = require('http');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TARGET_RESPONSE_TIME = 100; // ms
const NUM_REQUESTS = 100;
const CONCURRENT = 10;

async function makeRequest(path) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const url = new URL(path, API_BASE_URL);
    
    http.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        const duration = Date.now() - start;
        resolve({ status: res.statusCode, duration, data });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function runPerformanceTest() {
  console.log(`\n⚡ Performance Test: ${NUM_REQUESTS} requests, ${CONCURRENT} concurrent\n`);
  
  const results = [];
  const batches = Math.ceil(NUM_REQUESTS / CONCURRENT);
  
  for (let batch = 0; batch < batches; batch++) {
    const batchPromises = [];
    const batchSize = Math.min(CONCURRENT, NUM_REQUESTS - batch * CONCURRENT);
    
    for (let i = 0; i < batchSize; i++) {
      batchPromises.push(makeRequest('/health'));
    }
    
    const batchResults = await Promise.allSettled(batchPromises);
    batchResults.forEach((result) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error('Request failed:', result.reason.message);
      }
    });
    
    process.stdout.write(`\rProgress: ${Math.min((batch + 1) * CONCURRENT, NUM_REQUESTS)}/${NUM_REQUESTS}`);
  }
  
  console.log('\n');
  
  // Calculate statistics
  const durations = results.map(r => r.duration);
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  const min = Math.min(...durations);
  const max = Math.max(...durations);
  const p95 = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.95)];
  const p99 = durations.sort((a, b) => a - b)[Math.floor(durations.length * 0.99)];
  
  console.log('📊 Performance Results:');
  console.log(`   Average: ${avg.toFixed(2)}ms`);
  console.log(`   Min: ${min}ms`);
  console.log(`   Max: ${max}ms`);
  console.log(`   P95: ${p95}ms`);
  console.log(`   P99: ${p99}ms`);
  console.log(`   Target: <${TARGET_RESPONSE_TIME}ms`);
  
  const successRate = (results.filter(r => r.status === 200).length / results.length) * 100;
  console.log(`   Success Rate: ${successRate.toFixed(2)}%`);
  
  if (avg > TARGET_RESPONSE_TIME) {
    console.log(`\n⚠️  Warning: Average response time (${avg.toFixed(2)}ms) exceeds target (${TARGET_RESPONSE_TIME}ms)`);
    process.exit(1);
  } else {
    console.log(`\n✅ Performance target met!`);
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  runPerformanceTest().catch((err) => {
    console.error('Performance test failed:', err);
    process.exit(1);
  });
}

module.exports = { runPerformanceTest };

