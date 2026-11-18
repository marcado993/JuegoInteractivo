// NEON SWARM - Phaser 3 (sin assets externos: todo se genera por codigo)
const VIEW_W = 800, VIEW_H = 600;
const WORLD_W = 2400, WORLD_H = 1800;
const FONT = '"Courier New", monospace';

const config = {
    type: Phaser.AUTO, width: VIEW_W, height: VIEW_H, parent: 'game',
    backgroundColor: '#080b18',
    physics: { default: 'arcade', arcade: { debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: { preload: preload, create: create, update: update }
};
const game = new Phaser.Game(config);

let sc, player, cursors, keys, enemies, bullets, orbs, sparks;
let hudGfx, scoreText, waveText, comboText, bestText, bannerText, dashBtn;
let menuObjs = [], overObjs = [];
let S;                      // estado de la partida
let started = false;        // tras la primera partida, reiniciar salta el menu
let muted = false;
let best = 0;
try { best = parseInt(localStorage.getItem('neonswarm_best') || '0', 10) || 0; } catch (e) {}

// ---------- Texturas generadas por codigo ----------
function tex(scene, key, w, h, draw) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
}

function preload() {
    tex(this, 'block', 32, 32, g => {
        g.fillStyle(0x00e5ff); g.fillRoundedRect(0, 0, 32, 32, 7);
        g.fillStyle(0xffffff, 0.9); g.fillRoundedRect(9, 9, 14, 14, 3);
        g.fillStyle(0x0a1a2a); g.fillRect(22, 14, 10, 4);          // "canon" hacia la derecha
    });
    tex(this, 'chaser', 30, 30, g => {
        g.fillStyle(0xff3860); g.fillPoints([{ x: 15, y: 0 }, { x: 30, y: 15 }, { x: 15, y: 30 }, { x: 0, y: 15 }], true);
        g.fillStyle(0x3a0a18); g.fillCircle(15, 15, 5);
    });
    tex(this, 'runner', 24, 24, g => {
        g.fillStyle(0xb36bff); g.fillTriangle(24, 12, 0, 0, 0, 24);
        g.fillStyle(0xffffff, 0.8); g.fillCircle(7, 12, 3);
    });
    tex(this, 'tank', 52, 52, g => {
        const pts = [];
        for (let i = 0; i < 6; i++) pts.push({ x: 26 + 25 * Math.cos(i * Math.PI / 3), y: 26 + 25 * Math.sin(i * Math.PI / 3) });
        g.fillStyle(0xff9f1c); g.fillPoints(pts, true);
        g.lineStyle(4, 0x4a2a00); g.strokePoints(pts, true);
        g.fillStyle(0x4a2a00); g.fillCircle(26, 26, 9);
    });
    tex(this, 'bullet', 10, 10, g => { g.fillStyle(0xffe14d); g.fillCircle(5, 5, 5); });
    tex(this, 'orb', 20, 20, g => {
        g.fillStyle(0x39ff88, 0.3); g.fillCircle(10, 10, 10);
        g.fillStyle(0x39ff88); g.fillCircle(10, 10, 5);
    });
    tex(this, 'spark', 8, 8, g => { g.fillStyle(0xffffff); g.fillCircle(4, 4, 4); });
    tex(this, 'grid', 64, 64, g => {
        g.fillStyle(0x0a0f22); g.fillRect(0, 0, 64, 64);
        g.lineStyle(1, 0x18265a); g.strokeRect(0, 0, 64, 64);
    });
}

// ---------- Sonido (WebAudio, sin archivos) ----------
let actx;
const SFX = {
    shoot: [900, 0.05, 'square', 0.015, -500],
    kill:  [240, 0.12, 'sawtooth', 0.05, -160],
    hurt:  [130, 0.30, 'sawtooth', 0.10, -90],
    orb:   [660, 0.10, 'sine', 0.06, 520],
    dash:  [280, 0.15, 'triangle', 0.07, 650],
    wave:  [440, 0.35, 'square', 0.05, 440],
    over:  [220, 0.90, 'sawtooth', 0.10, -190]
};
function sfx(kind) {
    if (muted) return;
    try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        if (actx.state === 'suspended') actx.resume();
        const [f, d, type, v, slide] = SFX[kind];
        const t = actx.currentTime, o = actx.createOscillator(), g = actx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f, t);
        o.frequency.linearRampToValueAtTime(Math.max(30, f + slide), t + d);
        g.gain.setValueAtTime(v, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g); g.connect(actx.destination);
        o.start(t); o.stop(t + d);
    } catch (e) {}
}

// ---------- Musica (synthwave procedural, 128 BPM, Am F C G) ----------
const BPM = 128, STEP = 60 / BPM / 4;                       // duracion de una semicorchea
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const BASS = [33, 29, 36, 31];
const MUSIC_VOL = 0.5;
const music = { on: false, step: 0, next: 0, timer: null, gain: null };
let noiseBuf;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);

function mOsc(t, freq, dur, type, vol, cutoff) {
    const o = actx.createOscillator(), g = actx.createGain(), f = actx.createBiquadFilter();
    o.type = type; o.frequency.value = freq;
    f.type = 'lowpass'; f.frequency.value = cutoff;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(music.gain);
    o.start(t); o.stop(t + dur + 0.02);
}
function mNoise(t, dur, vol, hp) {
    if (!noiseBuf) {
        noiseBuf = actx.createBuffer(1, actx.sampleRate, actx.sampleRate);
        const d = noiseBuf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
    s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(music.gain);
    s.start(t); s.stop(t + dur);
}
function mKick(t) {
    const o = actx.createOscillator(), g = actx.createGain();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.9, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(music.gain);
    o.start(t); o.stop(t + 0.25);
}
function musicStep(s, t) {
    const lvl = S && S.wave >= 4 ? 3 : S && S.wave >= 2 ? 2 : 1;   // mas capas conforme suben las olas
    const c = Math.floor(s / 16) % 4;
    if (s % 4 === 0) mKick(t);
    if (s % 4 === 2) mNoise(t, 0.05, 0.10, 7000);
    if (lvl >= 3 && s % 8 === 4) { mNoise(t, 0.16, 0.22, 1800); mOsc(t, 190, 0.1, 'triangle', 0.15, 1500); }
    if (s % 2 === 0) mOsc(t, mtof(BASS[c] + (lvl >= 2 && s % 8 === 6 ? 12 : 0)), STEP * 1.8, 'sawtooth', 0.2, 700);
    if (lvl >= 2) mOsc(t, mtof(CHORDS[c][[0, 1, 2, 1][s % 4]] + 12), STEP * 0.9, 'square', 0.05, 2600);
    if (lvl >= 3 && s % 16 === 0) CHORDS[c].forEach(n => mOsc(t, mtof(n), STEP * 15, 'sawtooth', 0.035, 900));
}
function musicTick() {
    if (!actx || !music.on) return;
    if (music.next < actx.currentTime - 0.3) music.next = actx.currentTime + 0.05;   // la pestana estuvo en segundo plano
    while (music.next < actx.currentTime + 0.15) {
        musicStep(music.step, music.next);
        music.next += STEP;
        music.step = (music.step + 1) % 64;
    }
}
function musicStart() {
    try {
        actx = actx || new (window.AudioContext || window.webkitAudioContext)();
        if (actx.state === 'suspended') actx.resume();
        if (music.on) return;
        music.on = true; music.step = 0; music.next = actx.currentTime + 0.05;
        music.gain = actx.createGain();
        music.gain.gain.value = muted ? 0 : MUSIC_VOL;
        music.gain.connect(actx.destination);
        music.timer = setInterval(musicTick, 25);
    } catch (e) { music.on = false; }
}
function musicStop() {
    if (!music.on) return;
    music.on = false; clearInterval(music.timer);
    const g = music.gain;
    g.gain.setTargetAtTime(0, actx.currentTime, 0.15);
    setTimeout(() => g.disconnect(), 1200);
}
function toggleMute() {
    muted = !muted;
    if (music.on) music.gain.gain.setTargetAtTime(muted ? 0 : MUSIC_VOL, actx.currentTime, 0.05);
}
document.addEventListener('visibilitychange', () => {
    if (!actx) return;
    if (document.hidden) actx.suspend(); else actx.resume();
});

// ---------- Utilidades ----------
function txt(x, y, str, size, color, fixed) {
    const t = sc.add.text(x, y, str, { fontFamily: FONT, fontStyle: 'bold', fontSize: size + 'px', color: color || '#ffffff', align: 'center' });
    if (fixed) t.setScrollFactor(0).setDepth(100);
    return t;
}
function burst(x, y, color, n) { sparks.setParticleTint(color); sparks.explode(n, x, y); }
function popup(x, y, str, color) {
    const t = sc.add.text(x, y, str, { fontFamily: FONT, fontStyle: 'bold', fontSize: '18px', color: color || '#ffffff', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(50);
    sc.tweens.add({ targets: t, y: y - 46, alpha: 0, duration: 750, onComplete: () => t.destroy() });
}
function banner(str, color) {
    sc.tweens.killTweensOf(bannerText);
    bannerText.setText(str).setColor(color || '#ffffff').setAlpha(1).setScale(0.6);
    sc.tweens.add({ targets: bannerText, scale: 1, duration: 300, ease: 'Back.out' });
    sc.tweens.add({ targets: bannerText, alpha: 0, delay: 1100, duration: 600 });
}
function multiplier() { return Math.min(8, 1 + Math.floor(S.combo / 5)); }

// ---------- create ----------
function create() {
    sc = this;
    sc.physics.resume();
    S = {
        state: started ? 'play' : 'menu', hp: 100, maxHp: 100, score: 0, kills: 0,
        combo: 0, comboT: 0, wave: 0, toSpawn: 0, spawnT: 0, waitNext: false,
        weapon: 1, fireT: 0, dashT: 0, dashCd: 0, dashVec: new Phaser.Math.Vector2(), invuln: 0,
        face: new Phaser.Math.Vector2(1, 0), overAt: 0
    };

    sc.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    sc.add.tileSprite(0, 0, WORLD_W, WORLD_H, 'grid').setOrigin(0).setDepth(-10);
    sc.add.graphics().lineStyle(6, 0xff3de1, 1).strokeRect(3, 3, WORLD_W - 6, WORLD_H - 6).setDepth(-5);

    // Jugador + camara (igual que en el taller)
    player = sc.physics.add.image(WORLD_W / 2, WORLD_H / 2, 'block').setDepth(10);
    player.setCollideWorldBounds(true);
    player.body.setCircle(14, 2, 2);
    sc.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    sc.cameras.main.startFollow(player, true, 0.1, 0.1);
    cursors = sc.input.keyboard.createCursorKeys();
    keys = sc.input.keyboard.addKeys('W,A,S,D,SPACE,M');

    enemies = sc.physics.add.group();
    bullets = sc.physics.add.group();
    orbs = sc.physics.add.group();

    sparks = sc.add.particles(0, 0, 'spark', {
        speed: { min: 60, max: 340 }, lifespan: { min: 250, max: 650 },
        scale: { start: 1.3, end: 0 }, alpha: { start: 1, end: 0 },
        blendMode: 'ADD', emitting: false
    }).setDepth(20);
    sc.add.particles(0, 0, 'spark', {
        follow: player, lifespan: 320, scale: { start: 1.6, end: 0 }, alpha: { start: 0.5, end: 0 },
        tint: 0x00e5ff, blendMode: 'ADD', frequency: 25
    }).setDepth(9);

    sc.physics.add.overlap(bullets, enemies, hitEnemy);
    sc.physics.add.overlap(player, enemies, hurtPlayer);
    sc.physics.add.overlap(player, orbs, takeOrb);
    sc.physics.add.collider(enemies, enemies);

    // HUD
    hudGfx = sc.add.graphics().setScrollFactor(0).setDepth(100);
    scoreText = txt(16, 10, '', 22, '#ffe14d', true);
    bestText = txt(16, 76, '', 14, '#8fa3d9', true);
    waveText = txt(VIEW_W / 2, 10, '', 20, '#ff3de1', true).setOrigin(0.5, 0);
    comboText = txt(VIEW_W - 16, 112, '', 20, '#39ff88', true).setOrigin(1, 0);
    bannerText = txt(VIEW_W / 2, VIEW_H / 2 - 70, '', 54, '#ffffff', true).setOrigin(0.5).setAlpha(0);
    bannerText.setStroke('#000', 6);

    // Boton de dash para tactil
    if (sc.sys.game.device.input.touch) {
        sc.input.addPointer(1);
        dashBtn = sc.add.circle(VIEW_W - 70, VIEW_H - 70, 44, 0x00e5ff, 0.25).setStrokeStyle(3, 0x00e5ff).setScrollFactor(0).setDepth(100).setInteractive();
        txt(VIEW_W - 70, VIEW_H - 70, 'DASH', 16, '#00e5ff', true).setOrigin(0.5);
        dashBtn.on('pointerdown', () => tryDash());
    }

    if (S.state === 'menu') showMenu(); else startGame();
}

// ---------- Menu / flujo ----------
function showMenu() {
    const t = txt(VIEW_W / 2, 170, 'NEON SWARM', 72, '#00e5ff', true).setOrigin(0.5).setStroke('#ff3de1', 6);
    sc.tweens.add({ targets: t, scale: 1.06, yoyo: true, repeat: -1, duration: 700 });
    menuObjs = [t,
        txt(VIEW_W / 2, 270, 'Sobrevive a la horda. Dispara solo, tu solo esquiva.', 18, '#c9d4ff', true).setOrigin(0.5),
        txt(VIEW_W / 2, 330, 'FLECHAS / WASD  mover      ESPACIO  dash (invulnerable)', 16, '#ffffff', true).setOrigin(0.5),
        txt(VIEW_W / 2, 358, 'Recoge los orbes verdes para curarte  ·  M = silencio', 16, '#39ff88', true).setOrigin(0.5),
        txt(VIEW_W / 2, 430, best ? 'RECORD: ' + best : '', 22, '#ffe14d', true).setOrigin(0.5)
    ];
    const go = txt(VIEW_W / 2, 500, 'PRESIONA ESPACIO O TOCA PARA JUGAR', 24, '#ffffff', true).setOrigin(0.5);
    sc.tweens.add({ targets: go, alpha: 0.2, yoyo: true, repeat: -1, duration: 500 });
    menuObjs.push(go);
    sc.input.once('pointerdown', () => { if (S.state === 'menu') startGame(); });
}

function startGame() {
    started = true;
    menuObjs.forEach(o => o.destroy()); menuObjs = [];
    S.state = 'play';
    musicStart();
    startWave(1);
}

function startWave(n) {
    S.wave = n;
    S.toSpawn = 8 + n * 7;
    S.spawnT = 600;
    S.waitNext = false;
    const w = Math.min(4, 1 + Math.floor((n - 1) / 2));
    if (w > S.weapon) { S.weapon = w; banner('ARMA MEJORADA', '#ffe14d'); sc.time.delayedCall(900, () => S.state === 'play' && banner('OLA ' + n, '#ff3de1')); }
    else banner('OLA ' + n, '#ff3de1');
    sfx('wave');
}

// ---------- Enemigos ----------
const TYPES = {
    chaser: { key: 'chaser', hp: 1, speed: 105, dmg: 15, pts: 10, color: 0xff3860, r: 14 },
    runner: { key: 'runner', hp: 1, speed: 215, dmg: 10, pts: 20, color: 0xb36bff, r: 11 },
    tank:   { key: 'tank',   hp: 6, speed: 65,  dmg: 30, pts: 60, color: 0xff9f1c, r: 24 }
};

function spawnEnemy() {
    const r = Math.random();
    let type = 'chaser';
    if (S.wave >= 3 && r < 0.14) type = 'tank';
    else if (S.wave >= 2 && r < 0.40) type = 'runner';
    const T = TYPES[type];
    const a = Math.random() * Math.PI * 2, d = 520 + Math.random() * 120;
    const x = Phaser.Math.Clamp(player.x + Math.cos(a) * d, 30, WORLD_W - 30);
    const y = Phaser.Math.Clamp(player.y + Math.sin(a) * d, 30, WORLD_H - 30);
    const e = enemies.create(x, y, T.key).setDepth(8);
    e.body.setCircle(T.r, e.width / 2 - T.r, e.height / 2 - T.r);
    e.type = type; e.hp = T.hp + Math.floor(S.wave / (type === 'tank' ? 3 : type === 'runner' ? 6 : 4));
    e.speed = T.speed + S.wave * 4; e.dmg = T.dmg; e.pts = T.pts; e.color = T.color;
    e.stun = 0; e.spawnT = sc.time.now + 400;
    e.setAlpha(0);
    sc.tweens.add({ targets: e, alpha: 1, duration: 350 });
}

function hitEnemy(b, e) {
    if (!b.active || !e.active) return;
    const vx = b.body.velocity.x, vy = b.body.velocity.y;
    b.destroy();
    e.hp -= 1;
    e.setTintFill(0xffffff);
    sc.time.delayedCall(60, () => { if (e.active) e.clearTint(); });
    e.stun = sc.time.now + 110;
    e.setVelocity(vx * 0.35, vy * 0.35);
    burst(e.x, e.y, 0xffe14d, 4);
    if (e.hp <= 0) killEnemy(e);
}

function killEnemy(e) {
    const big = e.type === 'tank';
    burst(e.x, e.y, e.color, big ? 34 : 16);
    S.combo++; S.comboT = 2500; S.kills++;
    const pts = e.pts * multiplier();
    S.score += pts;
    popup(e.x, e.y - 10, '+' + pts, '#ffe14d');
    sc.cameras.main.shake(big ? 160 : 70, big ? 0.006 : 0.002);
    sfx('kill');
    if (big || Math.random() < 0.18) {
        const o = orbs.create(e.x, e.y, 'orb').setDepth(6);
        o.setBlendMode(Phaser.BlendModes.ADD);
        sc.tweens.add({ targets: o, scale: 1.4, yoyo: true, repeat: -1, duration: 500 });
        sc.time.delayedCall(9000, () => o.active && o.destroy());
    }
    e.destroy();
}

function hurtPlayer(p, e) {
    if (S.state !== 'play' || S.invuln > 0 || S.dashT > 0 || sc.time.now < e.spawnT) return;
    S.hp -= e.dmg; S.invuln = 1000; S.combo = 0;
    sc.cameras.main.shake(220, 0.012);
    sc.cameras.main.flash(120, 255, 40, 80);
    burst(p.x, p.y, 0xff3860, 22);
    sfx('hurt');
    if (e.type === 'tank') {
        const a = Phaser.Math.Angle.Between(p.x, p.y, e.x, e.y);
        e.stun = sc.time.now + 400;
        e.setVelocity(Math.cos(a) * 320, Math.sin(a) * 320);
    } else killEnemy(e);
    if (S.hp <= 0) gameOver();
}

function takeOrb(p, o) {
    S.hp = Math.min(S.maxHp, S.hp + 10);
    S.score += 25;
    popup(o.x, o.y - 10, '+10 HP', '#39ff88');
    burst(o.x, o.y, 0x39ff88, 12);
    sfx('orb');
    o.destroy();
}

// ---------- Jugador ----------
function fire(angle) {
    const spreads = { 1: [0], 2: [-0.07, 0.07], 3: [-0.2, 0, 0.2], 4: [-0.32, -0.16, 0, 0.16, 0.32] }[S.weapon];
    spreads.forEach(s => {
        const a = angle + s;
        const b = bullets.create(player.x, player.y, 'bullet').setDepth(7);
        b.setBlendMode(Phaser.BlendModes.ADD);
        b.body.setCircle(5);
        b.setVelocity(Math.cos(a) * 680, Math.sin(a) * 680);
        sc.time.delayedCall(900, () => b.active && b.destroy());
    });
    sfx('shoot');
}

function tryDash() {
    if (S.state !== 'play' || S.dashCd > 0) return;
    S.dashT = 170; S.dashCd = 900;
    S.dashVec.copy(S.face).scale(840);
    S.invuln = Math.max(S.invuln, 260);
    burst(player.x, player.y, 0x00e5ff, 18);
    sfx('dash');
}

function gameOver() {
    S.state = 'over'; S.overAt = sc.time.now;
    musicStop();
    sfx('over');
    burst(player.x, player.y, 0x00e5ff, 60);
    player.setVisible(false);
    sc.cameras.main.shake(500, 0.02);
    sc.physics.pause();
    const newBest = S.score > best;
    if (newBest) { best = S.score; try { localStorage.setItem('neonswarm_best', String(best)); } catch (e) {} }
    overObjs = [
        sc.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x000000, 0.6).setScrollFactor(0).setDepth(99),
        txt(VIEW_W / 2, 170, 'GAME OVER', 68, '#ff3860', true).setOrigin(0.5).setStroke('#000', 6),
        txt(VIEW_W / 2, 270, 'PUNTAJE  ' + S.score, 30, '#ffe14d', true).setOrigin(0.5),
        txt(VIEW_W / 2, 314, 'Ola ' + S.wave + '  ·  ' + S.kills + ' enemigos destruidos', 18, '#c9d4ff', true).setOrigin(0.5),
        txt(VIEW_W / 2, 354, newBest ? '¡NUEVO RECORD!' : 'Record: ' + best, 22, newBest ? '#39ff88' : '#8fa3d9', true).setOrigin(0.5)
    ];
    const again = txt(VIEW_W / 2, 450, 'ESPACIO O TOCA PARA REINTENTAR', 22, '#ffffff', true).setOrigin(0.5);
    sc.tweens.add({ targets: again, alpha: 0.2, yoyo: true, repeat: -1, duration: 500 });
    overObjs.push(again);
}

// ---------- HUD ----------
function drawHud() {
    const g = hudGfx;
    g.clear();
    // vida
    g.fillStyle(0x1c2447); g.fillRect(16, 42, 200, 14);
    const hpFrac = Math.max(0, S.hp) / S.maxHp;
    g.fillStyle(hpFrac > 0.5 ? 0x39ff88 : hpFrac > 0.25 ? 0xffe14d : 0xff3860); g.fillRect(16, 42, 200 * hpFrac, 14);
    g.lineStyle(2, 0xffffff, 0.6); g.strokeRect(16, 42, 200, 14);
    // dash
    g.fillStyle(0x1c2447); g.fillRect(16, 62, 200, 6);
    g.fillStyle(0x00e5ff); g.fillRect(16, 62, 200 * (1 - Math.max(0, S.dashCd) / 900), 6);
    // minimapa
    const mx = VIEW_W - 136, my = 12, mw = 120, mh = 90, k = mw / WORLD_W;
    g.fillStyle(0x000000, 0.55); g.fillRect(mx, my, mw, mh);
    g.lineStyle(1, 0xff3de1, 0.9); g.strokeRect(mx, my, mw, mh);
    const cam = sc.cameras.main;
    g.lineStyle(1, 0xffffff, 0.35); g.strokeRect(mx + cam.scrollX * k, my + cam.scrollY * k, VIEW_W * k, VIEW_H * k);
    g.fillStyle(0xff3860);
    enemies.getChildren().forEach(e => g.fillRect(mx + e.x * k - 1, my + e.y * k - 1, 3, 3));
    g.fillStyle(0x39ff88);
    orbs.getChildren().forEach(o => g.fillRect(mx + o.x * k - 1, my + o.y * k - 1, 2, 2));
    g.fillStyle(0x00e5ff); g.fillRect(mx + player.x * k - 2, my + player.y * k - 2, 5, 5);

    scoreText.setText('PUNTOS ' + S.score);
    bestText.setText('RECORD ' + Math.max(best, S.score));
    waveText.setText(S.wave ? 'OLA ' + S.wave : '');
    comboText.setText(S.combo >= 2 ? 'x' + multiplier() + '  COMBO ' + S.combo : '');
}

// ---------- update ----------
function update(time, delta) {
    if (Phaser.Input.Keyboard.JustDown(keys.M)) toggleMute();

    if (S.state === 'menu') {
        if (Phaser.Input.Keyboard.JustDown(keys.SPACE)) startGame();
        drawHud();
        return;
    }
    if (S.state === 'over') {
        if (time - S.overAt > 700 && (Phaser.Input.Keyboard.JustDown(keys.SPACE) || sc.input.activePointer.isDown)) sc.scene.restart();
        return;
    }

    // --- movimiento ---
    let dx = 0, dy = 0;
    if (cursors.left.isDown || keys.A.isDown) dx -= 1;
    if (cursors.right.isDown || keys.D.isDown) dx += 1;
    if (cursors.up.isDown || keys.W.isDown) dy -= 1;
    if (cursors.down.isDown || keys.S.isDown) dy += 1;
    [sc.input.pointer1, sc.input.pointer2].forEach(p => {   // tactil: arrastra hacia donde quieres ir
        if (p && p.isDown && p.wasTouch && !(dashBtn && Phaser.Math.Distance.Between(p.x, p.y, dashBtn.x, dashBtn.y) < 60)) {
            const tx = p.x - (player.x - sc.cameras.main.scrollX), ty = p.y - (player.y - sc.cameras.main.scrollY);
            if (Math.hypot(tx, ty) > 24) { dx = tx; dy = ty; }
        }
    });
    const len = Math.hypot(dx, dy);
    if (len > 0) { dx /= len; dy /= len; S.face.set(dx, dy); }

    if (Phaser.Input.Keyboard.JustDown(keys.SPACE)) tryDash();
    S.dashCd -= delta;
    if (S.dashT > 0) { S.dashT -= delta; player.setVelocity(S.dashVec.x, S.dashVec.y); }
    else player.setVelocity(dx * 300, dy * 300);

    if (S.invuln > 0) { S.invuln -= delta; player.setAlpha(Math.floor(S.invuln / 70) % 2 ? 0.35 : 1); }
    else player.setAlpha(1);

    // --- disparo automatico al enemigo mas cercano ---
    S.fireT -= delta;
    let target = null, best2 = 480 * 480;
    enemies.getChildren().forEach(e => {
        const d2 = (e.x - player.x) ** 2 + (e.y - player.y) ** 2;
        if (d2 < best2) { best2 = d2; target = e; }
    });
    if (target) {
        const a = Phaser.Math.Angle.Between(player.x, player.y, target.x, target.y);
        player.rotation = Phaser.Math.Angle.RotateTo(player.rotation, a, 0.35);
        if (S.fireT <= 0) { fire(a); S.fireT = [260, 235, 210, 185][S.weapon - 1]; }
    } else if (len > 0) player.rotation = Phaser.Math.Angle.RotateTo(player.rotation, Math.atan2(dy, dx), 0.2);

    // --- enemigos persiguen ---
    enemies.getChildren().forEach(e => {
        if (time > e.stun) {
            sc.physics.moveToObject(e, player, e.speed);
            if (e.type === 'runner') e.rotation = Math.atan2(e.body.velocity.y, e.body.velocity.x);
            else e.rotation += e.type === 'tank' ? 0.01 : 0.05;
        }
    });

    // --- oleadas ---
    S.spawnT -= delta;
    if (S.toSpawn > 0 && S.spawnT <= 0 && enemies.countActive() < 60) {
        const pack = Math.min(S.toSpawn, 1 + Math.floor(S.wave / 3));   // spawns en grupo
        for (let i = 0; i < pack; i++) spawnEnemy();
        S.toSpawn -= pack;
        S.spawnT = Math.max(300, 800 - S.wave * 40);
    }
    if (S.toSpawn === 0 && enemies.countActive() === 0 && !S.waitNext) {
        S.waitNext = true;
        const bonus = 100 * S.wave;
        S.score += bonus; S.hp = Math.min(S.maxHp, S.hp + 15);
        banner('OLA SUPERADA +' + bonus, '#39ff88');
        sc.time.delayedCall(2300, () => { if (S.state === 'play') startWave(S.wave + 1); });
    }

    S.comboT -= delta;
    if (S.comboT <= 0) S.combo = 0;
    drawHud();
}
