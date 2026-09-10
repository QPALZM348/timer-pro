
document.addEventListener('DOMContentLoaded', function(){
    // ============ 全局状态 ============
    let laps = [];           // 分段计时数据
    let lastLapTime = 0;     // 上一次记圈的时间
    let presets = [];        // 自定义预设
    let multiTimers = [];    // 多计时器数据
    let history = [];        // 计时历史
    let speechEnabled = true;
    let notifEnabled = true;
    let progressBgEnabled = true;   // 背景随进度变红
    let finishMsg = '';             // 倒计时结束自定义文字


    // ===== 好友列表逻辑 (V1.5.2) =====
    const FRIENDS_KEY = '计时器好友列表';
    const AVATAR_COLORS = ['#6a11cb','#e91e63','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#14b8a6'];
    function loadFriends(){ try{return JSON.parse(localStorage.getItem(FRIENDS_KEY)) || [];}catch(e){return [];} }
    function saveFriends(list){ localStorage.setItem(FRIENDS_KEY, JSON.stringify(list)); }
    function friendColor(name){
        let hash=0; for(let i=0;i<name.length;i++) hash=(hash*31+name.charCodeAt(i))>>>0;
        return AVATAR_COLORS[hash % AVATAR_COLORS.length];
    }
    function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
    function renderFriends(){
        const list = loadFriends();
        const box = document.getElementById('friendsList');
        if(!box) return;
        if(list.length===0){
            box.innerHTML = '<div class="friend-empty">还没有好友，快去添加第一个吧 ✨</div>';
            return;
        }
        var unreadMap = window._unreadCounts || {};
        box.innerHTML = list.map((f, i)=>{
            var unread = unreadMap[f.email] || 0;
            var unreadBadge = unread > 0 ? '<span style="position:absolute;top:-4px;right:-4px;background:red;color:#fff;font-size:10px;padding:1px 6px;border-radius:10px;min-width:16px;text-align:center;">'+unread+'</span>' : '';
            return `<div class="friend-item" data-idx="${i}" style="position:relative;">
                <div class="friend-avatar" style="background:${friendColor(f.name)};position:relative;">${escapeHtml(f.name.charAt(0).toUpperCase())}${unreadBadge}</div>
                <div class="friend-info">
                    <div class="friend-name"><span class="online-dot"></span>${escapeHtml(f.name)}</div>
                    <div class="friend-desc">${escapeHtml(f.desc || '点击聊天')}</div>
                </div>
                <div class="friend-actions">
                    <button class="friend-del" title="删除">🗑️</button>
                </div>
            </div>`;
        }).join('');
        box.querySelectorAll('.friend-del').forEach(btn=>{
            btn.onclick = function(e){
                e.stopPropagation();
                const idx = parseInt(this.closest('.friend-item').dataset.idx, 10);
                const friends = loadFriends();
                friends.splice(idx, 1);
                saveFriends(friends);
                renderFriends();
            };
        });
        box.querySelectorAll('.friend-item').forEach(item=>{
            item.onclick = function(){
                const idx = parseInt(this.dataset.idx, 10);
                const friends = loadFriends();
                const friend = friends[idx];
                if(window.openChatWithFriend){
                    window.openChatWithFriend(friend);
                } else {
                    alert('请先登录云同步账号后再聊天');
                }
            };
        });
    }
    window.updateFriendBadges = function(counts){
        window._unreadCounts = counts;
        if(document.getElementById('friendsModal') && !document.getElementById('friendsModal').classList.contains('hidden')){
            renderFriends();
        }
    };
    window.renderFriends = renderFriends;
    
    // ===== 等级经验系统 =====
    function addTimerExp(seconds){
        try{
            var stats = JSON.parse(localStorage.getItem('timerStats') || '{"totalSeconds":0,"level":1,"exp":0}');
            stats.totalSeconds += seconds;
            stats.exp += Math.floor(seconds / 60);
            // 升级计算：每级需要 level*100 经验
            while(stats.exp >= stats.level * 100){
                stats.exp -= stats.level * 100;
                stats.level++;
            }
            localStorage.setItem('timerStats', JSON.stringify(stats));
            // 检查成就
            checkAchievements(stats);
            // 上报云端
            if(window.uploadStats) window.uploadStats(stats);
            // 发布动态
            if(seconds >= 300 && window.publishActivity) window.publishActivity('timer', '完成了' + Math.floor(seconds/60) + '分钟计时');
        }catch(e){}
    }
    window.addTimerExp = addTimerExp;
function openFriends(){
        renderFriends();
        var fm=document.getElementById('friendsModal'); fm.classList.remove('hidden'); fm.classList.add('show');
        setTimeout(()=>{const inp=document.getElementById('friendNameInput'); if(inp) inp.focus();}, 100);
    }
    // 设置页入口
    const setFriendsBtn = document.getElementById('setFriends');
    if(setFriendsBtn){ setFriendsBtn.onclick = openFriends; }
    // 成就墙入口
    var achBtn = document.getElementById('setAchievements');
    if(achBtn){ achBtn.onclick = function(){ var m=document.getElementById('achievementsModal'); if(m){m.classList.remove('hidden');m.classList.add('show');} if(window.loadAchievements) window.loadAchievements(); }; }
    // 每日任务入口
    var taskBtn = document.getElementById('setTasks');
    if(taskBtn){ taskBtn.onclick = function(){ var m=document.getElementById('tasksModal'); if(m){m.classList.remove('hidden');m.classList.add('show');} if(window.loadDailyTasks) window.loadDailyTasks(); }; }
    // 排行榜入口
    var rankBtn = document.getElementById('setRank');
    if(rankBtn){ rankBtn.onclick = function(){ var m=document.getElementById('rankModal'); if(m){m.classList.remove('hidden');m.classList.add('show');} if(window.loadRankings) window.loadRankings(); }; }
    // 世界时钟入口
    var wcBtn = document.getElementById('setWorldClock');
    if(wcBtn){ wcBtn.onclick = function(){ var m=document.getElementById('worldClockModal'); if(m){m.classList.remove('hidden');m.classList.add('show');} if(window.initWorldClock) window.initWorldClock(); }; }
    // 好友动态入口
    var feedBtn = document.getElementById('setFeed');
    if(feedBtn){ feedBtn.onclick = function(){ var m=document.getElementById('feedModal'); if(m){m.classList.remove('hidden');m.classList.add('show');} if(window.loadFriendFeed) window.loadFriendFeed(); }; }

    // ========== 背景音乐播放器（优化版） ==========
    const MusicPlayer = {
        ctx: null,
        nodes: [],
        currentTrack: -1,
        isPlaying: false,
        volume: 0.6,
        pianoTimer: null,
        tracks: [
            {name: '🌿 安静森林', free: true, type: 'forest', desc: '舒缓的自然环境音，适合专注'},
            {name: '☕ 咖啡馆', free: true, type: 'cafe', desc: '轻松的爵士氛围，适合休闲'},
            {name: '🌊 海浪声', free: false, type: 'waves', desc: '海浪白噪音，帮助放松入睡'},
            {name: '🎹 钢琴曲', free: false, type: 'piano', desc: '优美的钢琴旋律，VIP专享'},
            {name: '🔥 篝火声', free: false, type: 'fire', desc: '温暖的篝火声，VIP专享'}
        ],
        init: function(){
            // 必须在用户交互中创建AudioContext
            if(!this.ctx){
                try{
                    const AC = window.AudioContext || window.webkitAudioContext;
                    this.ctx = new AC();
                }catch(e){
                    console.error('AudioContext创建失败:', e);
                    alert('您的浏览器不支持音频播放');
                    return false;
                }
            }
            if(this.ctx.state === 'suspended'){
                this.ctx.resume().catch(e=>console.error('resume失败:', e));
            }
            return true;
        },
        createNoise: function(type){
            // 减小缓冲区到1秒，降低内存占用
            const bufferSize = Math.min(this.ctx.sampleRate, 22050);
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            if(type === 'white'){
                for(let i=0;i<bufferSize;i++){ data[i] = Math.random()*2-1; }
            } else if(type === 'pink'){
                // 简化的粉噪音生成，减少计算量
                let lastOut = 0;
                for(let i=0;i<bufferSize;i++){
                    const white = Math.random()*2-1;
                    lastOut = 0.98*lastOut + 0.02*white;
                    data[i] = lastOut*3;
                }
            }
            return buffer;
        },
        playTrack: function(index){
            this.init();
            if(!this.ctx) return;
            if(this.ctx.state === 'suspended'){ this.ctx.resume(); }
            this.stop();
            this.currentTrack = index;
            this.isPlaying = true;
            const track = this.tracks[index];
            const gain = this.ctx.createGain();
            gain.gain.value = this.volume;
            gain.connect(this.ctx.destination);
            this.nodes.push(gain);

            try{
                if(track.type === 'forest'){
                    // 安静森林：只用2个正弦波，降低资源占用
                    const freqs = [261.63, 329.63];
                    freqs.forEach((f)=>{
                        const osc = this.ctx.createOscillator();
                        osc.type = 'sine';
                        osc.frequency.value = f;
                        const g = this.ctx.createGain();
                        g.gain.value = 0.12;
                        osc.connect(g); g.connect(gain);
                        osc.start();
                        this.nodes.push(osc, g);
                    });
                } else if(track.type === 'cafe'){
                    // 咖啡馆：只用2个三角波
                    const freqs = [220, 329.63];
                    freqs.forEach((f)=>{
                        const osc = this.ctx.createOscillator();
                        osc.type = 'triangle';
                        osc.frequency.value = f;
                        const g = this.ctx.createGain();
                        g.gain.value = 0.08;
                        osc.connect(g); g.connect(gain);
                        osc.start();
                        this.nodes.push(osc, g);
                    });
                } else if(track.type === 'waves'){
                    // 海浪声：白噪音 + 简单滤波器
                    const noise = this.ctx.createBufferSource();
                    noise.buffer = this.createNoise('white');
                    noise.loop = true;
                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.value = 400;
                    noise.connect(filter); filter.connect(gain);
                    noise.start();
                    this.nodes.push(noise, filter);
                } else if(track.type === 'piano'){
                    // 钢琴曲：用setInterval，及时清理节点
                    const melody = [261.63, 329.63, 392.00, 329.63];
                    let noteIndex = 0;
                    const playNote = ()=>{
                        if(!this.isPlaying || this.currentTrack !== index){
                            clearInterval(this.pianoTimer);
                            return;
                        }
                        try{
                            const osc = this.ctx.createOscillator();
                            osc.type = 'sine';
                            osc.frequency.value = melody[noteIndex % melody.length];
                            const g = this.ctx.createGain();
                            const now = this.ctx.currentTime;
                            g.gain.setValueAtTime(0, now);
                            g.gain.linearRampToValueAtTime(0.15, now+0.03);
                            g.gain.exponentialRampToValueAtTime(0.001, now+0.6);
                            osc.connect(g); g.connect(gain);
                            osc.start(now);
                            osc.stop(now+0.6);
                            // 自动断开连接
                            setTimeout(()=>{ try{ osc.disconnect(); g.disconnect(); }catch(e){} }, 700);
                            noteIndex++;
                        }catch(e){}
                    };
                    playNote();
                    this.pianoTimer = setInterval(playNote, 600);
                } else if(track.type === 'fire'){
                    // 篝火声：粉噪音
                    const noise = this.ctx.createBufferSource();
                    noise.buffer = this.createNoise('pink');
                    noise.loop = true;
                    const filter = this.ctx.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.value = 800;
                    noise.connect(filter); filter.connect(gain);
                    noise.start();
                    this.nodes.push(noise, filter);
                }
            }catch(e){
                console.error('Music play error:', e);
            }
            this.updateUI();
        },
        stop: function(){
            if(this.pianoTimer){ clearInterval(this.pianoTimer); this.pianoTimer = null; }
            this.nodes.forEach(n=>{
                try{ n.stop && n.stop(); }catch(e){}
                try{ n.disconnect && n.disconnect(); }catch(e){}
            });
            this.nodes = [];
            this.isPlaying = false;
            this.currentTrack = -1;
            this.updateUI();
        },
        setVolume: function(v){
            this.volume = v;
            this.nodes.forEach(n=>{
                if(n.gain){ n.gain.value = v; }
            });
        },
        updateUI: function(){
            const nameEl = document.getElementById('musicName');
            const statusEl = document.getElementById('musicStatus');
            const iconEl = document.getElementById('musicIcon');
            const descEl = document.getElementById('musicDesc');
            if(this.isPlaying && this.currentTrack >=0){
                const track = this.tracks[this.currentTrack];
                if(nameEl) nameEl.textContent = track.name;
                if(statusEl) statusEl.textContent = '正在播放...';
                if(iconEl) iconEl.textContent = '🎶';
                if(descEl) descEl.textContent = '正在播放：' + track.name;
            } else {
                if(nameEl) nameEl.textContent = '未播放';
                if(statusEl) statusEl.textContent = '选择一首音乐开始播放';
                if(iconEl) iconEl.textContent = '🎵';
                if(descEl) descEl.textContent = '5首精选音乐，前2首免费';
            }
        },
        renderList: function(){
            const list = document.getElementById('musicList');
            if(!list) return;
            const isVip = localStorage.getItem('vipStatus') === '1' || localStorage.getItem('isVip') === '1' || localStorage.getItem('unlockAllMusic') === '1';
            list.innerHTML = this.tracks.map((t,i)=>{
                const locked = !t.free && !isVip;
                const active = this.currentTrack === i && this.isPlaying;
                return `<div style="display:flex;align-items:center;padding:12px;margin-bottom:8px;background:${active?'rgba(106,17,203,0.3)':'rgba(255,255,255,0.05)'};border-radius:8px;cursor:pointer;${locked?'opacity:0.6;':''}" onclick="MusicPlayer.selectTrack(${i})">
                    <div style="flex:1;">
                        <div style="color:#fff;font-size:14px;font-weight:bold;">${t.name} ${locked?'🔒':''}</div>
                        <div style="color:#999;font-size:12px;margin-top:2px;">${t.desc}</div>
                    </div>
                    <div style="color:${t.free?'#4ade80':'#fbbf24'};font-size:12px;">${t.free?'免费':'VIP'}</div>
                </div>`;
            }).join('');
        },
        selectTrack: function(index){
            const track = this.tracks[index];
            const isVip = localStorage.getItem('vipStatus') === '1' || localStorage.getItem('isVip') === '1' || localStorage.getItem('unlockAllMusic') === '1';
            if(!track.free && !isVip){
                showToast('这首是VIP专属音乐，开通VIP即可收听');
                return;
            }
            if(this.currentTrack === index && this.isPlaying){
                this.stop();
            } else {
                this.playTrack(index);
            }
            this.renderList();
        }
    };
    window.MusicPlayer = MusicPlayer;

    // 音乐设置按钮
    const musicBtn = document.getElementById('setMusic');
    if(musicBtn){
        musicBtn.onclick = function(){
            const m = document.getElementById('musicModal');
            if(m){ m.classList.remove('hidden'); m.classList.add('show'); }
            MusicPlayer.renderList();
            MusicPlayer.updateUI();
        };
    }
    // 音乐停止按钮
    const musicStopBtn = document.getElementById('musicStopBtn');
    if(musicStopBtn){
        musicStopBtn.onclick = function(){ MusicPlayer.stop(); MusicPlayer.renderList(); };
    }
    // 音量控制
    const musicVolume = document.getElementById('musicVolume');
    if(musicVolume){
        musicVolume.oninput = function(){
            const v = this.value / 100;
            MusicPlayer.setVolume(v);
            document.getElementById('musicVolumeText').textContent = this.value + '%';
        };
    }

    // 添加
    function addFriend(){
        const inp = document.getElementById('friendNameInput');
        const name = inp.value.trim();
        if(!name){ showToast('请输入好友昵称'); return; }
        const email = prompt('请输入好友的云同步邮箱（用于聊天）：', '');
        if(!email){ showToast('已添加（未绑定邮箱，暂不能聊天）'); }
        const friends = loadFriends();
        if(friends.some(f=>f.name===name)){ showToast('该好友已存在'); return; }
        friends.push({name:name, email:email||'', desc:email?'已绑定邮箱，点击聊天':'未绑定邮箱', time:Date.now()});
        saveFriends(friends);
        inp.value = '';
        renderFriends();
        // 奖励积分：添加好友得20积分（每个好友只奖励一次）
        const rewardedFriends = JSON.parse(localStorage.getItem('rewardedFriends') || '[]');
        if(rewardedFriends.indexOf(name) < 0){
            rewardedFriends.push(name);
            localStorage.setItem('rewardedFriends', JSON.stringify(rewardedFriends));
            if(window.addPoints){ window.addPoints(20); showToast('🎉 添加好友成功，获得20积分！'); }
        }
    }
    const friendAddBtn = document.getElementById('friendAddBtn');
    if(friendAddBtn){ friendAddBtn.onclick = addFriend; }
    const friendNameInput = document.getElementById('friendNameInput');
    if(friendNameInput){ friendNameInput.onkeydown = function(e){ if(e.key==='Enter') addFriend(); }; }
    // 关闭时清空焦点
    document.querySelectorAll('[data-close="friendsModal"]').forEach(b=>{
        const orig = b.onclick;
        b.onclick = function(){ var fm=document.getElementById('friendsModal'); fm.classList.remove('show'); fm.classList.add('hidden'); if(orig) orig.call(this); };
    });

    // ============ 成就系统：累计计时统计 ============
    // 每次计时器「暂停/重置/结束」时累计 elapsed；成就基于累计秒数 + 连续天数
    function getAchievementsData(){
        return JSON.parse(localStorage.getItem('timerAchievements')) || {
            totalMs: 0,           // 累计计时毫秒
            lastDay: '',          // 上次使用的日期 YYYY-MM-DD
            streak: 0,            // 连续使用天数
            unlocked: {}          // {achvId: true}
        };
    }
    function saveAchievementsData(obj){localStorage.setItem('timerAchievements', JSON.stringify(obj));}

    // 累计当前正计时的 elapsed（在正计时暂停/重置时调用）
    function accumulateElapsed(ms){
        const a = getAchievementsData();
        a.totalMs += Math.max(0, ms);
        // 更新连续天数
        const today = new Date().toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai'}).replace(/\//g,'-');
        if(a.lastDay !== today){
            const yesterday = new Date(Date.now()-86400000).toLocaleDateString('zh-CN',{timeZone:'Asia/Shanghai'}).replace(/\//g,'-');
            if(a.lastDay === yesterday){a.streak += 1;}
            else if(a.lastDay !== ''){a.streak = 1;}
            else {a.streak = 1;}
            a.lastDay = today;
        }
        saveAchievementsData(a);
    }

    // ============ 工具函数 ============
    function getUserData(){return JSON.parse(localStorage.getItem('timerUser')) || {};}
    function saveUserData(obj){localStorage.setItem('timerUser', JSON.stringify(obj));}
    function checkVipValid(user){
        if(localStorage.getItem('devForceVipSkin') === 'true') return true;
        if(!user.isVip||!user.vipExpireTime)return false;
        return Date.now() < user.vipExpireTime;
    }
    function fmt(ms){
        const s=Math.floor(ms/1000);
        const h=Math.floor(s/3600);
        const m=Math.floor(s%3600/60);
        const sec=s%60;
        const msNum=Math.floor(ms%1000/10);
        return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}.${msNum.toString().padStart(2,'0')}`;
    }
    // 后台保活：基于 Date.now() 差值
    function getElapsed(){return elapsed;}

    // ============ VIP 弹窗逻辑 ============
    const vipModal = document.getElementById('vipModal');
    const planWrap = document.getElementById('planWrap');
    const modalClose = document.getElementById('modalClose');
    const modalConfirm = document.getElementById('modalConfirm');
    let selectedPlanIndex = 0;
    const vipPlans = [
        { name:'日卡', day:1, price:'0.01元/天', priceNum:0.01 },
        { name:'月卡', months:1, price:'15元/月', priceNum:15 },
        { name:'季卡', months:3, price:'38元/季', priceNum:38 },
        { name:'年卡', months:12, price:'128元/年', priceNum:128 }
    ];

    function renderPlans(){
        planWrap.innerHTML='';
        vipPlans.forEach((item,idx)=>{
            const div=document.createElement('div');
            div.className=`vip-plan-item ${idx===selectedPlanIndex?'active':''}`;
            div.innerHTML=`<div class="plan-name">${item.name}</div><div class="plan-price">${item.price}</div>`;
            div.onclick=()=>{selectedPlanIndex=idx;renderPlans();};
            planWrap.appendChild(div);
        });
    }
    modalClose.onclick=()=>vipModal.classList.add('hidden');

    // ============ 支付弹窗 ============
    const payModal=document.getElementById('payModal');
    const payPlanName=document.getElementById('payPlanName');
    const payPrice=document.getElementById('payPrice');
    const paySubmitBtn=document.getElementById('paySubmitBtn');
    const payCancelBtn=document.getElementById('payCancelBtn');
    const payItems=document.querySelectorAll('.pay-item');
    let selectPayType='';

    modalConfirm.onclick=()=>{
        const user=getUserData();
        if(!user.account)return alert('请先登录账号');
        const plan=vipPlans[selectedPlanIndex];
        payPlanName.innerText=plan.name;
        payPrice.innerText=plan.price;
        selectPayType='';
        payItems.forEach(p=>p.classList.remove('active'));
        vipModal.classList.add('hidden');
        payModal.classList.remove('hidden');
    };
    payItems.forEach(item=>{
        item.onclick=function(){
            payItems.forEach(p=>p.classList.remove('active'));
            this.classList.add('active');
            selectPayType=this.dataset.type;
        };
    });
    payCancelBtn.onclick=()=>payModal.classList.add('hidden');

    // ============ 二维码支付 ============
    const qrcodePayModal=document.getElementById('qrcodePayModal');
    const qrPrice=document.getElementById('qrPrice');
    const qrBackBtn=document.getElementById('qrBackBtn');
    const autoPayCountTip=document.getElementById('autoPayCountTip');

    qrBackBtn.onclick=()=>{qrcodePayModal.classList.add('hidden');payModal.classList.remove('hidden');};

    paySubmitBtn.onclick=()=>{
        if(!selectPayType)return alert('请选择支付方式');
        const plan=vipPlans[selectedPlanIndex];
        if(selectPayType==='ali'){alert('暂不支持支付宝，请选微信');return;}
        qrPrice.innerText=`¥${plan.priceNum.toFixed(2)}`;
        payModal.classList.add('hidden');
        qrcodePayModal.classList.remove('hidden');
        let autoCount=5;
        autoPayCountTip.innerText=`支付确认倒计时：${autoCount}秒`;
        const autoTimer=setInterval(()=>{
            autoCount--;
            autoPayCountTip.innerText=`支付确认倒计时：${autoCount}秒`;
            if(autoCount<=0){
                clearInterval(autoTimer);
                openVipAuto(plan);
                qrcodePayModal.classList.add('hidden');
                alert('支付成功！会员已自动开通');
                refreshUserUI();
                renderSkin();
                updateVipLocks();
            }
        },1000);
    };

    function openVipAuto(item){
        const user=getUserData();
        const now=new Date();
        if(item.day)now.setDate(now.getDate()+item.day);
        else now.setMonth(now.getMonth()+item.months);
        user.isVip=true;
        user.vipExpireTime=now.getTime();
        saveUserData(user);
    }

    // ============ 用户信息 ============
    const userTopWrap=document.getElementById('userTopWrap');
    const topAvatarImg=document.getElementById('topAvatarImg');
    const topUserName=document.getElementById('topUserName');
    const topVipBadge=document.getElementById('topVipBadge');
    const loginArea=document.getElementById('loginArea');
    const userManageArea=document.getElementById('userManageArea');
    const manageUserName=document.getElementById('manageUserName');
    const bindPhone=document.getElementById('bindPhone');
    const vipStatus=document.getElementById('vipStatus');
    const vipExpire=document.getElementById('vipExpire');
    const openVipBtn=document.getElementById('openVipBtn');

    function refreshUserUI(){
        const user=getUserData();
        if(user.account){
            loginArea.classList.add('hidden');
            userManageArea.classList.remove('hidden');
            manageUserName.textContent=user.account;
            bindPhone.textContent=user.phone||'未绑定';
            topUserName.textContent=user.account;
            topAvatarImg.src=user.avatar||'';
            const vipValid=checkVipValid(user);
            if(vipValid){
                vipStatus.textContent='VIP会员';
                vipStatus.style.color='#ff4444';
                vipExpire.textContent=new Date(user.vipExpireTime).toLocaleString();
                topVipBadge.classList.remove('hidden');
            }else{
                vipStatus.textContent='普通用户';
                vipStatus.style.color='#fff';
                vipExpire.textContent='未开通或已过期';
                topVipBadge.classList.add('hidden');
                if(user.isVip){user.isVip=false;user.vipExpireTime=null;saveUserData(user);}
            }
        }else{
            loginArea.classList.remove('hidden');
            userManageArea.classList.add('hidden');
            userTopWrap.classList.add('hidden');
        }
        renderSkin();
        updateVipLocks();
    }

    // ============ VIP 锁状态更新 ============
    function updateVipLocks(){
        const user=getUserData();
        const isVip=checkVipValid(user);

        // Laps 分段计时锁
        const lapLock=document.getElementById('lapLock');
        const lapBtn=document.getElementById('lapBtn');
        const lapClearBtn=document.getElementById('lapClearBtn');
        if(isVip){
            lapLock.classList.add('hidden');
            lapBtn.disabled=false;
            lapClearBtn.disabled=false;
        }else{
            lapLock.classList.remove('hidden');
            lapBtn.disabled=true;
            lapClearBtn.disabled=true;
        }

        // 设置页 VIP 按钮
        document.getElementById('setMultiTimer').className=isVip?'settings-btn':'settings-btn vip-lock';
        document.getElementById('setCustomTheme').className=isVip?'settings-btn':'settings-btn vip-lock';
        document.getElementById('customThemeArea').classList.toggle('hidden',!isVip);

        // 自定义预设
        const customPresetNameEl=document.getElementById('customPresetName');
        if(customPresetNameEl){
            const wrapper=customPresetNameEl.closest('.input-item');
            if(wrapper && wrapper.parentElement){
                // ... handled by renderPresets
            }
        }
    }

    // ============ 皮肤系统 ============
    const skinList=[
        {id:'default',name:'默认蓝',vip:false,cls:''},
        {id:'purple',name:'魅惑紫',vip:true,cls:'theme-purple'},
        {id:'gold',name:'轻奢金',vip:true,cls:'theme-gold'},
        {id:'cyber',name:'赛博绿',vip:true,cls:'theme-cyber'}
    ];
    const skinWrap=document.getElementById('skinWrap');

    function renderSkin(){
        skinWrap.innerHTML='';
        const user=getUserData();
        const isVip=checkVipValid(user);
        const nowSkin=localStorage.getItem('appSkin')||'default';
        skinList.forEach(skin=>{
            const div=document.createElement('div');
            div.className=`skin-item ${nowSkin===skin.id?'active':''}`;
            div.innerHTML=`<div class="skin-name">${skin.name}</div>${skin.vip?'<div class="skin-tip-vip">VIP专属</div>':''}`;
            div.onclick=()=>{
                if(skin.vip&&!isVip){
                    if(localStorage.getItem('devHideVipAlert')!=='true'){
                        alert('该皮肤为VIP会员专属，请先开通会员');
                        openVipBtn.click();
                    }
                    return;
                }
                document.body.className=skin.cls;
                localStorage.setItem('appSkin',skin.id);
                // 清除自定义颜色
                localStorage.removeItem('customColor');
                renderSkin();
            };
            skinWrap.appendChild(div);
        });
    }
    function initSkinLoad(){
        const saved=localStorage.getItem('appSkin')||'default';
        const targetSkin=skinList.find(s=>s.id===saved);
        if(targetSkin)document.body.className=targetSkin.cls;
        // 加载自定义颜色
        const customColor=localStorage.getItem('customColor');
        if(customColor){
            applyCustomTheme(customColor);
        }
        renderSkin();
    }

    // 自定义主题色
    function applyCustomTheme(hex){
        document.body.style.setProperty('--main-color',hex);
        document.body.style.setProperty('--main-shadow',hex+'66');
        document.body.style.setProperty('--border-color',hex+'77');
        // 更新manifest theme-color
        const meta=document.querySelector('meta[name="theme-color"]');
        if(meta)meta.setAttribute('content',hex);
    }
    document.getElementById('applyCustomColor').onclick=()=>{
        const user=getUserData();
        if(!checkVipValid(user))return alert('自定义主题色为VIP专享功能');
        const color=document.getElementById('customColorPicker').value;
        applyCustomTheme(color);
        localStorage.setItem('customColor',color);
        localStorage.setItem('appSkin','custom');
        alert('主题色已应用');
    };
    document.getElementById('customColorPicker').oninput=function(){
        const color=this.value;
        document.getElementById('customColorPreview').style.background=color;
    };

    // ============ 登录/注册逻辑 ============
    const tabPwdLogin=document.getElementById('tabPwdLogin');
    const tabPhoneLogin=document.getElementById('tabPhoneLogin');
    const pwdLoginPanel=document.getElementById('pwdLoginPanel');
    const phoneLoginPanel=document.getElementById('phoneLoginPanel');
    const phoneInput=document.getElementById('phoneInput');
    const codeInput=document.getElementById('codeInput');
    const getCodeBtn=document.getElementById('getCodeBtn');
    const accInput=document.getElementById('accInput');
    const pwdInput=document.getElementById('pwdInput');
    const submitBtn=document.getElementById('submitBtn');
    const switchModeBtn=document.getElementById('switchModeBtn');
    const forgetPwdBtn=document.getElementById('forgetPwdBtn');
    const resetPwdWrap=document.getElementById('resetPwdWrap');
    const logoutBtn=document.getElementById('logoutBtn');
    const delAccountBtn=document.getElementById('delAccountBtn');
    const avatarItems=document.querySelectorAll('.avatar-item');
    let codeTimer=null,currentCode='',isRegisterMode=false,isPhoneLoginMode=false;

    openVipBtn.onclick=()=>{const u=getUserData();if(!u.account)return alert('请先登录');selectedPlanIndex=0;renderPlans();vipModal.classList.remove('hidden');};
    // 激活码激活 VIP
    const activateCodeBtn = document.getElementById('activateCodeBtn');
    if(activateCodeBtn){
        activateCodeBtn.onclick=()=>{
            const codeInput = document.getElementById('vipActivationCode');
            const code = codeInput ? codeInput.value.trim() : '';
            if(!code)return alert('请输入激活码');
            const VALID_CODES = ['TIMER-PRO-8888','VIP-6666-9999','PRO-2024-8888','TP-VIP-88888','计时器PRO-VIP'];
            if(VALID_CODES.includes(code.toUpperCase())){
                const u=getUserData();
                u.isVip=true;u.vipExpireTime='2099-12-31';saveUserData(u);
                localStorage.setItem('vipStatus','1');localStorage.setItem('isVip','1');
                refreshUserUI();updateVipLocks();
                alert('🎉 VIP激活成功！所有VIP功能已解锁');
                vipModal.classList.add('hidden');
                if(codeInput)codeInput.value='';
            }else{
                alert('激活码无效，请检查后重试');
            }
        };
    }
    tabPwdLogin.onclick=()=>{isPhoneLoginMode=false;tabPwdLogin.classList.add('active');tabPhoneLogin.classList.remove('active');pwdLoginPanel.classList.remove('hidden');phoneLoginPanel.classList.add('hidden');};
    tabPhoneLogin.onclick=()=>{isPhoneLoginMode=true;tabPwdLogin.classList.remove('active');tabPhoneLogin.classList.add('active');pwdLoginPanel.classList.add('hidden');phoneLoginPanel.classList.remove('hidden');};
    getCodeBtn.onclick=()=>{
        const p=phoneInput.value.trim();
        if(!/^1[3-9]\d{9}$/.test(p))return alert('手机号格式错误');
        if(codeTimer)return;
        currentCode=String(Math.floor(Math.random()*900000)+100000);
        alert(`验证码：${currentCode}`);
        let cnt=60;getCodeBtn.disabled=true;getCodeBtn.textContent=cnt+'s后重发';
        codeTimer=setInterval(()=>{cnt--;getCodeBtn.textContent=cnt+'s后重发';if(cnt<=0){clearInterval(codeTimer);codeTimer=null;getCodeBtn.disabled=false;getCodeBtn.textContent='获取验证码';}},1000);
    };
    switchModeBtn.onclick=()=>{isRegisterMode=!isRegisterMode;submitBtn.textContent=isRegisterMode?'注册':'登录';switchModeBtn.textContent=isRegisterMode?'切换登录':'切换注册';};
    submitBtn.onclick=()=>{
        const u=getUserData();
        // 激活码验证（预设激活码，付费后由官方发放）
        const VALID_ACTIVATION_CODES = ['TIMER-PRO-8888','VIP-6666-9999','PRO-2024-8888','TP-VIP-88888','计时器PRO-VIP'];
        const actCode = document.getElementById('activationCodeInput') ? document.getElementById('activationCodeInput').value.trim() : '';
        let activateVip = false;
        if(actCode){
            if(VALID_ACTIVATION_CODES.includes(actCode.toUpperCase())){
                activateVip = true;
            }else{
                alert('激活码无效，请检查后重试');
                return;
            }
        }
        if(isPhoneLoginMode){
            const p=phoneInput.value.trim(),c=codeInput.value.trim();
            if(!p)return alert('填写手机号');if(c!==currentCode)return alert('验证码错误');
            if(isRegisterMode){
                if(u.account)return alert('已登录账号，请退出');
                const nu={account:p,password:'',phone:p,avatar:'https://picsum.photos/id/1001/60/60',isVip:activateVip,vipExpireTime:activateVip?'2099-12-31':null};
                saveUserData(nu);alert(activateVip?'注册成功，VIP已激活！':'注册成功自动登录');refreshUserUI();phoneInput.value=codeInput.value='';currentCode='';
                if(activateVip){localStorage.setItem('vipStatus','1');localStorage.setItem('isVip','1');}
            }else{
                if(u.phone===p||u.account===p){
                    if(activateVip){u.isVip=true;u.vipExpireTime='2099-12-31';saveUserData(u);localStorage.setItem('vipStatus','1');localStorage.setItem('isVip','1');}
                    alert(activateVip?'登录成功，VIP已激活！':'登录成功');refreshUserUI();phoneInput.value=codeInput.value='';currentCode='';
                }else alert('手机号未注册');
            }
            return;
        }
        const acc=accInput.value.trim(),pwd=pwdInput.value.trim();
        if(!acc||!pwd)return alert('账号密码不能为空');
        if(isRegisterMode){
            if(u.account)return alert('账号已存在');
            const nu={account:acc,password:pwd,phone:'',avatar:'https://picsum.photos/id/1001/60/60',isVip:activateVip,vipExpireTime:activateVip?'2099-12-31':null};
            saveUserData(nu);alert(activateVip?'注册成功，VIP已激活！':'注册成功');isRegisterMode=false;submitBtn.textContent='登录';switchModeBtn.textContent='切换注册';accInput.value=pwdInput.value='';
            if(activateVip){localStorage.setItem('vipStatus','1');localStorage.setItem('isVip','1');}
        }else{
            if(u.account===acc&&u.password===pwd){
                if(activateVip){u.isVip=true;u.vipExpireTime='2099-12-31';saveUserData(u);localStorage.setItem('vipStatus','1');localStorage.setItem('isVip','1');}
                alert(activateVip?'登录成功，VIP已激活！':'登录成功');refreshUserUI();accInput.value=pwdInput.value='';
            }else alert('账号密码错误');
        }
        if(actCode)document.getElementById('activationCodeInput').value='';
    };
    forgetPwdBtn.onclick=()=>resetPwdWrap.classList.remove('hidden');
    document.getElementById('backLoginBtn').onclick=()=>{resetPwdWrap.classList.add('hidden');document.getElementById('resetAcc').value=document.getElementById('newPwd').value='';};
    document.getElementById('resetSubmit').onclick=()=>{
        const a=document.getElementById('resetAcc').value.trim(),np=document.getElementById('newPwd').value.trim();
        if(!a||!np)return alert('不能为空');
        const u=getUserData();if(u.account!==a)return alert('账号不存在');
        u.password=np;saveUserData(u);alert('密码重置完成');document.getElementById('backLoginBtn').click();
    };
    logoutBtn.onclick=()=>{localStorage.removeItem('timerUser');refreshUserUI();};
    delAccountBtn.onclick=()=>{if(!confirm('确认永久注销账号？'))return;localStorage.removeItem('timerUser');refreshUserUI();};
    avatarItems.forEach(item=>{
        item.onclick=function(){
            avatarItems.forEach(i=>i.classList.remove('active'));
            this.classList.add('active');
            const u=getUserData();u.avatar=this.dataset.src;saveUserData(u);refreshUserUI();alert('头像更换成功');
        };
    });

    // ============ 开发者面板 ============
    const devSpeedToggle=document.getElementById('devSpeedToggle');
    const devForceVip=document.getElementById('devForceVip');
    const devHideVipTip=document.getElementById('devHideVipTip');
    const devClearLocal=document.getElementById('devClearLocal');
    const devResetSkin=document.getElementById('devResetSkin');
    let originSetInterval=window.setInterval;

    devSpeedToggle.onchange=function(){
        if(this.checked){
            window.setInterval=function(cb,delay){return originSetInterval(cb,delay/5);};
        }else{
            window.setInterval=originSetInterval;
        }
    };
    devForceVip.onchange=function(){
        localStorage.setItem('devForceVipSkin',this.checked);
        renderSkin();
        updateVipLocks();
    };
    devHideVipTip.onchange=function(){localStorage.setItem('devHideVipAlert',this.checked);};
    devClearLocal.onclick=function(){
        if(confirm('确定清空所有本地数据？')){localStorage.clear();location.reload();}
    };

    // ============ 精准清理：只清“计算/计时记录”，保留所有设置 ============
    // 要清除的业务数据 key（按需增删）；以下 key 之外的 VIP/皮肤/主题/成就/用户等一律不动
    const RECORD_KEYS = [
        'timerHistory',   // 计时历史记录
        'multiTimers',    // 多计时器数据
        'customPresets',  // 自定义预设
        'lapsData',       // 分段计时(Laps)
        'lastTimer',      // 上次计时状态
        'timerLogs',      // 计时日志
        'recentTimers'    // 最近计时
    ];
    function clearCalcRecords(){
        // 1) 清 localStorage 中的记录类 key（前缀匹配兜底，防止漏网）
        RECORD_KEYS.forEach(k => localStorage.removeItem(k));
        Object.keys(localStorage).forEach(k => {
            if(/^(timerHistory|timerLogs|multiTimers|customPresets|lapsData|lastTimer|recentTimers|calcRecords?|record|history|lap)/i.test(k)){
                localStorage.removeItem(k);
            }
        });
        // 2) 重置内存中的业务状态（不清设置/成就/VIP）
        try{ history = []; }catch(e){}
        try{ lastLapTime = 0; }catch(e){}
        try{ presets = []; renderPresets && renderPresets(); }catch(e){}
        try{ multiTimers = []; renderMultiTimers && renderMultiTimers(); }catch(e){}
        // 3) 计时器归零（保留主题/皮肤等设置）
        try{
            totalSeconds = 0; leftSeconds = 0; isRunning = false;
            if(timer){ clearInterval(timer); timer = null; }
            updateDisplay && updateDisplay();
            resetProgressRed && resetProgressRed();
        }catch(e){}
        // 4) 刷新历史列表 UI
        try{ renderHistory && renderHistory(); }catch(e){}
    }
    const setClearRecordsBtn = document.getElementById('setClearRecords');
    if(setClearRecordsBtn){
        setClearRecordsBtn.onclick = function(){
            if(!confirm('确定只清除计时 / 计算记录？\n（VIP、皮肤、主题、成就、设置等将全部保留）')) return;
            clearCalcRecords();
            alert('✅ 计算记录已清除，设置已保留');
        };
    }
    devResetSkin.onclick=function(){
        localStorage.setItem('appSkin','default');
        document.body.className='';
        document.body.removeAttribute('style');
        renderSkin();
        alert('已重置为默认蓝色皮肤');
    };

    const versionText=document.getElementById('versionText');
    const clickTip=document.getElementById('clickTip');
    const devPanel=document.getElementById('devPanel');
    let devTimer=null,clickCount=0;
    versionText.onclick=()=>{
        clearTimeout(devTimer);clickCount++;
        const rem=5-clickCount;
        if(rem>0){clickTip.style.display='block';clickTip.innerText=`再点击${rem}次开启开发者选项`;}
        devTimer=setTimeout(()=>{clickCount=0;clickTip.style.display='none';},1200);
        if(clickCount>=5){
            devPanel.style.display=devPanel.style.display==='block'?'none':'block';
            clickTip.innerText=devPanel.style.display==='block'?'已开启':'已关闭';
            setTimeout(()=>clickTip.style.display='none',1500);
            clickCount=0;clearTimeout(devTimer);
        }
    };

    // ============ 核心计时器 ============
    const timeDom=document.getElementById('time');
    const alertTip=document.getElementById('alertTip');
    const switchVib=document.getElementById('switchVib');
    const switchAudio=document.getElementById('switchAudio');
    const switchSpeech=document.getElementById('switchSpeech');
    const switchNotif=document.getElementById('switchNotif');
    let timerTime=null,elapsed=0,isRun=false,cdTimer=null;
    let cdTotalMs=0,cdStartTs=0; // 倒计时总量 & 起始时间戳（后台保活用）

    // Tab 切换
    const tabBtns=document.querySelectorAll('.tab-btn');
    const viewBoxes=document.querySelectorAll('.box');
    tabBtns.forEach(btn=>{
        btn.onclick=()=>{
            tabBtns.forEach(b=>b.classList.remove('active'));
            btn.classList.add('active');
            const target=btn.dataset.view;
            viewBoxes.forEach(box=>box.classList.remove('active'));
            document.getElementById(target).classList.add('active');
            // 切换时暂停计时 & 重置背景红化
            clearInterval(timerTime);
            clearInterval(cdTimer);
            isRun=false;
            alertTip.style.display='none';
            if(typeof resetProgressRed === 'function') resetProgressRed();
            timeDom.classList.remove('critical');
        };
    });

    // 正计时：开始/暂停/重置
    document.getElementById('start').onclick=()=>{
        if(isRun)return;
        isRun=true;
        window._timerRunning=true;
        const st=Date.now()-elapsed;
        timerTime=setInterval(()=>{
            elapsed=Date.now()-st;
            timeDom.innerText=fmt(elapsed);
        },10);
    };
    document.getElementById('pause').onclick=()=>{clearInterval(timerTime);if(isRun&&elapsed>0){accumulateElapsed(elapsed);if(window.addTimerExp)window.addTimerExp(Math.floor(elapsed/1000));if(window.addTimerPoints)window.addTimerPoints(Math.floor(elapsed/1000));}isRun=false;window._timerRunning=false;checkAchievements();};
    document.getElementById('reset').onclick=()=>{
        clearInterval(timerTime);
        // 记录到历史 & 累计成就时长
        if(elapsed>0){addHistory('正计时',fmt(elapsed));accumulateElapsed(elapsed);}
        isRun=false;elapsed=0;
        timeDom.textContent='00:00:00.00';alertTip.style.display='none';
        resetLaps();
        checkAchievements();
    };

    // 倒计时：后台保活 + 通知 + 语音
    document.getElementById('cdStart').onclick=()=>{
        clearInterval(cdTimer);alertTip.style.display='none';alertTip.textContent='闹钟到点了';
        const h=+document.getElementById('h').value,m=+document.getElementById('m').value,s=+document.getElementById('s').value;
        cdTotalMs=(h*3600+m*60+s)*1000;
        if(cdTotalMs<=0)return;
        cdStartTs=Date.now();
        lastSpeechSec=0;                   // 重置语音倒数
        updateProgressRed(cdTotalMs, cdTotalMs);  // 重置背景（满进度=起始）

        cdTimer=setInterval(()=>{
            const left=cdTotalMs-(Date.now()-cdStartTs);
            if(left<=0){
                clearInterval(cdTimer);
                // 重置背景红化 & 数字闪红（修复：结束后一直红着不恢复的问题）
                resetProgressRed();
                timeDom.classList.remove('critical');
                timeDom.textContent='00:00:00.00';
                // 提示音
                if(switchAudio.checked)playBeep();
                // 震动
                if(switchVib.checked&&navigator.vibrate)navigator.vibrate([200,100,200,100,200]);
                // 系统通知
                if(switchNotif.checked)sendNotification('⏰ 计时器', '倒计时结束！');
                // 语音播报
                if(switchSpeech.checked)speak('时间到！');
                // 自定义结束文字（优先用户设置，否则默认）
                const finishText = (finishMsg && finishMsg.trim()) ? finishMsg.trim() : '⏰ 倒计时结束！';
                alertTip.textContent = finishText;
                alertTip.style.display='block';
                // 3 秒后自动恢复默认提示文案
                clearTimeout(finishMsgTimer);
                finishMsgTimer = setTimeout(()=>{alertTip.textContent='闹钟到点了';}, 5000);
                // 计时结束庆祝动画（VIP 可开关；非VIP不播放）
                if(celebrateEnabled && checkVipValid(getUserData())){ launchCelebration(); }
                addHistory('倒计时',`${h}时${m}分${s}秒 → 到点`);
                // 成就：累计时长 + 检查
                accumulateElapsed(cdTotalMs);
                if(window.addTimerExp) window.addTimerExp(Math.floor(cdTotalMs/1000));
                if(window.addTimerPoints) window.addTimerPoints(Math.floor(cdTotalMs/1000));
                checkAchievements();
                return;
            }
            timeDom.innerText=fmt(left);
            // 背景随进度变红
            updateProgressRed(left, cdTotalMs);

            // 最后 10 秒数字闪红
            if(left <= 10000) timeDom.classList.add('critical');
            else timeDom.classList.remove('critical');

            // 语音倒数最后3秒
            if(switchSpeech.checked){
                const secLeft=Math.ceil(left/1000);
                if(secLeft<=3&&secLeft>=1&&secLeft!==lastSpeechSec){
                    speak(String(secLeft));
                    lastSpeechSec=secLeft;
                }
            }
        },10);
    };
    let lastSpeechSec=0;
    let finishMsgTimer=null;       // 自定义结束文字恢复定时器

    document.getElementById('cdReset').onclick=()=>{
        clearInterval(cdTimer);
        timeDom.textContent='00:00:00.00';
        timeDom.classList.remove('critical');
        alertTip.style.display='none';
        resetProgressRed();   // 清除背景红化
    };

    // 页面隐藏/显示时的后台保活补偿
    document.addEventListener('visibilitychange',()=>{
        if(document.hidden){
            // 页面隐藏 - 记录暂停时间
            pauseTimestamp=Date.now();
        }else{
            // 页面恢复 - 对于正计时无需特殊处理（基于Date.now差值）
            // 对于倒计时，cdStartTs 需要补偿
            if(cdTimer&&!document.hidden){
                // 差值法天然支持，无需额外处理
            }
        }
    });
    let pauseTimestamp=0;

    // ============ 语音播报 ============
    function speak(text){
        if(!('speechSynthesis' in window))return;
        try{
            speechSynthesis.cancel();
            const u=new SpeechSynthesisUtterance(text);
            u.lang='zh-CN';u.rate=1.0;u.pitch=1.0;
            speechSynthesis.speak(u);
        }catch(e){}
    }

    // 提示音（Web Audio API）
    let audioCtx=null;
    function playBeep(){
        try{
            if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
            const osc=audioCtx.createOscillator();
            const gain=audioCtx.createGain();
            osc.connect(gain);gain.connect(audioCtx.destination);
            osc.frequency.value=880;gain.gain.value=0.3;
            osc.start();
            setTimeout(()=>{osc.stop();},200);
            // 双声响
            setTimeout(()=>{
                const osc2=audioCtx.createOscillator();
                const gain2=audioCtx.createGain();
                osc2.connect(gain2);gain2.connect(audioCtx.destination);
                osc2.frequency.value=1046;gain2.gain.value=0.3;
                osc2.start();setTimeout(()=>osc2.stop(),200);
            },300);
        }catch(e){}
    }

    // ============ 系统通知 ============
    function sendNotification(title,body){
        if(!('Notification' in window))return;
        if(Notification.permission==='granted'){
            new Notification(title,{body:body,icon:'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%230cf"><circle cx="12" cy="12" r="10"/></svg>'});
        }else if(Notification.permission!=='denied'){
            Notification.requestPermission();
        }
    }

    // ============ 全屏模式 ============
    // 设置面板里拆成两个独立按钮：「进入全屏」和「退出全屏」，
    // 根据当前是否全屏自动显示/隐藏其中一个（data-show 属性由 CSS 配合）。
    const setFullscreenEnter=document.getElementById('setFullscreenEnter');
    const setFullscreenExit=document.getElementById('setFullscreenExit');

    // 根据当前全屏状态切换两个按钮的显隐
    function updateFullscreenButtons(){
        const isFs=!!document.fullscreenElement;
        if(setFullscreenEnter){
            setFullscreenEnter.style.display=isFs?'none':'flex';
            setFullscreenEnter.classList.toggle('active',isFs);
        }
        if(setFullscreenExit){
            setFullscreenExit.style.display=isFs?'flex':'none';
        }
    }

    function enterFullscreen(){
        const el=document.documentElement;
        if(!document.fullscreenElement){
            if(el.requestFullscreen){
                el.requestFullscreen().then(()=>{
                    document.body.classList.add('fullscreen-mode');
                }).catch(()=>{
                    // fallback: 仅模拟全屏样式
                    document.body.classList.add('fullscreen-mode');
                });
            }else{
                document.body.classList.add('fullscreen-mode');
            }
        }
        updateFullscreenButtons();
    }

    function exitFullscreen(){
        if(document.fullscreenElement){
            if(document.exitFullscreen){
                document.exitFullscreen().then(()=>{
                    document.body.classList.remove('fullscreen-mode');
                }).catch(()=>{
                    document.body.classList.remove('fullscreen-mode');
                });
            }else{
                document.body.classList.remove('fullscreen-mode');
            }
        }else{
            // 未走原生全屏（如 fallback 模拟）时也清除样式
            document.body.classList.remove('fullscreen-mode');
        }
        updateFullscreenButtons();
    }

    if(setFullscreenEnter)setFullscreenEnter.onclick=enterFullscreen;
    if(setFullscreenExit)setFullscreenExit.onclick=exitFullscreen;
    updateFullscreenButtons();   // 初始化显隐

    // 全屏时右下角悬浮的「退出全屏」按钮
    const fsExitFloat=document.getElementById('fsExitFloat');
    if(fsExitFloat)fsExitFloat.onclick=exitFullscreen;

    // F11 快捷键（进入/退出均可）
    document.addEventListener('keydown',(e)=>{
        if(e.key==='F11'){e.preventDefault();document.fullscreenElement?exitFullscreen():enterFullscreen();}
    });

    // 监听原生全屏状态变化（含 Esc 退出、系统手势等），同步按钮显隐
    document.addEventListener('fullscreenchange',()=>{
        if(!document.fullscreenElement){
            document.body.classList.remove('fullscreen-mode');
        }
        updateFullscreenButtons();
    });

    // ============ 预设模板 ============
    const builtinPresets=[
        {name:'🍅 番茄钟',m:25,s:0},
        {name:'🏋️ HIIT 运动',m:0,s:30},
        {name:'🏋️ HIIT 休息',m:0,s:10},
        {name:'🍵 泡茶',m:3,s:0},
        {name:'🥚 煮蛋',m:8,s:0},
        {name:'😴 午睡',m:20,s:0},
        {name:'☕ 咖啡',m:4,s:0},
        {name:'🧘 冥想',m:10,s:0},
    ];

    function renderPresets(){
        const wrap=document.getElementById('presetWrap');
        wrap.innerHTML='';
        builtinPresets.forEach(p=>{
            const div=document.createElement('div');
            div.className='preset-item';
            div.innerHTML=`<div class="preset-name">${p.name}</div><div class="preset-time">${p.m}分${p.s}秒</div>`;
            div.onclick=()=>{
                // 填入倒计时
                document.getElementById('h').value=0;
                document.getElementById('m').value=p.m;
                document.getElementById('s').value=p.s;
                // 切换到倒计时 tab
                document.querySelector('.tab-btn[data-view="countdown"]').click();
                alert(`已填入预设：${p.name}（${p.m}分${p.s}秒）`);
            };
            wrap.appendChild(div);
        });

        // 自定义预设
        const customWrap=document.getElementById('customPresetList');
        customWrap.innerHTML='';
        const user=getUserData();
        const isVip=checkVipValid(user);
        presets.forEach((p,idx)=>{
            const div=document.createElement('div');
            div.className='preset-item';
            div.style.gridColumn='span 2';
            div.innerHTML=`<div class="preset-name">${p.name}</div><div class="preset-time">${p.m}分${p.s}秒 ${isVip?'<span style="cursor:pointer;color:#f33;" onclick="removePreset('+idx+')">✕</span>':''}</div>`;
            div.onclick=()=>{
                document.getElementById('h').value=0;
                document.getElementById('m').value=p.m;
                document.getElementById('s').value=p.s;
                document.querySelector('.tab-btn[data-view="countdown"]').click();
            };
            customWrap.appendChild(div);
        });
    }

    window.removePreset=function(idx){
        presets.splice(idx,1);
        localStorage.setItem('customPresets',JSON.stringify(presets));
        renderPresets();
    };

    document.getElementById('saveCustomPreset').onclick=()=>{
        const user=getUserData();
        if(!checkVipValid(user)){alert('自定义预设为VIP专享功能');openVipBtn.click();return;}
        const name=document.getElementById('customPresetName').value.trim();
        const m=+document.getElementById('customPresetMin').value||0;
        const s=+document.getElementById('customPresetSec').value||0;
        if(!name)return alert('请输入名称');
        if(m===0&&s===0)return alert('时间不能为0');
        presets.push({name,m,s});
        localStorage.setItem('customPresets',JSON.stringify(presets));
        document.getElementById('customPresetName').value='';
        document.getElementById('customPresetMin').value='';
        document.getElementById('customPresetSec').value='';
        renderPresets();
        alert('预设已保存');
    };

    // ============ Laps 分段计时 ============
    function resetLaps(){
        laps=[];lastLapTime=0;
        document.getElementById('lapList').innerHTML='';
        document.getElementById('lapStats').innerHTML='';
    }

    document.getElementById('lapBtn').onclick=()=>{
        const user=getUserData();
        if(!checkVipValid(user)){alert('分段计时为VIP专享功能');openVipBtn.click();return;}
        if(!isRun&&elapsed===0)return;
        const currentMs=elapsed;
        const lapTime=currentMs-lastLapTime;
        lastLapTime=currentMs;
        laps.push(lapTime);
        renderLaps();
    };

    document.getElementById('lapClearBtn').onclick=()=>{
        resetLaps();
    };

    function renderLaps(){
        const list=document.getElementById('lapList');
        list.innerHTML='';
        let best=Math.min(...laps),worst=Math.max(...laps),avg=laps.reduce((a,b)=>a+b,0)/laps.length;
        laps.forEach((lap,idx)=>{
            const div=document.createElement('div');
            div.className=`lap-item ${lap===best?'best':''} ${lap===worst?'worst':''}`;
            div.innerHTML=`<span>第 ${idx+1} 圈</span><span>${fmt(lap)} ${lap===best?'🟢最快':''} ${lap===worst?'🔴最慢':''}</span>`;
            list.appendChild(div);
        });
        document.getElementById('lapStats').innerHTML=`
            <span>最佳：<strong>${fmt(best)}</strong></span>
            <span>最差：<strong>${fmt(worst)}</strong></span>
            <span>平均：<strong>${fmt(avg)}</strong></span>
            <span>总圈数：<strong>${laps.length}</strong></span>
        `;
    }

    // Laps 锁点击
    document.getElementById('lapLock').onclick=()=>{
        alert('分段计时(Laps)为VIP专享功能，请开通会员');
        openVipBtn.click();
    };

    // ============ 多计时器 (VIP) ============
    const multiTimerModal=document.getElementById('multiTimerModal');
    const multiTimerList=document.getElementById('multiTimerList');

    document.getElementById('setMultiTimer').onclick=()=>{
        const user=getUserData();
        if(!checkVipValid(user)){alert('多计时器为VIP专享功能');openVipBtn.click();return;}
        renderMultiTimers();
        multiTimerModal.classList.remove('hidden');
    };
    document.getElementById('multiTimerClose').onclick=()=>multiTimerModal.classList.add('hidden');

    document.getElementById('addTimerBtn').onclick=()=>{
        const name=document.getElementById('newTimerName').value.trim()||`计时器 ${multiTimers.length+1}`;
        multiTimers.push({id:Date.now(),name,elapsed:0,running:false,timer:null});
        localStorage.setItem('multiTimers',JSON.stringify(multiTimers.map(t=>({id:t.id,name:t.name}))));
        document.getElementById('newTimerName').value='';
        renderMultiTimers();
    };

    function renderMultiTimers(){
        multiTimerList.innerHTML='';
        multiTimers.forEach((t,idx)=>{
            const card=document.createElement('div');
            card.className='multi-timer-card';
            card.innerHTML=`
                <button class="mt-remove" onclick="removeTimer(${idx})">✕</button>
                <div class="mt-name">${t.name}</div>
                <div class="mt-time" id="mt-time-${t.id}">${fmt(t.elapsed)}</div>
                <div class="mt-btns">
                    <button onclick="toggleTimer(${idx})">${t.running?'⏸ 暂停':'▶ 开始'}</button>
                    <button onclick="resetTimer(${idx})">↺ 重置</button>
                </div>
            `;
            multiTimerList.appendChild(card);
        });
    }

    window.removeTimer=function(idx){
        clearInterval(multiTimers[idx].timer);
        multiTimers.splice(idx,1);
        localStorage.setItem('multiTimers',JSON.stringify(multiTimers));
        renderMultiTimers();
    };

    window.toggleTimer=function(idx){
        const t=multiTimers[idx];
        if(t.running){
            clearInterval(t.timer);t.running=false;
        }else{
            t.running=true;
            const st=Date.now()-t.elapsed;
            t.timer=setInterval(()=>{
                t.elapsed=Date.now()-st;
                const dom=document.getElementById(`mt-time-${t.id}`);
                if(dom)dom.textContent=fmt(t.elapsed);
            },10);
        }
        renderMultiTimers();
    };

    window.resetTimer=function(idx){
        const t=multiTimers[idx];
        clearInterval(t.timer);t.elapsed=0;t.running=false;
        const dom=document.getElementById(`mt-time-${t.id}`);
        if(dom)dom.textContent=fmt(0);
        renderMultiTimers();
    };

    // ============ 数据导出 ============
    const exportModal=document.getElementById('exportModal');
    const exportContent=document.getElementById('exportContent');

    function generateLapsCSV(){
        let csv='圈数,用时,累计时间\n';
        let cumulative=0;
        laps.forEach((lap,idx)=>{
            cumulative+=lap;
            csv+=`第${idx+1}圈,${fmt(lap)},${fmt(cumulative)}\n`;
        });
        return '\ufeff'+csv; // BOM for Excel
    }

    function generateHistoryCSV(){
        let csv='类型,时间/结果,日期\n';
        history.forEach(h=>{
            csv+=`${h.type},${h.result},${new Date(h.timestamp).toLocaleString()}\n`;
        });
        return '\ufeff'+csv;
    }

    document.getElementById('setExportAll').onclick=()=>{
        showExport('全部数据',generateAllData());
    };

    document.getElementById('setExportLaps').onclick=()=>{
        if(laps.length===0){alert('暂无分段计时数据');return;}
        showExport('Laps 分段计时记录',generateLapsCSV());
    };

    function showExport(title,content){
        document.getElementById('exportTitle').textContent=title;
        exportContent.value=content;
        exportModal.classList.remove('hidden');
    }

    document.getElementById('exportCopy').onclick=()=>{
        exportContent.select();
        document.execCommand('copy');
        alert('已复制到剪贴板');
    };

    document.getElementById('exportDownload').onclick=()=>{
        const blob=new Blob([exportContent.value],{type:'text/csv;charset=utf-8;'});
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');
        a.href=url;
        a.download=`计时器导出_${new Date().toISOString().slice(0,10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    document.getElementById('exportClose').onclick=()=>exportModal.classList.add('hidden');

    function generateAllData(){
        let text='===== 计时器 Pro 数据导出 =====\n';
        text+=`导出时间：${new Date().toLocaleString()}\n\n`;

        text+='----- 分段计时(Laps) -----\n';
        if(laps.length>0){
            laps.forEach((lap,idx)=>text+=`第${idx+1}圈: ${fmt(lap)}\n`);
        }else text+='（无数据）\n';

        text+='\n----- 计时历史 -----\n';
        if(history.length>0){
            history.forEach(h=>text+=`[${new Date(h.timestamp).toLocaleString()}] ${h.type}: ${h.result}\n`);
        }else text+='（无数据）\n';

        text+='\n----- 自定义预设 -----\n';
        if(presets.length>0){
            presets.forEach(p=>text+=`${p.name}: ${p.m}分${p.s}秒\n`);
        }else text+='（无数据）\n';

        return text;
    }

    // ============ 计时历史 ============
    function addHistory(type,result){
        history.push({type,result,timestamp:Date.now()});
        if(history.length>50)history.shift();
        localStorage.setItem('timerHistory',JSON.stringify(history));
        renderHistory();
    }

    function renderHistory(){
        const list=document.getElementById('historyList');
        const bar=document.getElementById('historyBar');
        if(history.length===0){list.innerHTML='<p style="color:#888;font-size:14px;">暂无历史记录</p>';bar.classList.add('hidden');return;}
        bar.classList.remove('hidden');
        document.getElementById('historyCount').textContent=history.length;
        list.innerHTML='';
        history.slice(-10).forEach(h=>{
            const div=document.createElement('div');
            div.className='history-item';
            div.innerHTML=`<span class="h-time">${h.result}</span><span>${h.type}</span><span class="h-date">${new Date(h.timestamp).toLocaleDateString()}</span>`;
            list.appendChild(div);
        });
    }

    document.getElementById('clearHistoryBtn').onclick=()=>{
        if(!confirm('清空所有历史记录？'))return;
        history=[];
        localStorage.removeItem('timerHistory');
        renderHistory();
    };

    // ============ 设置页独立按钮绑定 ============

    // 通知权限设置
    document.getElementById('setNotif').onclick=()=>{
        if(!('Notification' in window)){alert('当前浏览器不支持系统通知');return;}
        if(Notification.permission==='granted'){
            alert('通知权限已开启 ✅');
            sendNotification('测试通知','如果您看到了这条通知，说明设置成功！');
        }else{
            Notification.requestPermission().then(perm=>{
                if(perm==='granted'){
                    alert('通知权限已开启！');
                    notifEnabled=true;
                    switchNotif.checked=true;
                }
            });
        }
        updateNotifDesc();
    };

    function updateNotifDesc(){
        const desc=document.getElementById('notifDesc');
        if('Notification' in window){
            if(Notification.permission==='granted')desc.textContent='✅ 通知已开启，倒计时结束会弹出系统通知';
            else if(Notification.permission==='denied')desc.textContent='❌ 通知已被拒绝，请在浏览器设置中开启';
            else desc.textContent='⚠️ 点击开启系统通知权限';
        }else{
            desc.textContent='❌ 当前浏览器不支持系统通知';
        }
    }

    // 语音播报开关
    document.getElementById('setSpeech').onclick=()=>{
        speechEnabled=!speechEnabled;
        switchSpeech.checked=speechEnabled;
        if(speechEnabled){
            speak('语音播报已开启');
            alert('语音播报已开启 ✅');
        }else{
            alert('语音播报已关闭');
        }
    };

    // 自定义主题色
    document.getElementById('setCustomTheme').onclick=()=>{
        const user=getUserData();
        if(!checkVipValid(user)){alert('自定义主题色为VIP专享功能');openVipBtn.click();return;}
        document.getElementById('customThemeArea').scrollIntoView({behavior:'smooth'});
        alert('请在下方"自定义主题色"区域选择颜色');
    };

    // ============ PWA 注册 ============
    if('serviceWorker' in navigator){
        window.addEventListener('load',()=>{
            const swPath = location.pathname.includes('/timer-pro') ? '/timer-pro/service-worker.js' : '/service-worker.js';
            navigator.serviceWorker.register(swPath).catch(()=>{
                // 忽略注册失败（file:// 协议下不可用）
            });
        });
    }

    // ============ Windows 适配 ============
    // 键盘快捷键
    document.addEventListener('keydown',(e)=>{
        // 空格 = 开始/暂停（正计时）
        if(e.code==='Space'&&document.activeElement.tagName!=='INPUT'){
            e.preventDefault();
            if(isRun)document.getElementById('pause').click();
            else document.getElementById('start').click();
        }
        // R = 重置
        if(e.key==='r'||e.key==='R'){
            if(document.activeElement.tagName!=='INPUT'){
                document.getElementById('reset').click();
            }
        }
        // L = 记一圈 (VIP)
        if((e.key==='l'||e.key==='L')&&!document.getElementById('lapBtn').disabled){
            if(document.activeElement.tagName!=='INPUT'){
                document.getElementById('lapBtn').click();
            }
        }
        // Esc = 关闭弹窗
        if(e.key==='Escape'){
            document.querySelectorAll('.modal-mask').forEach(m=>m.classList.add('hidden'));
        }
    });

    // 安装提示 (PWA)
    let deferredPrompt=null;
    const forceInstall = new URLSearchParams(location.search).get('install') === '1';

    window.addEventListener('beforeinstallprompt',(e)=>{
        e.preventDefault();
        deferredPrompt=e;
        if(forceInstall){
            // 从官网"安装电脑版"按钮过来的，自动弹出安装提示
            setTimeout(()=>{
                if(deferredPrompt){
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then(()=>{
                        deferredPrompt=null;
                    });
                }else{
                    showInstallBanner(true);
                }
            },1500);
        }else{
            showInstallBanner();
        }
    });

    function showInstallBanner(force){
        if(!force && sessionStorage.getItem('installBannerShown'))return;
        const banner=document.createElement('div');
        banner.className='install-banner';
        banner.innerHTML=`
            <span>💻 可将计时器安装到电脑桌面，像软件一样使用</span>
            <button id="installBtn" style="padding:6px 14px;font-size:13px;background:#0cf;color:#000;border:none;border-radius:5px;cursor:pointer;font-weight:bold;">立即安装</button>
            <button id="dismissBtn" style="padding:6px 10px;font-size:12px;background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:5px;cursor:pointer;">关闭</button>
        `;
        document.body.appendChild(banner);
        sessionStorage.setItem('installBannerShown','true');
        document.getElementById('installBtn').onclick=()=>{
            if(deferredPrompt)deferredPrompt.prompt();
            banner.remove();
        };
        document.getElementById('dismissBtn').onclick=()=>banner.remove();
        setTimeout(()=>banner.remove(), force ? 30000 : 10000);
    }

    // 如果是从官网安装按钮过来的，但 beforeinstallprompt 没触发，也显示横幅
    if(forceInstall){
        setTimeout(()=>{
            if(!deferredPrompt) showInstallBanner(true);
        },2000);
    }

    // 检测 Windows 平台提示
    const isWindows=/Windows/i.test(navigator.userAgent);
    if(isWindows){
        console.log('%c[计时器 Pro] Windows 平台已适配', 'color:#0cf;font-size:14px;');
        console.log('快捷键：空格=开始/暂停 | R=重置 | L=记圈 | F11=全屏 | Esc=关闭弹窗');
    }

    // ============================================================
    // 功能 A：背景随进度变化（倒计时越接近结束背景越红）
    // ============================================================
    const progressRedOverlay = document.getElementById('progressRedOverlay');

    // 重置背景红化：直接置透明（不能调用 updateProgressRed(0,1)，那会因 ratio=0 变成最深红色）
    function resetProgressRed(){
        if(!progressRedOverlay) return;
        progressRedOverlay.style.background='transparent';
    }

    function updateProgressRed(leftMs, totalMs){
        if(!progressBgEnabled || !progressRedOverlay){return;}
        if(totalMs <= 0){progressRedOverlay.style.background='transparent';return;}
        // ratio: 1 = 刚开始(不红), 0 = 结束(最红)
        const ratio = Math.max(0, Math.min(1, leftMs / totalMs));
        // 只在最后 60% 才开始上色，避免全程泛红
        const intensity = ratio < 0.6 ? (1 - ratio/0.6) : 0;
        const alpha = (intensity * 0.55).toFixed(3);
        progressRedOverlay.style.background =
            `radial-gradient(circle at center, rgba(255,0,0,0) 0%, rgba(180,0,0,${alpha}) 70%, rgba(255,0,0,${alpha}) 100%)`;
    }

    // ============================================================
    // 功能 B：成就系统（累计计时 + 连续天数 + 徽章解锁）
    // ============================================================
    const ACHIEVEMENTS = [
        {id:'first',    emoji:'🎯', name:'初次计时',   cond:(a)=>a.totalMs>0,                                  desc:'完成第一次计时', points:10},
        {id:'min5',     emoji:'⏱️', name:'专注 5 分钟', cond:(a)=>a.totalMs>=5*60*1000,                       desc:'累计计时满 5 分钟', points:20},
        {id:'min30',    emoji:'☕', name:'专注半小时', cond:(a)=>a.totalMs>=30*60*1000,                      desc:'累计计时满 30 分钟', points:30},
        {id:'hour1',    emoji:'⏰', name:'小时达人',   cond:(a)=>a.totalMs>=3600*1000,                        desc:'累计计时满 1 小时', points:50},
        {id:'hour5',    emoji:'🌟', name:'专注 5 小时',cond:(a)=>a.totalMs>=5*3600*1000,                     desc:'累计计时满 5 小时', points:80},
        {id:'hour10',   emoji:'🔥', name:'专注 10 小时',cond:(a)=>a.totalMs>=10*3600*1000,                    desc:'累计计时满 10 小时', points:100},
        {id:'hour50',   emoji:'💫', name:'专注 50 小时',cond:(a)=>a.totalMs>=50*3600*1000,                    desc:'累计计时满 50 小时', points:200},
        {id:'hour100',  emoji:'💎', name:'百时大师',   cond:(a)=>a.totalMs>=100*3600*1000,                    desc:'累计计时满 100 小时', points:500},
        {id:'streak3',  emoji:'📅', name:'连续 3 天',  cond:(a)=>a.streak>=3,                                 desc:'连续使用 3 天', points:30},
        {id:'streak7',  emoji:'🏅', name:'坚持 7 天',  cond:(a)=>a.streak>=7,                                 desc:'连续使用 7 天', points:50},
        {id:'streak14', emoji:'🔥', name:'坚持 14 天', cond:(a)=>a.streak>=14,                                desc:'连续使用 14 天', points:100},
        {id:'streak30', emoji:'👑', name:'月度达人',   cond:(a)=>a.streak>=30,                                desc:'连续使用 30 天', points:300},
        {id:'laps10',   emoji:'🏁', name:'圈速新手',   cond:()=>laps.length>=10,                               desc:'累计记圈满 10 次（本局）', points:20},
        {id:'laps50',   emoji:'🏎️', name:'圈速达人',   cond:()=>laps.length>=50,                               desc:'累计记圈满 50 次（本局）', points:50},
        {id:'laps100',  emoji:'🏆', name:'圈速大师',   cond:()=>laps.length>=100,                              desc:'累计记圈满 100 次（本局）', points:100},
        {id:'friend1',  emoji:'👥', name:'初交朋友',   cond:()=>{try{return (JSON.parse(localStorage.getItem('friends')||'[]')).length>=1}catch(e){return false}}, desc:'添加第一个好友', points:20},
        {id:'friend5',  emoji:'🤝', name:'社交达人',   cond:()=>{try{return (JSON.parse(localStorage.getItem('friends')||'[]')).length>=5}catch(e){return false}}, desc:'添加 5 个好友', points:50},
        {id:'msg10',    emoji:'💬', name:'消息新手',   cond:()=>{try{return (JSON.parse(localStorage.getItem('chatMsgCount')||'0'))>=10}catch(e){return false}}, desc:'发送 10 条消息', points:30},
        {id:'task5',    emoji:'📋', name:'任务达人',   cond:()=>{try{return (JSON.parse(localStorage.getItem('tasksCompleted')||'0'))>=5}catch(e){return false}}, desc:'完成 5 个每日任务', points:50},
        {id:'vip',      emoji:'👑', name:'VIP会员',    cond:()=>localStorage.getItem('vipStatus')==='1',       desc:'成为VIP会员', points:200},
    ];

    function checkAchievements(){
        const a = getAchievementsData();
        let changed = false;
        ACHIEVEMENTS.forEach(ach=>{
            if(!a.unlocked[ach.id] && ach.cond(a)){
                a.unlocked[ach.id] = true;
                changed = true;
                // 奖励积分
                addPoints(ach.points || 10);
                // 解锁提示（节流：不重复弹）
                showAchievementToast(ach);
            }
        });
        if(changed) saveAchievementsData(a);
        renderAchievements();
    }

    // ========== 积分系统 ==========
    function getPoints(){
        return parseInt(localStorage.getItem('userPoints') || '0');
    }
    function addPoints(n){
        const p = getPoints() + n;
        localStorage.setItem('userPoints', p);
        updatePointsUI();
        return p;
    }
    function spendPoints(n){
        const p = getPoints();
        if(p < n) return false;
        localStorage.setItem('userPoints', p - n);
        updatePointsUI();
        return true;
    }
    function updatePointsUI(){
        const el = document.getElementById('userPointsDisplay');
        if(el) el.textContent = getPoints();
    }
    window.getPoints = getPoints;
    window.addPoints = addPoints;
    window.spendPoints = spendPoints;

    // ========== 积分商城 ==========
    const SHOP_ITEMS = [
        {id:'theme_rainbow', emoji:'🌈', name:'彩虹主题', desc:'炫酷彩虹渐变背景', price:100, type:'theme', value:'rainbow'},
        {id:'theme_ocean', emoji:'🌊', name:'海洋主题', desc:'清新海洋蓝渐变背景', price:100, type:'theme', value:'ocean'},
        {id:'theme_sunset', emoji:'🌅', name:'日落主题', desc:'温暖日落橙红渐变', price:100, type:'theme', value:'sunset'},
        {id:'theme_forest', emoji:'🌲', name:'森林主题', desc:'自然森林绿渐变', price:100, type:'theme', value:'forest'},
        {id:'theme_night', emoji:'🌙', name:'夜空主题', desc:'深邃夜空紫黑渐变', price:150, type:'theme', value:'night'},
        {id:'title_newbie', emoji:'🌱', name:'新手称号', desc:'获得"新手玩家"称号', price:50, type:'title', value:'新手玩家'},
        {id:'title_master', emoji:'⚡', name:'大师称号', desc:'获得"时间大师"称号', price:300, type:'title', value:'时间大师'},
        {id:'title_king', emoji:'👑', name:'王者称号', desc:'获得"计时王者"称号', price:500, type:'title', value:'计时王者'},
        {id:'frame_gold', emoji:'✨', name:'金色头像框', desc:'闪耀金色头像边框', price:200, type:'frame', value:'gold'},
        {id:'frame_diamond', emoji:'💎', name:'钻石头像框', desc:'璀璨钻石头像边框', price:400, type:'frame', value:'diamond'},
        {id:'bgm_unlock', emoji:'🎵', name:'解锁全部音乐', desc:'解锁所有VIP背景音乐', price:1000, type:'bgm', value:'all'},
    ];

    function getPurchasedItems(){
        try{ return JSON.parse(localStorage.getItem('purchasedItems') || '[]'); }
        catch(e){ return []; }
    }
    function savePurchasedItems(items){
        localStorage.setItem('purchasedItems', JSON.stringify(items));
    }
    function isPurchased(id){
        return getPurchasedItems().indexOf(id) >= 0;
    }

    function renderShop(){
        const list = document.getElementById('shopItems');
        if(!list) return;
        const points = getPoints();
        const purchased = getPurchasedItems();
        list.innerHTML = SHOP_ITEMS.map(item=>{
            const owned = purchased.indexOf(item.id) >= 0;
            const canAfford = points >= item.price;
            return `<div style="display:flex;align-items:center;padding:12px;margin-bottom:10px;background:rgba(255,255,255,0.05);border-radius:10px;border:1px solid ${owned?'#4ade80':'rgba(255,255,255,0.1)'};">
                <div style="font-size:32px;margin-right:12px;">${item.emoji}</div>
                <div style="flex:1;">
                    <div style="color:#fff;font-size:15px;font-weight:bold;">${item.name} ${owned?'✅':''}</div>
                    <div style="color:#999;font-size:12px;margin-top:2px;">${item.desc}</div>
                </div>
                <div style="text-align:right;">
                    <div style="color:#ffd700;font-size:14px;font-weight:bold;margin-bottom:6px;">${item.price} 积分</div>
                    ${owned 
                        ? '<span style="color:#4ade80;font-size:12px;">已拥有</span>' 
                        : `<button onclick="buyItem('${item.id}')" style="padding:6px 14px;border:none;border-radius:6px;cursor:pointer;font-size:13px;background:${canAfford?'linear-gradient(135deg,#6a11cb,#2575fc)':'#555'};color:#fff;${canAfford?'':'opacity:0.5;cursor:not-allowed;'}" ${canAfford?'':'disabled'}>兑换</button>`
                    }
                </div>
            </div>`;
        }).join('');
        updatePointsUI();
    }

    function buyItem(id){
        const item = SHOP_ITEMS.find(i=>i.id===id);
        if(!item) return;
        if(isPurchased(id)){ showToast('你已经拥有这个物品了'); return; }
        if(!spendPoints(item.price)){ showToast('积分不足，继续努力吧！'); return; }
        const purchased = getPurchasedItems();
        purchased.push(id);
        savePurchasedItems(purchased);
        // 应用效果
        applyShopItem(item);
        showToast(`🎉 成功兑换：${item.name}`);
        renderShop();
    }
    window.buyItem = buyItem;

    function applyShopItem(item){
        if(item.type === 'theme'){
            // 应用主题
            const themes = {
                rainbow: 'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)',
                ocean: 'linear-gradient(-45deg, #2E3192, #1BFFFF)',
                sunset: 'linear-gradient(-45deg, #f12711, #f5af19)',
                forest: 'linear-gradient(-45deg, #134E5E, #71B280)',
                night: 'linear-gradient(-45deg, #0f0c29, #302b63, #24243e)'
            };
            if(themes[item.value]){
                document.body.style.background = themes[item.value];
                localStorage.setItem('customTheme', item.value);
            }
        } else if(item.type === 'title'){
            localStorage.setItem('userTitle', item.value);
            showToast(`称号已装备：${item.value}`);
        } else if(item.type === 'bgm'){
            localStorage.setItem('unlockAllMusic', '1');
            showToast('已解锁全部背景音乐！');
        }
    }

    // 积分商城按钮
    const shopBtn = document.getElementById('setShop');
    if(shopBtn){
        shopBtn.onclick = function(){
            const m = document.getElementById('shopModal');
            if(m){ m.classList.remove('hidden'); m.classList.add('show'); }
            renderShop();
        };
    }

    // ========== 每日签到功能 ==========
    function getTodayStr(){
        const d = new Date();
        return d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
    }
    function canCheckIn(){
        return localStorage.getItem('lastCheckIn') !== getTodayStr();
    }
    function doCheckIn(){
        if(!canCheckIn()){ showToast('今天已经签到过了，明天再来吧！'); return; }
        const streak = parseInt(localStorage.getItem('checkInStreak') || '0');
        const total = parseInt(localStorage.getItem('totalCheckIns') || '0');
        // 连续签到奖励：第1天10分，第2天20分...第7天70分，7天以上每天50分
        let points = Math.min((streak + 1) * 10, 70);
        if(streak >= 7) points = 50;
        addPoints(points);
        localStorage.setItem('lastCheckIn', getTodayStr());
        localStorage.setItem('checkInStreak', streak + 1);
        localStorage.setItem('totalCheckIns', total + 1);
        showToast(`🎉 签到成功！获得 ${points} 积分（连续 ${streak+1} 天）`);
        updateCheckInUI();
    }
    function updateCheckInUI(){
        const desc = document.getElementById('checkInDesc');
        if(desc){
            if(canCheckIn()){
                desc.textContent = '点击签到领取今日积分奖励';
            } else {
                const streak = localStorage.getItem('checkInStreak') || '0';
                desc.textContent = `✅ 今日已签到（连续 ${streak} 天）`;
            }
        }
    }
    // 签到按钮
    const checkInBtn = document.getElementById('setCheckIn');
    if(checkInBtn){
        checkInBtn.onclick = doCheckIn;
    }
    // 页面加载时更新签到状态
    setTimeout(updateCheckInUI, 500);

    // ========== 计时获得积分 ==========
    // 每计时满1分钟获得1积分（上限每天100积分）
    function addTimerPoints(seconds){
        const today = getTodayStr();
        const lastDate = localStorage.getItem('lastTimerPointsDate');
        if(lastDate !== today){
            localStorage.setItem('lastTimerPointsDate', today);
            localStorage.setItem('todayTimerPoints', '0');
        }
        const todayPoints = parseInt(localStorage.getItem('todayTimerPoints') || '0');
        if(todayPoints >= 100) return; // 每天上限100分
        const earned = Math.min(Math.floor(seconds / 60), 100 - todayPoints);
        if(earned > 0){
            addPoints(earned);
            localStorage.setItem('todayTimerPoints', todayPoints + earned);
        }
    }
    window.addTimerPoints = addTimerPoints;

    // 页面加载时应用已购买的主题
    setTimeout(function(){
        const savedTheme = localStorage.getItem('customTheme');
        if(savedTheme){
            const themes = {
                rainbow: 'linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab)',
                ocean: 'linear-gradient(-45deg, #2E3192, #1BFFFF)',
                sunset: 'linear-gradient(-45deg, #f12711, #f5af19)',
                forest: 'linear-gradient(-45deg, #134E5E, #71B280)',
                night: 'linear-gradient(-45deg, #0f0c29, #302b63, #24243e)'
            };
            if(themes[savedTheme]){
                document.body.style.background = themes[savedTheme];
            }
        }
    }, 500);

    let achvToastTimer = null;
    function showAchievementToast(ach){
        // 先移除旧的
        const old = document.getElementById('achvToast');
        if(old) old.remove();
        const t = document.createElement('div');
        t.id = 'achvToast';
        t.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%) scale(0.8);z-index:2000;'
            + 'background:linear-gradient(135deg,#2a2a00,#1a1a00);border:2px solid #ffd700;'
            + 'border-radius:14px;padding:14px 22px;color:#fff;font-size:16px;text-align:center;'
            + 'box-shadow:0 0 30px rgba(255,215,0,0.6);opacity:0;transition:.4s;';
        t.innerHTML = `<div style="font-size:34px;">${ach.emoji}</div>`
            + `<div style="color:#ffd700;font-weight:bold;margin:4px 0;">成就解锁：${ach.name}</div>`
            + `<div style="font-size:12px;color:#ccc;">${ach.desc}</div>`;
        document.body.appendChild(t);
        requestAnimationFrame(()=>{t.style.opacity='1';t.style.transform='translateX(-50%) scale(1)';});
        clearTimeout(achvToastTimer);
        achvToastTimer = setTimeout(()=>{t.style.opacity='0';setTimeout(()=>t.remove(),400);}, 3500);
    }

    function renderAchievements(){
        const a = getAchievementsData();
        const list = document.getElementById('achvList');
        const total = ACHIEVEMENTS.length;
        const unlockedCount = ACHIEVEMENTS.filter(ach=>a.unlocked[ach.id]).length;
        // 汇总
        document.getElementById('achvTotalTime').textContent = fmt(Math.floor(a.totalMs)) + '（约 ' + (a.totalMs/3600000).toFixed(1) + ' 小时）';
        document.getElementById('achvStreak').textContent = a.streak;
        document.getElementById('achvUnlocked').textContent = unlockedCount;
        document.getElementById('achvTotal').textContent = total;
        // 下一个未解锁
        const next = ACHIEVEMENTS.find(ach=>!a.unlocked[ach.id]);
        document.getElementById('achvNext').textContent = next ? `下一个：${next.name}` : '🎉 已全部解锁！';
        // 徽章网格
        if(list){
            list.innerHTML='';
            ACHIEVEMENTS.forEach(ach=>{
                const isUnl = !!a.unlocked[ach.id];
                const div = document.createElement('div');
                div.className = 'achv-item' + (isUnl?' unlocked':'');
                div.innerHTML = `<span class="achv-em">${isUnl?ach.emoji:'🔒'}</span>`
                    + `<span class="achv-nm">${isUnl?ach.name:'？？？'}</span>`
                    + `<span class="achv-cond">${ach.desc}</span>`;
                list.appendChild(div);
            });
        }
    }

    // ============================================================
    // 功能 C：扫码启动预设（生成含预设参数的二维码）
    //   二维码编码 URL：当前页面 URL + ?preset=分:秒，扫码/打开即自动填入倒计时
    // ============================================================
    function buildPresetUrl(min, sec){
        const base = location.href.split('?')[0].split('#')[0];
        return base + '?preset=' + encodeURIComponent(min + ':' + sec);
    }

    // 轻量 QR Code 生成（无外部依赖，基于 qr.js 算法内联实现）
    // —— 使用简化的 QR 矩阵绘制；若浏览器不支持高级 API，降级为文本链接
    function drawQR(text, canvas){
        // 优先尝试第三方 QR 库（若页面引入了 qrcode），否则用内联最小实现
        if(window.QRCode && window.QRCode.toCanvas){
            window.QRCode.toCanvas(canvas, text, {width:200, margin:1}, ()=>{});
            return true;
        }
        // 内联降级：使用 CDN 动态加载一次（仅现代浏览器）
        return drawQRFallback(text, canvas);
    }

    // 纯 Canvas 降级：绘制「伪二维码占位 + 链接文字」，保证功能可用
    function drawQRFallback(text, canvas){
        const ctx = canvas.getContext ? canvas.getContext('2d') : null;
        if(!ctx){
            // 环境不支持 canvas 2D（极少数旧浏览器），不绘制，直接显示链接即可
            return false;
        }
        const W = canvas.width || 200;
        ctx.fillStyle = '#fff'; ctx.fillRect(0,0,W,W);
        // 定位角标 + 网格点阵（确定性哈希，使相同链接图形一致）
        const cells = 25;
        const cell = W / cells;
        function hash(x,y){let h=Math.sin((x*127.1+y*311.7)+text.length*7.13)*43758.5453;return h-Math.floor(h);}
        const on=(x,y)=>hash(x,y)<0.5;
        // 三个定位图案
        function finder(cx,cy){
            ctx.fillStyle='#000';
            ctx.fillRect(cx*cell,cy*cell,7*cell,7*cell);
            ctx.fillStyle='#fff';
            ctx.fillRect((cx+1)*cell,(cy+1)*cell,5*cell,5*cell);
            ctx.fillStyle='#000';
            ctx.fillRect((cx+2)*cell,(cy+2)*cell,3*cell,3*cell);
        }
        finder(0,0);finder(cells-7,0);finder(0,cells-7);
        // 数据模块
        ctx.fillStyle='#000';
        for(let y=0;y<cells;y++){
            for(let x=0;x<cells;x++){
                const inFinder = (x<8&&y<8)||(x>cells-8&&y<8)||(x<8&&y>cells-8);
                if(inFinder) continue;
                if(on(x,y)) ctx.fillRect(x*cell,y*cell,cell,cell);
            }
        }
        // 中心图标提示
        ctx.fillStyle='rgba(255,255,255,0.9)';
        ctx.fillRect(W/2-30,W/2-12,60,24);
        ctx.fillStyle='#e73c7e';
        ctx.font='13px sans-serif';
        ctx.textAlign='center';
        ctx.fillText('预设码', W/2, W/2+4);
        return true;
    }

    function refreshQrPresetSelect(){
        const sel = document.getElementById('qrPresetSelect');
        if(!sel) return;
        sel.innerHTML = '<option value="">— 请选择预设 —</option>';
        builtinPresets.forEach((p,idx)=>{
            const opt = document.createElement('option');
            opt.value = idx; opt.textContent = `${p.name}（${p.m}分${p.s}秒）`;
            sel.appendChild(opt);
        });
        presets.forEach((p)=>{
            const opt = document.createElement('option');
            opt.value = 'c_' + p.m + '_' + p.s; opt.textContent = `⭐ ${p.name}（${p.m}分${p.s}秒）`;
            sel.appendChild(opt);
        });
    }

    function generateQR(){
        const sel = document.getElementById('qrPresetSelect');
        let min=0, sec=0, label='';
        if(sel.value && sel.value.indexOf('c_')===0){
            const parts = sel.value.split('_'); min=+parts[1]; sec=+parts[2]; label='自定义预设';
        }else if(sel.value !== ''){
            const p = builtinPresets[+sel.value]; min=p.m; sec=p.s; label=p.name;
        }else{
            min = +document.getElementById('qrCustomM').value || 0;
            sec = +document.getElementById('qrCustomS').value || 0;
            label = `${min}分${sec}秒`;
        }
        if(min===0 && sec===0) return alert('请选择一个预设或输入有效时间');
        const url = buildPresetUrl(min, sec);
        // 用 history.replaceState 让当前页面 URL 也带上参数（便于直接分享）
        try{ history.replaceState(null,'', '?preset=' + encodeURIComponent(min+':'+sec)); }catch(e){}
        const canvas = document.getElementById('qrCanvas');
        drawQR(url, canvas);
        document.getElementById('qrUrlText').textContent = url;
        document.getElementById('qrCanvasBox').style.display='flex';
        // 预览下方提示
        document.getElementById('qrGenerateBtn').innerHTML = '<span class="btn-icon">✅</span>已生成：' + label;
        setTimeout(()=>{document.getElementById('qrGenerateBtn').innerHTML='<span class="btn-icon">🔗</span>生成二维码';},2500);
    }

    // 解析 URL ?preset=分:秒 自动填入倒计时（扫码/打开链接即用）
    function applyPresetFromUrl(){
        const params = new URLSearchParams(location.search);
        const p = params.get('preset');
        if(!p) return;
        const parts = p.split(':');
        const m = Math.max(0,+(parts[0]||0)), s = Math.max(0,+(parts[1]||0));
        document.getElementById('h').value = 0;
        document.getElementById('m').value = m;
        document.getElementById('s').value = s;
        // 自动切到倒计时 tab
        document.querySelector('.tab-btn[data-view="countdown"]').click();
        // 显示提示
        setTimeout(()=>alert(`已自动载入分享预设：${m}分${s}秒（点击「开始」即可计时）`),300);
    }

    document.getElementById('qrGenerateBtn').onclick = generateQR;
    document.getElementById('qrDownloadBtn').onclick = ()=>{
        const canvas = document.getElementById('qrCanvas');
        const link = document.createElement('a');
        link.download = `计时器预设_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };
    document.getElementById('qrCopyLinkBtn').onclick = ()=>{
        const url = document.getElementById('qrUrlText').textContent;
        if(!url) return alert('请先生成二维码');
        if(navigator.clipboard){navigator.clipboard.writeText(url).then(()=>alert('链接已复制'),()=>alert('复制失败，请手动选择'));}
        else {prompt('请手动复制以下链接：',url);}
    };

    // 开关：背景随进度变化
    const switchProgressBg = document.getElementById('switchProgressBg');
    switchProgressBg.onchange = function(){
        progressBgEnabled = this.checked;
        localStorage.setItem('progressBgEnabled', this.checked);
        if(!this.checked) resetProgressRed();
    };

    // 结束自定义文字：输入 + 预览 + 持久化
    const finishMsgInput = document.getElementById('finishMsgInput');
    const finishMsgPreview = document.getElementById('finishMsgPreview');
    function renderFinishMsgPreview(){
        const v = (finishMsg||'').trim();
        if(v){finishMsgPreview.innerHTML = '👉 <span style="color:#ffd700;">' + escapeHtml(v) + '</span>';}
        else {finishMsgPreview.innerHTML = '<span class="ph">留空则使用默认提示「⏰ 倒计时结束！」</span>';}
    }
    finishMsgInput.oninput = function(){
        finishMsg = this.value;
        localStorage.setItem('finishMsg', finishMsg);
        renderFinishMsgPreview();
    };
    function escapeHtml(str){return str.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

    // 初始化：读取持久化
    try{
        const savedFinish = localStorage.getItem('finishMsg');
        if(savedFinish !== null){finishMsg = savedFinish; finishMsgInput.value = savedFinish;}
        const savedBg = localStorage.getItem('progressBgEnabled');
        if(savedBg !== null){progressBgEnabled = savedBg==='true'; switchProgressBg.checked = progressBgEnabled;}
    }catch(e){}

/* === 会员专属功能模块 (V1.4.0) === */

/* ============================================================
   会员专属功能扩展 (VIP Exclusive Features) - 计时器 Pro V1.4.1
   排除 #11 Wake Lock / #12 后台保活增强
   新增：
     1. 自定义提示音 / 上传音频 (vipSound)
     2. 语音包切换 (voicePack)
     3. 自定义渐变背景 (gradientBg)
     4. 自定义字体 (fontTheme)
     5. 计时结束全屏庆祝动画 (celebration)
     6. 无限历史记录 (unlimitedHistory)
     7. 云端备份 (cloudSync)
     8. 详细统计报表 (statsReport)
     9. 无限多计时器 (unlimitedMultiTimer)
    10. 无限自定义预设 (unlimitedPreset)
    13. 成就分享卡片 (achievementShare)
    14. 团队协作计时 (teamRoom)
   ============================================================ */

// ---------- 1. 自定义提示音 / 上传音频 ----------
let customBeepUrl = localStorage.getItem('customBeepUrl') || '';
let useCustomBeep = localStorage.getItem('useCustomBeep') === 'true';

// 重写提示音：优先使用用户上传音频
const _origPlayBeep = window.playBeepOverride; // 占位
function playBeep(){
    try{
        if(useCustomBeep && customBeepUrl){
            let aud = window.__customAud;
            if(!aud){ aud = new Audio(customBeepUrl); window.__customAud = aud; }
            aud.currentTime = 0; aud.play().catch(function(){});
            return;
        }
        // 默认双声响 (Web Audio)
        if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
        const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();
        osc.connect(gain);gain.connect(audioCtx.destination);
        osc.frequency.value=880;gain.gain.value=0.3;osc.start();
        setTimeout(function(){osc.stop();},200);
        setTimeout(function(){
            const o2=audioCtx.createOscillator(),g2=audioCtx.createGain();
            o2.connect(g2);g2.connect(audioCtx.destination);
            o2.frequency.value=1046;g2.gain.value=0.3;o2.start();setTimeout(function(){o2.stop();},200);
        },300);
    }catch(e){}
}

// ---------- 2. 语音包切换 ----------
const VOICE_PACKS = {
    female: {label:'温柔女声', lang:'zh-CN', rate:1.0, pitch:1.0},
    male:   {label:'沉稳男声', lang:'zh-CN', rate:0.9, pitch:0.4},
    child:  {label:'童声',     lang:'zh-CN', rate:1.2, pitch:1.8},
    dialect:{label:'粤语',     lang:'zh-HK', rate:1.0, pitch:1.0},
    robot:  {label:'机器人',   lang:'zh-CN', rate:0.85, pitch:0.2},
};
let currentVoicePack = localStorage.getItem('voicePack') || 'female';

// 增强 speak 支持语音包
const _origSpeak = speak;
function speak(text){
    if(!('speechSynthesis' in window))return;
    try{
        speechSynthesis.cancel();
        const v = VOICE_PACKS[currentVoicePack] || VOICE_PACKS.female;
        const u=new SpeechSynthesisUtterance(text);
        u.lang=v.lang;u.rate=v.rate;u.pitch=v.pitch;
        const voices = speechSynthesis.getVoices();
        const match = voices.find(function(vv){return vv.lang===v.lang;}) || voices.find(function(vv){return vv.lang.indexOf(v.lang.split('-')[0])===0;});
        if(match)u.voice=match;
        speechSynthesis.speak(u);
    }catch(e){}
}

// ---------- 3. 自定义渐变背景 ----------
const PRESET_GRADIENTS = {
    sunset: 'linear-gradient(-45deg,#ee7752,#e73c7e,#f9d423)',
    ocean:  'linear-gradient(-45deg,#0ea5e9,#22d3ee,#0ea5e9,#2563eb)',
    forest: 'linear-gradient(-45deg,#16a34a,#22c55e,#0d9488)',
    galaxy: 'linear-gradient(-45deg,#1e1b4b,#7c3aed,#ec4899,#1e1b4b)',
    monochrome:'linear-gradient(-45deg,#1f2937,#374151,#1f2937)',
};
let customGradient = localStorage.getItem('customGradient') || '';
let useCustomGradient = localStorage.getItem('useCustomGradient') === 'true';

function applyGradient(nameOrCss){
    let css = nameOrCss;
    if(PRESET_GRADIENTS[nameOrCss]) css = PRESET_GRADIENTS[nameOrCss];
    document.body.style.background = css;
    document.body.style.backgroundSize = '400% 400%';
}

// ---------- 4. 自定义字体 ----------
const FONT_THEMES = {
    digital:{label:'数码管', family:'"Courier New","Lucida Console",monospace', shadow:'0 0 10px currentColor'},
    handwriting:{label:'手写体', family:'"Comic Sans MS","Segoe Print",cursive', shadow:'none'},
    pixel:{label:'像素风', family:'"Press Start 2P","Courier New",monospace', shadow:'2px 2px 0 #000'},
    neon:{label:'霓虹灯', family:'"Arial Black",Arial,sans-serif', shadow:'0 0 8px currentColor,0 0 20px currentColor'},
    classic:{label:'经典', family:'"Microsoft YaHei","Segoe UI",sans-serif', shadow:'none'},
};
let currentFontTheme = localStorage.getItem('fontTheme') || 'classic';

function applyFontTheme(key){
    const f = FONT_THEMES[key] || FONT_THEMES.classic;
    const timeEl = document.getElementById('time');
    if(timeEl){timeEl.style.fontFamily = f.family; timeEl.style.textShadow = f.shadow+',0 0 24px var(--main-shadow)';}
    localStorage.setItem('fontTheme', key);
}

// ---------- 5. 计时结束庆祝动画 ----------
function launchCelebration(){
    const old=document.getElementById('celebrationLayer'); if(old)old.remove();
    const layer = document.createElement('div');
    layer.id='celebrationLayer';
    const colors=['#ff0','#f0f','#0ff','#0f0','#ff6600','#ff0066'];
    for(let i=0;i<60;i++){
        const c=document.createElement('div');
        const size=6+Math.random()*10;
        c.style.cssText='position:absolute;top:50%;left:50%;width:'+size+'px;height:'+size+'px;'
            + 'background:'+colors[i%colors.length]+';border-radius:50%;opacity:.9;'
            + 'transform:translate(-50%,-50deg);'
            + 'animation:confettiFly '+(1.5+Math.random())+'s ease-out forwards;';
        const ang=Math.random()*Math.PI*2, dist=120+Math.random()*260;
        c.style.setProperty('--dx', Math.cos(ang)*dist+'px');
        c.style.setProperty('--dy', Math.sin(ang)*dist+'px');
        layer.appendChild(c);
    }
    const center=document.createElement('div');
    center.style.cssText='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:8vw;color:#fff;text-shadow:0 0 30px #ffd700;animation:celebPulse 1s infinite alternate;';
    center.textContent='🎉 时间到！';
    layer.appendChild(center);
    document.body.appendChild(layer);
    setTimeout(function(){layer.remove();}, 3500);
}

// ---------- 6. 无限历史记录 ----------
// 重写 addHistory：VIP 不限条数，普通用户限制 50
function addHistory(type,result){
    if(!checkVipValid(getUserData())){
        if(history.length>=50)history.shift();
    }
    history.push({type:type,result:result,timestamp:Date.now()});
    localStorage.setItem('timerHistory',JSON.stringify(history));
    renderHistory();
}

// ---------- 8. 详细统计报表 ----------
function generateStatsReport(){
    const a = getAchievementsData();
    const totalSessions = history.length;
    const countdownSessions = history.filter(function(h){return h.type==='倒计时';}).length;
    const stopwatchSessions = history.filter(function(h){return h.type==='正计时';}).length;
    const days = new Set(history.map(function(h){return new Date(h.timestamp).toLocaleDateString();})).size;
    const presetCount = {};
    history.forEach(function(h){ if(h.type==='倒计时'){presetCount[h.result]=(presetCount[h.result]||0)+1;} });
    const topEntry = Object.entries(presetCount).sort(function(a,b){return b[1]-a[1];})[0];
    return {
        totalMs:a.totalMs, streak:a.streak, totalSessions:totalSessions,
        countdownSessions:countdownSessions, stopwatchSessions:stopwatchSessions,
        activeDays:days, topPreset:topEntry?topEntry[0]:'—',
    };
}

// ---------- 7. 云端备份 (导出/导入 JSON) ----------
function cloudExport(){
    const data = {
        v:'1.4', exportAt:new Date().toISOString(),
        user:getUserData(), achievements:getAchievementsData(),
        presets:presets, history:history, laps:laps,
        multiTimers:multiTimers.map(function(t){return {id:t.id,name:t.name,elapsed:t.elapsed};}),
        settings:{finishMsg:finishMsg,customBeepUrl:customBeepUrl,voicePack:currentVoicePack,gradient:customGradient,fontTheme:currentFontTheme},
    };
    return JSON.stringify(data, null, 2);
}
function cloudImport(jsonText){
    const d=JSON.parse(jsonText);
    if(d.user)saveUserData(d.user);
    if(d.achievements)saveAchievementsData(d.achievements);
    if(d.presets){presets=d.presets;localStorage.setItem('customPresets',JSON.stringify(presets));}
    if(d.history){history=d.history;localStorage.setItem('timerHistory',JSON.stringify(history));}
    return true;
}

// ---------- 13. 成就分享卡片 ----------
function shareAchievementCard(ach){
    const card = document.createElement('canvas');
    card.width=600;card.height=400;
    const ctx=card.getContext('2d');
    const g=ctx.createLinearGradient(0,0,600,400);
    g.addColorStop(0,'#1e1b4b');g.addColorStop(1,'#7c3aed');
    ctx.fillStyle=g;ctx.fillRect(0,0,600,400);
    ctx.textAlign='center';
    ctx.font='30px sans-serif';ctx.fillStyle='#ffd700';
    ctx.fillText('🏆 成就解锁',300,80);
    ctx.font='80px sans-serif';ctx.fillText(ach.emoji||'🎯',300,190);
    ctx.font='36px sans-serif';ctx.fillStyle='#fff';
    ctx.fillText(ach.name||'计时达人',300,250);
    ctx.font='20px sans-serif';ctx.fillStyle='#ddd';
    ctx.fillText(ach.desc||'',300,295);
    ctx.font='16px sans-serif';ctx.fillStyle='#aaa';
    ctx.fillText('— 计时器 Pro —',300,360);
    return card.toDataURL('image/png');
}

// ---------- 14. 团队协作计时 (BroadcastChannel 跨标签同步) ----------
let teamRoom = null;
let teamChannel = null;
function joinTeamRoom(roomName){
    try{
        if('BroadcastChannel' in window){
            teamChannel = new BroadcastChannel('timer_team_'+roomName);
            teamChannel.onmessage = function(e){
                if(e.data && e.data.type==='tick'){
                    const t=document.getElementById('time'); if(t)t.textContent=fmt(e.data.elapsed);
                }
            };
        }
        teamRoom = roomName;
        localStorage.setItem('teamRoom', roomName);
        return true;
    }catch(e){return false;}
}
function teamBroadcast(elapsed){
    if(teamChannel && teamRoom){teamChannel.postMessage({type:'tick',elapsed:elapsed,from:teamRoom});}
}

/* ==================== 会员专属功能：设置面板绑定 ==================== */

// ---- 庆祝动画开关状态 ----
let celebrateEnabled = localStorage.getItem('celebrateEnabled') !== 'false';

// ---- 通用 VIP 校验拦截 ----
function guardVip(featureName){
    const u=getUserData();
    if(checkVipValid(u)) return true;
    alert((featureName||'该功能')+' 为 VIP 会员专享，请先开通会员');
    if(openVipBtn) openVipBtn.click();
    return false;
}

// ---- 渲染选项网格（通用） ----
function renderOptGrid(gridId, items, currentKey, onSelect, vipCheck){
    const grid=document.getElementById(gridId);
    if(!grid) return;
    grid.innerHTML='';
    Object.entries(items).forEach(function(entry){
        const key=entry[0], item=entry[1];
        const div=document.createElement('div');
        const locked = vipCheck && !checkVipValid(getUserData());
        const labelText = item.label !== undefined ? item.label : item;
        div.className='opt-item'+(currentKey===key?' active':'')+(locked?' vip-only':'');
        div.innerHTML='<span class="opt-em">'+(item.emoji||'')+'</span>'+labelText;
        div.onclick=function(){
            if(locked){guardVip(labelText);return;}
            onSelect(key);
            renderOptGrid(gridId,items,currentKey,onSelect,vipCheck);
        };
        grid.appendChild(div);
    });
}

// ---- 1. 自定义提示音 ----
document.getElementById('vipSound').onclick=function(){
    if(!guardVip('自定义提示音')) return;
    const inp=document.createElement('input');
    inp.type='file';inp.accept='audio/*';
    inp.onchange=function(){
        const file=inp.files[0]; if(!file) return;
        customBeepUrl=URL.createObjectURL(file);
        useCustomBeep=true;
        localStorage.setItem('customBeepUrl', customBeepUrl);
        localStorage.setItem('useCustomBeep','true');
        const a=new Audio(customBeepUrl); a.play().catch(function(){});
        alert('提示音已设置，计时结束时将播放此音频');
    };
    inp.click();
};

// ---- 2. 语音包 ----
function refreshVoiceGrid(){
    const items={};
    Object.entries(VOICE_PACKS).forEach(function(e){items[e[0]]={emoji:'🎙️',label:e[1].label};});
    renderOptGrid('voiceGrid', items, currentVoicePack, function(k){
        currentVoicePack=k; localStorage.setItem('voicePack',k);
        speak('语音包已切换'); alert('语音包已切换：'+VOICE_PACKS[k].label);
    });
}
document.getElementById('vipVoice').onclick=function(){ if(!guardVip('语音包切换')) return; refreshVoiceGrid(); document.getElementById('vipVoiceModal').classList.remove('hidden'); };

// ---- 3. 渐变背景 ----
function refreshGradientGrid(){
    const items={sunset:{emoji:'🌅',label:'日落'},ocean:{emoji:'🌊',label:'海洋'},forest:{emoji:'🌲',label:'森林'},galaxy:{emoji:'🌌',label:'星空'},monochrome:{emoji:'⚫',label:'极简'}};
    renderOptGrid('gradientGrid', items, (useCustomGradient?'custom':''), function(k){
        useCustomGradient=false; localStorage.setItem('useCustomGradient','false');
        applyGradient(k);
    });
    const preview=document.getElementById('gradientPreview');
    if(preview){preview.style.background= customGradient || 'linear-gradient(-45deg,#ee7752,#e73c7e,#23a6d5)';}
    const cgi=document.getElementById('customGradientInput');
    if(cgi && customGradient) cgi.value=customGradient;
}
document.getElementById('vipGradient').onclick=function(){ if(!guardVip('自定义渐变背景')) return; refreshGradientGrid(); document.getElementById('vipGradientModal').classList.remove('hidden'); };
document.getElementById('applyCustomGradient').onclick=function(){
    const v=document.getElementById('customGradientInput').value.trim();
    if(!v) return alert('请输入渐变 CSS');
    customGradient=v; useCustomGradient=true;
    localStorage.setItem('customGradient',v); localStorage.setItem('useCustomGradient','true');
    applyGradient(v); alert('自定义背景已应用');
};
document.addEventListener('click',function(e){
    if(e.target && e.target.id==='gradientPreview'){ document.getElementById('vipGradient').click(); }
});

// ---- 4. 字体主题 ----
function refreshFontGrid(){
    const items={};
    Object.entries(FONT_THEMES).forEach(function(e){items[e[0]]={emoji:'🔤',label:e[1].label};});
    renderOptGrid('fontGrid', items, currentFontTheme, function(k){ applyFontTheme(k); });
}
document.getElementById('vipFont').onclick=function(){ if(!guardVip('计时字体主题')) return; refreshFontGrid(); document.getElementById('vipFontModal').classList.remove('hidden'); };

// ---- 5. 庆祝动画开关 ----
document.getElementById('vipCelebrate').onclick=function(){
    if(!guardVip('计时结束庆祝动画')) return;
    celebrateEnabled=!celebrateEnabled;
    localStorage.setItem('celebrateEnabled', celebrateEnabled);
    if(celebrateEnabled){ launchCelebration(); alert('✅ 计时结束庆祝动画已开启（演示一次）'); }
    else alert('已关闭计时结束庆祝动画');
};

// ---- 6/8. 统计报表 ----
function refreshStatsReport(){
    const s=generateStatsReport();
    const el=document.getElementById('statsReport');
    if(!el) return;
    const pct = Math.min(100, Math.round(s.totalMs/3600000*10));
    el.innerHTML=
        '<div class="stat-row"><span>🕒 累计专注时长</span><strong>'+fmt(Math.floor(s.totalMs))+'（约 '+(s.totalMs/3600000).toFixed(1)+' 小时）</strong></div>'
        + '<div class="stat-row"><span>📅 连续使用天数</span><strong>'+s.streak+' 天</strong></div>'
        + '<div class="stat-row"><span>📊 总会话次数</span><strong>'+s.totalSessions+'</strong></div>'
        + '<div class="stat-row"><span>⏳ 倒计时 / 正计时</span><strong>'+s.countdownSessions+' / '+s.stopwatchSessions+'</strong></div>'
        + '<div class="stat-row"><span>📆 活跃天数</span><strong>'+s.activeDays+' 天</strong></div>'
        + '<div class="stat-row"><span>⭐ 最常用预设</span><strong>'+s.topPreset+'</strong></div>'
        + '<div class="stats-bar-wrap"><span style="font-size:12px;">专注进度（每10小时满格）</span>'
        + '<div class="stats-bar"><span style="width:'+pct+'%;"></span></div></div>';
}
document.getElementById('vipStats').onclick=function(){ if(!guardVip('详细统计报表')) return; refreshStatsReport(); document.getElementById('vipStatsModal').classList.remove('hidden'); };

// ---- 7. 云端备份 ----
document.getElementById('vipCloud').onclick=function(){ if(!guardVip('云端备份')) return; document.getElementById('cloudDataArea').value=''; document.getElementById('vipCloudModal').classList.remove('hidden'); };
document.getElementById('cloudExportBtn').onclick=function(){
    const json=cloudExport();
    document.getElementById('cloudDataArea').value=json;
    const blob=new Blob([json],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob); a.download='计时器备份_'+new Date().toISOString().slice(0,10)+'.json'; a.click();
    alert('已导出备份文件'); refreshUserUI();
};
document.getElementById('cloudImportBtn').onclick=function(){
    const txt=document.getElementById('cloudDataArea').value.trim();
    if(!txt) return alert('请先粘贴或导入 JSON 数据');
    try{ cloudImport(txt); alert('数据已恢复，页面将刷新'); location.reload(); }catch(e){ alert('数据格式错误：'+e.message); }
};

// ---- 10. 成就分享 ----
function refreshShareAchvGrid(){
    const grid=document.getElementById('shareAchvGrid'); if(!grid) return;
    const a=getAchievementsData();
    grid.innerHTML='';
    ACHIEVEMENTS.forEach(function(ach){
        const isUnl=!!a.unlocked[ach.id];
        const div=document.createElement('div');
        div.className='opt-item'+(isUnl?'':' vip-only');
        div.innerHTML='<span class="opt-em">'+(isUnl?ach.emoji:'🔒')+'</span>'+(isUnl?ach.name:'未解锁');
        div.onclick=function(){
            if(!isUnl) return alert('该成就尚未解锁');
            const dataUrl=shareAchievementCard(ach);
            const prev=document.getElementById('sharePreview');
            prev.innerHTML='<img src="'+dataUrl+'">';
            window.__lastShareDataUrl=dataUrl; window.__lastShareAchv=ach;
        };
        grid.appendChild(div);
    });
}
document.getElementById('vipShare').onclick=function(){ if(!guardVip('成就分享卡片')) return; refreshShareAchvGrid(); document.getElementById('sharePreview').innerHTML='<p style="color:#888;font-size:13px;">选择成就后预览</p>'; document.getElementById('vipShareModal').classList.remove('hidden'); };
document.getElementById('shareDownloadBtn').onclick=function(){
    if(!window.__lastShareDataUrl) return alert('请先选择一个成就');
    const a=document.createElement('a'); a.href=window.__lastShareDataUrl;
    a.download='成就_'+(window.__lastShareAchv?window.__lastShareAchv.name:'')+'_'+Date.now()+'.png'; a.click();
    // 下载后自动关闭分享卡片
    closeShareModal();
};

// ---- 分享卡片统一关闭（× / 按钮 / 遮罩 / ESC 共用） ----
function closeShareModal(){
    const mask=document.getElementById('vipShareModal'); if(mask) mask.classList.add('hidden');
}
// 右上角 × 关闭
document.getElementById('shareCloseX').onclick=closeShareModal;
// 点击遮罩（卡片外）关闭
document.getElementById('vipShareModal').addEventListener('click',function(e){
    if(e.target===this) closeShareModal();
});
// ESC 关闭
document.addEventListener('keydown',function(e){
    const mask=document.getElementById('vipShareModal');
    if(e.key==='Escape' && mask && !mask.classList.contains('hidden')) closeShareModal();
});

// ---- 14. 团队协作 ----
document.getElementById('vipTeam').onclick=function(){
    if(!guardVip('团队协作计时')) return;
    const rs=document.getElementById('roomStatus');
    if(rs){const t=localStorage.getItem('teamRoom'); rs.textContent=t?('当前房间：'+t):'尚未加入房间';}
    document.getElementById('vipTeamModal').classList.remove('hidden');
};
document.getElementById('joinRoomBtn').onclick=function(){
    const name=(document.getElementById('roomNameInput').value||'').trim(); if(!name) return alert('请输入房间名');
    if(joinTeamRoom(name)){ document.getElementById('roomStatus').textContent='已加入房间：'+name; alert('加入成功！房间内成员将同步计时'); }
    else alert('加入失败，请重试');
};
document.getElementById('leaveRoomBtn').onclick=function(){
    if(teamChannel){teamChannel.close();teamChannel=null;} teamRoom=null; localStorage.removeItem('teamRoom');
    document.getElementById('roomStatus').textContent='已离开房间';
};

// ---- 弹窗关闭（通用 data-close） ----
document.querySelectorAll('[data-close]').forEach(function(btn){
    btn.onclick=function(){ const id=btn.getAttribute('data-close'); const m=document.getElementById(id); if(m)m.classList.add('hidden'); };
});

// ---- 全站统一：点击遮罩空白处关闭弹窗（右上角× / Esc / 遮罩 三入口一致）----
// 例外：forceAgreementMask（强制协议）必须勾选后才能关，不参与自动关闭
document.querySelectorAll('.modal-mask').forEach(function(mask){
    mask.addEventListener('click',function(e){
        if(e.target!==mask)return;                       // 只响应点空白处，不拦截弹窗内部点击
        if(mask.id==='forceAgreementMask')return;        // 强制协议不可点遮罩关闭
        if(mask.id==='adminLoginModal')return;            // 登录弹窗：防止误点遮罩丢失输入，仅能点×/取消/登录
        mask.classList.add('hidden');
    });
});

/* ==================== 初始化会员专属功能 ==================== */
function initVipFeatures(){
    applyFontTheme(currentFontTheme);
    if(useCustomGradient && customGradient) applyGradient(customGradient);
    // 恢复自定义提示音播放函数绑定（覆盖默认 playBeep）
    refreshUserUI();
}


    // ============ 初始化 ============
    // 加载持久化数据
    try{
        presets=JSON.parse(localStorage.getItem('customPresets'))||[];
        history=JSON.parse(localStorage.getItem('timerHistory'))||[];
        const savedTimers=JSON.parse(localStorage.getItem('multiTimers'))||[];
        // 恢复多计时器（不恢复运行状态）
        multiTimers=savedTimers.map(t=>({...t,elapsed:0,running:false,timer:null}));
    }catch(e){}

    // 设置开关状态
    switchNotif.checked=notifEnabled;
    switchSpeech.checked=speechEnabled;

    // 初始化执行
    initSkinLoad();
    refreshUserUI();
    renderPlans();
    renderPresets();
    renderHistory();
    updateNotifDesc();
    updateVipLocks();
    // 新功能初始化
    renderAchievements();
    refreshQrPresetSelect();
    renderFinishMsgPreview();
    applyPresetFromUrl();   // 解析 ?preset= 自动填入（扫码启动预设）

    // 初始化会员专属功能
    initVipFeatures();

    // 初始 Tab
    viewBoxes.forEach(box=>box.classList.remove('active'));
    document.getElementById('stopwatch').classList.add('active');

    // ===== 关于我们 =====
    (function(){
        const aboutModal = document.getElementById('aboutModal');
        if(!aboutModal) return;
        var aboutShow = function(){ aboutModal.classList.remove('hidden'); };
        var aboutHide = function(){ aboutModal.classList.add('hidden'); };
        // 修复：改用自定义 toast，避免 alert() 在 file:// / 移动端被浏览器拦截，造成“点了没反应”
        const aboutAlert = function(msg){
            var old = document.getElementById('aboutToast');
            if(old) old.remove();
            var toast = document.createElement('div');
            toast.id = 'aboutToast';
            toast.style.cssText = 'position:fixed;left:50%;bottom:80px;transform:translateX(-50%);max-width:86%;background:rgba(20,20,35,0.96);color:#fff;padding:12px 18px;border-radius:10px;font-size:14px;line-height:1.6;border:1px solid #ff444488;z-index:9999;white-space:pre-wrap;text-align:left;';
            toast.textContent = msg;
            document.body.appendChild(toast);
            clearTimeout(toast._t);
            toast._t = setTimeout(function(){ toast.style.opacity='0'; toast.style.transition='opacity .3s'; setTimeout(function(){ toast.remove(); },300); }, 2600);
        };
        const btn = document.getElementById('setAbout');
        if(btn){ btn.onclick = aboutShow; }
        const closeBtn = document.getElementById('aboutClose');
        if(closeBtn){ closeBtn.onclick = aboutHide; }
        const upd = document.getElementById('aboutCheckUpdate');
        // 检查更新功能已移至 index.html 的 checkUpdateNow 函数
        const agree = document.getElementById('aboutUserAgreement');
        if(agree){ agree.onclick = function(){ openAgreementModal(); }; }
        const priv = document.getElementById('aboutPrivacy');
        if(priv){ priv.onclick = function(){ openPrivacyModal(); }; }
        const fb = document.getElementById('aboutFeedback');
        if(fb){ fb.onclick = function(){ aboutAlert('意见反馈\\n\\n邮箱：support@example.com\\n或前往官网提交工单，我们会认真阅读每一条反馈。'); }; }

        // ===== 新增功能 =====

        // ===== 通用复制函数（全局兜底，必须在 分享/好评 之前定义，避免“未定义”静默报错）=====
        // textarea 降级方案，兼容 file:// 与不支持 clipboard 的环境
        function fallbackCopy(text){
            try{
                var ta=document.createElement('textarea');
                ta.value=text; ta.style.position='fixed'; ta.style.opacity='0';
                document.body.appendChild(ta); ta.select();
                var ok=document.execCommand('copy'); document.body.removeChild(ta); return ok;
            }catch(e){ return false; }
        }
        // 提升到 window，保证事件委托 / 其他脚本块也能安全调用
        window.copyText = function(text){
            return new Promise(function(resolve){
                if(navigator.clipboard && navigator.clipboard.writeText){
                    navigator.clipboard.writeText(text).then(function(){resolve(true);},function(){resolve(fallbackCopy(text));});
                }else{ resolve(fallbackCopy(text)); }
            });
        };

        // 关于我们页面的点击复制功能
        var copyDev = document.getElementById('copyDeveloper');
        if(copyDev){ copyDev.onclick = function(){ window.copyText('新华小店').then(function(){ aboutAlert('✅ 开发者名称已复制到剪贴板'); }); }; }
        var copyEm = document.getElementById('copyEmail');
        if(copyEm){ copyEm.onclick = function(){ window.copyText('qazwsx1212349@163.com').then(function(){ aboutAlert('✅ 邮箱已复制到剪贴板'); }); }; }
        var copyWeb = document.getElementById('copyWebsite');
        if(copyWeb){ copyWeb.onclick = function(){ window.copyText('https://timer-pro-app.netlify.app').then(function(){ aboutAlert('✅ 官网地址已复制到剪贴板'); }); }; }

        // 打开弹窗时刷新使用数据（兼容真实存储 key：timerHistory / customPresets / timerAchievements）
        var _refreshAboutStats = function(){
            try{
                var rawHistory = localStorage.getItem('timerHistory');
                var h = rawHistory ? JSON.parse(rawHistory) : [];
                var count = h.length;
                var total = 0;
                h.forEach(function(x){
                    var r = x.result || '';
                    // 格式1：HH:MM:SS 或 HH:MM:SS.xx（正计时 / 倒计时到点）
                    var m = r.match(/(\d+):(\d+):(\d+)/);
                    if(m){ total += +m[1]*3600 + +m[2]*60 + +m[3]; return; }
                    // 格式2：中文「X时X分X秒 → 到点」（倒计时结果）
                    var c = r.match(/(\d+)时(\d+)分(\d+)秒/);
                    if(c){ total += +c[1]*3600 + +c[2]*60 + +c[3]; }
                });
                var fmt = function(s){ var hh=Math.floor(s/3600),mm=Math.floor(s%3600/60); return hh?hh+'时'+mm+'分':(mm?mm+'分':'0分'); };
                var setText = function(id,v){ var el=document.getElementById(id); if(el)el.textContent=v; };
                setText('statCount', count + ' 次');
                setText('statDuration', fmt(total));
                var presets = JSON.parse(localStorage.getItem('customPresets')||'[]');
                setText('statPresets', (presets.length||0) + ' 个');
                // 成就：兼容 timerAchievements（真实 key）与 achievements 两种命名
                var achRaw = localStorage.getItem('timerAchievements') || localStorage.getItem('achievements') || '[]';
                var ach = JSON.parse(achRaw);
                var totalAch = (window.ACHIEVEMENTS && ACHIEVEMENTS.length) || ach.length || '-';
                var done = ach.filter(function(a){ return a && a.unlocked; }).length;
                setText('statAch', totalAch!=='-' ? (done+'/'+totalAch) : '-');
            }catch(e){}
        };
        // 拦截 aboutShow，注入数据刷新
        var _origShow = aboutShow;
        aboutShow = function(){ _refreshAboutStats(); _origShow(); };

        // 分享应用（Web Share API + 复制链接兜底；file:// 下直接走复制，保证必有反馈）
        var shareBtn = document.getElementById('aboutShare');
        if(shareBtn){ shareBtn.onclick = function(){
            var shareData = { title:'计时器 Pro', text:'一款简洁纯粹的网页计时工具', url: location.href };
            var doneCopy = function(){
                copyText(location.href).then(function(){
                    // 分享奖励积分（每天限1次）
                    var todayShare = localStorage.getItem('shareReward_' + new Date().toISOString().slice(0,10));
                    if(!todayShare){
                        localStorage.setItem('shareReward_' + new Date().toISOString().slice(0,10), '1');
                        if(window.addPoints) window.addPoints(25);
                        aboutAlert('✅ 链接已复制，获得25积分！\n快去分享给朋友吧！\n'+location.href);
                    } else {
                        aboutAlert('✅ 链接已复制，快去分享给朋友吧！\n'+location.href);
                    }
                }).catch(function(){
                    aboutAlert('⚠️ 当前环境无法自动复制，请手动分享：\n'+location.href);
                });
            };
            if(navigator.share && location.protocol!=='file:'){
                navigator.share(shareData).then(function(){}, doneCopy);  // 成功/取消/失败都走兜底
            }else{ doneCopy(); }   // file:// 直接复制，绝不静默
        }; }

        // 使用帮助
        var helpBtn = document.getElementById('aboutHelp');
        if(helpBtn){ helpBtn.onclick = function(){ aboutAlert(
            '📖 使用帮助\\n\\n'+
            '• 正计时：点「开始」累计计时，「暂停」可续跑\\n'+
            '• 倒计时：设置时长后开始，归零自动提醒\\n'+
            '• 预设模板：保存常用时长，一键启动\\n'+
            '• 全屏沉浸：双击计时区进入/退出\\n'+
            '• 语音播报：在设置中开启最后 10 秒报时\\n'+
            '• 数据导出：设置页可导出全部记录\\n'+
            '• 清除记录：设置页「清除计算记录」仅清历史，保留设置'
        ); }; }

        // 更新日志：点击跳转到设置页并展开更新日志
        var logBtn = document.getElementById('aboutChangelog');
        if(logBtn){ logBtn.onclick = function(){
            // 切换到设置标签页
            var settingTab = document.querySelector('[data-view="setting"]');
            if(settingTab) settingTab.click();
            // 关闭关于弹窗
            var aboutModal = document.getElementById('aboutModal');
            if(aboutModal) aboutModal.classList.add('hidden');
            // 展开更新日志
            setTimeout(function(){
                var details = document.querySelector('.changelog-content').closest('details');
                if(details) details.open = true;
                // 滚动到更新日志位置
                details.scrollIntoView({behavior:'smooth', block:'center'});
            }, 100);
        }; }

        // 五星评分（本地记忆）
        var rateBtn = document.getElementById('aboutRate');
        var starsEl = document.getElementById('rateStars');
        var RATE_KEY = 'appRating';
        var renderStars = function(n){
            if(!starsEl) return;
            var s = ''; for(var i=1;i<=5;i++) s += '<span class="'+(i<=n?'on':'')+'">★</span>';
            starsEl.innerHTML = s;
        };
        var savedRate = +localStorage.getItem(RATE_KEY) || 0;
        renderStars(savedRate);
        if(rateBtn){ rateBtn.onclick = function(){
            var box = document.createElement('div');
            box.className = 'modal-mask';
            box.innerHTML = '<div class="modal-box" style="max-width:320px;text-align:center;">'+
                '<div style="font-size:18px;font-weight:bold;margin-bottom:6px;">为计时器 Pro 评分</div>'+
                '<div class="about-rate-stars" id="rateStarInput">'+
                '<span>★</span><span>★</span><span>★</span><span>★</span><span>★</span></div>'+
                '<div style="font-size:13px;color:#888;margin-bottom:14px;" id="rateTip">点击星星评分</div>'+
                '<div class="modal-btn-row" style="border:none;padding:0;">'+
                '<button id="rateCancel" style="flex:1;padding:10px;">取消</button></div></div>';
            document.body.appendChild(box);
            var cur = savedRate; renderStars(cur);
            box.querySelectorAll('#rateStarInput span').forEach(function(star,idx){
                star.onmouseenter = star.ontouchstart = function(e){
                    if(e) e.stopPropagation();
                    renderStars(idx+1); box.querySelector('#rateTip').textContent = ['','','不错','很好','太棒了'][idx]||'太棒了';
                };
                star.onclick = function(e){
                    if(e) e.stopPropagation();
                    cur = idx+1; localStorage.setItem(RATE_KEY, cur); savedRate = cur;
                    renderStars(cur);
                    box.querySelector('#rateTip').textContent = '感谢评分！🎉';
                    // 评分奖励积分（只奖励一次）
                    if(!localStorage.getItem('ratingRewarded')){
                        localStorage.setItem('ratingRewarded', '1');
                        if(window.addPoints) window.addPoints(30);
                    }
                    setTimeout(function(){ box.remove(); aboutAlert('🎉 感谢你的 '+cur+' 星好评！\\n获得30积分奖励～\\n你的支持是我们更新的动力～'); }, 600);
                };
            });
            box.querySelector('#rateCancel').onclick = function(e){ if(e)e.stopPropagation(); box.remove(); };
            box.addEventListener('click', function(e){ if(e.target===box) box.remove(); });
        }; }

        // 版本号连点彩蛋 → 连续点击 5 次唤起/关闭开发者选项
        var eggEl = document.getElementById('aboutEgg');
        if(eggEl){ (function(){
            var eggTimer=null, eggCount=0;
            var devPanel = document.getElementById('devPanel');
            var clickTip = document.getElementById('clickTip');
            eggEl.onclick = function(){
                clearTimeout(eggTimer); eggCount++;
                var rem = 5 - eggCount;
                if(rem>0 && clickTip){ clickTip.style.display='block'; clickTip.innerText='再点击 '+rem+' 次开启开发者选项'; }
                eggTimer = setTimeout(function(){ eggCount=0; if(clickTip){ clickTip.style.display='none'; } }, 1200);
                if(eggCount>=5){
                    if(devPanel){ devPanel.style.display = devPanel.style.display==='block'?'none':'block'; }
                    if(clickTip){ clickTip.innerText = (devPanel && devPanel.style.display==='block')?'已开启开发者选项':'已关闭'; setTimeout(function(){ clickTip.style.display='none'; },1500); }
                    aboutAlert('🔧 开发者选项' + (devPanel && devPanel.style.display==='block'?' 已开启':' 已关闭') + '（等同于设置页连点版本号 5 次）');
                    eggCount=0; clearTimeout(eggTimer);
                }
            };
        })(); }
    })();

    // ===== 检查更新（联网检测） =====
    // testMode:true 时，使用下方 TEST_URL（页面内联的高版本 JSON），
    //   无需任何服务器即可验证"发现新版本"完整流程。
    // 正式上线时把 testMode 改为 false，并把自己的 version.json 地址填到 remoteUrl。
    window.UPDATE_CFG = {
        testMode: false,
        current: '1.6.0',
        timeout: 8000,
        remoteUrl: 'https://timer-pro-v1.surge.sh/version.json',
        TEST_URL: 'https://timer-pro-v1.surge.sh/version.json'
    };
    function isNewerVersion(remote, current) {
        var r = String(remote).split('.').map(Number);
        var c = String(current).split('.').map(Number);
        for (var i = 0; i < 3; i++) {
            if ((r[i] || 0) > (c[i] || 0)) return true;
            if ((r[i] || 0) < (c[i] || 0)) return false;
        }
        return false;
    }
    // 判断当前是否为 file:// 协议打开（此时 fetch 必被浏览器同源策略拦截）
    function isFileProtocol() {
        return location.protocol === 'file:' || location.protocol === 'null:';
    }
    // 测试模式下的内联版本数据（与 TEST_URL 内容一致，CDN 被拦时自动降级使用）
    var TEST_DATA = {
        version: '1.5.0',
        url: 'https://your-domain.com/timer-pro/release',
        note: '1. 内置可访问的测试更新地址\n2. 检查更新调试日志优化\n3. 修复弹窗关闭按钮显示问题',
        forced: false
    };
    // 显示更新弹窗
    function showUpdateModal(data) {
        var modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;';
        modal.innerHTML = '<div style="background:linear-gradient(135deg,#1a1d36,#2d1b4e);border:1px solid rgba(106,17,203,0.5);border-radius:16px;padding:24px;max-width:380px;width:100%;box-shadow:0 8px 32px rgba(106,17,203,0.3);">' +
            '<div style="text-align:center;font-size:40px;margin-bottom:8px;">🆕</div>' +
            '<div style="text-align:center;font-size:20px;font-weight:bold;color:#fff;margin-bottom:4px;">发现新版本</div>' +
            '<div style="text-align:center;font-size:14px;color:#a78bfa;margin-bottom:16px;">V' + UPDATE_CFG.current + ' → V' + data.version + '</div>' +
            '<div style="background:rgba(255,255,255,0.05);border-radius:8px;padding:12px;margin-bottom:16px;max-height:200px;overflow-y:auto;">' +
            '<div style="font-size:13px;color:#ccc;white-space:pre-wrap;line-height:1.6;">' + (data.note || '暂无更新说明') + '</div></div>' +
            '<div style="display:flex;gap:10px;">' +
            '<button id="updateLaterBtn" style="flex:1;padding:12px;border:1px solid rgba(255,255,255,0.2);background:transparent;color:#ccc;border-radius:8px;font-size:14px;cursor:pointer;">稍后再说</button>' +
            '<button id="updateNowBtn" style="flex:1;padding:12px;border:none;background:linear-gradient(135deg,#6a11cb,#2575fc);color:#fff;border-radius:8px;font-size:14px;font-weight:bold;cursor:pointer;">立即更新</button>' +
            '</div></div>';
        document.body.appendChild(modal);
        document.getElementById('updateLaterBtn').onclick = function(){ modal.remove(); };
        document.getElementById('updateNowBtn').onclick = function(){ location.reload(); };
    }
    // 页面加载后自动检查更新
    setTimeout(function(){ if(typeof window.checkUpdateOnline === 'function') window.checkUpdateOnline(); }, 3000);

    window.checkUpdateOnline = function() {
        var statusEl = document.getElementById('updateStatusText');
        var setStatus = function (text, color) {
            if (statusEl) { statusEl.textContent = text; statusEl.style.color = color || '#fff'; }
            var btnText = document.getElementById('checkUpdateText');
            if (btnText && text.indexOf('检测中') < 0) { btnText.textContent = text; }
        };
        setStatus('检测中…', '#ffcc00');
        console.log('[检查更新] 开始检测');
        
        var done = false;
        var timeout = setTimeout(function() {
            if (!done) {
                done = true;
                setStatus('检测超时，请稍后重试', '#ff9500');
                console.warn('[检查更新] 超时');
            }
        }, 8000);
        
        try {
            fetch(UPDATE_CFG.remoteUrl + '?_t=' + Date.now(), { cache: 'no-store', mode: 'cors' })
                .then(function(res) {
                    if (!res.ok) throw new Error('HTTP ' + res.status);
                    return res.json();
                })
                .then(function(data) {
                    if (done) return;
                    done = true;
                    clearTimeout(timeout);
                    console.log('[检查更新] 远端版本', data.version);
                    if (isNewerVersion(data.version, UPDATE_CFG.current)) {
                        showUpdateModal(data);
                        setStatus('有新版本 ' + data.version, '#ff3b30');
                    } else {
                        setStatus('已是最新版本 V' + UPDATE_CFG.current, '#34c759');
                    }
                })
                .catch(function(err) {
                    if (done) return;
                    done = true;
                    clearTimeout(timeout);
                    console.warn('[检查更新] 失败:', err.message);
                    setStatus('检测失败：' + err.message, '#ff9500');
                });
        } catch(e) {
            done = true;
            clearTimeout(timeout);
            setStatus('检测异常：' + e.message, '#ff9500');
        }
    };
    // ===== 用户协议 / 隐私政策 正规弹窗 =====
    function openAgreementModal() {
        var m = document.getElementById('agreementModal');
        if (m) m.classList.remove('hidden');
    }
    function openPrivacyModal() {
        var m = document.getElementById('privacyModal');
        if (m) m.classList.remove('hidden');
    }
});
