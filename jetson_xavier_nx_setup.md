# Jetson Xavier NX Setup Guide

## System Info
- **Device:** Jetson Xavier NX
- **RAM:** 8GB
- **Storage:** 238GB NVMe SSD + 30GB eMMC
- **JetPack:** 5.x (R35 release)

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

## jtop Installation

```bash
sudo python3.9 -m pip install -U jetson-stats
sudo systemctl restart jtop.service

# Run jtop
sudo python3.9 -m jtop
```

## llama.cpp Installation

### Install Dependencies

```bash
sudo apt update
sudo apt install -y cmake build-essential

# Upgrade cmake if needed (requires 3.18+)
pip3 install cmake --upgrade
echo 'export PATH=$HOME/.local/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

### Build with CUDA

```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
mkdir build && cd build
cmake .. -DGGML_CUDA=ON
cmake --build . --config Release -j4
```

### Download Models

```bash
pip3 install huggingface_hub

# Example: Download Llama 3.2 3B
huggingface-cli download TheBloke/Llama-2-7B-Chat-GGUF llama-2-7b-chat.Q4_K_M.gguf --local-dir ./models
```

### Run

```bash
./build/bin/llama-server -m models/model.gguf -ngl 99
```

## Recommended Models for 8GB

| Model | Context | Quantization | Speed (est.) |
|-------|---------|--------------|--------------|
| Llama 3.2 3B | 128K | Q4_K_M | ~15-20 tok/s |
| Phi-3 Mini 128K | 128K | Q4_K_M | ~18-22 tok/s |
| Qwen 3 4B | 32K | Q4_K_M | ~12-15 tok/s |
| Mistral 7B | 32K | Q4_0 | ~8-12 tok/s |

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
sudo python3.9 -m jtop

# Reboot
sudo reboot
```
