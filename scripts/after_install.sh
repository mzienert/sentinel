# Show tsconfig.json content if it exists
if [ -f tsconfig.json ]; then
    echo "tsconfig.json content:"
    cat tsconfig.json
else
    echo "tsconfig.json not found!"
fi

# Run build
echo "Running build..."
npm run build

echo "Listing dist directory after build:"
ls -la dist/

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

echo "Final directory structure:"
find . -type f -o -type d