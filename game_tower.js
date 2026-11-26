// ============================================================================
// GAME 3: 鐵壁要塞：星際塔防 (BASTION COMMAND: STAR DEFENSE)
// ============================================================================
Nexus.register('tower', () => {
  const TOWERS = [
    { id: 'gatling', name: '雙聯火神塔', cost: 60,  range: 145, rate: 0.2,  dmg: 16, color: '#f59e0b' },
    { id: 'rail',    name: '軌道磁軌砲', cost: 120, range: 275, rate: 1.1,  dmg: 85, color: '#38bdf8' },
    { id: 'mortar',  name: '溫壓迫擊砲', cost: 150, range: 210, rate: 1.4,  dmg: 65, color: '#f43f5e', splash: 65 },
    { id: 'tesla',   name: '特斯拉電塔', cost: 175, range: 155, rate: 0.62, dmg: 34, color: '#c084fc', chain: 3 }
  ];

  return {
    fx: new FXManager(),
    money: 260,
    lives: 20,
    wave: 0,
    selected: 0,
    turrets: [],
    enemies: [],
    shots: [],
    arcs: [],
    path: [],
    queue: 0,
    spawnCd: 0,
    over: false,

    init(canvas, ctx) {
      this.canvas = canvas;
      this.ctx = ctx;
      this.fx = new FXManager();
      this.money = 260;
      this.lives = 20;
      this.wave = 0;
      this.selected = 0;
      this.turrets = [];
      this.enemies = [];
      this.shots = [];
      this.arcs = [];
      this.over = false;
      this.onResize();
      this.nextWave();
      this.renderDock();
      document.getElementById('hud-hint').textContent = '左鍵點擊高地建造防禦塔 | 點擊現有砲塔進行強化改造（最高 LV.5）';
    },

    onResize() {
      const w = this.canvas.width, h = this.canvas.height;
      this.path = [
        { x: 0, y: h * 0.25 },
        { x: w * 0.30, y: h * 0.25 },
        { x: w * 0.30, y: h * 0.68 },
        { x: w * 0.66, y: h * 0.68 },
        { x: w * 0.66, y: h * 0.28 },
        { x: w, y: h * 0.28 }
      ];
    },

    renderDock() {
      const dock = document.getElementById('hud-bottom');
      dock.innerHTML = TOWERS.map((t, i) => `
        <div class="dock-item ${this.selected === i ? 'active' : ''}" onclick="Nexus.current.pick(${i})">
          <span class="title">${t.name}</span>
          <span class="sub">$${t.cost}</span>
        </div>
      `).join('') + `
        <div class="dock-item" style="border-color:#10b981;" onclick="Nexus.current.nextWave()">
          <span class="title" style="color:#34d399;">提前出兵</span>
          <span class="sub" style="color:#6ee7b7;">+獎金</span>
        </div>
      `;
    },

    pick(i) {
      this.selected = i;
      this.renderDock();
    },

    nextWave() {
      if (this.over) return;
      if (this.queue === 0 && this.enemies.length > 0) this.money += 25;
      this.wave++;
      Nexus.saveRecord('tower', this.wave);
      this.queue += 7 + this.wave * 3;
      AudioFX.play('pickup');
    },

    onRoad(x, y) {
      for (let i = 0; i < this.path.length - 1; i++) {
        const a = this.path[i], b = this.path[i + 1];
        const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
        let t = ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        if (Math.hypot(x - (a.x + t * (b.x - a.x)), y - (a.y + t * (b.y - a.y))) < 40) return true;
      }
      return false;
    },

    handleClick() {
      const mx = Nexus.mouse.x, my = Nexus.mouse.y;
      if (my < 65 || my > this.canvas.height - 82) return;

      for (const t of this.turrets) {
        if (Math.hypot(t.x - mx, t.y - my) < 25) {
          const cost = Math.floor(t.baseCost * 0.85 * t.lvl);
          if (this.money >= cost && t.lvl < 5) {
            this.money -= cost;
            t.lvl++;
            t.dmg = Math.round(t.dmg * 1.42);
            t.range += 15;
            t.rate *= 0.88;
            AudioFX.play('pickup');
            this.fx.spawnExplosion(t.x, t.y, t.color, 0.7, false);
          }
          return;
        }
      }

      if (this.onRoad(mx, my)) return;
      for (const t of this.turrets) {
        if (Math.hypot(t.x - mx, t.y - my) < 46) return;
      }

      const spec = TOWERS[this.selected];
      if (this.money >= spec.cost) {
        this.money -= spec.cost;
        this.turrets.push({
          x: mx, y: my, ...spec, baseCost: spec.cost, lvl: 1, cd: 0, angle: 0, recoil: 0
        });
        AudioFX.play('pickup');
        this.fx.spawnExplosion(mx, my, spec.color, 0.65, false);
      }
    },

    update(dt) {
      if (this.over) return;
      if (Nexus.mouse.clicked) this.handleClick();
      this.fx.update(dt);

      if (this.queue > 0) {
        this.spawnCd -= dt;
        if (this.spawnCd <= 0) {
          this.queue--;
          this.spawnCd = Math.max(0.28, 0.85 - this.wave * 0.03);
          const boss = this.wave % 5 === 0 && this.queue === 0;
          const hp = (65 + this.wave * 32) * (boss ? 7 : 1);
          this.enemies.push({
            x: this.path[0].x, y: this.path[0].y, wp: 1,
            hp, maxHp: hp,
            speed: boss ? 46 : 78 + Math.min(45, this.wave * 2.5),
            r: boss ? 20 : 12,
            reward: boss ? 110 : 16 + this.wave,
            color: boss ? '#f43f5e' : '#fb923c'
          });
        }
      } else if (this.enemies.length === 0) {
        this.nextWave();
      }

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (e.hp <= 0) {
          this.money += e.reward;
          AudioFX.play('explosion');
          this.fx.spawnExplosion(e.x, e.y, e.color, e.r > 15 ? 1.5 : 0.85, true);
          this.enemies.splice(i, 1);
          continue;
        }
        const wp = this.path[e.wp];
        if (!wp) {
          this.lives--;
          this.fx.addShake(10);
          AudioFX.play('explosion');
          this.enemies.splice(i, 1);
          if (this.lives <= 0) {
            this.over = true;
            Nexus.showResult(
              '要塞防線失守',
              '裝甲軍團突破了最終防禦陣地。',
              `<div>抵禦波次<strong>WAVE ${this.wave}</strong></div><div>歷史最高<strong>WAVE ${Nexus.getRecord('tower')}</strong></div>`,
              () => this.init(this.canvas, this.ctx)
            );
          }
          continue;
        }
        const d = Math.hypot(wp.x - e.x, wp.y - e.y);
        if (d < 5) e.wp++;
        else {
          e.x += ((wp.x - e.x) / d) * e.speed * dt;
          e.y += ((wp.y - e.y) / d) * e.speed * dt;
        }
      }

      for (const t of this.turrets) {
        t.cd -= dt;
        t.recoil = Math.max(0, t.recoil - 26 * dt);
        let target = null, bestProg = -1;
        for (const e of this.enemies) {
          if (Math.hypot(e.x - t.x, e.y - t.y) <= t.range) {
            const prog = e.wp * 1000 - Math.hypot((this.path[e.wp]?.x || 0) - e.x, (this.path[e.wp]?.y || 0) - e.y);
            if (prog > bestProg) { bestProg = prog; target = e; }
          }
        }
        if (target) {
          t.angle = Math.atan2(target.y - t.y, target.x - t.x);
          if (t.cd <= 0) {
            t.cd = t.rate;
            t.recoil = 5;
            if (t.id === 'tesla') {
              AudioFX.play('tesla');
              let cur = target;
              const seen = new Set([cur]);
              cur.hp -= t.dmg;
              this.arcs.push({ x1: t.x, y1: t.y, x2: cur.x, y2: cur.y, color: t.color, life: 0.16 });
              for (let c = 1; c < t.chain; c++) {
                let nxt = null, md = 120;
                for (const cand of this.enemies) {
                  if (!seen.has(cand) && Math.hypot(cand.x - cur.x, cand.y - cur.y) < md) {
                    md = Math.hypot(cand.x - cur.x, cand.y - cur.y); nxt = cand;
                  }
                }
                if (nxt) {
                  seen.add(nxt);
                  nxt.hp -= t.dmg * 0.78;
                  this.arcs.push({ x1: cur.x, y1: cur.y, x2: nxt.x, y2: nxt.y, color: t.color, life: 0.16 });
                  cur = nxt;
                }
              }
            } else if (t.id === 'rail') {
              AudioFX.play('railgun');
              target.hp -= t.dmg;
              this.arcs.push({ x1: t.x, y1: t.y, x2: target.x, y2: target.y, color: t.color, life: 0.18 });
            } else {
              AudioFX.play('vulcan');
              this.shots.push({
                x: t.x, y: t.y,
                vx: Math.cos(t.angle) * 480, vy: Math.sin(t.angle) * 480,
                dmg: t.dmg, splash: t.splash || 0, color: t.color, life: 1.0
              });
            }
          }
        }
      }

      for (let i = this.shots.length - 1; i >= 0; i--) {
        const s = this.shots[i];
        s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
        let hit = false;
        for (const e of this.enemies) {
          if (Math.hypot(e.x - s.x, e.y - s.y) < e.r + 6) {
            hit = true;
            if (s.splash) {
              AudioFX.play('explosion');
              this.fx.spawnExplosion(s.x, s.y, '#f43f5e', 1.1, false);
              for (const e2 of this.enemies) {
                if (Math.hypot(e2.x - s.x, e2.y - s.y) <= s.splash) e2.hp -= s.dmg;
              }
            } else {
              e.hp -= s.dmg;
            }
            break;
          }
        }
        if (hit || s.life <= 0) this.shots.splice(i, 1);
      }

      for (let i = this.arcs.length - 1; i >= 0; i--) {
        this.arcs[i].life -= dt;
        if (this.arcs[i].life <= 0) this.arcs.splice(i, 1);
      }

      document.getElementById('hud-top').innerHTML = `
        <div class="hud-cluster">
          <div class="hud-chip">軍費：<strong>$${this.money}</strong></div>
          <div class="hud-chip">核心護盾：<strong style="color:#f43f5e;">${this.lives}</strong></div>
          <div class="hud-chip">波次：<strong style="color:#38bdf8;">WAVE ${this.wave}</strong></div>
        </div>
        <div class="hud-cluster">
          <div class="hud-chip">最高波次：<strong>${Nexus.getRecord('tower')}</strong></div>
        </div>
      `;
    },

    render() {
      const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
      ctx.save();
      if (this.fx.shake > 0) ctx.translate((Math.random() - 0.5) * this.fx.shake, (Math.random() - 0.5) * this.fx.shake);

      ctx.fillStyle = '#080c14';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
      for (let x = 0; x < w; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // 裝甲行軍通道
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#162032'; ctx.lineWidth = 52;
      ctx.beginPath();
      this.path.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();

      ctx.strokeStyle = 'rgba(245, 158, 11, 0.28)'; ctx.lineWidth = 2; ctx.setLineDash([12, 10]);
      ctx.stroke(); ctx.setLineDash([]);

      this.fx.renderDecals(ctx);

      // 建造預覽圈
      const mx = Nexus.mouse.x, my = Nexus.mouse.y;
      if (my > 65 && my < h - 82) {
        const spec = TOWERS[this.selected];
        const ok = !this.onRoad(mx, my);
        ctx.beginPath(); ctx.arc(mx, my, spec.range, 0, Math.PI * 2);
        ctx.fillStyle = ok ? 'rgba(56,189,248,0.08)' : 'rgba(244,63,94,0.14)'; ctx.fill();
        ctx.strokeStyle = ok ? 'rgba(56,189,248,0.4)' : 'rgba(244,63,94,0.5)'; ctx.stroke();
      }

      // 砲塔繪製
      for (const t of this.turrets) {
        const hover = Math.hypot(t.x - mx, t.y - my) < 25;
        if (hover) {
          ctx.beginPath(); ctx.arc(t.x, t.y, t.range, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,255,255,0.28)'; ctx.stroke();
        }
        ctx.fillStyle = '#1e293b'; ctx.strokeStyle = t.color; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(t.x, t.y, 19, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(t.angle);
        ctx.fillStyle = t.color;
        ctx.fillRect(-t.recoil, -5, 23, 10);
        ctx.restore();

        ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('L' + t.lvl, t.x, t.y + 4);
        if (hover && t.lvl < 5) {
          ctx.fillStyle = '#fbbf24';
          ctx.fillText(`改造 $${Math.floor(t.baseCost * 0.85 * t.lvl)}`, t.x, t.y - 26);
        }
      }

      // 敵軍
      for (const e of this.enemies) {
        ctx.fillStyle = e.color;
        ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#090d16'; ctx.lineWidth = 2; ctx.stroke();
        const bw = e.r * 2.2;
        ctx.fillStyle = '#0f172a'; ctx.fillRect(e.x - bw / 2, e.y - e.r - 9, bw, 4);
        ctx.fillStyle = '#10b981'; ctx.fillRect(e.x - bw / 2, e.y - e.r - 9, bw * Math.max(0, e.hp / e.maxHp), 4);
      }

      for (const s of this.shots) {
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.splash ? 5 : 3.5, 0, Math.PI * 2); ctx.fill();
      }
      for (const a of this.arcs) {
        ctx.save(); ctx.strokeStyle = a.color; ctx.shadowBlur = 12; ctx.shadowColor = a.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(a.x1, a.y1); ctx.lineTo(a.x2, a.y2); ctx.stroke(); ctx.restore();
      }

      this.fx.renderParticles(ctx);
      ctx.restore();
    }
  };
});
