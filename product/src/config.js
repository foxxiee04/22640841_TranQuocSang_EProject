require("dotenv").config();

module.exports = {
  port: process.env.PRODUCT_SERVICE_PORT || 3001,
  mongoURI: process.env.MONGODB_PRODUCT_URI || "mongodb://localhost:27017/product_db",
  rabbitMQURI: process.env.RABBITMQ_URI || "amqp://localhost",
  exchangeName: "products",
  queueName: "products_queue",
};
