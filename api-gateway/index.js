require('dotenv').config();
const express = require("express");
const httpProxy = require("http-proxy");

const proxy = httpProxy.createProxyServer();
const app = express();

// CORS middleware (before proxy)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'API Gateway is running', timestamp: new Date().toISOString() });
});

// Route requests to the auth service (Port 3000)
app.use("/auth", (req, res) => {
  console.log(`[API Gateway] Proxying ${req.method} ${req.originalUrl} to auth service`);
  proxy.web(req, res, { 
    target: "http://auth:3000",
    changeOrigin: true,
    timeout: 5000
  });
});

// Route requests to the product service (Port 3001) - Short path
app.use("/products", (req, res) => {
  console.log(`[API Gateway] Proxying ${req.method} ${req.originalUrl} to product service`);
  const newPath = req.url.replace(/^\//, '/api/products/');
  req.url = newPath;
  
  proxy.web(req, res, { 
    target: "http://product:3001",
    changeOrigin: true,
    timeout: 5000
  });
});

// Route requests to the order service (Port 3002) - Short path  
app.use("/orders", (req, res) => {
  console.log(`[API Gateway] Proxying ${req.method} ${req.originalUrl} to order service`);
  const newPath = req.url.replace(/^\//, '/api/orders/');
  req.url = newPath;
  
  proxy.web(req, res, { 
    target: "http://order:3002",
    changeOrigin: true,
    timeout: 5000
  });
});

// Error handling for proxy
proxy.on('error', (err, req, res) => {
  console.error('[API Gateway] Proxy error:', err.message);
  console.error('[API Gateway] Target URL:', req.url);
  if (!res.headersSent) {
    res.status(502).json({ 
      error: 'Service temporarily unavailable',
      details: err.message,
      service: req.url.split('/')[1]
    });
  }
});

proxy.on('proxyReq', (proxyReq, req, res) => {
  console.log(`[API Gateway] Forwarding ${req.method} ${req.url} to ${proxyReq.getHeader('host')}`);
});

proxy.on('proxyRes', (proxyRes, req, res) => {
  console.log(`[API Gateway] Response ${proxyRes.statusCode} from ${req.url}`);
});

// Start the server on port 3003
const port = process.env.API_GATEWAY_PORT || 3003;
app.listen(port, () => {
  console.log(`API Gateway listening on port ${port}`);
  console.log(`Available routes:`);
  console.log(`- http://localhost:${port}/health`);
  console.log(`- http://localhost:${port}/auth/* → Auth Service (3000)`);
  console.log(`- http://localhost:${port}/products/* → Product Service (3001)`);
  console.log(`- http://localhost:${port}/orders/* → Order Service (3002)`);
});
