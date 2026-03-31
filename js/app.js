class TweetMonitor {
  constructor() {
    this.manifest = null;
    this.currentBatch = null;
    this.tweets = [];
    this.loadingEl = document.getElementById('loading');
    this.containerEl = document.getElementById('tweet-container');
    this.lastUpdateEl = document.getElementById('last-update');
    this.statsEl = document.getElementById('stats');
    this.dateSelectEl = document.getElementById('date-select');
  }

  async init() {
    try {
      // 加载manifest
      await this.loadManifest();
      
      // 填充日期选择器
      this.populateDateSelector();
      
      // 绑定日期变更事件
      this.dateSelectEl.addEventListener('change', (e) => {
        if (e.target.value) {
          this.loadBatch(e.target.value);
        }
      });
      
      // 加载最新批次数据
      const latestBatch = this.manifest.latest_batch;
      if (latestBatch) {
        this.dateSelectEl.value = latestBatch;
        await this.loadBatch(latestBatch);
      } else {
        this.showError('没有可用的数据批次');
      }
    } catch (error) {
      this.showError('初始化失败: ' + error.message);
      console.error(error);
    }
  }

  async loadManifest() {
    // 尝试多个可能的路径
    const paths = [
      `data/manifest.json?t=${Date.now()}`,
      `./data/manifest.json?t=${Date.now()}`,
      `/Users/bitjungle/.openclaw/workspace/security-monitor/data/manifest.json?t=${Date.now()}`
    ];
    
    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          this.manifest = await response.json();
          console.log('✓ 成功从以下路径加载manifest:', path);
          return;
        }
      } catch (e) {
        console.warn('✗ 无法从以下路径加载:', path, e.message);
      }
    }
    
    throw new Error('无法加载manifest.json。可能是CORS限制或文件路径错误。请使用HTTP服务器打开此页面（例如: python3 -m http.server 8000）');
  }

  populateDateSelector() {
    const batches = this.manifest.batches || {};
    const batchIds = Object.keys(batches).sort().reverse();
    
    if (batchIds.length === 0) {
      this.dateSelectEl.innerHTML = '<option value="">没有可用的数据</option>';
      return;
    }

    this.dateSelectEl.innerHTML = '';
    batchIds.forEach((batchId, idx) => {
      const batch = batches[batchId];
      const option = document.createElement('option');
      option.value = batchId;
      
      // 格式化日期: "2026-03-31_08-35" -> "2026-03-31 08:35"
      const parts = batchId.split('_');
      const formatted = `${parts[0]} ${parts[1].replace('-', ':')}`;
      
      // 第一个是最新的
      if (idx === 0) {
        option.textContent = `${formatted} (最新) - ${batch.clean_count || 0}条`;
      } else {
        option.textContent = `${formatted} - ${batch.clean_count || 0}条`;
      }
      
      this.dateSelectEl.appendChild(option);
    });
  }

  async loadBatch(batchId) {
    try {
      const batch = this.manifest.batches[batchId];
      if (!batch || !batch.clean_tweets_file) {
        this.showError(`批次 ${batchId} 没有clean_tweets_file字段`);
        return;
      }

      this.loadingEl.style.display = 'block';
      this.containerEl.innerHTML = '';

      const url = `data/${batch.clean_tweets_file}?t=${Date.now()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`加载tweets失败: ${response.status}`);
      }

      this.tweets = await response.json();
      this.currentBatch = batchId;
      
      // 显示数据
      this.render();
      
    } catch (error) {
      this.showError('加载批次数据失败: ' + error.message);
      console.error(error);
    }
  }

  render() {
    this.loadingEl.style.display = 'none';

    if (!this.tweets || this.tweets.length === 0) {
      this.containerEl.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">该批次没有推文</div>';
      this.statsEl.textContent = '共获取 0 条推文';
      return;
    }

    // 计算统计
    const stats = this.calculateStats();
    
    // 更新统计信息
    this.lastUpdateEl.textContent = `最后扫描时间: ${this.formatBatchId(this.currentBatch)}`;
    this.statsEl.textContent = `共获取 ${this.tweets.length} 条推文 | 高风险: ${stats.high} | 中风险: ${stats.medium} | 低风险: ${stats.low}`;

    // 渲染推文
    this.containerEl.innerHTML = this.tweets.map(tweet => this.renderTweet(tweet)).join('');
  }

  renderTweet(tweet) {
    const riskLevel = this.analyzeTweetRisk(tweet);
    const riskTag = this.getRiskTag(riskLevel);
    
    const createdAt = tweet.created_at ? new Date(tweet.created_at).toLocaleString('zh-CN') : '未知';
    const metrics = tweet.public_metrics || {};
    const likeCount = metrics.like_count || 0;
    const retweetCount = metrics.retweet_count || 0;
    const replyCount = metrics.reply_count || 0;
    const impressionCount = metrics.impression_count || 0;

    const tweetUrl = `https://twitter.com/i/web/status/${tweet.id}`;

    return `
      <div class="tweet-card">
        <div class="tweet-header">
          <span>${createdAt}</span>
          ${riskTag}
        </div>
        <div class="tweet-text">${this.escapeHtml(tweet.text)}</div>
        <div class="tweet-metrics">
          <div class="metric-item">💬 ${replyCount}</div>
          <div class="metric-item">🔄 ${retweetCount}</div>
          <div class="metric-item">❤️ ${likeCount}</div>
          <div class="metric-item">👁️ ${impressionCount}</div>
        </div>
        <a href="${tweetUrl}" target="_blank" class="tweet-link">查看原始推文 →</a>
      </div>
    `;
  }

  analyzeTweetRisk(tweet) {
    const text = (tweet.text || '').toLowerCase();
    
    const highRiskKeywords = ['被盗', '黑客', '漏洞', '攻击', 'breach', 'hack', 'stolen', 'exploit', 'drain', 'rug pull'];
    const mediumRiskKeywords = ['骗局', '虚假', '诈骗', '可疑', 'scam', 'fraud', 'phishing', 'suspicious', 'alert'];
    
    if (highRiskKeywords.some(keyword => text.includes(keyword))) {
      return 'high';
    }
    if (mediumRiskKeywords.some(keyword => text.includes(keyword))) {
      return 'medium';
    }
    return 'low';
  }

  getRiskTag(riskLevel) {
    if (riskLevel === 'high') {
      return '<span class="tag tag-security">🚨 高风险</span>';
    } else if (riskLevel === 'medium') {
      return '<span class="tag tag-maybe">⚠️ 中风险</span>';
    }
    return '';
  }

  calculateStats() {
    let high = 0, medium = 0, low = 0;
    
    this.tweets.forEach(tweet => {
      const risk = this.analyzeTweetRisk(tweet);
      if (risk === 'high') high++;
      else if (risk === 'medium') medium++;
      else low++;
    });
    
    return { high, medium, low };
  }

  formatBatchId(batchId) {
    // "2026-03-31_08-35" -> "2026-03-31 08:35"
    const parts = batchId.split('_');
    return `${parts[0]} ${parts[1].replace('-', ':')}`;
  }

  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  showError(message) {
    this.loadingEl.innerHTML = `<div style="color: #d32f2f; text-align: center;">⚠️ ${message}</div>`;
    this.loadingEl.style.display = 'block';
    this.containerEl.innerHTML = '';
  }
}

// 全局函数支持HTML的onchange属性
window.changeDate = function(batchId) {
  if (app && batchId) {
    app.loadBatch(batchId);
  }
};

// 页面加载完成后初始化
let app;
document.addEventListener('DOMContentLoaded', () => {
  app = new TweetMonitor();
  app.init();
});
