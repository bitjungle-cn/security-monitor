// 区块链安全事件监控网站 - 客户端脚本
const API_URL = './data/security_events.json';
const STATS_URL = './data/stats.json';
const LATEST_URL = './data/latest.json';

class SecurityMonitorApp {
    constructor() {
        this.data = {
            events: [],
            stats: {},
            latest: []
        };
        
        this.init();
    }
    
    async init() {
        console.log('🔍 初始化安全监控网站...');
        
        // 加载数据
        await this.loadData();
        
        // 更新页面
        this.updatePage();
        
        // 绑定事件
        this.bindEvents();
        
        // 自动刷新数据（可选）
        // setInterval(() => this.loadData(), 300000); // 每5分钟刷新
    }
    
    async loadData() {
        try {
            console.log('📥 加载数据...');
            
            const [eventsRes, statsRes, latestRes] = await Promise.allSettled([
                fetch(API_URL),
                fetch(STATS_URL),
                fetch(LATEST_URL)
            ]);
            
            // 加载事件数据
            if (eventsRes.status === 'fulfilled') {
                const eventsData = await eventsRes.value.json();
                this.data.events = eventsData.events || [];
                console.log(`✅ 加载 ${this.data.events.length} 个事件`);
            }
            
            // 加载统计
            if (statsRes.status === 'fulfilled') {
                this.data.stats = await statsRes.value.json();
                console.log('✅ 加载统计信息');
            }
            
            // 加载最新事件
            if (latestRes.status === 'fulfilled') {
                this.data.latest = await latestRes.value.json();
                console.log(`✅ 加载 ${this.data.latest.length} 个最新事件`);
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ 加载数据失败:', error);
            return false;
        }
    }
    
    updatePage() {
        // 更新统计数据
        this.updateStats();
        
        // 更新最新事件
        this.updateLatestEvents();
        
        // 更新所有事件
        this.updateAllEvents();
        
        // 更新风险分布
        this.updateRiskDistribution();
        
        // 更新时间信息
        this.updateTimeInfo();
    }
    
    updateStats() {
        const stats = this.data.stats;
        
        // 更新数字
        document.getElementById('total-events').textContent = stats.total_events || 0;
        document.getElementById('high-risk').textContent = stats.high_risk || 0;
        document.getElementById('medium-risk').textContent = stats.medium_risk || 0;
        document.getElementById('low-risk').textContent = stats.low_risk || 0;
        
        // 更新页脚统计
        document.getElementById('footer-total').textContent = stats.total_events || 0;
    }
    
    updateLatestEvents() {
        const container = document.getElementById('latest-events');
        
        // 使用最新事件，如果没有则用前几个
        const latestEvents = this.data.latest.length > 0 
            ? this.data.latest 
            : this.data.events.slice(0, 6);
        
        if (latestEvents.length === 0) {
            container.innerHTML = '<div class="no-data">暂无最新事件</div>';
            return;
        }
        
        container.innerHTML = latestEvents.map((event, index) => this.createEventCard(event, index)).join('');
        
        // 绑定展开按钮事件
        this.bindExpandButtons();
    }
    
    updateAllEvents() {
        const container = document.getElementById('all-events');
        
        if (this.data.events.length === 0) {
            container.innerHTML = '<div class="no-data">暂无事件记录</div>';
            return;
        }
        
        // 显示最近50个事件
        const recentEvents = this.data.events.slice(0, 50);
        
        container.innerHTML = recentEvents.map((event, index) => this.createEventCard(event, index)).join('');
    }
    
    updateRiskDistribution() {
        const stats = this.data.stats;
        const total = stats.total_events || 1;
        
        // 计算百分比
        const highPercent = ((stats.high_risk || 0) / total) * 100;
        const mediumPercent = ((stats.medium_risk || 0) / total) * 100;
        const lowPercent = ((stats.low_risk || 0) / total) * 100;
        
        // 更新进度条
        document.getElementById('high-risk-bar').style.width = highPercent + '%';
        document.getElementById('medium-risk-bar').style.width = mediumPercent + '%';
        document.getElementById('low-risk-bar').style.width = lowPercent + '%';
        
        // 更新百分比文本
        document.getElementById('high-risk-percent').textContent = highPercent.toFixed(1) + '%';
        document.getElementById('medium-risk-percent').textContent = mediumPercent.toFixed(1) + '%';
        document.getElementById('low-risk-percent').textContent = lowPercent.toFixed(1) + '%';
    }
    
    updateTimeInfo() {
        const now = new Date();
        const stats = this.data.stats;
        
        // 格式化时间
        const formatTime = (date) => {
            return date.toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }).replace(/\//g, '-');
        };
        
        // 更新最后更新时间
        const lastUpdated = stats.last_updated 
            ? new Date(stats.last_updated) 
            : now;
        
        document.getElementById('last-updated').textContent = formatTime(lastUpdated);
        document.getElementById('footer-time').textContent = formatTime(lastUpdated);
        document.getElementById('footer-updated').textContent = formatTime(lastUpdated);
    }
    
    createEventCard(event, index) {
        const eventDate = new Date(event.timestamp || event.created_at);
        const formattedDate = eventDate.toLocaleString('zh-CN', {
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const riskLevel = event.risk || '中';
        const riskClass = this.getRiskClass(riskLevel);
        
        // 截取内容预览
        const contentPreview = event.content 
            ? (event.content.length > 200 ? event.content.substring(0, 200) + '...' : event.content)
            : '暂无内容';
        
        return `
        <div class="event-card" data-index="${index}">
            <div class="event-header">
                <span class="event-time">${formattedDate}</span>
                <span class="risk-badge ${riskClass}">${this.getRiskText(riskLevel)}</span>
            </div>
            <h3 class="event-title">${event.title || '未命名事件'}</h3>
            <div class="event-content">
                ${contentPreview}
            </div>
            <button class="expand-btn">展开</button>
            <div class="event-footer">
                <span class="event-platform">
                    <i class="fas fa-globe"></i>
                    ${event.platform || '未知平台'}
                </span>
                <span class="event-author">${event.author || '未知作者'}</span>
            </div>
        </div>
        `;
    }
    
    getRiskClass(riskLevel) {
        switch (riskLevel.toLowerCase()) {
            case '高': return 'high';
            case '中': return 'medium';
            case '低': return 'low';
            default: return 'medium';
        }
    }
    
    getRiskText(riskLevel) {
        switch (riskLevel.toLowerCase()) {
            case '高': return '高风险';
            case '中': return '中风险';
            case '低': return '低风险';
            default: return '风险未知';
        }
    }
    
    bindEvents() {
        // 刷新按钮
        document.getElementById('refresh-btn').addEventListener('click', async () => {
            console.log('🔄 手动刷新数据...');
            await this.loadData();
            this.updatePage();
            this.showToast('数据已刷新');
        });
    }
    
    bindExpandButtons() {
        document.querySelectorAll('.event-card .expand-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const content = e.target.closest('.event-card').querySelector('.event-content');
                const isExpanded = content.classList.contains('expanded');
                
                if (isExpanded) {
                    content.classList.remove('expanded');
                    e.target.textContent = '展开';
                } else {
                    content.classList.add('expanded');
                    e.target.textContent = '收起';
                }
            });
        });
    }
    
    showToast(message, type = 'info') {
        // 创建toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            z-index: 1000;
            animation: slideIn 0.3s ease, fadeOut 0.3s ease 2.7s;
            max-width: 300px;
        `;
        
        document.body.appendChild(toast);
        
        // 自动移除
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 3000);
    }
}

// 启动应用
document.addEventListener('DOMContentLoaded', () => {
    const app = new SecurityMonitorApp();
    
    // 全局函数供链接使用
    window.loadData = async () => {
        await app.loadData();
        app.updatePage();
        app.showToast('数据已刷新', 'success');
    };
    
    window.exportData = () => {
        const dataStr = JSON.stringify(app.data.events, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `security_events_${new Date().toISOString().slice(0,10)}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        app.showToast('数据导出成功', 'success');
    };
});

// 动画样式
const style = document.createElement('style');
style.textContent = `
@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

@keyframes fadeOut {
    from {
        opacity: 1;
    }
    to {
        opacity: 0;
    }
}
`;
document.head.appendChild(style);
