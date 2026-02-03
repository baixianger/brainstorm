# 微信股票分析机器人

## 项目概述
基于微信服务号的股票分析机器人，带用户认证功能。

## 核心功能
- 股票分析查询
- 用户注册认证（只有注册用户才能使用）
- 未注册用户引导至注册网站

## 技术架构

```
用户发消息 → 服务号 → 后端服务器 → 检查用户是否注册
                                ↓
                    已注册 → 返回股票分析结果
                    未注册 → 返回注册引导链接
```

## 核心流程代码

```python
def handle_wechat_message(openid, message):
    # 1. 检查用户是否已注册
    user = db.query("SELECT * FROM users WHERE wechat_openid = ?", openid)

    if not user:
        # 未注册，返回引导
        return f"您尚未注册，请先访问 https://yoursite.com/register?openid={openid} 完成注册"

    # 2. 已注册，处理股票分析请求
    stock_code = parse_stock_code(message)
    analysis = analyze_stock(stock_code)
    return analysis
```

## 所需组件

| 组件 | 说明 |
|------|------|
| 微信服务号 | 需要企业资质认证 |
| 后端服务器 | 处理消息、用户认证、股票分析 |
| 数据库 | 存储用户信息和 OpenID 绑定关系 |
| 注册网站 | 用户注册并绑定微信 OpenID |
| 股票数据源 | Tushare、AKShare、或付费API |

## 用户注册流程
1. 用户首次发消息 → 获取其 OpenID
2. 返回带 OpenID 参数的注册链接
3. 用户在网站完成注册，OpenID 自动绑定
4. 下次发消息即可使用

## 命名候选

### 专业稳重型
- 析股通
- 研股助手
- 慧股参谋
- 智研投顾

### 科技感型
- StockMind
- AlphaBot
- 量子研股
- 智析AI

### 亲和易记型
- 小股通
- 股小秘
- 盯盘侠
- 牛股雷达

## 起名建议
1. 先查重 - 检查微信公众号、商标、域名是否可用
2. 避免敏感词 - "投资顾问"、"荐股"等可能涉及合规问题
3. 考虑SEO - 名字里带"股票"更容易被搜到
4. 简短好记 - 3-4个字最佳

## 注意事项
- 微信个人号不支持机器人，必须用服务号
- 服务号需要企业资质认证
- 涉及股票建议需注意合规风险
