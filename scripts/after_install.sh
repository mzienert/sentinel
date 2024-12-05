#!/bin/bash
cd /home/ec2-user/app

# Set up NVM environment
export NVM_DIR="/home/ec2-user/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Install dependencies
npm install

# Run build
npm run build

# Create logs directory
mkdir -p dist/logs
chmod 755 dist/logs

# Set permissions
chown -R ec2-user:ec2-user /home/ec2-user/app
chown -R ec2-user:ec2-user dist/logs

# Create log files if they don't exist
touch dist/logs/error.log
touch dist/logs/out.log
chmod 644 dist/logs/error.log
chmod 644 dist/logs/out.log
chown ec2-user:ec2-user dist/logs/error.log
chown ec2-user:ec2-user dist/logs/out.log