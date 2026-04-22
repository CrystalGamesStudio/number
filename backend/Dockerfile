FROM python:3.14-slim

WORKDIR /app

# Install uv
RUN pip install uv

# Copy dependencies and install
COPY pyproject.toml ./
RUN uv sync --dev

# Copy application
COPY . .

# Make start script executable
RUN chmod +x start.sh

# Expose port
EXPOSE 10000

# Run start script
CMD ["bash", "start.sh"]
