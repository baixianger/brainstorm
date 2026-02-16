# 02 — 安装、配置与首次运行

## 安装方式

Moltis 提供四种安装方式：

### 1. 一键安装脚本（macOS / Linux）

```bash
curl -fsSL https://www.moltis.org/install.sh | sh
```

### 2. Homebrew

```bash
brew install moltis-org/tap/moltis
```

### 3. Docker（多架构：amd64/arm64）

```bash
docker pull ghcr.io/moltis-org/moltis:latest

docker run -d \
  --name moltis \
  -p 13131:13131 \
  -p 13132:13132 \
  -v moltis-config:/home/moltis/.config/moltis \
  -v moltis-data:/home/moltis/.moltis \
  -v /var/run/docker.sock:/var/run/docker.sock \
  ghcr.io/moltis-org/moltis:latest
```

> Docker socket 挂载是必须的——没有它，沙箱命令执行将失败。

### 4. 从源码构建

```bash
cargo install moltis --git https://github.com/moltis-org/moltis
# 或
git clone https://github.com/moltis-org/moltis.git
cd moltis
cargo build --release
```

---

## 首次运行

```bash
moltis
# 或
cargo run --release
```

Moltis 启动后会：

1. **生成自签名 TLS 证书**（首次运行时）
2. **写入默认配置** `moltis.toml`（包含所有默认值）
3. **选择随机端口**（每次全新安装使用不同端口，避免多用户冲突）
4. **打印 6 位设置码**到终端（用于远程首次设置）

打开 `https://moltis.localhost:3000`（或 Docker 的 `https://localhost:13131`）

### 信任自签名证书

首次访问会显示浏览器安全警告。信任 CA 证书：

```bash
# 下载 CA 证书
curl -k http://localhost:13132/certs/ca.pem -o moltis-ca.pem

# macOS：添加到钥匙串
security add-trusted-cert -d -r trustRoot -k ~/Library/Keychains/login.keychain moltis-ca.pem

# Linux：添加到系统信任
sudo cp moltis-ca.pem /usr/local/share/ca-certificates/moltis.crt
sudo update-ca-certificates
```

---

## 首次设置向导（Onboarding）

首次打开 Web UI 进入引导设置：

1. **设置密码或 Passkey**（WebAuthn）
2. **配置 Agent 身份**：名字、emoji、性格（creature、vibe、soul）
3. **配置用户档案**
4. **选择 LLM Provider**

### 认证三层模型

| 层级 | 条件 | 行为 |
| --- | --- | --- |
| Tier 1 — 完整认证 | 已配置密码/Passkey | 所有连接需认证 |
| Tier 2 — 本地开发 | 无凭据 + 本地连接 | 直接访问 |
| Tier 3 — 远程设置 | 无凭据 + 远程连接 | 仅允许设置流程 |

本地连接判定（全部满足）：
- 未设置 `MOLTIS_BEHIND_PROXY`
- 无代理头（`X-Forwarded-For` 等）
- Host 头解析为 loopback
- TCP 源 IP 为 loopback

---

## 目录结构

| 目录 | 用途 | 默认路径 |
| --- | --- | --- |
| Config | 配置文件 | `~/.moltis/` 或 `~/.config/moltis/` |
| Data | 数据库、会话、日志、记忆 | `~/.moltis/` |

关键文件：
- `moltis.toml` — 主配置文件
- `credentials.json` — 认证凭据
- `mcp-servers.json` — MCP 服务器配置
- `provider_keys.json` — Provider API 密钥
- `moltis.db` — SQLite 主数据库

### 自定义目录

```bash
# CLI 参数
moltis --config-dir /path/to/config --data-dir /path/to/data

# 环境变量
export MOLTIS_CONFIG_DIR=/path/to/config
export MOLTIS_DATA_DIR=/path/to/data
```

---

## CLI 命令

```bash
moltis                          # 启动网关（默认命令）
moltis config check             # 校验配置文件
moltis auth reset-password      # 重置密码
moltis auth reset-identity      # 重置身份
moltis sandbox list             # 列出沙箱容器
moltis sandbox build            # 构建沙箱镜像
moltis sandbox remove           # 删除沙箱容器
moltis sandbox clean            # 清理沙箱
moltis hooks list               # 列出 hooks
moltis hooks info <name>        # 查看 hook 详情
moltis memory ...               # 记忆管理命令
moltis db ...                   # 数据库管理命令
```

---

## 云部署

### Fly.io

项目根目录已包含 `fly.toml`，使用 `--no-tls` flag（云平台负责 TLS 终止）。

### DigitalOcean

一键部署按钮配置在 `.do/deploy.template.yaml`。

### Docker Compose 示例

```yaml
# examples/docker-compose.yml
version: '3'
services:
  moltis:
    image: ghcr.io/moltis-org/moltis:latest
    ports:
      - "13131:13131"
      - "13132:13132"
    volumes:
      - moltis-config:/home/moltis/.config/moltis
      - moltis-data:/home/moltis/.moltis
      - /var/run/docker.sock:/var/run/docker.sock
```
