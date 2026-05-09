# Build Stage: Frontend
FROM node:18 as build-frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
# Use relative API path for production
RUN VITE_API_URL="" npm run build

# Build Stage: Backend
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements and install
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./

# Copy built frontend from Stage 1 to backend/static
COPY --from=build-frontend /app/frontend/dist ./static

# Set environment variables
ENV PORT=7860
ENV PYTHONUNBUFFERED=1

# Expose the port HF Spaces expects
EXPOSE 7860

# Command to run the application
CMD ["python", "main.py"]
