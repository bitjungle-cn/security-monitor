import json
import re

def load_tweets(file_path: str):
    """加载推文数据"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def is_security_event(tweet: dict) -> bool:
    """判断是否为真实的区块链安全事件"""
    text = tweet.get('text', '').lower()
    
    # 安全事件关键词
    security_keywords = [
        'hacked', '被盗', 'exploit', '漏洞', '安全漏洞', 'security', '攻击',
        'attack', '被黑', '盗取', '盗币', '冷钱包被盗', '钱包被盗', '账户被盗',
        'seed phrase', '助记词', '私钥', 'private key', '黑客', 'hacker',
        'breach', '入侵', '数据泄露', 'data breach', 'token drop', '代币下跌',
        'loss', '损失', '被攻击', 'exploit kit', '漏洞利用工具包', '零日漏洞',
        'zero-day', 'cve', '安全补丁', 'security patch', '更新', 'update',
        '威胁', 'threat', '风险', 'risk', '审计', 'audit', '智能合约安全',
        'smart contract security', 'defi安全', 'de-fi security', 'phishing',
        '钓鱼', 'scam', '诈骗', '欺诈', '骗局', '安全事件', '安全报告',
        'security report', 'hack report', '攻击报告', '漏洞报告'
    ]
    
    # 排除干扰内容的关键词
    exclude_keywords = [
        '币安教程', '钱包推广', '课程', '推广', '邀请码', '返佣', '手续费',
        '注册', '邀请', '优惠', '折扣', '钱包教程', 'web3钱包', '新手课堂',
        '通行密钥', 'web3钱包', '安全备份', '扫链工具', '聪明钱', '跟单',
        'gmgn', 'ai选币', '精准狙击', '百倍神话', '合约地址', 'k线', 'meme币',
        'dyor', '现价', '斩获', '捕获', '完美捕获', '拉人头', '推广项目',
        '空投', '营销', '推销', '项目推广', '推广链接', '专属注册链接',
        '推荐邀请码', '8折优惠', '手续费折扣', '返佣邀请码', '交易手续费',
        '长期折扣', '越早填写越划算', '色情', '低俗', '👠', '🤵', '褪去',
        '外衫', '套在身', '贴着的', 'crypto hoe', 'recovery', '恢复', '追回',
        '帮助', 'dm', 'contact', 'affected', 'assistance', 'specialists',
        '专家', '恢复服务', '追回资金', 'dm now', 'contact us', 'get help'
    ]
    
    # 检查是否包含安全关键词
    has_security = False
    for keyword in security_keywords:
        if keyword in text:
            has_security = True
            break
    
    # 检查是否包含排除关键词
    has_exclude = False
    for keyword in exclude_keywords:
        if keyword in text:
            has_exclude = True
            break
    
    # 如果是安全相关内容且不包含排除关键词，则认为是真实安全事件
    return has_security and not has_exclude

def get_risk_assessment(tweet: dict) -> tuple:
    """获取风险评估和原因"""
    text = tweet.get('text', '').lower()
    
    if is_security_event(tweet):
        # 确定具体的安全事件类型
        if any(kw in text for kw in ['hacked', '被盗', '盗币', '被黑', '盗取']):
            return '低风险-安全事件', '涉及账户/钱包被盗事件'
        elif any(kw in text for kw in ['exploit', '漏洞', '安全漏洞', 'cve', 'zero-day']):
            return '低风险-安全事件', '涉及安全漏洞或利用工具'
        elif any(kw in text for kw in ['phishing', '钓鱼', 'scam', '诈骗']):
            return '低风险-安全事件', '涉及钓鱼或诈骗攻击'
        elif any(kw in text for kw in ['security', '安全', '风险', 'threat']):
            return '低风险-安全事件', '涉及安全威胁或风险警告'
        else:
            return '低风险-安全事件', '涉及区块链安全相关内容'
    else:
        # 判断干扰类型
        if any(kw in text for kw in ['币安', 'binance', '教程', '课程', '推广', '邀请码']):
            return '高风险-广告推广', '包含交易所或钱包推广内容'
        elif any(kw in text for kw in ['色情', '低俗', '👠', '🤵', 'crypto hoe']):
            return '高风险-色情低俗', '包含色情或低俗内容'
        elif any(kw in text for kw in ['拉人头', '推广项目', '空投', '营销', '推销']):
            return '高风险-无关营销', '包含无关的营销推广内容'
        elif any(kw in text for kw in ['recovery', '恢复', '追回', 'dm now', 'contact us', 'get help']):
            return '高风险-诈骗钓鱼', '疑似诈骗或钓鱼恢复服务'
        elif any(kw in text for kw in ['gmgn', '扫链工具', '聪明钱', '跟单', 'meme币', '现价']):
            return '高风险-广告推广', '包含代币或工具推广内容'
        else:
            return '中风险-需要审核', '内容不明确，需要进一步审核'

def main():
    tweets = load_tweets('data/raw_tweets.json')
    
    print("过滤后的真实区块链安全事件推文列表:\n")
    print("ID,风险评估,原因说明")
    print("-" * 80)
    
    security_count = 0
    for tweet in tweets:
        tweet_id = tweet.get('id', '')
        risk, reason = get_risk_assessment(tweet)
        
        # 只输出真实的区块链安全事件（低风险-安全事件）
        if risk == '低风险-安全事件':
            print(f"{tweet_id},{risk},{reason}")
            security_count += 1
    
    print("\n" + "=" * 80)
    print(f"总计: {security_count} 条真实的区块链安全事件推文")
    print("=" * 80)
    
    # 输出完整的分析报告
    print("\n\n完整分析报告:")
    print("=" * 80)
    
    risk_counts = {}
    for tweet in tweets:
        risk, _ = get_risk_assessment(tweet)
        risk_counts[risk] = risk_counts.get(risk, 0) + 1
    
    print("\n风险分类统计:")
    for risk, count in sorted(risk_counts.items()):
        print(f"{risk}: {count}条")
    
    # 输出被过滤的推文示例
    print("\n被过滤的干扰内容示例:")
    print("=" * 80)
    
    filtered_examples = []
    for tweet in tweets:
        risk, reason = get_risk_assessment(tweet)
        if risk != '低风险-安全事件':
            filtered_examples.append({
                'id': tweet.get('id', ''),
                'risk': risk,
                'reason': reason,
                'text': tweet.get('text', '')[:100] + '...' if len(tweet.get('text', '')) > 100 else tweet.get('text', '')
            })
    
    for i, example in enumerate(filtered_examples[:10], 1):
        print(f"\n{i}. ID: {example['id']}")
        print(f"   风险: {example['risk']}")
        print(f"   原因: {example['reason']}")
        print(f"   内容: {example['text']}")

if __name__ == "__main__":
    main()