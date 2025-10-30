require("dotenv").config();

module.exports = {
  mongoURI: process.env.MONGODB_AUTH_URI || "mongodb://localhost:27017/auth_db",
  jwtSecret: process.env.JWT_SECRET || "your_super_secret_jwt_key_here_change_in_production",
  port: process.env.AUTH_SERVICE_PORT || 3000,
};
