const amqp = require("amqplib");
const config = require("../config");

class MessageBroker {
  constructor() {
    this.channel = null;
  }

  async connect() {
    console.log("Connecting to RabbitMQ...");
    try {
      const connection = await amqp.connect(config.rabbitMQURI);
      this.channel = await connection.createChannel();
      
      // Assert both queues
      await this.channel.assertQueue("orders", { durable: true });
      await this.channel.assertQueue("products", { durable: true });
      
      console.log("RabbitMQ connected and queues created");
    } catch (err) {
      console.error("Failed to connect to RabbitMQ:", err.message);
      // Retry after 5 seconds
      setTimeout(() => this.connect(), 5000);
    }
  }

  async publishMessage(queue, message) {
    if (!this.channel) {
      console.error("No RabbitMQ channel available.");
      return;
    }

    try {
      await this.channel.sendToQueue(
        queue,
        Buffer.from(JSON.stringify(message))
      );
    } catch (err) {
      console.log(err);
    }
  }

  async consumeMessage(queue, callback) {
    if (!this.channel) {
      console.error("No RabbitMQ channel available.");
      return;
    }

    try {
      await this.channel.consume(queue, (message) => {
        const content = message.content.toString();
        const parsedContent = JSON.parse(content);
        callback(parsedContent);
        this.channel.ack(message);
      });
    } catch (err) {
      console.log(err);
    }
  }
}

module.exports = new MessageBroker();
