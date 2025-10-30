const express = require("express");
const mongoose = require("mongoose");
const config = require("./config");
const authMiddleware = require("./middlewares/authMiddleware");
const AuthController = require("./controllers/authController");

class App {
  constructor() {
    this.app = express();
    this.authController = new AuthController();
    this.connectDB();
    this.setMiddlewares();
    this.setRoutes();
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
      res.json({ status: "Auth service is running", timestamp: new Date().toISOString() });
    });
    
    this.app.post("/login", (req, res) => this.authController.login(req, res));
    this.app.post("/register", (req, res) => this.authController.register(req, res));
    this.app.get("/dashboard", authMiddleware, (req, res) => res.json({ message: "Welcome to dashboard" }));
    this.app.get("/verify", authMiddleware, (req, res) => res.json({ user: req.user, message: "Token is valid" }));
  }

  start() {
    const port = process.env.AUTH_SERVICE_PORT || 3001;
    this.server = this.app.listen(port, () => {
      console.log(`Auth service started on port ${port}`);
      console.log(`Available endpoints:`);
      console.log(`- POST http://localhost:${port}/login`);
      console.log(`- POST http://localhost:${port}/register`);
      console.log(`- GET http://localhost:${port}/dashboard`);
      console.log(`- GET http://localhost:${port}/verify`);
      console.log(`- GET http://localhost:${port}/health`);
    });
  }

  async stop() {
    await mongoose.disconnect();
    this.server.close();
    console.log("Server stopped");
  }
}

module.exports = App;
