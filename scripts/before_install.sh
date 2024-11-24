#!/bin/bash
if [ -d "/home/ec2-user/app" ]; then
    rm -rf /home/ec2-user/app/*
    rm -rf /home/ec2-user/app/.[!.]*
fi

mkdir -p /home/ec2-user/app
chown -R ec2-user:ec2-user /home/ec2-user/app
