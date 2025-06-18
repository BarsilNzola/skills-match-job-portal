# Use Node + Debian base image with Python preinstalled
FROM node:20-slim

# Install Python 3, pip, and Tesseract OCR
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv tesseract-ocr && \
    ln -s /usr/bin/python3 /usr/bin/python

# Set working directory
WORKDIR /app

# Copy everything into container
COPY . .

# === FRONTEND BUILD ===
WORKDIR /app/frontend
RUN rm -rf node_modules && \
    npm install --legacy-peer-deps --force && \
    npm install --save-dev @babel/plugin-transform-private-property-in-object @babel/core@^7.0.0 && \
    npm run build

# === BACKEND SETUP ===
WORKDIR /app/backend
RUN rm -rf node_modules && \
    npm install --legacy-peer-deps --force && \
    python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --upgrade pip && \
    /opt/venv/bin/pip install --no-cache-dir -r requirements.txt && \
    /opt/venv/bin/python -m spacy download en_core_web_sm
    
# === Set back to main directory ===
WORKDIR /app

# Port exposed by your backend
EXPOSE 3000

# Run your backend server
CMD ["npm", "start"]
