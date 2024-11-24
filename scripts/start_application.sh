#!/bin/bash
cd /home/ec2-user/app
export NVM_DIR="/home/ec2-user/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
export PM2_HOME="/home/ec2-user/.pm2"
pm2 start ecosystem.config.js || pm2 restart ecosystem.config.js
chown -R ec2-user:ec2-user /home/ec2-user/.pm2