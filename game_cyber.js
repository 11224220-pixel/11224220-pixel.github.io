// ============================================================================
// GAME 2: 霓虹深淵：極速重力 (NEON ABYSS: GRAVITY VELOCITY)
// ============================================================================
Nexus.register('cyber', () => {
  return {
    fx: new FXManager(),
    playerX: 0,
    tilt: 0,
    speed: 480,
    dist: 0,
    score: 0,
    nitro: 100,
    combo: 1,
    traffic: [],
    orbs: [],
    spawnCd: 0,
    over: false,

    init(canvas, ctx) {
      this.canvas = canvas;
      this.ctx = ctx;
      this.fx = new FXManager();
      this.playerX = 0;
      this.tilt = 0;
      this.speed = 500;
      this.dist = 0;
      this.score = 0;
      this.nitro = 100;
      this.combo = 1;
      this.traffic = [];
      this.orbs = [];
      this.over = false;
      document.getElementById('hud-hint').textContent = 'A / D 或 左右方向鍵變換車道 | 按住 空白鍵 啟動雙渦輪氮氣噴射';
    },

    update(dt) {
      if (this.over) return;
      this.fx.update(dt);

      const boosting = (Nexus.keys['Space'] || Nexus.keys['ShiftLeft']) && this.nitro > 4;
      if (boosting) {
        this.nitro = Math.max(0, this.nitro - 36 * dt);
        this.speed = Math.min(1450, this.speed + 720 * dt);
        this.fx.addShake(2.2);
      } else {
        this.nitro = Math.min(100, this.nitro + 11 * dt);
        const baseTarget = Math.min(1020, 540 + this.dist * 0.045);
        this.speed += (baseTarget - this.speed) * 2.4 * dt;
      }

      let steer = 0;
      if (Nexus.keys['ArrowLeft'] || Nexus.keys['KeyA']) steer -= 1;
      if (Nexus.keys['ArrowRight'] || Nexus.keys['KeyD']) steer += 1;
      this.tilt += (steer * 0.22 - this.tilt) * 10 * dt;
      this.playerX = Math.max(-0.84, Math.min(0.84, this.playerX + steer * 1.85 * dt));

      this.dist += this.speed * dt * 0.05;
      this.score += this.speed * dt * 0.14 * this.combo;
      Nexus.saveRecord('cyber', this.score);

      this.spawnCd -= dt;
      if (this.spawnCd <= 0) {
        this.spawnCd = Math.max(0.3, 0.82 - this.dist * 0.00028);
        const lanes = [-0.6, 0, 0.6];
        const lane = lanes[Math.floor(Math.random() * lanes.length)];
        if (Math.random() < 0.24) {
          this.orbs.push({ lane, z: 1.0 });
        } else {
          const palette = ['#f43f5e', '#38bdf8', '#c084fc', '#fb923c'];
          this.traffic.push({
            lane, z: 1.0,
            spd: 270 + Math.random() * 140,
            color: palette[Math.floor(Math.random() * palette.length)],
            grazed: false
          });
        }
      }

      for (let i = this.traffic.length - 1; i >= 0; i--) {
        const c = this.traffic[i];
        c.z -= ((this.speed - c.spd) / 920) * dt;

        // 極限擦身獎勵
        if (!c.grazed && c.z < 0.13 && c.z > 0.04) {
          const gap = Math.abs(c.lane - this.playerX);
          if (gap >= 0.20 && gap < 0.38) {
            c.grazed = true;
            this.combo = Math.min(10, this.combo + 1);
            this.score += 150 * this.combo;
            AudioFX.play('pickup');
          }
        }

        if (c.z < 0.11 && c.z > 0.02 && Math.abs(c.lane - this.playerX) < 0.20) {
          this.over = true;
          AudioFX.play('explosion');
          this.fx.addShake(24);
          Nexus.showResult(
            '賽車解體',
            '在超音速車流中發生致命撞擊！',
            `<div>最終積分<strong>${Math.floor(this.score)}</strong></div><div>最高紀錄<strong>${Nexus.getRecord('cyber')}</strong></div>`,
            () => this.init(this.canvas, this.ctx)
          );
          return;
        }
        if (c.z < -0.1) this.traffic.splice(i, 1);
      }

      for (let i = this.orbs.length - 1; i >= 0; i--) {
        const o = this.orbs[i];
        o.z -= (this.speed / 920) * dt;
        if (o.z < 0.12 && o.z > 0.01 && Math.abs(o.lane - this.playerX) < 0.24) {
          this.nitro = Math.min(100, this.nitro + 38);
          this.score += 180;
          AudioFX.play('pickup');
          this.orbs.splice(i, 1);
          continue;
        }
        if (o.z < -0.1) this.orbs.splice(i, 1);
      }

      document.getElementById('hud-top').innerHTML = `
        <div class="hud-cluster">
          <div class="hud-chip">時速：<strong>${Math.round(this.speed * 0.38)} KM/H</strong></div>
          <div class="hud-chip">渦輪氮氣：<strong style="color:#06b6d4;">${Math.round(this.nitro)}%</strong></div>
          <div class="hud-chip">擦身連擊：<strong style="color:#f43f5e;">x${this.combo}</strong></div>
        </div>
        <div class="hud-cluster">
          <div class="hud-chip">積分：<strong>${Math.floor(this.score)}</strong></div>
        </div>
      `;
    },

    render() {
      const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
      const horizon = h * 0.36;

      ctx.save();
      if (this.fx.shake > 0) {
        ctx.translate((Math.random() - 0.5) * this.fx.shake, (Math.random() - 0.5) * this.fx.shake);
      }

      // 賽博夕陽天空與都市剪影
      const sky = ctx.createLinearGradient(0, 0, 0, horizon);
      sky.addColorStop(0, '#050412');
      sky.addColorStop(0.65, '#1e1038');
      sky.addColorStop(1, '#4c1d95');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, horizon);

      // 條紋落日
      const sunGrad = ctx.createLinearGradient(0, horizon - 110, 0, horizon);
      sunGrad.addColorStop(0, '#fbbf24');
      sunGrad.addColorStop(1, '#f43f5e');
      ctx.fillStyle = sunGrad;
      ctx.beginPath(); ctx.arc(w / 2, horizon - 10, 82, Math.PI, 0); ctx.fill();

      // 遠景摩天大樓剪影
      ctx.fillStyle = '#090617';
      for (let i = 0; i < 22; i++) {
        const bw = w / 22;
        const bh = 22 + ((i * 37) % 54);
        ctx.fillRect(i * bw, horizon - bh, bw - 2, bh);
      }

      // 地面與雷射網格
      ctx.fillStyle = '#070a12';
      ctx.fillRect(0, horizon, w, h - horizon);

      const topW = w * 0.11, botW = w * 0.82;
      const roadGrad = ctx.createLinearGradient(0, horizon, 0, h);
      roadGrad.addColorStop(0, '#111625');
      roadGrad.addColorStop(1, '#1c253b');
      ctx.fillStyle = roadGrad;
      ctx.beginPath();
      ctx.moveTo(w / 2 - topW / 2, horizon);
      ctx.lineTo(w / 2 + topW / 2, horizon);
      ctx.lineTo(w / 2 + botW / 2, h);
      ctx.lineTo(w / 2 - botW / 2, h);
      ctx.closePath();
      ctx.fill();

      // 發光霓虹路肩
      ctx.save();
      ctx.shadowBlur = 14;
      ctx.shadowColor = '#f43f5e';
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(w / 2 - topW / 2, horizon); ctx.lineTo(w / 2 - botW / 2, h);
      ctx.moveTo(w / 2 + topW / 2, horizon); ctx.lineTo(w / 2 + botW / 2, h);
      ctx.stroke();
      ctx.restore();

      // 動態車道分隔線
      const scroll = (this.dist * 22) % 64;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.lineWidth = 2.5;
      for (let y = horizon + scroll; y < h; y += 64) {
        const t = (y - horizon) / (h - horizon);
        const rw = topW + (botW - topW) * t;
        ctx.beginPath();
        ctx.moveTo(w / 2 - rw * 0.17, y); ctx.lineTo(w / 2 - rw * 0.17, y + 26 * t);
        ctx.moveTo(w / 2 + rw * 0.17, y); ctx.lineTo(w / 2 + rw * 0.17, y + 26 * t);
        ctx.stroke();
      }

      const project = (lane, z) => {
        const p = Math.pow(1 - z, 1.65);
        const y = horizon + (h - horizon) * p;
        const rw = topW + (botW - topW) * p;
        return { x: w / 2 + lane * (rw * 0.44), y, s: 0.18 + p * 0.98 };
      };

      // 氮氣能量球
      for (const o of this.orbs) {
        if (o.z < 0 || o.z > 1) continue;
        const pr = project(o.lane, o.z);
        ctx.save();
        ctx.shadowBlur = 12; ctx.shadowColor = '#06b6d4';
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath(); ctx.arc(pr.x, pr.y - 10 * pr.s, 15 * pr.s, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // 敵方車輛（由遠至近排序）
      const sorted = [...this.traffic].sort((a, b) => b.z - a.z);
      for (const c of sorted) {
        if (c.z < 0 || c.z > 1) continue;
        const pr = project(c.lane, c.z);
        const cw = 68 * pr.s, ch = 36 * pr.s;
        ctx.fillStyle = c.color;
        ctx.fillRect(pr.x - cw / 2, pr.y - ch, cw, ch);
        ctx.fillStyle = '#090d16';
        ctx.fillRect(pr.x - cw * 0.36, pr.y - ch * 0.84, cw * 0.72, ch * 0.36);
        // 尾燈光暈
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(pr.x - cw * 0.42, pr.y - ch * 0.35, cw * 0.18, ch * 0.14);
        ctx.fillRect(pr.x + cw * 0.24, pr.y - ch * 0.35, cw * 0.18, ch * 0.14);
      }

      // 玩家跑車
      const p = project(this.playerX, 0.06);
      ctx.save();
      ctx.translate(p.x, p.y - 18);
      ctx.rotate(this.tilt);
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(-40, -18, 80, 36, 6);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-26, -14, 52, 14);
      // 雙尾燈與氮氣噴焰
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(-34, 4, 16, 6);
      ctx.fillRect(18, 4, 16, 6);
      if (Nexus.keys['Space'] && this.nitro > 4) {
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.moveTo(-22, 18); ctx.lineTo(-10, 18); ctx.lineTo(-16, 42 + Math.random() * 16);
        ctx.moveTo(10, 18); ctx.lineTo(22, 18); ctx.lineTo(16, 42 + Math.random() * 16);
        ctx.fill();
      }
      ctx.restore();
      ctx.restore();
    }
  };
});
