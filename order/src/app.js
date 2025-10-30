const express = require("express");
const mongoose = require("mongoose");
const Order = require("./models/order");
const amqp = require("amqplib");
const config = require("./config");
const isAuthenticated = require("./utils/isAuthenticated");

class App {
  constructor() {
    this.app = express();
    this.connectDB();
    this.setMiddlewares();
    this.setRoutes();
    this.setupOrderConsumer();
  }

  async connectDB() {
    await mongoose.connect(config.mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected");
  }

  async disconnectDB() {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  }

  setMiddlewares() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: false }));
    
    // CORS middleware
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  setRoutes() {
    // Health check endpoint
    this.app.get("/health", (req, res) => {
      res.json({ status: "Order service is running", timestamp: new Date().toISOString() });
    });

    // API routes with /api/orders prefix
    this.app.get("/api/orders", isAuthenticated, async (req, res) => {
      try {
        const orders = await Order.find({});
        res.json(orders);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Get specific order
    this.app.get("/api/orders/:id", isAuthenticated, async (req, res) => {
      try {
        const order = await Order.findById(req.params.id);
        if (!order) {
          return res.status(404).json({ error: "Order not found" });
        }
        
        res.json(order);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Create order with proper structure
    this.app.post("/api/orders", isAuthenticated, async (req, res) => {
      try {
        const { products, totalPrice } = req.body;
        
        // Validate required fields
        if (!products || !Array.isArray(products) || products.length === 0) {
          return res.status(400).json({ error: "Products are required" });
        }
        
        if (!totalPrice || totalPrice <= 0) {
          return res.status(400).json({ error: "Valid total price is required" });
        }
        
        const newOrder = new Order({
          products: products,
          totalPrice: totalPrice,
          createdAt: new Date()
        });
        
        await newOrder.save();
        
        res.status(201).json({ 
          success: true, 
          order: newOrder,
          message: "Order created successfully" 
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Update order
    this.app.put("/api/orders/:id", isAuthenticated, async (req, res) => {
      try {
        const order = await Order.findById(req.params.id);
        
        if (!order) {
          return res.status(404).json({ error: "Order not found" });
        }
        
        // Can update other fields if needed
        await order.save();
        
        res.json({ 
          success: true, 
          order: order,
          message: "Order updated successfully" 
        });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }

  async setupOrderConsumer() {
    console.log("Connecting to RabbitMQ...");
  
    setTimeout(async () => {
      try {
        const amqpServer = config.rabbitMQURI;
        const connection = await amqp.connect(amqpServer);
        console.log("Connected to RabbitMQ");
        const channel = await connection.createChannel();
        await channel.assertQueue("orders");
  
        channel.consume("orders", async (data) => {
          // Consume messages from the order queue on buy
          console.log("Consuming ORDER service");
          const { products, username, orderId } = JSON.parse(data.content);
  
          const newOrder = new Order({
            products: products.map(p => p._id),
            totalPrice: products.reduce((acc, product) => acc + product.price, 0),
          });
  
          // Save order to DB
          await newOrder.save();
  
          // Send ACK to ORDER service
          channel.ack(data);
          console.log("Order saved to DB and ACK sent to ORDER queue");
  
          // Send fulfilled order to PRODUCTS service
          // Include orderId in the message
          const orderData = newOrder.toJSON();
          channel.sendToQueue(
            "products",
            Buffer.from(JSON.stringify({ 
              orderId, 
              products: orderData.products, 
              totalPrice: orderData.totalPrice 
            }))
          );
        });
      } catch (err) {
        console.error("Failed to connect to RabbitMQ:", err.message);
        console.log("Will retry RabbitMQ connection in 10 seconds...");
      }
    }, 5000); // Reduced delay for faster startup
  }



  start() {
    const port = config.port || 3003;
    this.server = this.app.listen(port, () => {
      console.log(`Order service started on port ${port}`);
      console.log(`Available endpoints:`);
      console.log(`- GET http://localhost:${port}/health`);
      console.log(`- GET http://localhost:${port}/api/orders (get user orders)`);
      console.log(`- GET http://localhost:${port}/api/orders/:id (get specific order)`);
      console.log(`- POST http://localhost:${port}/api/orders (create order)`);
      console.log(`- PUT http://localhost:${port}/api/orders/:id/status (update status)`);
    });
  }

  async stop() {
    await mongoose.disconnect();
    this.server.close();
    console.log("Server stopped");
  }
}

module.exports = App;
