#!/usr/bin/env python3
import json

# 读取原始数据
with open('/Users/bitjungle/.openclaw/workspace/security-monitor/data/indexed_texts_2026-04-14_10-06.json', 'r') as f:
    data = json.load(f)

# 读取删除索引
with open('/Users/bitjungle/.openclaw/workspace/security-monitor/data/deletion_indices_2026-04-14_10-06.json', 'r') as f:
    deletion_data = json.load(f)

deletion_set = set(deletion_data['deletion_indices'])

# 过滤数据
cleaned_texts = [item for item in data['texts'] if item['index'] not in deletion_set]

# 保存清洁数据
output = {
    'batch_id': data['batch_id'],
    'original_count': data['total_count'],
    'deleted_count': len(deletion_set),
    'cleaned_count': len(cleaned_texts),
    'generated_at': data['generated_at'],
    'texts': cleaned_texts
}

with open('/Users/bitjungle/.openclaw/workspace/security-monitor/data/cleaned_texts_2026-04-14_10-06.json', 'w') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)

print(f"✅ 清洁数据生成完成！")
print(f"原始推文: {data['total_count']}")
print(f"删除广告: {len(deletion_set)}")
print(f"剩余推文: {len(cleaned_texts)}")
