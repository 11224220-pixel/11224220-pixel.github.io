// ============================================================================
// AEGIS NEXUS // 共用核心引擎 (音效、鏡頭震動、粒子物理、永久殘骸、輸入管理)
// ============================================================================

const AudioFX = {
  enabled: true,
  ctx: null,
  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  },
  play(type) {
    if (!this.enabled) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.connect(gain);
    gain.connect(this.ctx.destination);

    switch (type) {
      case 'vulcan':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(340 + Math.random() * 80, t);
        osc.frequency.exponentialRampToValueAtTime(75, t + 0.06);
        gain.gain.setValueAtTime(0.11, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc.start(t); osc.stop(t + 0.06);
        break;
      case 'railgun':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1150, t);
        osc.frequency.exponentialRampToValueAtTime(110, t + 0.24);
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);
        osc.start(t); osc.stop(t + 0.24);
        break;
      case 'missile':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.linearRampToValueAtTime(480, t + 0.14);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        osc.start(t); osc.stop(t + 0.16);
        break;
      case 'tesla':
        osc.type = 'square';
        osc.frequency.setValueAtTime(780, t);
        osc.frequency.setValueAtTime(520, t + 0.05);
        osc.frequency.setValueAtTime(920, t + 0.1);
        gain.gain.setValueAtTime(0.1, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.start(t); osc.stop(t + 0.15);
        break;
      case 'explosion':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(125, t);
        osc.frequency.exponentialRampToValueAtTime(28, t + 0.32);
        gain.gain.setValueAtTime(0.22, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);
        osc.start(t); osc.stop(t + 0.32);
        break;
      case 'orbital':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(36, t + 0.65);
        gain.gain.setValueAtTime(0.28, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);
        osc.start(t); osc.stop(t + 0.65);
        break;
      case 'dash':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, t);
        osc.frequency.exponentialRampToValueAtTime(640, t + 0.14);
        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        osc.start(t); osc.stop(t + 0.14);
        break;
      case 'pickup':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(620, t);
        osc.frequency.setValueAtTime(940, t + 0.07);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
        osc.start(t); osc.stop(t + 0.16);
        break;
    }
  }
};

// 視覺特效系統（粒子、衝擊波環、物理彈殼、永久彈坑殘骸）
class FXManager {
  constructor() {
    this.particles = [];
    this.rings = [];
    this.shells = [];
    this.decals = [];
    this.shake = 0;
    this.hitstop = 0;
  }

  addShake(amount) {
    this.shake = Math.min(28, this.shake + amount);
  }

  addHitstop(sec) {
    this.hitstop = Math.max(this.hitstop, sec);
  }

  spawnExplosion(x, y, color = '#f59e0b', scale = 1, leaveDecal = true) {
    this.addShake(7 * scale);
    this.rings.push({ x, y, r: 6, maxR: 52 * scale, color, alpha: 0.9, speed: 240 * scale });

    const count = Math.floor(16 * scale);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = (50 + Math.random() * 220) * scale;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: (2 + Math.random() * 3.5) * scale,
        color: i % 3 === 0 ? '#ffffff' : color,
        life: 0.28 + Math.random() * 0.35,
        maxLife: 0.63,
        glow: true
      });
    }

    // 煙霧粒子
    for (let i = 0; i < Math.floor(6 * scale); i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 20 + Math.random() * 55;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: (8 + Math.random() * 10) * scale,
        color: 'rgba(30, 41, 59, 0.65)',
        life: 0.5 + Math.random() * 0.45,
        maxLife: 0.95,
        glow: false
      });
    }

    if (leaveDecal) {
      this.decals.push({
        x, y,
        r: (14 + Math.random() * 12) * scale,
        angle: Math.random() * Math.PI * 2,
        shards: Array.from({ length: 4 }, () => ({
          dx: (Math.random() - 0.5) * 26 * scale,
          dy: (Math.random() - 0.5) * 26 * scale,
          w: (4 + Math.random() * 6) * scale,
          h: (2 + Math.random() * 4) * scale,
          rot: Math.random() * Math.PI
        }))
      });
      if (this.decals.length > 75) this.decals.shift();
    }
  }

  spawnShell(x, y, ejectAngle) {
    const a = ejectAngle + (Math.random() - 0.5) * 0.45;
    const spd = 75 + Math.random() * 65;
    this.shells.push({
      x, y,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      rot: Math.random() * Math.PI,
      vrot: (Math.random() - 0.5) * 18,
      life: 1.4
    });
    if (this.shells.length > 90) this.shells.shift();
  }

  update(dt) {
    if (this.shake > 0) this.shake = Math.max(0, this.shake - 45 * dt);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.r += r.speed * dt;
      r.alpha -= 2.4 * dt;
      if (r.alpha <= 0 || r.r >= r.maxR) this.rings.splice(i, 1);
    }

    for (let i = this.shells.length - 1; i >= 0; i--) {
      const s = this.shells[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vx *= 0.91;
      s.vy *= 0.91;
      s.rot += s.vrot * dt;
      s.vrot *= 0.92;
      s.life -= dt;
      if (s.life <= 0) this.shells.splice(i, 1);
    }
  }

  renderDecals(ctx) {
    for (const d of this.decals) {
      const grad = ctx.createRadialGradient(d.x, d.y, 1, d.x, d.y, d.r);
      grad.addColorStop(0, 'rgba(3, 5, 8, 0.85)');
      grad.addColorStop(0.6, 'rgba(15, 23, 42, 0.45)');
      grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#334155';
      for (const sh of d.shards) {
        ctx.save();
        ctx.translate(d.x + sh.dx, d.y + sh.dy);
        ctx.rotate(sh.rot);
        ctx.fillRect(-sh.w / 2, -sh.h / 2, sh.w, sh.h);
        ctx.restore();
      }
    }

    // 黃銅彈殼
    ctx.fillStyle = '#fbbf24';
    for (const s of this.shells) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.globalAlpha = Math.min(1, s.life * 2);
      ctx.fillRect(-2.5, -1, 5, 2);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  renderParticles(ctx) {
    for (const r of this.rings) {
      ctx.save();
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = Math.max(0, r.alpha);
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      if (p.glow) {
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
      }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// 全域總控台 (Nexus)
const Nexus = {
  modules: {},
  current: null,
  canvas: document.getElementById('game-canvas'),
  ctx: null,
  raf: null,
  lastTime: 0,
  keys: {},
  mouse: { x: 0, y: 0, down: false, clicked: false, wheel: 0 },

  register(id, factory) {
    this.modules[id] = factory;
  },

  getRecord(id) {
    return Number(localStorage.getItem('aegis_nexus_' + id) || 0);
  },

  saveRecord(id, val) {
    if (val > this.getRecord(id)) {
      localStorage.setItem('aegis_nexus_' + id, Math.floor(val));
      this.refreshRecords();
    }
  },

  refreshRecords() {
    ['mech', 'cyber', 'tower', 'void'].forEach(id => {
      const el = document.getElementById('stat-' + id);
      if (el) el.textContent = this.getRecord(id);
    });
  },

  init() {
    this.ctx = this.canvas.getContext('2d');
    this.refreshRecords();
    this.renderLobbyPreviews();

    document.getElementById('btn-audio').addEventListener('click', () => {
      AudioFX.enabled = !AudioFX.enabled;
      document.getElementById('btn-audio').textContent = AudioFX.enabled ? '🔊 音效：開啟' : '🔇 音效：靜音';
    });

    document.getElementById('btn-home').addEventListener('click', () => this.toLobby());

    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) && this.current) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });

    this.canvas.addEventListener('mousemove', e => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
    });
    this.canvas.addEventListener('mousedown', e => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
      this.mouse.down = true;
      this.mouse.clicked = true;
    });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });
    this.canvas.addEventListener('wheel', e => {
      this.mouse.wheel = Math.sign(e.deltaY);
    }, { passive: true });

    window.addEventListener('resize', () => {
      if (!this.current) return;
      this.canvas.width = this.canvas.parentElement.clientWidth;
      this.canvas.height = this.canvas.parentElement.clientHeight;
      if (this.current.onResize) this.current.onResize();
    });
  },

  launch(id) {
    AudioFX.init();
    document.getElementById('lobby-screen').classList.add('hidden');
    document.getElementById('stage-screen').classList.remove('hidden');
    document.getElementById('btn-home').classList.remove('hidden');
    document.getElementById('result-modal').classList.add('hidden');
    document.getElementById('hud-bottom').innerHTML = '';

    this.canvas.width = this.canvas.parentElement.clientWidth;
    this.canvas.height = this.canvas.parentElement.clientHeight;

    this.current = this.modules[id]();
    this.current.init(this.canvas, this.ctx);

    this.lastTime = performance.now();
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(t => this.loop(t));
  },

  toLobby() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.current = null;
    document.getElementById('result-modal').classList.add('hidden');
    document.getElementById('stage-screen').classList.add('hidden');
    document.getElementById('btn-home').classList.add('hidden');
    document.getElementById('lobby-screen').classList.remove('hidden');
    this.refreshRecords();
  },

  showResult(title, subtitle, metricsHtml, onRestart) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-subtitle').textContent = subtitle;
    document.getElementById('modal-metrics').innerHTML = metricsHtml;
    document.getElementById('result-modal').classList.remove('hidden');
    document.getElementById('modal-restart').onclick = () => {
      document.getElementById('result-modal').classList.add('hidden');
      onRestart();
    };
  },

  loop(now) {
    if (!this.current) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.current.update(dt);
    this.current.render();

    this.mouse.clicked = false;
    this.mouse.wheel = 0;
    this.raf = requestAnimationFrame(t => this.loop(t));
  },

  // 繪製大廳 4 張高質感預覽圖
  renderLobbyPreviews() {
    const setup = (id) => {
      const c = document.getElementById(id);
      c.width = 340; c.height = 150;
      return c.getContext('2d');
    };

    // 1. 機甲預覽
    const g1 = setup('prev-mech');
    g1.fillStyle = '#090d14'; g1.fillRect(0, 0, 340, 150);
    g1.strokeStyle = 'rgba(245,158,11,0.18)';
    for (let x = 0; x < 340; x += 28) { g1.beginPath(); g1.moveTo(x, 0); g1.lineTo(x, 150); g1.stroke(); }
    const rad1 = g1.createRadialGradient(130, 75, 4, 130, 75, 55);
    rad1.addColorStop(0, 'rgba(245,158,11,0.5)'); rad1.addColorStop(1, 'transparent');
    g1.fillStyle = rad1; g1.fillRect(70, 20, 120, 110);
    g1.fillStyle = '#334155'; g1.fillRect(112, 57, 36, 36);
    g1.fillStyle = '#f59e0b'; g1.fillRect(142, 63, 28, 7); g1.fillRect(142, 80, 28, 7);
    g1.strokeStyle = '#38bdf8'; g1.lineWidth = 2.5; g1.beginPath(); g1.moveTo(170, 75); g1.lineTo(340, 52); g1.stroke();

    // 2. 賽車預覽
    const g2 = setup('prev-cyber');
    const sky = g2.createLinearGradient(0, 0, 0, 75);
    sky.addColorStop(0, '#090418'); sky.addColorStop(1, '#3b0764');
    g2.fillStyle = sky; g2.fillRect(0, 0, 340, 75);
    g2.fillStyle = '#f43f5e'; g2.beginPath(); g2.arc(170, 75, 38, Math.PI, 0); g2.fill();
    g2.fillStyle = '#090d16'; g2.fillRect(0, 75, 340, 75);
    g2.fillStyle = '#1e1b2e';
    g2.beginPath(); g2.moveTo(140, 75); g2.lineTo(200, 75); g2.lineTo(310, 150); g2.lineTo(30, 150); g2.fill();
    g2.strokeStyle = '#f43f5e'; g2.lineWidth = 3;
    g2.beginPath(); g2.moveTo(140, 75); g2.lineTo(30, 150); g2.moveTo(200, 75); g2.lineTo(310, 150); g2.stroke();

    // 3. 塔防預覽
    const g3 = setup('prev-tower');
    g3.fillStyle = '#080e17'; g3.fillRect(0, 0, 340, 150);
    g3.strokeStyle = '#1e293b'; g3.lineWidth = 34;
    g3.beginPath(); g3.moveTo(0, 50); g3.lineTo(170, 50); g3.lineTo(170, 105); g3.lineTo(340, 105); g3.stroke();
    g3.fillStyle = '#06b6d4'; g3.beginPath(); g3.arc(115, 92, 14, 0, Math.PI * 2); g3.fill();
    g3.strokeStyle = '#a855f7'; g3.lineWidth = 3;
    g3.beginPath(); g3.moveTo(115, 92); g3.lineTo(170, 65); g3.lineTo(220, 105); g3.stroke();

    // 4. 星艦預覽
    const g4 = setup('prev-void');
    g4.fillStyle = '#04070d'; g4.fillRect(0, 0, 340, 150);
    g4.strokeStyle = 'rgba(16, 185, 129, 0.35)'; g4.lineWidth = 2;
    g4.beginPath(); g4.arc(135, 75, 34, 0, Math.PI * 2); g4.stroke();
    g4.fillStyle = '#e2e8f0';
    g4.beginPath(); g4.moveTo(155, 75); g4.lineTo(120, 60); g4.lineTo(128, 75); g4.lineTo(120, 90); g4.closePath(); g4.fill();
    g4.fillStyle = '#10b981'; g4.fillRect(102, 71, 18, 8);
  }
};

window.addEventListener('DOMContentLoaded', () => Nexus.init());
