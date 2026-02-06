# Jetson Xavier NX Setup Guide

## System Info
- **Device:** Jetson Xavier NX Developer Kit
- **GPU:** GV11B (Volta, 384 CUDA cores, SM 7.2)
- **RAM:** 8GB (shared CPU/GPU)
- **Storage:** 238GB NVMe SSD + 30GB eMMC
- **JetPack:** 5.1.3 (L4T 35.5.0)

## WiFi Configuration

```bash
# List available networks
nmcli device wifi list

# Connect to WiFi
sudo nmcli device wifi connect "YOUR_SSID" password "YOUR_PASSWORD"

# Verify connection
ip addr show wlan0
ping -c 3 google.com
```

## Swap Configuration

### Disable Default zram

```bash
sudo systemctl disable nvzramconfig
sudo swapoff -a
```

### Create 16GB Swap on NVMe

```bash
sudo fallocate -l 16G /16GB.swap
sudo chmod 600 /16GB.swap
sudo mkswap /16GB.swap
sudo swapon /16GB.swap

# Verify
free -h
```

### Make Swap Permanent

```bash
echo '/16GB.swap none swap sw 0 0' | sudo tee -a /etc/fstab
```

### Optimize Swappiness for LLMs

```bash
# Lower value = prefer RAM over swap
sudo sysctl vm.swappiness=10

# Make permanent
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

## CUDA Setup

CUDA is pre-installed with JetPack. Add to PATH:

```bash
echo 'export PATH=/usr/local/cuda/bin:$PATH' >> ~/.bashrc
echo 'export LD_LIBRARY_PATH=/usr/local/cuda/lib64:$LD_LIBRARY_PATH' >> ~/.bashrc
source ~/.bashrc

# Verify
nvcc --version
```

## Python 3.9 Setup

```bash
# Install Python 3.9
sudo apt install python3.9 python3.9-venv python3.9-dev

# Set as default
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.8 1
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.9 2
sudo update-alternatives --config python3
```

**Note:** Don't remove Python 3.8 - it's required by system tools.

## jtop Installation

```bash
sudo python3.9 -m pip install -U jetson-stats
```

### Fix Missing Template Files

If `jtop --install-service` fails with missing template errors:

```bash
# Create directories
sudo mkdir -p /usr/local/lib/python3.9/dist-packages/scripts
sudo mkdir -p /usr/local/lib/python3.9/dist-packages/services

# Download missing files
sudo wget -O /usr/local/lib/python3.9/dist-packages/scripts/jtop_env.sh \
  https://raw.githubusercontent.com/rbonghi/jetson_stats/d49a1114be6d5893d7acf4e836330b0c408de800/scripts/jtop_env.sh

sudo wget -O /usr/local/lib/python3.9/dist-packages/services/jtop.service \
  https://raw.githubusercontent.com/rbonghi/jetson_stats/d49a1114be6d5893d7acf4e836330b0c408de800/services/jtop.service

# Install service
sudo jtop --install-service
sudo reboot
```

### Run jtop

```bash
jtop
```

## Jetson Clocks (Performance Mode)

```bash
# Enable max performance (locks CPU/GPU at max frequency)
sudo jetson_clocks

# Check status
sudo jetson_clocks --show

# Restore dynamic scaling
sudo jetson_clocks --restore
```

## llama.cpp Installation

### Install Dependencies

```bash
sudo apt update
sudo apt install -y cmake build-essential

# Upgrade cmake (requires 3.18+)
pip3 install cmake --upgrade
echo 'export PATH=$HOME/.local/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
cmake --version
```

### Build with CUDA

```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
mkdir build && cd build
cmake .. -DGGML_CUDA=ON
cmake --build . --config Release -j4
```

### Download Models (wget)

```bash
mkdir -p ~/models
cd ~/models

# Qwen3-VL-4B (multimodal, 2.5GB)
wget https://huggingface.co/Qwen/Qwen3-VL-4B-Instruct-GGUF/resolve/main/Qwen3VL-4B-Instruct-Q4_K_M.gguf

# Vision encoder (836MB)
wget https://huggingface.co/Qwen/Qwen3-VL-4B-Instruct-GGUF/resolve/main/mmproj-Qwen3VL-4B-Instruct-F16.gguf
```

### Run Models

```bash
# Text chat
cd ~/llama.cpp/build && sudo jetson_clocks && ./bin/llama-cli -m ~/models/Qwen3VL-4B-Instruct-Q4_K_M.gguf -ngl 99 -c 4096 -cnv

# Multimodal (with image)
cd ~/llama.cpp/build && sudo jetson_clocks && ./bin/llama-mtmd-cli -m ~/models/Qwen3VL-4B-Instruct-Q4_K_M.gguf --mmproj ~/models/mmproj-Qwen3VL-4B-Instruct-F16.gguf -ngl 99 -c 4096 -cnv
```

### Parameters

| Parameter | Description |
|-----------|-------------|
| `-m` | Model path |
| `-ngl 99` | Offload all layers to GPU |
| `-c 4096` | Context length |
| `-cnv` | Conversation mode |
| `--mmproj` | Vision encoder for multimodal |
| `--image` | Image path for multimodal |

### Run as API Server (OpenAI-Compatible)

**Quick start with tmux:**

```bash
tmux new -s llama
~/llama.cpp/build/bin/llama-server -m ~/models/Qwen3VL-4B-Instruct-Q4_K_M-new.gguf --mmproj ~/models/mmproj-Qwen3VL-4B-Instruct-F16.gguf -ngl 99 --host 0.0.0.0 --port 8080 --api-key sk-jetson-qwen3vl-a3f8c2d1e9b7f4a6c0d2e8f1a5b3c7d9
# Detach: Ctrl+b then d
```

**As a systemd service (auto-start on boot):**

Create `/etc/systemd/system/llama.service`:

```ini
[Unit]
Description=Llama.cpp Server
After=network.target

[Service]
ExecStart=/home/baixianger/llama.cpp/build/bin/llama-server -m /home/baixianger/models/Qwen3VL-4B-Instruct-Q4_K_M-new.gguf --mmproj /home/baixianger/models/mmproj-Qwen3VL-4B-Instruct-F16.gguf -ngl 99 --host 0.0.0.0 --port 8080 --api-key sk-jetson-qwen3vl-a3f8c2d1e9b7f4a6c0d2e8f1a5b3c7d9
Restart=always
User=baixianger

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable llama
sudo systemctl start llama

# Check status
sudo systemctl status llama

# View logs
sudo journalctl -u llama -f
```

**API Endpoints:**

| Endpoint | Description |
|----------|-------------|
| `http://<IP>:8080/v1/chat/completions` | OpenAI-compatible chat |
| `http://<IP>:8080/v1/completions` | Text completions |
| `http://<IP>:8080/health` | Health check |

**Test the API:**

```bash
curl http://localhost:8080/v1/chat/completions \
  -H "Authorization: Bearer sk-jetson-qwen3vl-a3f8c2d1e9b7f4a6c0d2e8f1a5b3c7d9" \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen","messages":[{"role":"user","content":"Hello!"}]}'
```

## Recommended Models for 8GB

| Model | Size | Context | Use Case |
|-------|------|---------|----------|
| Qwen3-VL-2B | 1.5GB | 8K+ | Multimodal, lightweight |
| Qwen3-VL-4B | 2.5GB | 8K+ | Multimodal, balanced |
| Llama 3.2 3B | 2GB | 128K | Long context text |
| Phi-3 Mini | 2.3GB | 128K | Long context text |
| Qwen2.5 3B | 2GB | 32K | General text |

## LLM Framework Comparison

| Framework | Xavier NX Support | Ease of Use | Performance |
|-----------|-------------------|-------------|-------------|
| **llama.cpp** | Excellent | Medium | Best |
| **Ollama** | Good | Easiest | Good |
| **TensorRT-LLM** | Limited (Orin only) | Hard | Best |
| **vLLM** | Not recommended | - | - |

## Remote Access with Tailscale

```bash
# Install
curl -fsSL https://tailscale.com/install.sh | sh
# or
wget -qO- https://tailscale.com/install.sh | sh

# Start and login
sudo tailscale up

# Get Tailscale IP
tailscale ip -4

# Enable on boot
sudo systemctl enable tailscaled
```

Connect from anywhere: `ssh user@100.x.x.x`

### Tailscale Exit Node (IPv4 Gateway)

The Jetson serves as a Tailscale exit node, providing IPv4 internet access to IPv6-only VPS servers in the network.

**Network topology:**

```
personal-dev (100.78.109.51, IPv6-only) ──┐
                                          ├──► jetson exit node (100.119.64.58) ──► IPv4 internet
sport-use-dev (100.70.35.15, IPv6-only) ──┘
```

#### Step 1: Enable IP Forwarding on Jetson

```bash
# IPv4 forwarding
echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.d/99-tailscale.conf

# IPv6 forwarding
echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.d/99-tailscale.conf

# Apply
sudo sysctl -p /etc/sysctl.d/99-tailscale.conf
```

#### Step 2: Advertise Jetson as Exit Node

```bash
sudo tailscale set --advertise-exit-node
```

#### Step 3: Approve in Admin Console

Go to https://login.tailscale.com/admin/machines → find **jetson** → `...` menu → **Edit route settings** → toggle **Use as exit node**.

Alternatively, add auto-approval in ACL policy (https://login.tailscale.com/admin/acls/file):

```json
"autoApprovers": {
    "exitNode": ["autogroup:member"]
}
```

#### Step 4: Configure VPS to Use Exit Node

On each VPS that needs IPv4 access:

```bash
# Set Jetson as exit node
sudo tailscale set --exit-node=100.119.64.58

# Verify IPv4 works
curl -4 ifconfig.me
```

To stop using the exit node:

```bash
sudo tailscale set --exit-node=
```

#### Notes

- Exit node only affects **outbound** traffic. Inbound connections (e.g., websites hosted on the VPS) are unaffected.
- Each device **opts in** individually — other Tailscale devices are not affected.
- The VPS outbound IPv4 address will be the Jetson's public IP (`188.180.104.0`).

## Screen (Keep Tasks Running)

```bash
# Install
sudo apt install screen

# Create session
screen -S download

# Run long task
wget https://...

# Detach: Ctrl+A, D

# Reattach
screen -r download

# Force reattach (if Attached elsewhere)
screen -d -r download

# Kill all screens
killall screen
```

## Disable Unused Services (Free Memory)

```bash
# Camera daemon (if not using CSI cameras)
sudo systemctl disable nvargus-daemon.service
sudo systemctl stop nvargus-daemon.service

# Desktop (if running headless)
sudo systemctl disable gdm3

# Bluetooth
sudo systemctl disable bluetooth
```

## Serial Console Access (from Mac)

```bash
screen /dev/cu.usbmodem14211210705753 115200

# Exit: Ctrl+A then K, then y
```

## Useful Commands

```bash
# Check JetPack version
cat /etc/nv_tegra_release

# Check memory/swap
free -h

# Check storage
df -h
lsblk

# Check GPU info
jtop

# Check Tailscale status
tailscale status

# Reboot
sudo reboot
```
