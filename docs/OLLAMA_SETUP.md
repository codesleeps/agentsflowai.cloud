# Ollama Setup Guide

This guide covers setting up Ollama for local AI model inference with AgentsFlowAI.

## What is Ollama?

Ollama is a tool that allows you to run large language models locally on your machine. It provides:

- **Privacy**: Your data stays on your machine
- **Cost-free**: No API costs after initial model download
- **Offline capability**: Works without internet connection
- **Fast inference**: Optimized for local hardware

## Installation

### macOS
```bash
brew install ollama
```

### Linux
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Windows
Download from [ollama.com](https://ollama.com) and run the installer.

## Starting Ollama

After installation, start the Ollama service:

```bash
ollama serve
```

This starts the Ollama API server on `http://localhost:11434` by default.

## Pulling Required Models

AgentsFlowAI requires these models for optimal performance:

```bash
# Fast Chat Agent, Marketing Agent, SEO Agent
ollama pull mistral:7b      # 3.8GB - Fast, general purpose

# Web Dev Agent, Social Media Agent
ollama pull llama3.1:8b     # 4.7GB - Better reasoning

# Content Agent, Gemini Agent
ollama pull gemma2:9b       # 5.4GB - Google's model
```

### Model Details

| Model | Size | Use Cases | Agents |
|-------|------|-----------|---------|
| `mistral:7b` | 3.8GB | Fast responses, general chat | Fast Chat, Marketing, SEO |
| `llama3.1:8b` | 4.7GB | Code generation, analysis | Web Dev, Social Media |
| `gemma2:9b` | 5.4GB | Content creation, reasoning | Content, Gemini |

## Configuration

### Environment Variables

Set the Ollama base URL in your `.env` file if not using the default:

```env
OLLAMA_BASE_URL=http://localhost:11434
```

### Custom Port

If running Ollama on a different port:

```bash
# Start on custom port
OLLAMA_HOST=0.0.0.0:8080 ollama serve

# Update environment
OLLAMA_BASE_URL=http://localhost:8080
```

## VPS Setup

For running Ollama on a remote server:

### 1. Install Ollama on VPS
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Configure systemd service
```bash
sudo tee /etc/systemd/system/ollama.service > /dev/null <<EOF
[Unit]
Description=Ollama Service
After=network-online.target

[Service]
ExecStart=/usr/local/bin/ollama serve
User=ollama
Group=ollama
Restart=always
RestartSec=3

[Install]
WantedBy=default.target
EOF
```

### 3. Create dedicated user
```bash
sudo useradd -r -s /bin/false -m -d /opt/ollama ollama
sudo chown -R ollama:ollama /opt/ollama
```

### 4. Enable and start service
```bash
sudo systemctl daemon-reload
sudo systemctl enable ollama
sudo systemctl start ollama
```

### 5. Configure firewall
```bash
# Allow port 11434
sudo ufw allow 11434/tcp
```

### 6. Update client configuration
In your local `.env` file:
```env
OLLAMA_BASE_URL=http://your-vps-ip:11434
```

## Troubleshooting

### Connection Issues

#### Ollama not running
```
Error: Ollama service not running at http://localhost:11434
```

**Solution:**
```bash
ollama serve
```

#### Connection refused
```
Error: ECONNREFUSED
```

**Solutions:**
1. Check if Ollama is running: `ps aux | grep ollama`
2. Restart Ollama: `pkill ollama && ollama serve`
3. Check firewall settings

#### Custom host/port issues
```
Error: Connection timeout
```

**Solutions:**
1. Verify `OLLAMA_BASE_URL` in `.env`
2. Check if VPS firewall allows the port
3. Test connectivity: `curl http://your-host:port/api/tags`

### Model Issues

#### Model not found
```
Error: Model 'mistral:7b' not found
```

**Solution:**
```bash
ollama pull mistral:7b
```

#### Model loading timeout
```
Error: Model 'llama3.1:8b' timed out after 30s
```

**Solutions:**
1. First-time model loading can take longer
2. Try again - subsequent requests are faster
3. Use a smaller model if RAM is limited
4. Check available RAM: `free -h` (Linux) or `vm_stat` (macOS)

#### Out of memory
```
Error: CUDA out of memory
```

**Solutions:**
1. Use smaller models
2. Reduce context window
3. Close other applications
4. Upgrade RAM

### Performance Issues

#### Slow responses
**Solutions:**
1. Use smaller models for faster inference
2. Ensure adequate RAM (16GB+ recommended)
3. Use SSD storage for model files
4. Consider GPU acceleration if available

#### High CPU usage
**Expected behavior:** Ollama uses CPU for inference. High usage during model loading is normal.

### Verification

#### Check Ollama status
```bash
# List running models
ollama list

# Check API endpoint
curl http://localhost:11434/api/tags

# Run verification script
npm run verify-ollama
```

#### Health check endpoint
```bash
curl http://localhost:3000/api/ai/health-check
```

## Advanced Configuration

### GPU Acceleration

Ollama automatically detects and uses GPU acceleration when available.

#### NVIDIA GPU
Ensure CUDA drivers are installed and compatible.

#### AMD GPU
Experimental support available in newer versions.

#### Apple Silicon
Native acceleration on M1/M2/M3 Macs.

### Model Management

```bash
# List installed models
ollama list

# Remove unused models
ollama rm model-name

# Copy model
ollama cp source-model destination-model

# Show model info
ollama show model-name
```

### Custom Models

Create custom models with Modelfile:

```bash
# Create directory for custom models
mkdir -p ~/.ollama/models

# Create Modelfile
cat > Modelfile << EOF
FROM mistral:7b
PARAMETER temperature 0.7
PARAMETER top_p 0.9
SYSTEM "You are a helpful assistant specialized in coding."
EOF

# Build custom model
ollama create my-custom-model -f Modelfile
```

## Integration with AgentsFlowAI

### Automatic Setup Verification

AgentsFlowAI includes built-in verification:

```bash
# Run setup verification
npm run verify-ollama

# Check health endpoint
curl http://localhost:3000/api/ai/health-check
```

### Pre-flight Checks

Before each generation request, AgentsFlowAI:
1. Verifies Ollama service is running
2. Checks if required model is available
3. Provides clear error messages with fix commands

### Fallback Chain

If Ollama models are unavailable, requests automatically fall back to:
1. Google Gemini (if configured)
2. OpenRouter (if configured)
3. OpenAI (if configured)

## Support

### Common Issues

1. **Port conflicts**: Change Ollama port if 11434 is in use
2. **Permission issues**: Run as administrator or configure user permissions
3. **Storage space**: Models require significant disk space (4-6GB each)

### Getting Help

1. Check Ollama documentation: [ollama.com](https://ollama.com)
2. Review AgentsFlowAI logs for detailed error messages
3. Test with the verification script: `npm run verify-ollama`

### Performance Tuning

For optimal performance:
- Use SSD storage
- Ensure 16GB+ RAM
- Close unnecessary applications during model loading
- Consider model quantization for lower resource usage
