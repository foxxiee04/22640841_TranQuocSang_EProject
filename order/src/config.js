require('dotenv').config();

module.exports = {
    mongoURI: process.env.MONGODB_ORDER_URI || 'mongodb://localhost:27017/order_db',
    rabbitMQURI: process.env.RABBITMQ_URI || 'amqp://localhost',
    rabbitMQQueue: 'orders',
    port: process.env.ORDER_SERVICE_PORT || 3002
};
  