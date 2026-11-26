// ============================================================================
// GAME 1: 天穹焦土：重裝機甲行動 (AEGIS SCORCH: MECH ASSAULT)
// ============================================================================
Nexus.register('mech', () => {
  const WEAPONS = [
    { id: 'vulcan', name: 'M61 貧鈾機砲', rate: 0.085, color: '#fbbf24', heat: 3.5 },
    { id: 'rail',   name: '奧丁磁軌砲',   rate: 0.78,  color: '#38bdf8', heat: 18 },
    { id: 'swarm',  name: '蜂群追蹤飛彈', rate: 0.55,  color: '#fb7185', heat: 14 },
    { id: 'arc',    name: '特斯拉電弧網', rate: 0.36,  color: '#c084fc', heat: 10 }
  ];

  return {
    fx: new FXManager(),
    mech: null,
    bullets: [],
    enemies: [],
    beams: [],
    orbitals: [],
    wave: 1,
    score: 0,
    spawnLeft: 0,
    spawnTimer: 0,
    over: false,

    init(canvas, ctx) {
      this.canvas = canvas;
      this.ctx = ctx;
      this.fx = new FXManager();
      this.mech = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: 0, vy: 0,
        legAngle: 0,
        turretAngle: 0,
        stride: 0,
        recoil: 0,
        hp: 100, maxHp: 100,
        heat: 0, overheated: false,
        dashCd: 0, dashTime: 0,
        orbitalCharge: 40,
        wepIdx: 0,
        wepLvl: [1, 1, 1, 1],
        fireCd: 0
      };
      this.bullets = [];
      this.enemies = [];
      this.beams = [];
      this.orbitals = [];
      this.wave = 1;
      this.score = 0;
      this.over = false;
      this.startWave();
      this.renderDock();
      document.getElementById('hud-hint').textContent = 'WASD 移動機甲 | 滑鼠瞄準射擊 | 1~4 切換武裝 | 空白鍵噴射衝刺 | E 鍵軌道轟炸';
    },

    renderDock() {
      const dock = document.getElementById('hud-bottom');
      dock.innerHTML = WEAPONS.map((w, i) => `
        <div class="dock-item ${this.mech.wepIdx === i ? 'active' : ''}" onclick="Nexus.current.selectWep(${i})">
          <span class="title">[${i + 1}] ${w.name}</span>
          <span class="sub">MK.${this.mech.wepLvl[i]}</span>
        </div>
      `).join('');
    },

    selectWep(idx) {
      this.mech.wepIdx = idx;
      this.renderDock();
    },

    startWave() {
      this.spawnLeft = 8 + this.wave * 4;
      this.spawnTimer = 0.5;
      Nexus.saveRecord('mech', this.wave);
    },

    spawnEnemy() {
      const w = this.canvas.width, h = this.canvas.height;
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      if (side === 0) { x = Math.random() * w; y = -30; }
      else if (side === 1) { x = w + 30; y = Math.random() * h; }
      else if (side === 2) { x = Math.random() * w; y = h + 30; }
      else { x = -30; y = Math.random() * h; }

      const isBoss = this.wave % 4 === 0 && this.spawnLeft === 1;
      const isTank = !isBoss && Math.random() < 0.28;
      this.enemies.push({
        x, y,
        hp: isBoss ? 480 + this.wave * 90 : isTank ? 95 + this.wave * 18 : 34 + this.wave * 8,
        maxHp: isBoss ? 480 + this.wave * 90 : isTank ? 95 + this.wave * 18 : 34 + this.wave * 8,
        speed: isBoss ? 52 : isTank ? 72 : 128 + Math.min(60, this.wave * 4),
        r: isBoss ? 30 : isTank ? 18 : 12,
        type: isBoss ? 'boss' : isTank ? 'tank' : 'spider',
        flash: 0,
        angle: 0
      });
    },

    update(dt) {
      if (this.over) return;
      if (this.fx.hitstop > 0) {
        this.fx.hitstop -= dt;
        return;
      }

      const m = this.mech;
      this.fx.update(dt);

      // 切換武器
      if (Nexus.keys['Digit1']) this.selectWep(0);
      if (Nexus.keys['Digit2']) this.selectWep(1);
      if (Nexus.keys['Digit3']) this.selectWep(2);
      if (Nexus.keys['Digit4']) this.selectWep(3);
      if (Nexus.mouse.wheel !== 0) {
        this.selectWep((m.wepIdx + Nexus.mouse.wheel + 4) % 4);
      }

      // 移動與步態動畫
      let ix = 0, iy = 0;
      if (Nexus.keys['KeyW'] || Nexus.keys['ArrowUp']) iy -= 1;
      if (Nexus.keys['KeyS'] || Nexus.keys['ArrowDown']) iy += 1;
      if (Nexus.keys['KeyA'] || Nexus.keys['ArrowLeft']) ix -= 1;
      if (Nexus.keys['KeyD'] || Nexus.keys['ArrowRight']) ix += 1;

      m.dashCd = Math.max(0, m.dashCd - dt);
      if (Nexus.keys['Space'] && m.dashCd <= 0 && (ix !== 0 || iy !== 0)) {
        m.dashCd = 1.4;
        m.dashTime = 0.2;
        AudioFX.play('dash');
        this.fx.addShake(5);
      }

      const moveSpd = m.dashTime > 0 ? 560 : 195;
      if (m.dashTime > 0) m.dashTime -= dt;

      if (ix !== 0 || iy !== 0) {
        const len = Math.hypot(ix, iy);
        m.vx = (ix / len) * moveSpd;
        m.vy = (iy / len) * moveSpd;
        m.legAngle = Math.atan2(iy, ix);
        m.stride += dt * (m.dashTime > 0 ? 22 : 12);
      } else {
        m.vx *= 0.82;
        m.vy *= 0.82;
      }

      m.x = Math.max(28, Math.min(this.canvas.width - 28, m.x + m.vx * dt));
      m.y = Math.max(70, Math.min(this.canvas.height - 75, m.y + m.vy * dt));
      m.turretAngle = Math.atan2(Nexus.mouse.y - m.y, Nexus.mouse.x - m.x);
      m.recoil = Math.max(0, m.recoil - 38 * dt);

      // 散熱冷卻
      m.heat = Math.max(0, m.heat - (m.overheated ? 26 : 34) * dt);
      if (m.overheated && m.heat <= 15) m.overheated = false;

      // 軌道離子轟炸大招
      if (Nexus.keys['KeyE'] && m.orbitalCharge >= 100) {
        m.orbitalCharge = 0;
        AudioFX.play('orbital');
        this.fx.addShake(22);
        this.orbitals.push({ x: Nexus.mouse.x, y: Nexus.mouse.y, life: 0.85, maxLife: 0.85 });
        for (const e of this.enemies) {
          if (Math.hypot(e.x - Nexus.mouse.x, e.y - Nexus.mouse.y) < 190) {
            e.hp -= 360;
            e.flash = 0.2;
          }
        }
        this.fx.spawnExplosion(Nexus.mouse.x, Nexus.mouse.y, '#38bdf8', 2.4, true);
      }

      // 射擊邏輯
      m.fireCd -= dt;
      const wep = WEAPONS[m.wepIdx];
      const lvl = m.wepLvl[m.wepIdx];
      if (Nexus.mouse.down && m.fireCd <= 0 && !m.overheated) {
        m.fireCd = wep.rate * Math.pow(0.9, lvl - 1);
        m.recoil = 7;
        m.heat += wep.heat;
        if (m.heat >= 100) { m.heat = 100; m.overheated = true; }

        const muzzleX = m.x + Math.cos(m.turretAngle) * 26;
        const muzzleY = m.y + Math.sin(m.turretAngle) * 26;

        if (wep.id === 'vulcan') {
          AudioFX.play('vulcan');
          this.fx.spawnShell(m.x, m.y, m.turretAngle + Math.PI * 0.65);
          const count = lvl >= 3 ? 2 : 1;
          for (let i = 0; i < count; i++) {
            const a = m.turretAngle + (Math.random() - 0.5) * 0.11 + (i - (count - 1) / 2) * 0.08;
            this.bullets.push({
              x: muzzleX, y: muzzleY,
              vx: Math.cos(a) * 760, vy: Math.sin(a) * 760,
              dmg: 16 + lvl * 5, type: 'vulcan', color: '#fbbf24', life: 0.9
            });
          }
        } else if (wep.id === 'rail') {
          AudioFX.play('railgun');
          this.fx.addShake(8);
          const endX = m.x + Math.cos(m.turretAngle) * 900;
          const endY = m.y + Math.sin(m.turretAngle) * 900;
          this.beams.push({ x1: muzzleX, y1: muzzleY, x2: endX, y2: endY, color: '#38bdf8', width: 5 + lvl * 1.5, life: 0.22 });
          for (const e of this.enemies) {
            const d = this.distToRay(e.x, e.y, muzzleX, muzzleY, endX, endY);
            if (d < e.r + 12) {
              e.hp -= 75 + lvl * 28;
              e.flash = 0.15;
              this.fx.spawnExplosion(e.x, e.y, '#38bdf8', 0.7, false);
            }
          }
        } else if (wep.id === 'swarm') {
          AudioFX.play('missile');
          const pods = 2 + Math.floor(lvl / 2);
          for (let i = 0; i < pods; i++) {
            const a = m.turretAngle + (i - (pods - 1) / 2) * 0.35;
            this.bullets.push({
              x: m.x, y: m.y,
              vx: Math.cos(a) * 320, vy: Math.sin(a) * 320,
              dmg: 34 + lvl * 12, type: 'missile', color: '#fb7185', life: 2.2
            });
          }
        } else if (wep.id === 'arc') {
          AudioFX.play('tesla');
          let currX = muzzleX, currY = muzzleY;
          const hitSet = new Set();
          const chains = 2 + lvl;
          for (let c = 0; c < chains; c++) {
            let best = null, bestD = 220;
            for (const e of this.enemies) {
              if (!hitSet.has(e)) {
                const d = Math.hypot(e.x - currX, e.y - currY);
                if (d < bestD && (c > 0 || Math.abs(Math.atan2(e.y - m.y, e.x - m.x) - m.turretAngle) < 0.9)) {
                  bestD = d; best = e;
                }
              }
            }
            if (best) {
              hitSet.add(best);
              best.hp -= 28 + lvl * 10;
              best.flash = 0.12;
              this.beams.push({ x1: currX, y1: currY, x2: best.x, y2: best.y, color: '#c084fc', width: 3.5, life: 0.16 });
              currX = best.x; currY = best.y;
            }
          }
        }
      }

      // 生成敵軍
      if (this.spawnLeft > 0) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
          this.spawnEnemy();
          this.spawnLeft--;
          this.spawnTimer = Math.max(0.28, 0.95 - this.wave * 0.04);
        }
      } else if (this.enemies.length === 0) {
        this.wave++;
        m.hp = Math.min(m.maxHp, m.hp + 25);
        m.wepLvl[m.wepIdx] = Math.min(5, m.wepLvl[m.wepIdx] + 1);
        this.renderDock();
        this.startWave();
      }

      // 更新子彈與追蹤飛彈
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        if (b.type === 'missile' && this.enemies.length > 0) {
          let target = this.enemies[0];
          const desired = Math.atan2(target.y - b.y, target.x - b.x);
          const curA = Math.atan2(b.vy, b.vx);
          const diff = Math.atan2(Math.sin(desired - curA), Math.cos(desired - curA));
          const nextA = curA + Math.sign(diff) * Math.min(Math.abs(diff), 5.5 * dt);
          const spd = Math.min(560, Math.hypot(b.vx, b.vy) + 320 * dt);
          b.vx = Math.cos(nextA) * spd;
          b.vy = Math.sin(nextA) * spd;
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;

        let hit = false;
        for (const e of this.enemies) {
          if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + 6) {
            hit = true;
            e.hp -= b.dmg;
            e.flash = 0.1;
            if (b.type === 'missile') {
              AudioFX.play('explosion');
              this.fx.spawnExplosion(b.x, b.y, '#fb7185', 1.1, false);
              for (const e2 of this.enemies) {
                if (Math.hypot(e2.x - b.x, e2.y - b.y) < 75) e2.hp -= b.dmg * 0.6;
              }
            }
            break;
          }
        }
        if (hit || b.life <= 0) this.bullets.splice(i, 1);
      }

      // 更新敵軍
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        e.flash = Math.max(0, e.flash - dt);
        if (e.hp <= 0) {
          AudioFX.play('explosion');
          const isBig = e.type !== 'spider';
          this.fx.spawnExplosion(e.x, e.y, isBig ? '#f59e0b' : '#fb7185', isBig ? 1.5 : 0.85, true);
          if (isBig) this.fx.addHitstop(0.035);
          this.score += isBig ? 250 : 60;
          m.orbitalCharge = Math.min(100, m.orbitalCharge + (isBig ? 18 : 6));
          this.enemies.splice(i, 1);
          continue;
        }

        e.angle = Math.atan2(m.y - e.y, m.x - e.x);
        e.x += Math.cos(e.angle) * e.speed * dt;
        e.y += Math.sin(e.angle) * e.speed * dt;

        if (Math.hypot(e.x - m.x, e.y - m.y) < e.r + 18) {
          if (m.dashTime <= 0) {
            m.hp -= e.type === 'boss' ? 32 : 14;
            this.fx.addShake(12);
            AudioFX.play('explosion');
          }
          if (e.type !== 'boss') this.enemies.splice(i, 1);
          if (m.hp <= 0) {
            this.over = true;
            Nexus.showResult(
              '機甲裝甲瓦解',
              '重裝機甲在無盡機械軍團的圍攻下失去動力。',
              `<div>生存波次<strong>WAVE ${this.wave}</strong></div><div>作戰積分<strong>${this.score}</strong></div>`,
              () => this.init(this.canvas, this.ctx)
            );
          }
        }
      }

      for (let i = this.beams.length - 1; i >= 0; i--) {
        this.beams[i].life -= dt;
        if (this.beams[i].life <= 0) this.beams.splice(i, 1);
      }
      for (let i = this.orbitals.length - 1; i >= 0; i--) {
        this.orbitals[i].life -= dt;
        if (this.orbitals[i].life <= 0) this.orbitals.splice(i, 1);
      }

      document.getElementById('hud-top').innerHTML = `
        <div class="hud-cluster">
          <div class="hud-chip">裝甲耐久：<strong style="color:#10b981;">${Math.max(0, Math.round(m.hp))}%</strong></div>
          <div class="hud-chip">武器熱能：<strong style="color:${m.overheated ? '#f43f5e' : '#f59e0b'};">${Math.round(m.heat)}%</strong></div>
          <div class="hud-chip">軌道轟炸 [E]：<strong style="color:#38bdf8;">${Math.round(m.orbitalCharge)}%</strong></div>
        </div>
        <div class="hud-cluster">
          <div class="hud-chip">波次：<strong>WAVE ${this.wave}</strong></div>
          <div class="hud-chip">積分：<strong>${this.score}</strong></div>
        </div>
      `;
    },

    distToRay(px, py, x1, y1, x2, y2) {
      const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
      let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
      t = Math.max(0, Math.min(1, t));
      return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
    },

    render() {
      const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
      ctx.save();
      if (this.fx.shake > 0) {
        ctx.translate((Math.random() - 0.5) * this.fx.shake, (Math.random() - 0.5) * this.fx.shake);
      }

      // 裝甲金屬地板與鉚釘網格
      ctx.fillStyle = '#090d14';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.55)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 64) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 64) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // 永久焦黑彈坑與黃銅彈殼
      this.fx.renderDecals(ctx);

      // 軌道轟炸光柱
      for (const o of this.orbitals) {
        const ratio = o.life / o.maxLife;
        const grad = ctx.createRadialGradient(o.x, o.y, 5, o.x, o.y, 190 * ratio);
        grad.addColorStop(0, 'rgba(224, 242, 254, 0.95)');
        grad.addColorStop(0.45, 'rgba(56, 189, 248, 0.5)');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(o.x, o.y, 190 * ratio, 0, Math.PI * 2); ctx.fill();
      }

      // 敵方單位（多層硬表面裝甲繪製）
      for (const e of this.enemies) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle);
        ctx.fillStyle = e.flash > 0 ? '#ffffff' : (e.type === 'boss' ? '#9f1239' : e.type === 'tank' ? '#b45309' : '#334155');
        ctx.strokeStyle = e.type === 'boss' ? '#fb7185' : '#f59e0b';
        ctx.lineWidth = 2;

        if (e.type === 'spider') {
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2;
            const px = Math.cos(a) * e.r, py = Math.sin(a) * e.r;
            k === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
          }
          ctx.closePath(); ctx.fill(); ctx.stroke();
        } else {
          ctx.fillRect(-e.r, -e.r * 0.85, e.r * 2, e.r * 1.7);
          ctx.strokeRect(-e.r, -e.r * 0.85, e.r * 2, e.r * 1.7);
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-e.r * 0.4, -e.r * 0.45, e.r * 0.8, e.r * 0.9);
        }
        ctx.restore();

        // 血條
        const bw = e.r * 2;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(e.x - bw / 2, e.y - e.r - 10, bw, 4);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(e.x - bw / 2, e.y - e.r - 10, bw * Math.max(0, e.hp / e.maxHp), 4);
      }

      // 玩家重裝雙足機甲
      const m = this.mech;
      ctx.save();
      ctx.translate(m.x, m.y);

      // 雷射瞄準輔助線
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(m.turretAngle) * 320, Math.sin(m.turretAngle) * 320); ctx.stroke();

      // 雙足步態動畫
      ctx.save();
      ctx.rotate(m.legAngle);
      const step = Math.sin(m.stride) * 8;
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-10 + step, -18, 20, 8);
      ctx.fillRect(-10 - step, 10, 20, 8);
      ctx.restore();

      // 旋轉上身砲塔與後座力
      ctx.rotate(m.turretAngle);
      ctx.translate(-m.recoil, 0);

      // 砲管與飛彈莢艙
      ctx.fillStyle = '#475569';
      ctx.fillRect(8, -14, 24, 6);
      ctx.fillRect(8, 8, 24, 6);

      // 主裝甲外殼
      const bodyGrad = ctx.createLinearGradient(-18, -18, 18, 18);
      bodyGrad.addColorStop(0, '#475569');
      bodyGrad.addColorStop(1, '#1e293b');
      ctx.fillStyle = bodyGrad;
      ctx.strokeStyle = m.dashTime > 0 ? '#38bdf8' : '#f59e0b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-18, -16, 34, 32, 6);
      ctx.fill();
      ctx.stroke();

      // 過熱散熱格柵光暈
      if (m.heat > 20) {
        ctx.fillStyle = `rgba(244, 63, 94, ${m.heat / 110})`;
        ctx.fillRect(-12, -8, 10, 16);
      }
      ctx.restore();

      // 光束與子彈
      for (const bm of this.beams) {
        ctx.save();
        ctx.strokeStyle = bm.color;
        ctx.shadowBlur = 14;
        ctx.shadowColor = bm.color;
        ctx.lineWidth = bm.width * (bm.life / 0.22);
        ctx.beginPath(); ctx.moveTo(bm.x1, bm.y1); ctx.lineTo(bm.x2, bm.y2); ctx.stroke();
        ctx.restore();
      }

      for (const b of this.bullets) {
        ctx.save();
        ctx.fillStyle = b.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = b.color;
        ctx.beginPath(); ctx.arc(b.x, b.y, b.type === 'missile' ? 4.5 : 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      this.fx.renderParticles(ctx);
      ctx.restore();
    }
  };
});
