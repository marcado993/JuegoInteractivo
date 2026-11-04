// NOOB SWARM - Phaser 3 (sin assets externos: todo se genera por codigo)
// Shooter de naves estilo Roblox: naves de ladrillos con piloto "noob", monedas, tienda de naves y mejoras.
const VIEW_W = 800, VIEW_H = 600;
const WORLD_W = 2400, WORLD_H = 1800;
const FONT = '"Fredoka", "Trebuchet MS", Verdana, sans-serif';
const WORLD_COLORS = [0x0b1030, 0x240b3a, 0x0b3a3a, 0x3a240b, 0x3a0b1c];

const SHIPS = [
    { name: 'Nave Noob', c: 0x1e88e5, cost: 0, hp: 100, spd: 300, pat: 1, rate: 260 },
    { name: 'Rayo Rojo', c: 0xe53935, cost: 200, hp: 100, spd: 340, pat: 2, rate: 240 },
    { name: 'Tanque Verde', c: 0x43a047, cost: 450, hp: 160, spd: 280, pat: 3, rate: 270 },
    { name: 'Dorada', c: 0xfdd835, cost: 900, hp: 130, spd: 320, pat: 3, rate: 200 },
    { name: 'Cósmica', c: 0x8e24aa, cost: 1600, hp: 150, spd: 330, pat: 4, rate: 220 },
    { name: 'Arcoíris', c: 0xeeeeee, cost: 3000, hp: 200, spd: 340, pat: 4, rate: 160, rainbow: true }
];
const UPG = [
    { key: 'dmg', name: 'Daño', desc: '+50% de daño por nivel', max: 6, cost: [60, 120, 220, 380, 600, 900] },
    { key: 'rate', name: 'Cadencia', desc: 'Disparas más rápido', max: 5, cost: [60, 120, 220, 380, 600] },
    { key: 'hp', name: 'Vida máxima', desc: '+20 de vida por nivel', max: 5, cost: [50, 100, 180, 300, 480] },
    { key: 'speed', name: 'Velocidad', desc: '+6% de velocidad por nivel', max: 4, cost: [50, 100, 180, 300] },
    { key: 'magnet', name: 'Imán de monedas', desc: 'Atrae monedas desde más lejos', max: 4, cost: [40, 90, 160, 260] }
];

// ---------- Progreso guardado ----------
let save = { coins: 0, bestWave: 0, dmg: 0, rate: 0, hp: 0, speed: 0, magnet: 0, ship: 0, owned: [true, false, false, false, false, false] };
try { const s = JSON.parse(localStorage.getItem('noobswarm_save') || 'null'); if (s) save = Object.assign(save, s); } catch (e) {}
function persist() { try { localStorage.setItem('noobswarm_save', JSON.stringify(save)); } catch (e) {} }

const ship = () => SHIPS[save.ship];
const maxHpOf = () => ship().hp + 20 * save.hp;
const speedOf = () => ship().spd * (1 + 0.06 * save.speed);
const dmgOf = () => 1 + 0.5 * save.dmg;
const rateOf = () => ship().rate * (1 - 0.08 * save.rate);
const magnetR = () => 110 + 60 * save.magnet;

const config = {
    type: Phaser.AUTO, width: VIEW_W, height: VIEW_H, parent: 'game', backgroundColor: '#0b1030',
    physics: { default: 'arcade', arcade: { debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: { preload: preload, create: create, update: update }
};
let game;
const fontReady = (document.fonts && document.fonts.load)
    ? Promise.race([document.fonts.load('700 24px Fredoka'), new Promise(r => setTimeout(r, 1200))])
    : Promise.resolve();
fontReady.then(() => { game = new Phaser.Game(config); });

let sc, player, keys, cursors, enemies, bullets, ebullets, coinGrp, orbs, sparks, sky, planets = [], stars1, stars2;
let hud = {}, hudGfx, dashBtn, shopObjs = [], shopRows = [], shipBoxes = [], menuObjs = [], overObjs = [];
let S, started = false, muted = false, actx;
const J = Phaser.Input.Keyboard.JustDown;
const rnd = (a, b) => Phaser.Math.Between(a, b);

// ---------- Texturas (ladrillos estilo Roblox) ----------
function tex(scene, key, w, h, draw) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
}
const shade = (c, amt) => { const col = Phaser.Display.Color.ValueToColor(c); return (amt > 0 ? col.lighten(amt) : col.darken(-amt)).color; };

function brick(g, x, y, w, h, c, studs) {
    g.fillStyle(c); g.fillRect(x, y, w, h);
    g.fillStyle(shade(c, 25), 0.9); g.fillRect(x, y, w, 3);
    g.fillStyle(shade(c, -28)); g.fillRect(x, y + h - 4, w, 4);
    g.lineStyle(2, 0x111111, 0.85); g.strokeRect(x + 1, y + 1, w - 2, h - 2);
    if (studs) {
        for (let sx = x + 9; sx < x + w - 4; sx += 13) for (let sy = y + 9; sy < y + h - 6; sy += 13) {
            g.fillStyle(shade(c, -22)); g.fillCircle(sx, sy + 1, 3.6);
            g.fillStyle(shade(c, 24)); g.fillCircle(sx, sy, 3.1);
        }
    }
}

function angryFace(g, x, y, k) {
    g.fillStyle(0xffffff); g.fillRect(x + 2 * k, y + 4 * k, 4 * k, 4 * k); g.fillRect(x + 10 * k, y + 4 * k, 4 * k, 4 * k);
    g.fillStyle(0x111111); g.fillRect(x + 4 * k, y + 5 * k, 2 * k, 3 * k); g.fillRect(x + 10 * k, y + 5 * k, 2 * k, 3 * k);
    g.lineStyle(Math.max(2, 1.6 * k), 0x111111);
    g.lineBetween(x + k, y + 2 * k, x + 7 * k, y + 4 * k); g.lineBetween(x + 15 * k, y + 2 * k, x + 9 * k, y + 4 * k);
    g.fillRect(x + 4 * k, y + 10 * k, 8 * k, 1.6 * k);
}

function drawShip(g, c) {
    const wing = shade(c, -18);
    brick(g, 8, 2, 26, 12, wing, false);
    brick(g, 8, 34, 26, 12, wing, false);
    brick(g, 4, 12, 44, 24, c, false);
    brick(g, 46, 16, 14, 16, shade(c, 20), false);
    g.fillStyle(0xffa000); g.fillRect(0, 18, 6, 12); g.fillStyle(0xffe27a); g.fillRect(0, 21, 4, 6);
    g.fillStyle(0xf5cd30); g.fillRect(20, 16, 16, 16);                                   // piloto noob
    g.lineStyle(2, 0x111111, 0.85); g.strokeRect(21, 17, 14, 14);
    g.fillStyle(0x222222); g.fillRect(25, 21, 2, 3); g.fillRect(31, 21, 2, 3);
    g.fillRect(24, 26, 1, 1); g.fillRect(25, 27, 8, 1); g.fillRect(33, 26, 1, 1);
    [[13, 7], [25, 7], [13, 41], [25, 41]].forEach(([x, y]) => { g.fillStyle(shade(wing, 22)); g.fillCircle(x, y, 3); });
}

function preload() {
    SHIPS.forEach((s, i) => tex(this, 'ship' + i, 64, 48, g => drawShip(g, s.c)));
    tex(this, 'e_chaser', 38, 38, g => { brick(g, 0, 0, 38, 38, 0xe53935, false); angryFace(g, 11, 11, 1.1); [[6, 6], [32, 6], [6, 32], [32, 32]].forEach(([x, y]) => { g.fillStyle(0xff8a80); g.fillCircle(x, y, 2.5); }); });
    tex(this, 'e_runner', 44, 30, g => {
        brick(g, 0, 3, 28, 24, 0x8e24aa, false); brick(g, 26, 8, 16, 14, 0xba68c8, false);
        g.fillStyle(0xffffff); g.fillRect(12, 9, 5, 5); g.fillRect(12, 17, 5, 5); g.fillStyle(0x111111); g.fillRect(15, 10, 2, 3); g.fillRect(15, 18, 2, 3);
    });
    tex(this, 'e_gunner', 52, 44, g => {
        brick(g, 0, 4, 38, 36, 0x00897b, false); brick(g, 36, 16, 16, 12, 0x37474f, false);
        angryFace(g, 6, 12, 1.1);
    });
    tex(this, 'e_tank', 64, 64, g => { brick(g, 0, 0, 64, 64, 0xfb8c00, true); angryFace(g, 16, 22, 2); });
    tex(this, 'e_boss', 132, 132, g => {
        brick(g, 4, 28, 124, 100, 0xd32f2f, true);
        [10, 52, 94].forEach(x => brick(g, x, 4, 28, 28, 0xfdd835, false));               // corona
        g.fillStyle(0x111111); g.fillRect(24, 56, 84, 8);
        angryFace(g, 24, 62, 5.2);
    });
    tex(this, 'pb', 16, 8, g => { g.fillStyle(0xffeb3b); g.fillRoundedRect(0, 0, 16, 8, 3); g.lineStyle(2, 0x111111, 0.8); g.strokeRoundedRect(1, 1, 14, 6, 2); });
    tex(this, 'eb', 14, 14, g => { g.fillStyle(0xff4081); g.fillCircle(7, 7, 7); g.fillStyle(0xffffff, 0.5); g.fillCircle(5, 5, 2.5); g.lineStyle(2, 0x111111, 0.7); g.strokeCircle(7, 7, 6); });
    tex(this, 'coin', 20, 20, g => { g.fillStyle(0xb8860b); g.fillCircle(10, 10, 10); g.fillStyle(0xf5cd30); g.fillCircle(10, 10, 8); g.fillStyle(0xffe27a); g.fillCircle(10, 10, 5); });
    tex(this, 'orb', 24, 24, g => {
        g.fillStyle(0x39d353); g.fillRoundedRect(0, 0, 24, 24, 6); g.lineStyle(2, 0x111111, 0.8); g.strokeRoundedRect(1, 1, 22, 22, 6);
        g.fillStyle(0xffffff); g.fillRect(10, 4, 4, 16); g.fillRect(4, 10, 16, 4);
    });
    tex(this, 'head', 16, 16, g => {
        g.fillStyle(0xf5cd30); g.fillRect(0, 0, 16, 16); g.lineStyle(2, 0x111111, 0.85); g.strokeRect(1, 1, 14, 14);
        g.fillStyle(0x222222); g.fillRect(4, 5, 2, 3); g.fillRect(10, 5, 2, 3); g.fillRect(4, 11, 8, 1);
    });
    tex(this, 'spark', 6, 6, g => { g.fillStyle(0xffffff); g.fillRect(0, 0, 6, 6); });
    tex(this, 'grid', 64, 64, g => {
        g.fillStyle(0x0e1538); g.fillRect(0, 0, 64, 64); g.lineStyle(1, 0x1a2760); g.strokeRect(0, 0, 64, 64);
        g.fillStyle(0x2a3a80, 0.55); g.fillCircle(32, 32, 4);                              // tachuela de baseplate
    });
    tex(this, 'stars1', 256, 256, g => { for (let i = 0; i < 55; i++) { g.fillStyle(0xffffff, Phaser.Math.FloatBetween(0.25, 0.7)); g.fillRect(rnd(0, 254), rnd(0, 254), 2, 2); } });
    tex(this, 'stars2', 256, 256, g => { for (let i = 0; i < 18; i++) { g.fillStyle([0xfff59d, 0x80d8ff, 0xffffff][i % 3], 0.9); g.fillRect(rnd(0, 252), rnd(0, 252), 4, 4); } });
    [[0x1e88e5, 0x64b5f6], [0xe53935, 0xff8a65], [0x43a047, 0xaed581], [0xfdd835, 0xfff176]].forEach(([c, l], i) => tex(this, 'planet' + i, 220, 220, g => {
        g.fillStyle(c); g.fillCircle(110, 110, 100);
        g.fillStyle(0x000000, 0.22); g.fillCircle(140, 130, 92);
        g.fillStyle(l, 0.9); g.fillCircle(72, 70, 20); g.fillCircle(150, 60, 11); g.fillCircle(60, 140, 14);
        g.lineStyle(5, 0x111111, 0.7); g.strokeCircle(110, 110, 100);
    }));
}

// ---------- Sonido y musica (WebAudio, sin archivos) ----------
const SFX = {
    shoot: [[900, 0.05, 'square', 0.012, -500, 0]],
    kill:  [[240, 0.12, 'sawtooth', 0.045, -160, 0]],
    hurt:  [[330, 0.12, 'square', 0.10, -90, 0], [210, 0.28, 'square', 0.10, -150, 0.11]],       // el "oof"
    coin:  [[988, 0.06, 'square', 0.035, 0, 0], [1319, 0.12, 'square', 0.035, 0, 0.06]],
    orb:   [[660, 0.1, 'sine', 0.06, 520, 0]],
    dash:  [[280, 0.15, 'triangle', 0.07, 650, 0]],
    wave:  [[523, 0.1, 'square', 0.05, 0, 0], [659, 0.1, 'square', 0.05, 0, 0.1], [784, 0.2, 'square', 0.05, 0, 0.2]],
    boss:  [[110, 0.5, 'sawtooth', 0.12, 40, 0], [90, 0.6, 'sawtooth', 0.12, 30, 0.3]],
    win:   [[523, 0.12, 'square', 0.06, 0, 0], [659, 0.12, 'square', 0.06, 0, 0.1], [784, 0.12, 'square', 0.06, 0, 0.2], [1047, 0.35, 'square', 0.06, 0, 0.3]],
    over:  [[330, 0.14, 'square', 0.12, -90, 0], [250, 0.2, 'square', 0.12, -120, 0.13], [160, 0.5, 'square', 0.12, -100, 0.3]],
    buy:   [[660, 0.09, 'square', 0.05, 0, 0], [990, 0.16, 'square', 0.05, 0, 0.08]],
    nope:  [[150, 0.2, 'square', 0.06, -40, 0]]
};
function ctx() {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    return actx;
}
function sfx(kind) {
    if (muted) return;
    try {
        const a = ctx();
        SFX[kind].forEach(([f, d, type, v, slide, delay]) => {
            const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
            o.type = type;
            o.frequency.setValueAtTime(f, t);
            if (slide) o.frequency.linearRampToValueAtTime(Math.max(30, f + slide), t + d);
            g.gain.setValueAtTime(v, t);
            g.gain.exponentialRampToValueAtTime(0.0001, t + d);
            o.connect(g); g.connect(a.destination);
            o.start(t); o.stop(t + d + 0.02);
        });
    } catch (e) {}
}

// Musica: synth espacial a 128 BPM, progresion Am F C G; mas capas conforme suben las olas
const BPM = 128, STEP = 60 / BPM / 4;
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const BASS = [33, 29, 36, 31];
const MUSIC_VOL = 0.42;
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
    g.gain.setValueAtTime(0.8, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g); g.connect(music.gain);
    o.start(t); o.stop(t + 0.25);
}
function musicStep(s, t) {
    const w = S ? S.wave : 1, lvl = w >= 4 ? 3 : w >= 2 ? 2 : 1;
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
    if (music.next < actx.currentTime - 0.3) music.next = actx.currentTime + 0.05;
    while (music.next < actx.currentTime + 0.15) {
        musicStep(music.step, music.next);
        music.next += STEP;
        music.step = (music.step + 1) % 64;
    }
}
function musicStart() {
    try {
        const a = ctx();
        if (music.on) return;
        music.on = true; music.step = 0; music.next = a.currentTime + 0.05;
        music.gain = a.createGain();
        music.gain.gain.value = muted ? 0 : MUSIC_VOL;
        music.gain.connect(a.destination);
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

// ---------- Utilidades de interfaz ----------
function T(x, y, str, size, color, ox, oy) {
    const t = sc.add.text(x, y, str, { fontFamily: FONT, fontStyle: 'bold', fontSize: size + 'px', color: color || '#ffffff' });
    t.setScrollFactor(0).setDepth(101).setOrigin(ox === undefined ? 0 : ox, oy === undefined ? 0 : oy).setStroke('#1a1a1a', 4);
    return t;
}
function burst(x, y, color, n) { sparks.setParticleTint(color); sparks.explode(n, x, y); }
function popup(x, y, str, color) {
    const t = sc.add.text(x, y, str, { fontFamily: FONT, fontStyle: 'bold', fontSize: '20px', color: color || '#ffd54a' }).setOrigin(0.5).setDepth(50).setStroke('#1a1a1a', 4);
    sc.tweens.add({ targets: t, y: y - 42, alpha: 0, duration: 750, onComplete: () => t.destroy() });
}
function banner(title, sub, color) {
    if (!hud.banner) {
        hud.banner = T(VIEW_W / 2, 190, '', 72, '#ffffff', 0.5, 0.5).setDepth(150).setStroke('#1a1a1a', 8);
        hud.bannerSub = T(VIEW_W / 2, 250, '', 28, '#ffffff', 0.5, 0.5).setDepth(150);
    }
    sc.tweens.killTweensOf([hud.banner, hud.bannerSub]);
    hud.banner.setText(title).setColor(color || '#ffffff').setAlpha(1).setScale(0.5);
    hud.bannerSub.setText(sub || '').setAlpha(1);
    sc.tweens.add({ targets: hud.banner, scale: 1, duration: 300, ease: 'Back.out' });
    sc.tweens.add({ targets: [hud.banner, hud.bannerSub], alpha: 0, delay: 1500, duration: 500 });
}
const coinMult = () => Math.min(3, 1 + Math.floor(S.combo / 8));

// ---------- create ----------
function create() {
    sc = this;
    planets = []; shopObjs = []; shopRows = []; shipBoxes = []; menuObjs = []; overObjs = [];
    hud = {}; dashBtn = null;                       // se recrean en cada escena (al reaparecer la escena se reinicia)
    S = {
        state: started ? 'play' : 'menu', hp: maxHpOf(), wave: 0, toSpawn: 0, spawnT: 0, waitNext: false, combo: 0, comboT: 0,
        kills: 0, runCoins: 0, fireT: 0, dashT: 0, dashCd: 0, invuln: 0, face: new Phaser.Math.Vector2(1, 0), dashVec: new Phaser.Math.Vector2(),
        shopOpen: false, boss: null, overAt: 0, dirtyAt: 0, theme: 0
    };

    sc.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);

    // fondo espacial
    sky = sc.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, WORLD_COLORS[0]).setScrollFactor(0).setDepth(-100);
    stars1 = sc.add.tileSprite(0, 0, VIEW_W, VIEW_H, 'stars1').setOrigin(0).setScrollFactor(0).setDepth(-95);
    stars2 = sc.add.tileSprite(0, 0, VIEW_W, VIEW_H, 'stars2').setOrigin(0).setScrollFactor(0).setDepth(-94);
    [[560, 120, 0, 0.9], [80, 380, 1, 0.6], [900, 420, 2, 1.1], [420, 40, 3, 0.5]].forEach(([x, y, k, s]) => {
        const p = sc.add.image(x, y, 'planet' + k).setScrollFactor(0).setDepth(-90).setScale(s).setAlpha(0.85);
        p.bx = x; p.by = y; planets.push(p);
    });
    sc.add.tileSprite(0, 0, WORLD_W, WORLD_H, 'grid').setOrigin(0).setDepth(-10).setAlpha(0.55);
    sc.add.graphics().lineStyle(8, 0xffd54a, 1).strokeRect(4, 4, WORLD_W - 8, WORLD_H - 8).setDepth(-5);

    // jugador + camara
    player = sc.physics.add.image(WORLD_W / 2, WORLD_H / 2, 'ship' + save.ship).setDepth(10);
    player.setCollideWorldBounds(true);
    player.body.setCircle(16, 16, 8);
    sc.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    sc.cameras.main.startFollow(player, true, 0.1, 0.1);
    cursors = sc.input.keyboard.createCursorKeys();
    keys = sc.input.keyboard.addKeys('W,A,S,D,SPACE,E,M,ESC,ONE,TWO,THREE,FOUR,FIVE');

    enemies = sc.physics.add.group();
    bullets = sc.physics.add.group();
    ebullets = sc.physics.add.group();
    coinGrp = sc.physics.add.group();
    orbs = sc.physics.add.group();

    sparks = sc.add.particles(0, 0, 'spark', {
        speed: { min: 60, max: 340 }, lifespan: { min: 300, max: 700 }, rotate: { min: 0, max: 360 },
        scale: { start: 1.7, end: 0.2 }, alpha: { start: 1, end: 0 }, emitting: false
    }).setDepth(20);
    sc.add.particles(0, 0, 'spark', {
        follow: player, lifespan: 300, scale: { start: 1.6, end: 0 }, alpha: { start: 0.55, end: 0 },
        tint: 0xffa000, blendMode: 'ADD', frequency: 28
    }).setDepth(9);

    sc.physics.add.overlap(bullets, enemies, hitEnemy);
    sc.physics.add.overlap(player, enemies, hurtPlayer);
    sc.physics.add.overlap(player, ebullets, hitByBullet);
    sc.physics.add.overlap(player, coinGrp, takeCoin);
    sc.physics.add.overlap(player, orbs, takeOrb);
    sc.physics.add.collider(enemies, enemies);

    buildHud();
    buildShop();
    if (sc.sys.game.device.input.touch) buildTouch();
    applyShip();
    if (S.state === 'menu') showMenu(); else startGame();
}

function applyShip() {
    player.setTexture('ship' + save.ship);
    S.hp = Math.min(S.hp, maxHpOf());
}

// ---------- HUD ----------
function buildHud() {
    const before = sc.children.list.length;
    hudGfx = sc.add.graphics().setScrollFactor(0).setDepth(100);
    const g = sc.add.graphics().setScrollFactor(0).setDepth(99);
    g.fillStyle(0x000000, 0.45);
    g.fillRoundedRect(12, 10, 236, 36, 12); g.fillRoundedRect(12, 52, 236, 30, 12); g.fillRoundedRect(12, 88, 150, 36, 12);
    hud.wave = T(26, 12, '', 22);
    sc.add.image(30, 106, 'coin').setScrollFactor(0).setDepth(101).setScale(1.15);
    hud.coins = T(50, 90, '0', 24, '#ffd54a');
    hud.hp = T(130, 55, '', 18, '#ffffff', 0.5, 0);
    hud.combo = T(VIEW_W - 16, 112, '', 22, '#7bed9f', 1, 0);
    hud.hint = T(16, VIEW_H - 36, 'E: tienda', 22, '#ffffff').setAlpha(0.85);
    hud.all = sc.children.list.slice(before);
    hud.all.forEach(o => o.setVisible(false));
}

function drawHud() {
    const g = hudGfx;
    g.clear();
    const frac = Phaser.Math.Clamp(S.hp / maxHpOf(), 0, 1);
    g.fillStyle(0x1c2447); g.fillRoundedRect(18, 58, 224, 18, 8);
    g.fillStyle(frac > 0.5 ? 0x39d353 : frac > 0.25 ? 0xffd54a : 0xff5252); g.fillRoundedRect(18, 58, Math.max(10, 224 * frac), 18, 8);
    g.lineStyle(2, 0xffffff, 0.5); g.strokeRoundedRect(18, 58, 224, 18, 8);
    g.fillStyle(0x1c2447); g.fillRect(18, 128, 224, 5);
    g.fillStyle(0x4fc3f7); g.fillRect(18, 128, 224 * (1 - Math.max(0, S.dashCd) / 900), 5);
    // minimapa
    const mx = VIEW_W - 136, my = 12, mw = 120, mh = 90, k = mw / WORLD_W, cam = sc.cameras.main;
    g.fillStyle(0x000000, 0.5); g.fillRoundedRect(mx, my, mw, mh, 8);
    g.lineStyle(2, 0xffd54a, 0.9); g.strokeRoundedRect(mx, my, mw, mh, 8);
    g.lineStyle(1, 0xffffff, 0.35); g.strokeRect(mx + cam.scrollX * k, my + cam.scrollY * k, VIEW_W * k, VIEW_H * k);
    g.fillStyle(0xff5252);
    enemies.getChildren().forEach(e => g.fillRect(mx + e.x * k - 1, my + e.y * k - 1, e === S.boss ? 6 : 3, e === S.boss ? 6 : 3));
    g.fillStyle(0xffd54a);
    coinGrp.getChildren().forEach(c => g.fillRect(mx + c.x * k, my + c.y * k, 2, 2));
    g.fillStyle(0x4fc3f7); g.fillRect(mx + player.x * k - 2, my + player.y * k - 2, 5, 5);
    // vida del jefe
    if (S.boss && S.boss.active) {
        const bw = 360, bx = VIEW_W / 2 - bw / 2, by = 56, f = Phaser.Math.Clamp(S.boss.hp / S.boss.maxHp, 0, 1);
        g.fillStyle(0x000000, 0.55); g.fillRoundedRect(bx - 6, by - 6, bw + 12, 28, 10);
        g.fillStyle(0x4a1010); g.fillRoundedRect(bx, by, bw, 16, 6);
        g.fillStyle(0xff5252); g.fillRoundedRect(bx, by, Math.max(8, bw * f), 16, 6);
        g.lineStyle(2, 0xffffff, 0.6); g.strokeRoundedRect(bx, by, bw, 16, 6);
    }
    hud.wave.setText('MUNDO ' + Math.max(1, Math.ceil(S.wave / 5)) + ' · OLA ' + S.wave);
    hud.hp.setText(Math.max(0, Math.ceil(S.hp)) + ' / ' + maxHpOf());
    hud.coins.setText(String(save.coins));
    hud.combo.setText(S.combo >= 2 ? 'COMBO ' + S.combo + (coinMult() > 1 ? '  ·  MONEDAS x' + coinMult() : '') : '');
    const cheapest = Math.min(...UPG.map(u => lvl(u.key) < u.max ? u.cost[lvl(u.key)] : 1e9));
    hud.hint.setAlpha(save.coins >= cheapest ? 0.6 + 0.4 * Math.sin(sc.time.now / 150) : 0.8)
        .setColor(save.coins >= cheapest ? '#ffd54a' : '#ffffff');
}

function buildTouch() {
    sc.input.addPointer(2);
    dashBtn = sc.add.circle(VIEW_W - 70, VIEW_H - 70, 46, 0x4fc3f7, 0.25).setStrokeStyle(4, 0x4fc3f7).setScrollFactor(0).setDepth(110).setInteractive();
    T(VIEW_W - 70, VIEW_H - 70, 'DASH', 18, '#4fc3f7', 0.5, 0.5).setDepth(111);
    dashBtn.on('pointerdown', () => tryDash());
    const shop = sc.add.circle(VIEW_W - 36, 170, 26, 0xffd54a, 0.25).setStrokeStyle(4, 0xffd54a).setScrollFactor(0).setDepth(110).setInteractive();
    T(VIEW_W - 36, 170, '$', 30, '#ffd54a', 0.5, 0.5).setDepth(111);
    shop.on('pointerdown', () => toggleShop());
    hud.hint.setVisible(false);
}

// ---------- Tienda ----------
const lvl = key => save[key];
function sh(o) { o.setScrollFactor(0).setDepth(200).setVisible(false); shopObjs.push(o); return o; }

function buildShop() {
    sh(sc.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x000000, 0.65).setInteractive());
    const g = sh(sc.add.graphics());
    g.fillStyle(0x2b2f3a); g.fillRoundedRect(130, 24, 540, 552, 18);
    g.lineStyle(4, 0xffffff, 0.15); g.strokeRoundedRect(130, 24, 540, 552, 18);
    const tx = (x, y, s, size, color, ox) => { const t = T(x, y, s, size, color, ox === undefined ? 0 : ox, 0); sh(t); t.setDepth(202); return t; };
    tx(150, 34, 'TIENDA', 34, '#ffd54a');
    shopObjs.coin = tx(612, 40, '', 24, '#ffd54a', 1);
    shopObjs.stats = tx(150, 72, '', 16, '#b0bec5');
    const close = sh(sc.add.text(648, 32, 'X', { fontFamily: FONT, fontStyle: 'bold', fontSize: '30px', color: '#ff6b6b' }).setInteractive({ useHandCursor: true }));
    close.setDepth(203).setOrigin(0.5, 0); close.on('pointerdown', () => toggleShop());
    UPG.forEach((u, i) => {
        const y = 98 + i * 62;
        const bg = sh(sc.add.rectangle(400, y + 27, 500, 54, 0x3a4050).setInteractive({ useHandCursor: true }));
        bg.setDepth(201); bg.on('pointerdown', () => buy(u.key));
        const name = tx(170, y + 4, '', 22, '#ffffff');
        tx(170, y + 30, u.desc, 15, '#b0bec5');
        const price = tx(630, y + 14, '', 20, '#ffd54a', 1);
        shopRows.push({ u, name, price, i });
    });
    tx(150, 414, 'Naves', 22, '#ffffff');
    SHIPS.forEach((s, i) => {
        const x = 185 + i * 86;
        const box = sh(sc.add.rectangle(x, 478, 76, 62, 0x3a4050).setStrokeStyle(4, 0x2b2f3a).setInteractive({ useHandCursor: true }));
        box.setDepth(201); box.on('pointerdown', () => shipAction(i));
        const img = sh(sc.add.image(x, 476, 'ship' + i).setScale(0.88)); img.setDepth(202);
        const label = tx(x, 516, '', 15, '#ffd54a', 0.5);
        shipBoxes.push({ box, img, label });
    });
    tx(400, 548, 'E o ESC para cerrar · teclas 1-5 para comprar mejoras', 15, '#b0bec5', 0.5);
}

function refreshShop() {
    shopObjs.coin.setText(save.coins + ' monedas');
    shopObjs.stats.setText(ship().name + ' · vida ' + maxHpOf() + ' · velocidad ' + Math.round(speedOf()) + ' · daño ' + dmgOf().toFixed(1));
    shopRows.forEach(r => {
        const l = lvl(r.u.key);
        r.name.setText((r.i + 1) + '  ' + r.u.name + '  Nv ' + l + '/' + r.u.max);
        if (l >= r.u.max) r.price.setText('MAX').setColor('#7bed9f');
        else { const c = r.u.cost[l]; r.price.setText(c + ' monedas').setColor(save.coins >= c ? '#ffd54a' : '#ff6b6b'); }
    });
    shipBoxes.forEach((b, i) => {
        const owned = save.owned[i];
        b.box.setStrokeStyle(4, save.ship === i ? 0xffffff : 0x2b2f3a);
        b.img.setAlpha(owned ? 1 : 0.5);
        b.label.setText(save.ship === i ? 'USANDO' : owned ? 'USAR' : String(SHIPS[i].cost)).setColor(!owned && save.coins < SHIPS[i].cost ? '#ff6b6b' : '#ffd54a');
    });
    hud.coins.setText(String(save.coins));
}

function toggleShop() {
    S.shopOpen = !S.shopOpen;
    shopObjs.forEach(o => o.setVisible(S.shopOpen));
    if (S.shopOpen) { sc.physics.pause(); refreshShop(); sfx('buy'); }
    else if (S.state === 'play') sc.physics.resume();
}

function buy(key) {
    const u = UPG.find(x => x.key === key), l = lvl(key);
    if (l >= u.max) { sfx('nope'); return; }
    const c = u.cost[l];
    if (save.coins < c) { sfx('nope'); sc.cameras.main.shake(120, 0.004); return; }
    save.coins -= c; save[key]++;
    if (key === 'hp') S.hp += 20;
    persist(); sfx('buy'); refreshShop();
}

function shipAction(i) {
    if (!save.owned[i]) {
        if (save.coins < SHIPS[i].cost) { sfx('nope'); sc.cameras.main.shake(120, 0.004); return; }
        save.coins -= SHIPS[i].cost; save.owned[i] = true; sfx('buy');
    }
    save.ship = i; persist();
    applyShip(); S.hp = maxHpOf();
    refreshShop();
}

// ---------- Menu / flujo ----------
function showMenu() {
    const t = T(VIEW_W / 2, 110, 'NOOB SWARM', 92, '#ffd54a', 0.5, 0.5).setStroke('#1a1a1a', 10);
    sc.tweens.add({ targets: t, scale: 1.05, yoyo: true, repeat: -1, duration: 700 });
    const go = T(VIEW_W / 2, 520, 'PRESIONA ESPACIO O TOCA PARA JUGAR', 28, '#ffffff', 0.5, 0.5);
    sc.tweens.add({ targets: go, alpha: 0.25, yoyo: true, repeat: -1, duration: 500 });
    menuObjs = [t, go,
        T(VIEW_W / 2, 186, 'Sobrevive a la horda de ladrillos', 28, '#ffffff', 0.5, 0.5),
        T(VIEW_W / 2, 240, '← →  ↑ ↓  o  WASD  mover        ESPACIO  dash', 20, '#ffffff', 0.5, 0.5),
        T(VIEW_W / 2, 268, 'Disparas solo · junta monedas · E tienda · M silencio', 20, '#ffffff', 0.5, 0.5),
        T(VIEW_W / 2, 330, save.bestWave ? 'MEJOR: OLA ' + save.bestWave : '', 26, '#ffb347', 0.5, 0.5),
        T(VIEW_W / 2, 380, save.coins ? save.coins + ' monedas · pulsa E para la tienda' : '', 20, '#ffd54a', 0.5, 0.5)
    ];
    sc.input.once('pointerdown', () => { if (S.state === 'menu') startGame(); });
}

function startGame() {
    started = true;
    menuObjs.forEach(o => o.destroy()); menuObjs = [];
    hud.all.forEach(o => o.setVisible(true));
    if (sc.sys.game.device.input.touch) hud.hint.setVisible(false);
    S.state = 'play';
    S.hp = maxHpOf();
    sc.physics.resume();
    musicStart();
    startWave(1);
}

function setWorld(i) {
    const idx = i % WORLD_COLORS.length;
    if (S.theme === idx) return;
    S.theme = idx;
    const from = Phaser.Display.Color.ValueToColor(sky.fillColor), to = Phaser.Display.Color.ValueToColor(WORLD_COLORS[idx]);
    sc.tweens.addCounter({
        from: 0, to: 100, duration: 1500,
        onUpdate: tw => {
            const c = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, tw.getValue());
            sky.setFillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
        }
    });
}

function startWave(n) {
    S.wave = n; S.waitNext = false; S.spawnT = 700;
    const boss = n % 5 === 0;
    S.toSpawn = boss ? 6 + n * 2 : 8 + n * 5;
    setWorld(Math.floor((n - 1) / 5));
    if (boss) {
        banner('¡JEFE!', 'Ola ' + n + ' · derrota al Rey Ladrillo', '#ff5252');
        sfx('boss');
        spawnBoss();
    } else {
        banner('OLA ' + n, n === 1 ? 'Dispara solo: tú esquiva' : 'Mundo ' + Math.ceil(n / 5), '#ffd54a');
        sfx('wave');
    }
}

// ---------- Enemigos ----------
const TYPES = {
    chaser: { key: 'e_chaser', hp: 1, speed: 105, dmg: 15, coins: 3, color: 0xe53935, r: 18, div: 4 },
    runner: { key: 'e_runner', hp: 1, speed: 215, dmg: 10, coins: 5, color: 0x8e24aa, r: 12, div: 6 },
    gunner: { key: 'e_gunner', hp: 3, speed: 95, dmg: 15, coins: 8, color: 0x00897b, r: 20, div: 4 },
    tank:   { key: 'e_tank', hp: 6, speed: 65, dmg: 30, coins: 15, color: 0xfb8c00, r: 30, div: 3 }
};

function spawnPoint(dist) {
    const a = Math.random() * Math.PI * 2, d = dist + Math.random() * 120;
    return { x: Phaser.Math.Clamp(player.x + Math.cos(a) * d, 40, WORLD_W - 40), y: Phaser.Math.Clamp(player.y + Math.sin(a) * d, 40, WORLD_H - 40) };
}

function spawnEnemy() {
    const r = Math.random();
    let type = 'chaser';
    if (S.wave >= 3 && r < 0.12) type = 'tank';
    else if (S.wave >= 4 && r < 0.26) type = 'gunner';
    else if (S.wave >= 2 && r < 0.45) type = 'runner';
    const T0 = TYPES[type], p = spawnPoint(520);
    const e = enemies.create(p.x, p.y, T0.key).setDepth(8);
    e.body.setCircle(T0.r, e.width / 2 - T0.r, e.height / 2 - T0.r);
    e.type = type; e.hp = T0.hp + Math.floor(S.wave / T0.div);
    e.speed = T0.speed + S.wave * 4; e.dmg = T0.dmg; e.coins = T0.coins; e.color = T0.color;
    e.stun = 0; e.spawnT = sc.time.now + 400; e.fireAt = sc.time.now + 1500 + Math.random() * 1000;
    e.setAlpha(0);
    sc.tweens.add({ targets: e, alpha: 1, duration: 350 });
}

function spawnBoss() {
    const p = spawnPoint(560);
    const e = enemies.create(p.x, p.y, 'e_boss').setDepth(8);
    e.body.setCircle(58, e.width / 2 - 58, e.height / 2 - 58);
    e.body.setImmovable(true);
    e.type = 'boss'; e.hp = e.maxHp = 40 + S.wave * 6;
    e.speed = 55 + S.wave * 2; e.dmg = 30; e.coins = 15; e.color = 0xd32f2f;
    e.stun = 0; e.spawnT = sc.time.now + 1200; e.nextRad = sc.time.now + 2200; e.nextAim = sc.time.now + 1600; e.rot = 0;
    e.setAlpha(0);
    sc.tweens.add({ targets: e, alpha: 1, duration: 800 });
    S.boss = e;
}

function enemyShoot(x, y, ang, speed, dmg) {
    const b = ebullets.create(x, y, 'eb').setDepth(7);
    b.body.setCircle(6, 1, 1);
    b.setVelocity(Math.cos(ang) * speed, Math.sin(ang) * speed);
    b.dmg = dmg;
    sc.time.delayedCall(5000, () => b.active && b.destroy());
}

function hitEnemy(b, e) {
    if (!b.active || !e.active) return;
    const vx = b.body.velocity.x, vy = b.body.velocity.y;
    b.destroy();
    e.hp -= dmgOf();
    e.setTintFill(0xffffff);
    sc.time.delayedCall(60, () => { if (e.active) e.clearTint(); });
    if (e.type !== 'boss') { e.stun = sc.time.now + 110; e.setVelocity(vx * 0.35, vy * 0.35); }
    burst(e.x, e.y, 0xffeb3b, 3);
    if (e.hp <= 0) killEnemy(e);
}

function dropCoin(x, y, v) {
    const c = coinGrp.create(x, y, 'coin').setDepth(6);
    c.value = v; c.body.setCircle(10);
    c.setVelocity(rnd(-140, 140), rnd(-140, 140)); c.setDrag(260);
    const tw = sc.tweens.add({ targets: c, scaleX: 0.3, yoyo: true, repeat: -1, duration: 380 + rnd(0, 150) });
    c.once('destroy', () => tw.remove());
    sc.time.delayedCall(14000, () => c.active && c.destroy());
}

function killEnemy(e) {
    const boss = e.type === 'boss';
    [e.color, 0xffffff, 0xfdd835].forEach(c => burst(e.x, e.y, c, boss ? 26 : 8));
    S.combo++; S.comboT = 2600; S.kills++;
    sc.cameras.main.shake(boss ? 400 : 70, boss ? 0.012 : 0.002);
    sfx('kill');
    if (boss) {
        for (let i = 0; i < 14; i++) dropCoin(e.x, e.y, 15 + S.wave);
        S.boss = null;
        banner('¡JEFE DERROTADO!', '+monedas por todos lados', '#39d353');
        sfx('win');
    } else {
        dropCoin(e.x, e.y, e.coins * coinMult());
        if (Math.random() < 0.12 || e.type === 'tank') {
            const o = orbs.create(e.x, e.y, 'orb').setDepth(6);
            sc.tweens.add({ targets: o, scale: 1.25, yoyo: true, repeat: -1, duration: 500 });
            sc.time.delayedCall(9000, () => o.active && o.destroy());
        }
    }
    e.destroy();
}

function damagePlayer(n) {
    S.hp -= n; S.invuln = 900; S.combo = 0;
    sc.cameras.main.shake(220, 0.012);
    sc.cameras.main.flash(120, 255, 40, 80);
    burst(player.x, player.y, 0xff5252, 18);
    sfx('hurt');
    if (S.hp <= 0) gameOver();
}

function hurtPlayer(p, e) {
    if (S.state !== 'play' || S.invuln > 0 || S.dashT > 0 || sc.time.now < e.spawnT) return;
    damagePlayer(e.dmg);
    if (e.type === 'chaser' || e.type === 'runner') killEnemy(e);
    else {
        const a = Phaser.Math.Angle.Between(p.x, p.y, e.x, e.y);
        e.stun = sc.time.now + 400;
        e.setVelocity(Math.cos(a) * 320, Math.sin(a) * 320);
    }
}

function hitByBullet(p, b) {
    if (!b.active) return;
    b.destroy();
    if (S.state !== 'play' || S.invuln > 0 || S.dashT > 0) return;
    damagePlayer(b.dmg);
}

function takeCoin(p, c) {
    save.coins += c.value; S.runCoins += c.value; S.dirtyAt = sc.time.now;
    popup(c.x, c.y - 10, '+' + c.value);
    sfx('coin');
    c.destroy();
}

function takeOrb(p, o) {
    S.hp = Math.min(maxHpOf(), S.hp + 12);
    popup(o.x, o.y - 10, '+12 vida', '#7bed9f');
    burst(o.x, o.y, 0x39d353, 12);
    sfx('orb');
    o.destroy();
}

// ---------- Jugador ----------
function fire(angle) {
    const spreads = { 1: [0], 2: [-0.07, 0.07], 3: [-0.2, 0, 0.2], 4: [-0.32, -0.16, 0, 0.16, 0.32] }[ship().pat];
    spreads.forEach(s => {
        const a = angle + s;
        const b = bullets.create(player.x + Math.cos(a) * 24, player.y + Math.sin(a) * 24, 'pb').setDepth(7);
        b.rotation = a;
        b.body.setCircle(5, 3, -1);
        b.setVelocity(Math.cos(a) * 700, Math.sin(a) * 700);
        sc.time.delayedCall(900, () => b.active && b.destroy());
    });
    sfx('shoot');
}

function tryDash() {
    if (S.state !== 'play' || S.dashCd > 0 || S.shopOpen) return;
    S.dashT = 170; S.dashCd = 900;
    S.dashVec.copy(S.face).scale(840);
    S.invuln = Math.max(S.invuln, 260);
    burst(player.x, player.y, 0x4fc3f7, 16);
    sfx('dash');
}

function gameOver() {
    S.state = 'over'; S.overAt = sc.time.now; S.hp = 0;
    drawHud();
    musicStop();
    sfx('over');
    burst(player.x, player.y, ship().c, 50); burst(player.x, player.y, 0xffffff, 20);
    const head = sc.add.image(player.x, player.y, 'head').setDepth(30).setScale(2);
    sc.tweens.add({ targets: head, y: player.y - 110, angle: 540, alpha: 0, duration: 1100, ease: 'Cubic.out', onComplete: () => head.destroy() });
    player.setVisible(false);
    sc.cameras.main.shake(500, 0.02);
    sc.physics.pause();
    const newBest = S.wave > save.bestWave;
    if (newBest) save.bestWave = S.wave;
    persist();
    overObjs = [
        sc.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x000000, 0.6).setScrollFactor(0).setDepth(99),
        T(VIEW_W / 2, 150, '¡OOF!', 110, '#ff5252', 0.5, 0.5).setStroke('#1a1a1a', 12).setDepth(150),
        T(VIEW_W / 2, 250, 'Llegaste a la OLA ' + S.wave, 32, '#ffd54a', 0.5, 0.5).setDepth(150),
        T(VIEW_W / 2, 296, '+' + S.runCoins + ' monedas · ' + S.kills + ' ladrillos destruidos', 20, '#ffffff', 0.5, 0.5).setDepth(150),
        T(VIEW_W / 2, 336, newBest ? '¡NUEVO RÉCORD!' : 'Récord: ola ' + save.bestWave, 24, newBest ? '#7bed9f' : '#b0bec5', 0.5, 0.5).setDepth(150),
        T(VIEW_W / 2, 384, 'Tienes ' + save.coins + ' monedas: compra mejoras con E', 20, '#ffd54a', 0.5, 0.5).setDepth(150)
    ];
    const again = T(VIEW_W / 2, 470, 'ESPACIO O TOCA PARA REAPARECER', 26, '#ffffff', 0.5, 0.5).setDepth(150);
    sc.tweens.add({ targets: again, alpha: 0.25, yoyo: true, repeat: -1, duration: 500 });
    overObjs.push(again);
}

// ---------- update ----------
function update(time, delta) {
    const cam = sc.cameras.main;
    if (J(keys.M)) toggleMute();
    stars1.tilePositionX = cam.scrollX * 0.15; stars1.tilePositionY = cam.scrollY * 0.15;
    stars2.tilePositionX = cam.scrollX * 0.3; stars2.tilePositionY = cam.scrollY * 0.3;
    planets.forEach(p => p.setPosition(p.bx - cam.scrollX * 0.18, p.by - cam.scrollY * 0.18));
    if (save.ship === SHIPS.length - 1 && player.visible) {
        const rgb = Phaser.Display.Color.HSVToRGB((time / 1800) % 1, 0.55, 1);
        player.setTint(Phaser.Display.Color.GetColor(rgb.r, rgb.g, rgb.b));
    } else player.clearTint();

    if (J(keys.E) || (S.shopOpen && J(keys.ESC))) toggleShop();
    if (S.shopOpen) {
        [keys.ONE, keys.TWO, keys.THREE, keys.FOUR, keys.FIVE].forEach((k, i) => { if (J(k)) buy(UPG[i].key); });
        return;
    }
    if (S.state === 'menu') {
        player.setVelocity(0, 0);
        player.y = WORLD_H / 2 + Math.sin(time / 400) * 8;
        if (J(keys.SPACE)) startGame();
        return;
    }
    if (S.state === 'over') {
        if (time - S.overAt > 700 && (J(keys.SPACE) || sc.input.activePointer.isDown)) sc.scene.restart();
        return;
    }

    // --- movimiento ---
    let dx = 0, dy = 0;
    if (cursors.left.isDown || keys.A.isDown) dx -= 1;
    if (cursors.right.isDown || keys.D.isDown) dx += 1;
    if (cursors.up.isDown || keys.W.isDown) dy -= 1;
    if (cursors.down.isDown || keys.S.isDown) dy += 1;
    [sc.input.pointer1, sc.input.pointer2].forEach(p => {
        if (p && p.isDown && p.wasTouch && !(dashBtn && Phaser.Math.Distance.Between(p.x, p.y, dashBtn.x, dashBtn.y) < 60) && p.x < VIEW_W - 70) {
            const tx = p.x - (player.x - cam.scrollX), ty = p.y - (player.y - cam.scrollY);
            if (Math.hypot(tx, ty) > 24) { dx = tx; dy = ty; }
        }
    });
    const len = Math.hypot(dx, dy);
    if (len > 0) { dx /= len; dy /= len; S.face.set(dx, dy); }
    if (J(keys.SPACE)) tryDash();
    S.dashCd -= delta;
    if (S.dashT > 0) { S.dashT -= delta; player.setVelocity(S.dashVec.x, S.dashVec.y); }
    else player.setVelocity(dx * speedOf(), dy * speedOf());
    if (S.invuln > 0) { S.invuln -= delta; player.setAlpha(Math.floor(S.invuln / 70) % 2 ? 0.35 : 1); } else player.setAlpha(1);

    // --- disparo automatico ---
    S.fireT -= delta;
    let target = null, bd = 480 * 480;
    enemies.getChildren().forEach(e => {
        const d2 = (e.x - player.x) ** 2 + (e.y - player.y) ** 2;
        if (d2 < bd) { bd = d2; target = e; }
    });
    if (target) {
        const a = Phaser.Math.Angle.Between(player.x, player.y, target.x, target.y);
        player.rotation = Phaser.Math.Angle.RotateTo(player.rotation, a, 0.35);
        if (S.fireT <= 0) { fire(a); S.fireT = rateOf(); }
    } else if (len > 0) player.rotation = Phaser.Math.Angle.RotateTo(player.rotation, Math.atan2(dy, dx), 0.2);

    // --- IA de enemigos ---
    enemies.getChildren().forEach(e => {
        if (time <= e.stun) return;
        const dist = Phaser.Math.Distance.Between(e.x, e.y, player.x, player.y);
        if (e.type === 'gunner') {
            if (dist > 330) sc.physics.moveToObject(e, player, e.speed);
            else if (dist < 240) { const a = Phaser.Math.Angle.Between(player.x, player.y, e.x, e.y); e.setVelocity(Math.cos(a) * e.speed, Math.sin(a) * e.speed); }
            else { const a = Phaser.Math.Angle.Between(e.x, e.y, player.x, player.y) + Math.PI / 2; e.setVelocity(Math.cos(a) * 60, Math.sin(a) * 60); }
            e.rotation = Phaser.Math.Angle.Between(e.x, e.y, player.x, player.y);
            if (time > e.fireAt && time > e.spawnT) { enemyShoot(e.x, e.y, e.rotation, 270, 12); e.fireAt = time + 1900; }
        } else if (e.type === 'boss') {
            if (time < e.spawnT) { e.setVelocity(0, 0); return; }
            if (dist > 220) sc.physics.moveToObject(e, player, e.speed); else e.setVelocity(0, 0);
            if (time > e.nextRad) {
                e.rot += 0.3; for (let i = 0; i < 12; i++) enemyShoot(e.x, e.y, e.rot + i * Math.PI / 6, 210, 12);
                e.nextRad = time + 2400; sfx('boss');
            }
            if (time > e.nextAim) {
                const a = Phaser.Math.Angle.Between(e.x, e.y, player.x, player.y);
                [-0.22, 0, 0.22].forEach(o => enemyShoot(e.x, e.y, a + o, 300, 12));
                e.nextAim = time + 1600;
            }
        } else {
            sc.physics.moveToObject(e, player, e.speed);
            if (e.type === 'runner') e.rotation = Math.atan2(e.body.velocity.y, e.body.velocity.x);
        }
    });

    // --- monedas: iman ---
    const mr = magnetR();
    coinGrp.getChildren().forEach(c => {
        if (Phaser.Math.Distance.Between(c.x, c.y, player.x, player.y) < mr) sc.physics.moveToObject(c, player, 480);
    });
    if (S.dirtyAt && time - S.dirtyAt > 800) { S.dirtyAt = 0; persist(); }

    // --- oleadas ---
    S.spawnT -= delta;
    if (S.toSpawn > 0 && S.spawnT <= 0 && enemies.countActive() < 60) {
        const pack = Math.min(S.toSpawn, 1 + Math.floor(S.wave / 3));
        for (let i = 0; i < pack; i++) spawnEnemy();
        S.toSpawn -= pack;
        S.spawnT = Math.max(300, 800 - S.wave * 40);
    }
    if (S.toSpawn === 0 && enemies.countActive() === 0 && !S.waitNext) {
        S.waitNext = true;
        const bonus = 15 * S.wave;
        save.coins += bonus; S.runCoins += bonus;
        S.hp = Math.min(maxHpOf(), S.hp + 15);
        if (S.wave > save.bestWave) save.bestWave = S.wave;
        persist();
        banner('OLA SUPERADA', '+' + bonus + ' monedas', '#39d353');
        sfx('win');
        sc.time.delayedCall(2400, () => { if (S.state === 'play') startWave(S.wave + 1); });
    }
    S.comboT -= delta;
    if (S.comboT <= 0) S.combo = 0;
    drawHud();
}
