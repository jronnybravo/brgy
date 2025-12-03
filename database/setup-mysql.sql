-- MySQL Database Setup Script
-- This script creates the database and user for the Barangay Mapping System

-- Create database
CREATE DATABASE IF NOT EXISTS brgy_mapping 
  CHARACTER SET utf8mb4 
  COLLATE utf8mb4_unicode_ci;

-- Optional: Create dedicated user (recommended for production)
-- Replace 'your_secure_password' with an actual secure password
-- Uncomment the following lines if you want to create a dedicated user:

-- CREATE USER IF NOT EXISTS 'brgy_user'@'localhost' IDENTIFIED BY 'your_secure_password';
-- GRANT ALL PRIVILEGES ON brgy_mapping.* TO 'brgy_user'@'localhost';
-- FLUSH PRIVILEGES;

-- Switch to the database
USE brgy_mapping;

-- Note: Tables will be automatically created by TypeORM when you run the application
-- with synchronize: true in development mode

-- To verify the setup:
-- SELECT DATABASE();
-- SHOW TABLES;

-- After running the application for the first time, you should see these tables:
-- - localities
-- - voters

