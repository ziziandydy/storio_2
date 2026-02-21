# Use official Python lightweight image
FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies (for httpx/grpc support if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose the port FastAPI will run on
EXPOSE 8080

# Command to run the application
# We use 0.0.0.0 to bind to all interfaces for Railway
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
