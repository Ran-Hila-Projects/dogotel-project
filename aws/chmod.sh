#!/bin/bash

echo "🔧 Setting execute permissions for deployment scripts..."

chmod +x deploy_part1.sh
chmod +x deploy_part2.sh

echo "✅ Execute permissions set successfully!"
echo "📋 Current permissions:"
ls -la *.sh

echo ""
echo "🚀 Ready to deploy:"
echo "   ./deploy_part1.sh  # Backend deployment"
echo "   ./deploy_part2.sh  # Frontend deployment" 