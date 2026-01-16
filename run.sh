#!/bin/bash

# Ensure we are using the correct Java version (JDK 21)
export JAVA_HOME=/home/sri-jaya-shankaran/.sdkman/candidates/java/21.0.9-tem
export PATH=$JAVA_HOME/bin:$PATH

echo "============================================="
echo "       JSPCS POS - Local Launcher            "
echo "============================================="
echo ""
echo "This script helps you run the application with your local PostgreSQL."
echo ""
echo "Note: The application requires a running PostgreSQL database."
echo "Default User: postgres"
echo "Default DB:   jspcs_pos"
echo "Default Pass: test (Press Enter to use)"
echo ""

# Prompt for database password securely
echo -n "Enter your local PostgreSQL password for user 'postgres' [test]: "
read -s DB_PASS_INPUT
echo ""
echo ""

# Use 'password' if input is empty
DB_PASS=${DB_PASS_INPUT:-password}

# Export environment variables for the application
export SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5433/jspcs_pos
export SPRING_DATASOURCE_PASSWORD=$DB_PASS

# Just try to run the app
echo "Starting Application on port 5433 with password: $DB_PASS"
echo "---------------------------------------------"

mvn spring-boot:run
