#!/bin/bash

set -e  # Exit on error
# set -x  # Uncomment to debug

# Function to clean up background processes
cleanup() {
    echo "Stopping backend and frontend..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
    wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
    echo "All services stopped."
    exit 0
}

# Trap SIGINT (Ctrl+C) and SIGTERM (for graceful shutdown)
trap cleanup SIGINT SIGTERM

# Check for "--reset-db" argument
RESET_DB=false
if [[ "$1" == "--reset-db" ]]; then
    RESET_DB=true
fi

./generate-client.sh

# Start Backend
cd backend || exit 1
source .venv/bin/activate

if $RESET_DB; then
    echo "🔄 Resetting database..."
    rm -f data/app.db  # Delete the SQLite database file
fi

echo "Initializing database..."
python -c "from app.core.db import init_db; init_db()"
echo "Database initialization complete."

# Populate database if --reset-db was provided
if $RESET_DB; then
    echo "🚀 Populating database..."
    python populate_db.py
    echo "✅ Database populated successfully."
fi

# Start backend in the background
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &  
BACKEND_PID=$!  # Store backend PID
cd ..

# Start Frontend
cd frontend || exit 1
npm run dev -- --host=0.0.0.0 --port=5173 &  
FRONTEND_PID=$!  # Store frontend PID
cd ..

# Display PIDs for reference
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

# Wait for both processes
wait "$BACKEND_PID" "$FRONTEND_PID"
