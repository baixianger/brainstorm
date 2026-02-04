# SEO 优化 SaaS

## 项目概述
使用 Embedding 技术帮助用户提升 SEO，通过计算内容与目标关键词的语义距离，与竞品进行对比分析。

## 核心思路

```
用户网页内容 ──→ Embedding ──→ 向量A
目标关键词    ──→ Embedding ──→ 向量Q
竞品网页内容  ──→ Embedding ──→ 向量B1, B2, B3...

比较：cosine_similarity(A, Q) vs cosine_similarity(B, Q)
```

## 核心功能

| 功能 | 说明 |
|------|------|
| 语义匹配度评分 | 你的内容和目标词有多相关 |
| 竞品差距分析 | 排名靠前的页面为什么更匹配 |
| 内容优化建议 | 缺少哪些语义相关的主题 |
| 主题聚类分析 | 发现竞品覆盖的主题分布 |

## 基础实现

```python
from sentence_transformers import SentenceTransformer
import numpy as np

model = SentenceTransformer('BAAI/bge-large-zh-v1.5')  # 中文推荐

def analyze_seo(target_query, user_content, competitor_contents):
    # Embedding
    query_vec = model.encode(target_query)
    user_vec = model.encode(user_content)
    comp_vecs = [model.encode(c) for c in competitor_contents]

    # 计算相似度
    user_score = cosine_sim(user_vec, query_vec)
    comp_scores = [cosine_sim(v, query_vec) for v in comp_vecs]

    return {
        "your_score": user_score,
        "competitor_avg": np.mean(comp_scores),
        "gap": np.mean(comp_scores) - user_score
    }
```

## 聚类分析 - 发现主题

### 流程
```
竞品页面 → 拆成段落 → Embedding → 聚类 → 发现主题簇
```

### KMeans 聚类

```python
from sentence_transformers import SentenceTransformer
from sklearn.cluster import KMeans

model = SentenceTransformer('BAAI/bge-large-zh-v1.5')

# 1. 收集竞品内容，拆成段落
paragraphs = [
    "股票基本面分析包括市盈率、市净率等指标",
    "技术分析主要看K线图和均线",
    # ... 更多段落
]

# 2. 生成 Embedding
embeddings = model.encode(paragraphs)

# 3. KMeans 聚类
n_clusters = 5
kmeans = KMeans(n_clusters=n_clusters, random_state=42)
labels = kmeans.fit_predict(embeddings)

# 4. 查看每个簇的内容
for i in range(n_clusters):
    print(f"\n=== 主题簇 {i} ===")
    cluster_paragraphs = [p for p, l in zip(paragraphs, labels) if l == i]
    for p in cluster_paragraphs:
        print(f"  - {p[:50]}...")
```

### HDBSCAN 聚类（推荐）

```python
import hdbscan

clusterer = hdbscan.HDBSCAN(min_cluster_size=3, metric='euclidean')
labels = clusterer.fit_predict(embeddings)

# -1 表示噪声点（不属于任何簇）
n_clusters = len(set(labels)) - (1 if -1 in labels else 0)
print(f"自动发现 {n_clusters} 个主题")
```

### 常用聚类算法对比

| 算法 | 特点 | 适用场景 |
|------|------|----------|
| KMeans | 简单快速，需指定 K | 主题数大致已知 |
| HDBSCAN | 自动确定簇数，能发现噪声 | 不确定有多少主题 |
| Agglomerative | 层次聚类，可生成树状图 | 想看主题的层级关系 |

## 找出缺失主题

```python
def find_missing_topics(user_paragraphs, competitor_paragraphs):
    all_paragraphs = user_paragraphs + competitor_paragraphs
    embeddings = model.encode(all_paragraphs)

    # 聚类
    labels = hdbscan.HDBSCAN(min_cluster_size=3).fit_predict(embeddings)

    user_labels = set(labels[:len(user_paragraphs)])
    comp_labels = set(labels[len(user_paragraphs):])

    # 竞品有但你没有的主题
    missing = comp_labels - user_labels
    return missing
```

## 进阶功能

1. **分段分析** - 把页面拆成段落，找出哪部分拖后腿
2. **关键词簇** - 用 Embedding 聚类发现竞品覆盖的子主题
3. **内容建议** - 找出竞品有但你没覆盖的语义主题

## 推荐 Embedding 模型

| 模型 | 特点 |
|------|------|
| BAAI/bge-large-zh-v1.5 | 中文效果好，开源免费 |
| M3E | 专门针对中文优化 |
| OpenAI text-embedding-3 | 商用，效果好 |
| Google textembedding-gecko | Vertex AI 提供 |

## 背景知识

### Google 搜索索引原理
- 传统索引：倒排索引，基于关键词精确匹配
- 现代方式：Embedding + 语义理解（BERT, MUM）
- 两者结合：先用传统方式快速筛选，再用 Embedding 精细排序

### SEO 相关概念
- SEO = Search Engine Optimization（搜索引擎优化）
- 目的：让用户更容易搜到你的内容
