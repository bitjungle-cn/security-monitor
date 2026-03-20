import json
import re
from typing import Dict, List, Tuple

def load_tweets(file_path: str) -> List[Dict]:
    """加载推文数据"""
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def analyze_tweet(tweet: Dict) -> Tuple[str, str, str]:
    """
    分析单条推文，返回风险评估和原因
    返回: (风险评估, 原因说明)
    """
    text = tweet.get('text', '').lower()
    tweet_id = tweet.get('id', '')
    
    # 1. 广告推广类检测
    ad_keywords = [
        '币安', 'binance', '教程', '课程', '推广', '邀请码', '返佣', '手续费',
        '注册', '邀请', '优惠', '折扣', '钱包推广', '钱包教程', 'web3钱包',
        '新手课堂', '通行密钥', 'web3钱包', '安全备份', '扫链工具', '聪明钱',
        '跟单', 'gmgn', 'ai选币', '精准狙击', '百倍神话', '合约地址', 'k线',
        'meme币', 'dyor', '现价', '斩获', '捕获', '完美捕获'
    ]
    
    # 2. 色情或低俗内容检测
    porn_keywords = [
        '色情', '低俗', '👠', '🤵', '褪去', '外衫', '套在身', '贴着的', 'crypto hoe'
    ]
    
    # 3. 无关营销检测
    marketing_keywords = [
        '拉人头', '推广项目', '空投', '营销', '推销', '项目推广', '推广链接',
        '专属注册链接', '推荐邀请码', '8折优惠', '手续费折扣', '返佣邀请码',
        '交易手续费', '长期折扣', '越早填写越划算'
    ]
    
    # 4. 诈骗或钓鱼相关内容检测
    scam_keywords = [
        '诈骗', '钓鱼', 'phishing', 'scam', '欺诈', '骗局', '假冒', '冒充',
        'impersonation', 'fake', '虚假', '伪造', 'alert', '警告', '危险',
        'recovery', '恢复', '追回', '帮助', 'dm', 'contact', 'affected',
        'assistance', 'specialists', '专家', '恢复服务', '追回资金'
    ]
    
    # 5. 重复或垃圾内容检测模式
    # 我们会检查推文的相似性模式
    
    # 检查广告推广
    for keyword in ad_keywords:
        if keyword.lower() in text:
            return '高风险-广告推广', f'包含广告推广关键词: {keyword}'
    
    # 检查色情低俗内容
    for keyword in porn_keywords:
        if keyword.lower() in text:
            return '高风险-色情低俗', f'包含色情低俗内容: {keyword}'
    
    # 检查无关营销
    for keyword in marketing_keywords:
        if keyword.lower() in text:
            return '高风险-无关营销', f'包含营销推广内容: {keyword}'
    
    # 检查诈骗钓鱼
    for keyword in scam_keywords:
        if keyword.lower() in text:
            return '高风险-诈骗钓鱼', f'涉及诈骗钓鱼内容: {keyword}'
    
    # 检查安全相关关键词 - 真正的安全事件
    security_keywords = [
        'hacked', '被盗', 'exploit', '漏洞', '安全漏洞', 'security', '攻击',
        'attack', '被黑', '盗取', '盗币', '冷钱包被盗', '钱包被盗', '账户被盗',
        'seed phrase', '助记词', '私钥', 'private key', '黑客', 'hacker',
        'breach', '入侵', '数据泄露', 'data breach', 'token drop', '代币下跌',
        'loss', '损失', '被攻击', 'exploit kit', '漏洞利用工具包', '零日漏洞',
        'zero-day', 'cve', '安全补丁', 'security patch', '更新', 'update',
        '威胁', 'threat', '风险', 'risk', '审计', 'audit', '智能合约安全',
        'smart contract security', 'defi安全', 'de-fi security'
    ]
    
    # 检查是否包含安全相关关键词
    has_security_content = False
    security_found = []
    for keyword in security_keywords:
        if keyword.lower() in text:
            has_security_content = True
            security_found.append(keyword)
    
    if has_security_content:
        return '低风险-安全事件', f'包含真实安全事件内容: {", ".join(security_found)}'
    
    # 如果没有明显特征，标记为需要人工审核
    return '中风险-需要审核', '内容不明确，需要人工审核是否为安全事件'

def find_duplicate_tweets(tweets: List[Dict]) -> Dict[str, List[str]]:
    """查找重复或相似的推文"""
    text_patterns = {}
    duplicates = {}
    
    for tweet in tweets:
        text = tweet.get('text', '')
        tweet_id = tweet.get('id', '')
        
        # 提取关键模式（去除链接和特殊字符）
        clean_text = re.sub(r'https?://\S+', '', text)
        clean_text = re.sub(r'[@#]\w+', '', clean_text)
        clean_text = re.sub(r'[^\w\s]', '', clean_text).strip()
        
        # 取前50个字符作为模式
        if len(clean_text) > 50:
            pattern = clean_text[:50]
        else:
            pattern = clean_text
        
        if pattern and len(pattern) > 10:  # 有意义的模式
            if pattern not in text_patterns:
                text_patterns[pattern] = []
            text_patterns[pattern].append(tweet_id)
    
    # 找出重复模式
    for pattern, ids in text_patterns.items():
        if len(ids) > 1:
            duplicates[pattern] = ids
    
    return duplicates

def main():
    # 加载数据
    tweets = load_tweets('data/raw_tweets.json')
    
    print(f"分析 {len(tweets)} 条推文...\n")
    
    # 分析每条推文
    results = []
    for tweet in tweets:
        tweet_id = tweet.get('id', '')
        risk, reason = analyze_tweet(tweet)
        results.append({
            'id': tweet_id,
            'risk': risk,
            'reason': reason,
            'text': tweet.get('text', '')[:100] + '...' if len(tweet.get('text', '')) > 100 else tweet.get('text', '')
        })
    
    # 查找重复内容
    duplicates = find_duplicate_tweets(tweets)
    
    # 输出结果
    print("=" * 80)
    print("推文分析结果:")
    print("=" * 80)
    
    for i, result in enumerate(results, 1):
        print(f"{i:3d}. ID: {result['id']}")
        print(f"    风险评估: {result['risk']}")
        print(f"    原因说明: {result['reason']}")
        print(f"    内容摘要: {result['text']}")
        print()
    
    # 统计
    risk_counts = {}
    for result in results:
        risk = result['risk']
        risk_counts[risk] = risk_counts.get(risk, 0) + 1
    
    print("=" * 80)
    print("风险统计:")
    print("=" * 80)
    for risk, count in sorted(risk_counts.items()):
        print(f"{risk}: {count}条")
    
    print()
    print("=" * 80)
    print("过滤后的真实安全事件推文 (低风险-安全事件):")
    print("=" * 80)
    
    security_tweets = [r for r in results if r['risk'] == '低风险-安全事件']
    for i, tweet in enumerate(security_tweets, 1):
        print(f"{i:3d}. ID: {tweet['id']}")
        print(f"    原因: {tweet['reason']}")
        print(f"    内容: {tweet['text']}")
        print()
    
    print(f"总计: {len(security_tweets)} 条真实安全事件推文")
    
    # 输出重复内容分析
    if duplicates:
        print("\n" + "=" * 80)
        print("重复/垃圾内容检测:")
        print("=" * 80)
        for pattern, ids in duplicates.items():
            print(f"模式: {pattern[:50]}...")
            print(f"重复推文ID: {ids}")
            print()

if __name__ == "__main__":
    main()