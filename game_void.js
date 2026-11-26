// ============================================================================
// GAME 4: 深空獵殺：星艦空戰 (VOID HUNTER: STARSHIP COMBAT)
// ============================================================================
Nexus.register('void', () => {
  return {
    fx: new FXManager(),
    ship: null,
    stars: [],
    lasers: [],
    torpedoes: [],
    enemies: [],
    kills: 0,
    spawnCd: 0,
    over: false,

    init(canvas, ctx) {
      this.canvas = canvas;
      this.ctx = ctx;
      this.fx = new FXManager();
      this.ship = {
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: 0, vy: 0,
        angle: -Math.PI / 2,
        shield: 100,
        hull: 100,
        energy: 100,
        fireCd: 0,
        torpCd: 0,
        shieldFlash: 0
      };
      this.stars = Array.from({ length: 90 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        s: 0.6 + Math.random() * 1.8,
        p: 0.2 + Math.random() * 0.6
      }));
      this.lasers = [];
      this.torpedoes = [];
      this.enemies = [];
      this.kills = 0;
      this.over = false;
      document.getElementById('hud-hint').textContent = 'W 慣性推進 | A / D 轉向 | 左鍵雙聯脈衝砲 | 空白鍵發射集束追蹤電漿魚雷';
    },

    update(dt) {
      if (this.over) return;
      this.fx.update(dt);
      const s = this.ship;

      if (Nexus.keys['KeyA'] || Nexus.keys['ArrowLeft']) s.angle -= 3.6 * dt;
      if (Nexus.keys['KeyD'] || Nexus.keys['ArrowRight']) s.angle += 3.6 * dt;

      const thrust = Nexus.keys['KeyW'] || Nexus.keys['ArrowUp'];
      if (thrust) {
        s.vx += Math.cos(s.angle) * 380 * dt;
        s.vy += Math.sin(s.angle) * 380 * dt;
        if (Math.random() < 0.6) {
          this.fx.particles.push({
            x: s.x - Math.cos(s.angle) * 18,
            y: s.y - Math.sin(s.angle) * 18,
            vx: -Math.cos(s.angle) * 140 + (Math.random() - 0.5) * 40,
            vy: -Math.sin(s.angle) * 140 + (Math.random() - 0.5) * 40,
            size: 3.5, color: '#38bdf8', life: 0.25, maxLife: 0.25, glow: true
          });
        }
      }

      s.vx *= 0.985;
      s.vy *= 0.985;
      s.x = (s.x + s.vx * dt + this.canvas.width) % this.canvas.width;
      s.y = (s.y + s.vy * dt + this.canvas.height) % this.canvas.height;

      s.shield = Math.min(100, s.shield + 6 * dt);
      s.energy = Math.min(100, s.energy + 22 * dt);
      s.shieldFlash = Math.max(0, s.shieldFlash - dt);

      // 雙聯脈衝砲
      s.fireCd -= dt;
      if ((Nexus.mouse.down || Nexus.keys['KeyJ']) && s.fireCd <= 0) {
        s.fireCd = 0.14;
        AudioFX.play('vulcan');
        const perp = s.angle + Math.PI / 2;
        [-9, 9].forEach(off => {
          this.lasers.push({
            x: s.x + Math.cos(perp) * off + Math.cos(s.angle) * 14,
            y: s.y + Math.sin(perp) * off + Math.sin(s.angle) * 14,
            vx: Math.cos(s.angle) * 760 + s.vx * 0.3,
            vy: Math.sin(s.angle) * 760 + s.vy * 0.3,
            fromPlayer: true, color: '#10b981', life: 1.1
          });
        });
      }

      // 集束追蹤電漿魚雷
      s.torpCd -= dt;
      if (Nexus.keys['Space'] && s.torpCd <= 0 && s.energy >= 45) {
        s.torpCd = 0.8;
        s.energy -= 45;
        AudioFX.play('missile');
        for (let k = -1; k <= 1; k++) {
          const a = s.angle + k * 0.38;
          this.torpedoes.push({
            x: s.x, y: s.y,
            vx: Math.cos(a) * 340, vy: Math.sin(a) * 340,
            life: 2.8
          });
        }
      }

      // 生成敵方星艦與巡洋艦
      this.spawnCd -= dt;
      if (this.spawnCd <= 0 && this.enemies.length < 10) {
        this.spawnCd = Math.max(0.9, 2.3 - this.kills * 0.03);
        const cruiser = this.kills > 0 && this.kills % 6 === 0;
        const edge = Math.floor(Math.random() * 4);
        const x = edge === 1 ? this.canvas.width : edge === 3 ? 0 : Math.random() * this.canvas.width;
        const y = edge === 2 ? this.canvas.height : edge === 0 ? 0 : Math.random() * this.canvas.height;
        this.enemies.push({
          x, y, vx: 0, vy: 0, angle: 0,
          hp: cruiser ? 220 : 48,
          maxHp: cruiser ? 220 : 48,
          r: cruiser ? 26 : 14,
          cruiser,
          cd: 1.2
        });
      }

      // 更新雷射
      for (let i = this.lasers.length - 1; i >= 0; i--) {
        const l = this.lasers[i];
        l.x += l.vx * dt; l.y += l.vy * dt; l.life -= dt;
        if (l.fromPlayer) {
          for (const e of this.enemies) {
            if (Math.hypot(e.x - l.x, e.y - l.y) < e.r + 5) {
              e.hp -= 20;
              l.life = 0;
              this.fx.spawnExplosion(l.x, l.y, '#10b981', 0.45, false);
              break;
            }
          }
        } else if (Math.hypot(s.x - l.x, s.y - l.y) < 18) {
          l.life = 0;
          this.damagePlayer(14);
        }
        if (l.life <= 0) this.lasers.splice(i, 1);
      }

      // 更新追蹤電漿魚雷
      for (let i = this.torpedoes.length - 1; i >= 0; i--) {
        const tp = this.torpedoes[i];
        if (this.enemies.length > 0) {
          const tgt = this.enemies[0];
          const des = Math.atan2(tgt.y - tp.y, tgt.x - tp.x);
          const cur = Math.atan2(tp.vy, tp.vx);
          const diff = Math.atan2(Math.sin(des - cur), Math.cos(des - cur));
          const na = cur + Math.sign(diff) * Math.min(Math.abs(diff), 5.2 * dt);
          const spd = Math.min(580, Math.hypot(tp.vx, tp.vy) + 280 * dt);
          tp.vx = Math.cos(na) * spd; tp.vy = Math.sin(na) * spd;
        }
        tp.x += tp.vx * dt; tp.y += tp.vy * dt; tp.life -= dt;
        for (const e of this.enemies) {
          if (Math.hypot(e.x - tp.x, e.y - tp.y) < e.r + 8) {
            e.hp -= 75;
            tp.life = 0;
            AudioFX.play('explosion');
            this.fx.spawnExplosion(tp.x, tp.y, '#38bdf8', 1.2, false);
            break;
          }
        }
        if (tp.life <= 0) this.torpedoes.splice(i, 1);
      }

      // 更新敵艦
      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const e = this.enemies[i];
        if (e.hp <= 0) {
          this.kills++;
          Nexus.saveRecord('void', this.kills);
          AudioFX.play('explosion');
          this.fx.spawnExplosion(e.x, e.y, e.cruiser ? '#f43f5e' : '#f59e0b', e.cruiser ? 1.8 : 1.0, false);
          this.enemies.splice(i, 1);
          continue;
        }
        e.angle = Math.atan2(s.y - e.y, s.x - e.x);
        const spd = e.cruiser ? 75 : 155;
        e.x += Math.cos(e.angle) * spd * dt;
        e.y += Math.sin(e.angle) * spd * dt;

        e.cd -= dt;
        if (e.cd <= 0 && Math.hypot(s.x - e.x, s.y - e.y) < 420) {
          e.cd = e.cruiser ? 0.95 : 1.75;
          AudioFX.play('railgun');
          this.lasers.push({
            x: e.x, y: e.y,
            vx: Math.cos(e.angle) * 430, vy: Math.sin(e.angle) * 430,
            fromPlayer: false, color: '#f43f5e', life: 1.5
          });
        }
      }

      document.getElementById('hud-top').innerHTML = `
        <div class="hud-cluster">
          <div class="hud-chip">偏轉護盾：<strong style="color:#38bdf8;">${Math.round(s.shield)}%</strong></div>
          <div class="hud-chip">船體裝甲：<strong style="color:#10b981;">${Math.max(0, Math.round(s.hull))}%</strong></div>
          <div class="hud-chip">魚雷能量：<strong style="color:#f59e0b;">${Math.round(s.energy)}%</strong></div>
        </div>
        <div class="hud-cluster">
          <div class="hud-chip">擊墜數：<strong>${this.kills}</strong></div>
        </div>
      `;
    },

    damagePlayer(dmg) {
      const s = this.ship;
      s.shieldFlash = 0.25;
      if (s.shield >= dmg) {
        s.shield -= dmg;
      } else {
        const rem = dmg - s.shield;
        s.shield = 0;
        s.hull -= rem;
        this.fx.addShake(11);
      }
      if (s.hull <= 0) {
        this.over = true;
        AudioFX.play('explosion');
        Nexus.showResult(
          '星艦訊號中斷',
          '你的戰艦在深空交火中遭到擊毀。',
          `<div>本局擊墜<strong>${this.kills}</strong></div><div>最高紀錄<strong>${Nexus.getRecord('void')}</strong></div>`,
          () => this.init(this.canvas, this.ctx)
        );
      }
    },

    render() {
      const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
      ctx.save();
      if (this.fx.shake > 0) ctx.translate((Math.random() - 0.5) * this.fx.shake, (Math.random() - 0.5) * this.fx.shake);

      ctx.fillStyle = '#04070d';
      ctx.fillRect(0, 0, w, h);

      // 視差星空
      ctx.fillStyle = '#cbd5e1';
      for (const st of this.stars) {
        const sx = (st.x - this.ship.x * st.p * 0.15 + w) % w;
        const sy = (st.y - this.ship.y * st.p * 0.15 + h) % h;
        ctx.fillRect(sx, sy, st.s, st.s);
      }

      // 敵艦
      for (const e of this.enemies) {
        ctx.save();
        ctx.translate(e.x, e.y);
        ctx.rotate(e.angle);
        ctx.fillStyle = e.cruiser ? '#881337' : '#9a3412';
        ctx.strokeStyle = '#fb7185';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(e.r, 0);
        ctx.lineTo(-e.r * 0.8, -e.r * 0.75);
        ctx.lineTo(-e.r * 0.4, 0);
        ctx.lineTo(-e.r * 0.8, e.r * 0.75);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }

      // 玩家星艦與偏轉護盾波紋
      const s = this.ship;
      ctx.save();
      ctx.translate(s.x, s.y);
      if (s.shieldFlash > 0) {
        ctx.strokeStyle = `rgba(56, 189, 248, ${s.shieldFlash * 3.5})`;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 28, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.rotate(s.angle);
      ctx.fillStyle = '#e2e8f0';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(22, 0);
      ctx.lineTo(-16, -14);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-16, 14);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();

      // 雷射與電漿魚雷
      for (const l of this.lasers) {
        ctx.save();
        ctx.strokeStyle = l.color;
        ctx.shadowBlur = 10; ctx.shadowColor = l.color;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x - l.vx * 0.025, l.y - l.vy * 0.025); ctx.stroke();
        ctx.restore();
      }
      for (const tp of this.torpedoes) {
        ctx.save();
        ctx.fillStyle = '#38bdf8';
        ctx.shadowBlur = 12; ctx.shadowColor = '#38bdf8';
        ctx.beginPath(); ctx.arc(tp.x, tp.y, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      this.fx.renderParticles(ctx);
      ctx.restore();
    }
  };
});
