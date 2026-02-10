# Digital Twin: Building Sensor Data Visualization & Large Screen Display

建筑数字孪生系统：实时采集建筑内传感器数据，3D 可视化展示传感器位置与状态，触发条件后在大屏上实时显示告警与态势。

**环境约束：Air-Gapped（气隙隔离）网络，面向军事/国防场景，所有组件内网部署，无互联网连接。**

## Architecture Overview

```
传感器 ──有线(Modbus/RS485)──▶ 加固网关 ──OPC-UA(TLS+mTLS)──▶ OPC-UA Server
                                                                      │
                                                                 DDS 中台总线
                                                                      │
                                                              内网 Web 服务器
                                                          (Nginx + 前端静态文件)
                                                                      │
                                                              WebSocket 推送
                                                                      │
                                                              大屏浏览器(3D)
```

## 四层架构

### Layer 1: Data Acquisition (数据采集层)

#### 通信协议对比

| 协议 | 安全性 | 可靠性 | 军事适用性 | 说明 |
|------|--------|--------|-----------|------|
| **DDS** | ★★★★★ | ★★★★★ | **军事首选** | 美军标准(MIL-STD)，无 Broker，抗单点故障 |
| **OPC-UA** | ★★★★★ | ★★★★★ | **工业首选** | 内置 X.509 认证 + AES-256 加密 + 审计 |
| **MQTT + TLS** | ★★★★ | ★★★★ | 推荐 | 轻量高效，IoT 事实标准 |
| **Modbus** | ★★ | ★★★★ | 谨慎使用 | 无加密无认证，需额外安全层 |
| **BACnet** | ★★★ | ★★★★ | 楼宇场景 | 楼宇自控标准协议 |
| **Zigbee/LoRa/BLE** | ★★★ | ★★★ | 不推荐 | 无线信号可被截获/干扰 |

#### 军事场景推荐协议

- **DDS (Data Distribution Service)**：美国国防部标准，去中心化无 Broker，微秒级延迟，20+ 种 QoS 参数
  - RTI Connext DDS（商业，军工主流）
  - Eclipse Cyclone DDS（开源，ROS 2 默认）
  - OpenDDS（开源，DoD 资助）
- **OPC-UA**：内置完整安全栈（证书认证、加密、权限、审计），信息建模能力强
  - open62541（开源 C 实现，可移植嵌入式平台）
  - Eclipse Milo（Java 实现）
- **有线优先**：以太网/光纤，避免无线协议（可被侦测/截获/干扰）

#### MQTT 备注

MQTT (Message Queuing Telemetry Transport) 是应用层协议，运行在 TCP/IP 之上，采用 Pub/Sub 模型：
- Publisher → Topic → Broker → Subscriber
- QoS 0/1/2 三级服务质量
- 最小报文 2 字节，适合资源受限设备
- Air-gap 环境需内网自建 Broker（EMQX / Mosquitto）

传感器接入方式：
1. 直连（ESP32 等自带 TCP 栈的设备）
2. 网关转换（Modbus/Zigbee/BLE → 网关 → MQTT）— 最常见
3. 厂商平台 API 转发

### Layer 2: Hardware (硬件选型)

#### 军工加固级网关/计算平台（国外）

| 厂商 | 国家 | 产品 | 特点 |
|------|------|------|------|
| **Curtiss-Wright** | 美国 | Parvus DuraCOR | MIL-STD-810 认证，军用嵌入式计算机 |
| **Mercury Systems** | 美国 | RES 系列 | 军用加固服务器，C4ISR 系统 |
| **General Dynamics** | 美国 | GETAC / Mission Systems | 军用加固平台 |
| **Leonardo DRS** | 美国/意大利 | HPEC 系列 | 高性能加固边缘计算 |
| **Kontron** | 德国 | COBALT 系列 | MIL 加固嵌入式平台 |
| **Elbit Systems** | 以色列 | TORCH 系列 | 军用 C4I 系统 |

#### 工业级网关 & 边缘计算（国外）

| 厂商 | 国家 | 产品 | OPC-UA 支持 |
|------|------|------|-------------|
| **Siemens** | 德国 | SIMATIC IOT2050 / S7-1500 | 原生内置，全球装机量最大 |
| **Beckhoff** | 德国 | CX 系列 / TwinCAT 3 | 软 PLC + OPC-UA，实时性极强 |
| **B&R (ABB)** | 奥地利 | X20 / Edge Controller | OPC-UA over TSN |
| **Phoenix Contact** | 德国 | PLCnext | 开放 Linux PLC + OPC-UA |
| **WAGO** | 德国 | PFC200 | Docker + OPC-UA |
| **HMS Networks** | 瑞典 | Anybus Edge / Ewon | 多协议 → OPC-UA 转换 |
| **Hilscher** | 德国 | netIOT / netPI | 工业 IoT 网关 |

#### 传感器 & 现场设备（国外）

| 厂商 | 国家 | 产品 | 类型 |
|------|------|------|------|
| **Endress+Hauser** | 瑞士 | 各类变送器 | 温度、压力、流量、液位 |
| **ifm electronic** | 德国 | IO-Link Master AL1350 | 传感器集线器 → OPC-UA |
| **SICK** | 德国 | SIG200 Gateway | 传感器网关 |
| **Balluff** | 德国 | BNI IOL 系列 | IO-Link → OPC-UA |
| **Pepperl+Fuchs** | 德国 | FieldConnex | 防爆传感器 + OPC-UA |
| **Turck** | 德国 | TBEN-L-PLC | 边缘 PLC + OPC-UA |

#### 楼宇自控（国外）

| 厂商 | 国家 | 产品 |
|------|------|------|
| **Honeywell** | 美国 | Niagara / Tridium |
| **Johnson Controls** | 美国/爱尔兰 | Metasys |
| **Schneider Electric** | 法国 | EcoStruxure |
| **ABB** | 瑞士 | Ability 平台 |

#### 嵌入式开发（自建 OPC-UA 节点）

| 硬件 | OPC-UA SDK |
|------|------------|
| Intel NUC (加固型) | open62541 (C)、Eclipse Milo (Java) |
| NVIDIA Jetson | open62541 + AI 推理 |
| Raspberry Pi (原型) | FreeOpcUa (Python)、open62541 |

### Layer 3: 3D Visualization (可视化层)

#### 开源 / Web 方案

| 框架 | 特点 | 适用场景 |
|------|------|---------|
| **Three.js** | 最成熟 WebGL 框架，社区大 | 自定义 3D 场景 |
| **Babylon.js** | 微软出品，内置物理引擎 | 高性能交互 |
| **xeokit** | 专为 BIM/AEC 设计 | IFC 建筑模型加载 |
| **IFC.js (web-ifc)** | 浏览器直接解析 IFC | BIM 集成 |
| **CesiumJS** | GIS + 3D | 园区/室外场景 |

#### 游戏引擎方案

| 引擎 | 特点 |
|------|------|
| **Unity** | C# 开发，跨平台，插件丰富 |
| **Unreal Engine** | 最高画质，C++ |

#### 商业平台（需评估 Air-Gap 部署能力）

| 平台 | 说明 |
|------|------|
| Autodesk Platform Services | BIM 模型在线查看 |
| NVIDIA Omniverse | 高保真渲染 |
| Azure Digital Twins | 微软云原生 |
| AWS IoT TwinMaker | AWS 生态 |

#### BIM 模型工作流

```
Revit (.rvt) → 导出 IFC → xeokit/IFC.js 加载 (Web)
                        → 转 glTF → Three.js 加载 (Web)
                        → 导入 Unity/Unreal (桌面)
```

#### 大屏前端框架

| 框架 | 用途 |
|------|------|
| **ECharts / ECharts GL** | 图表 + 3D |
| **D3.js** | 自定义数据可视化 |
| **DataV React 组件** | 大屏装饰效果（边框、飞线） |
| **Grafana** | 快速搭建监控面板 |

### Layer 4: Real-time Trigger & Display (实时触发与展示)

```
传感器数据 → 规则引擎(阈值判断) → WebSocket 推送 → 前端响应
                                                    ├─ 切换 3D 视角到告警区域
                                                    ├─ 高亮告警传感器
                                                    ├─ 弹窗显示详情
                                                    └─ 声光告警
```

规则引擎选择：Node-RED / EMQX 内置规则引擎 / 自定义后端服务

## Air-Gap 部署要点

| 要点 | 说明 |
|------|------|
| 所有服务内网部署 | EMQX/Mosquitto、Web 服务器、数据库全部本地 |
| 前端依赖离线打包 | Three.js / React / ECharts 等全部 bundle 进静态文件 |
| 离线 npm registry | Verdaccio 或提前打包 node_modules |
| 软件更新 | 审批过的 USB/光盘导入 |
| 时间同步 | 内网 NTP 服务器（无公网 NTP） |
| 证书管理 | 自建 CA（无 Let's Encrypt） |
| 地图/瓦片 | 本地地图服务（离线 CesiumJS 瓦片） |

## Security Checklist

- [ ] 全链路 TLS/DTLS 加密
- [ ] 双向证书认证 (mTLS)
- [ ] 网络分段（传感器网络 vs 管理网络）
- [ ] 数据签名防篡改
- [ ] 所有操作审计日志
- [ ] 协议白名单（防火墙只放行指定协议端口）
- [ ] 工作温度范围 -40°C ~ 70°C（军工级）
- [ ] 冗余电源
- [ ] Secure Boot / TPM / 固件签名
- [ ] 相关军标认证（如 GJB / MIL-STD）

## Recommended Tech Stack

**建筑传感器数据采集：**
```
传感器 → Siemens S7-1500 / Phoenix Contact PLCnext → OPC-UA → 数据中台
```

**军事加固环境：**
```
传感器 → Curtiss-Wright / Kontron 加固网关 → OPC-UA (TLS+mTLS) → DDS 中台 → 大屏
```

**快速原型 / MVP：**
```
Three.js + WebSocket + MQTT.js + ECharts + React（离线打包）
```

**企业交付级：**
```
xeokit(BIM) + EMQX(内网) + Spring Boot + WebSocket + DataV 大屏
```

**高保真演示：**
```
Unity / Unreal + OPC-UA/DDS + 自定义大屏渲染
```

## References

- [Digital Twin for 3D Interactive Building Operations (ScienceDirect)](https://www.sciencedirect.com/science/article/abs/pii/S0926580525003176)
- [Integrated Approach to Real-Time 3D Sensor Data Visualization (MDPI)](https://www.mdpi.com/2079-9292/14/15/2938)
- [Autodesk Digital Twin Explained](https://www.autodesk.com.cn/design-make/articles/digital-twin-explained)
- [2025 数字孪生技术趋势 (CSDN)](https://blog.csdn.net/2501_91851081/article/details/149066709)
