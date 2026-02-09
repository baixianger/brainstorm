# Smart Home Multi-Sensor Fusion Decision System

Multi-source sensor data fusion for smart home safety/security, combining visual (camera) and IoT sensors (smoke, temperature, motion, door/window) into a unified decision engine.

## Use Case

A house equipped with multiple sensors:
- Smoke detectors (IoT numerical + camera visual)
- Surveillance cameras (RGB/depth)
- Temperature/humidity sensors
- PIR motion sensors
- Door/window magnetic contact sensors
- Other environmental sensors

Goal: fuse all sensor streams into a decision engine that can detect fire, intrusion, anomalies, etc.

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Gazebo Simulation (3D House)         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌───────┐  │
│  │Camera│ │Smoke │ │Temp/ │ │PIR   │ │Door/  │  │
│  │RGB-D │ │Sensor│ │Humid │ │Motion│ │Window │  │
│  └──┬───┘ └──┬───┘ └──┬───┘ └──┬───┘ └──┬────┘  │
└─────┼────────┼────────┼────────┼────────┼────────┘
      │ ROS 2 Topics    │        │        │
      ▼        ▼        ▼        ▼        ▼
┌─────────────────────────────────────────────────┐
│              ROS 2 Middleware                     │
│  /camera/image  /smoke/level  /temp  /motion ... │
└─────────────────┬───────────────────────────────┘
                  │
    ┌─────────────┼──────────────┐
    ▼             ▼              ▼
┌────────┐  ┌──────────┐  ┌──────────┐
│Vision  │  │Scalar    │  │Event     │
│YOLO/   │  │Time-ser  │  │State     │
│Fire Det│  │Anomaly   │  │Machine   │
└───┬────┘  └────┬─────┘  └────┬─────┘
    ▼             ▼             ▼
┌─────────────────────────────────────┐
│     Multi-Source Fusion Engine       │
│  - Bayesian Fusion (probability)     │
│  - D-S Evidence Theory (uncertainty) │
│  - or Transformer Fusion (learned)   │
│         ▼                            │
│  Output: FIRE / INTRUSION /          │
│          ANOMALY / NORMAL            │
└─────────────────────────────────────┘
```

## Tech Stack

- **Simulation**: Gazebo + ROS 2 Humble (runs on Jetson Xavier NX)
- **Visual AI**: YOLOv8 + TensorRT (smoke/fire/person detection)
- **Fusion**: Bayesian fusion (start simple), upgrade to D-S or Transformer
- **Hardware**: Jetson Xavier NX (ARM64, 384-core Volta GPU, 8GB)
- **Alternative sim**: Pure Python + simpy for algorithm prototyping

## Sensor Mapping in Gazebo

| Sensor | Gazebo Implementation | ROS 2 Topic |
|--------|----------------------|-------------|
| RGB Camera | `<sensor type="camera">` | `/camera/image_raw` |
| Depth Camera | `<sensor type="depth_camera">` | `/camera/depth` |
| Smoke Sensor | Custom plugin (particle concentration) | `/smoke/level` |
| Temperature | Custom plugin (env temp + noise) | `/temperature` |
| PIR Motion | Custom plugin (zone object detection) | `/motion/detected` |
| Door/Window | `<sensor type="contact">` | `/door/state` |

## Datasets

### Smart Home IoT Sensors (motion, door, temperature, etc.)

| Dataset | Sensors | Scale | Link |
|---------|---------|-------|------|
| CASAS (WSU) | Motion, door, temperature | Multiple real apartments, months | https://archive.ics.uci.edu/dataset/506 |
| E-care@home | PIR, force, reed switch, light, temp/humid, smart plugs | 6M+ samples, 6 months, 1Hz | https://data.mendeley.com/datasets/t9n68ykfk3/1 |
| SDHAR-HOME | Door, motion, appliance power, temp/humid | 2 people + pet, 2 months | https://www.mdpi.com/1424-8220/22/21/8109 |
| Bristol Smart Building | Temp, humidity, pressure, gas, accel, light | 8 IoT devices, 6 months, 10s sampling | https://data.bris.ac.uk/data/dataset/fwlmb11wni392kodtyljkw4n2 |

### Fire/Smoke Visual Detection (camera)

| Dataset | Content | Scale | Link |
|---------|---------|-------|------|
| D-Fire | Fire+smoke annotated images + surveillance video | Images+video, YOLO format | https://github.com/gaiasd/DFireDataset |
| Fire and Smoke Dataset (Kaggle) | Flame, smoke, flame+smoke | 7000+ images | https://www.kaggle.com/datasets/dataclusterlabs/fire-and-smoke-dataset |
| Smoke-Fire-Detection-YOLO | YOLO-format smoke/fire | Annotated | https://www.kaggle.com/datasets/sayedgamal99/smoke-fire-detection-yolo |

### Smoke Sensor Numerical Data (IoT)

| Dataset | Content | Link |
|---------|---------|------|
| Smoke Detection Dataset (Kaggle) | Temp, humidity, TVOC, eCO2, PM1.0, PM2.5, raw H2, raw ethanol, smoke/no-smoke labels | https://www.kaggle.com/datasets/deepcontractor/smoke-detection-dataset |

### Anomaly Detection

| Dataset | Content | Link |
|---------|---------|------|
| Cyber-Physical Anomaly | Temp, humidity, motion, light, air quality, noise + normal/anomaly labels | https://www.frontiersin.org/journals/the-internet-of-things/articles/10.3389/friot.2023.1275080/full |

## Phased Plan

| Phase | What | Where |
|-------|------|-------|
| Phase 1 | Pure Python simulation: generate synthetic sensor data, validate fusion algorithm | Mac / Jetson |
| Phase 2 | Gazebo house model + ROS 2, camera + scalar sensors | Jetson |
| Phase 3 | Add visual AI (YOLOv8 + TensorRT), camera smoke/fire detection | Jetson |
| Phase 4 | Full fusion decision engine, multi-scenario testing (fire, intrusion, false alarm) | Jetson |

## Fusion Approaches

| Method | Best For | Complexity |
|--------|----------|------------|
| Bayesian Fusion | Known sensor reliability, probabilistic reasoning | Low |
| Dempster-Shafer Evidence Theory | High sensor uncertainty, conflict handling | Medium |
| Transformer Fusion | Large data, learned fusion weights | High |

Start with Bayesian, upgrade as needed.

## Key Resources

- ROS 2 Sensor Fusion Tutorial: https://github.com/methylDragon/ros-sensor-fusion-tutorial
- Gazebo + ROS 2 Integration: https://gazebosim.org/docs/latest/ros2_integration/
- Multi-Modal Sensor Fusion Survey: https://arxiv.org/html/2506.21885v1
- Smart Home Digital Twin Paper: https://www.mdpi.com/1424-8220/23/17/7586
- AIoT Smart Firefighting Digital Twin: https://www.sciencedirect.com/science/article/pii/S1474034625000102
- Digital Twin Smoke Alarm Calibration: https://www.nature.com/articles/s41598-023-46761-1

## Notes

- Omniverse/Isaac Sim is overkill for this use case unless photorealistic camera training data is needed
- Jetson Xavier NX can run Gazebo + ROS 2 + YOLOv8 inference (with TensorRT)
- Datasets come from different sources with unaligned timestamps — need synthetic alignment or per-channel training with fusion-layer tuning
- DGX Spark ($3K, Grace Blackwell) could be a future upgrade for heavier model training
