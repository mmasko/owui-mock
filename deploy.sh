#!/bin/bash

# Simple deployment script for GitHub Pages
# Make sure you have gh-pages installed: npm install -g gh-pages

echo "🚀 Deploying Mock Chat Assistant to GitHub Pages..."

# Check if gh-pages is installed
if ! command -v gh-pages &> /dev/null; then
    echo "❌ gh-pages not found. Installing..."
    npm install -g gh-pages
fi

# Deploy the current directory to gh-pages branch
echo "📦 Deploying current directory..."
gh-pages -d .

echo "✅ Deployment complete!"
echo "🌐 Your site will be available at: https://yourusername.github.io/your-repo-name"
echo "⏰ It may take a few minutes for changes to appear."