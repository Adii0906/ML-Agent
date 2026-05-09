#!/bin/bash

echo "🚀 Autonomous ML Engineer - Setup Script"
echo "=========================================="

# Create directories
echo "📁 Creating directories..."
mkdir -p data
mkdir -p backend
mkdir -p frontend/src/components/tabs
mkdir -p logs

# Setup Backend
echo "🐍 Setting up backend..."
cd backend
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cp ../.env.example .env
    echo "⚠️  Please update .env with your API keys"
fi

if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3.11 -m venv venv
    source venv/bin/activate
    pip install -r ../requirements.txt
fi
cd ..

# Setup Frontend
echo "🎨 Setting up frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "📦 Installing npm dependencies..."
    npm install
fi
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update .env with your API keys (ANTHROPIC_API_KEY, GROQ_API_KEY)"
echo "2. Run: docker-compose up"
echo "   OR"
echo "3. Run backend: cd backend && source venv/bin/activate && python main.py"
echo "4. Run frontend: cd frontend && npm run dev"
echo ""