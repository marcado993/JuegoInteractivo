// OBBY RUSH - Phaser 3 (sin assets externos: todo se genera por codigo)
// Obby infinito estilo Roblox: salta, esquiva, llega a la bandera, junta monedas y mejora a tu avatar.
const VIEW_W = 800, VIEW_H = 600;
const LAVA_Y = 580, KILL_Y = 592;
const FONT = '"Fredoka", "Trebuchet MS", Verdana, sans-serif';
const PALETTE = [0xc4281c, 0x0d69ac, 0x4b974b, 0xf5cd30, 0xda8541, 0x6b327c, 0x008f9c, 0xe4adc8];
const THEMES = [0x78c6ff, 0xff9a62, 0x16224a, 0x3a1659];            // dia, atardecer, noche, neon
const SKINS = [
    { c: 0x0d69ac, cost: 0 }, { c: 0xc4281c, cost: 40 }, { c: 0x4b974b, cost: 60 },
    { c: 0x6b327c, cost: 80 }, { c: 0xda8541, cost: 100 }, { c: 0xe4adc8, cost: 120 }
];
const JUMP_COST = [40, 80, 140, 220, 320], SPEED_COST = [40, 80, 140, 220, 320], MAGNET_COST = [60, 120, 200], DOUBLE_COST = 250;
const SEGMENTS_PER_STAGE = 7;
const BASE_JUMP = 620, BASE_SPEED = 280;

// ---------- Progreso guardado ----------
let save = { coins: 0, jump: 0, speed: 0, magnet: 0, dbl: false, skin: 0, owned: [true, false, false, false, false, false], best: 1 };
try { const s = JSON.parse(localStorage.getItem('obbyrush_save') || 'null'); if (s) save = Object.assign(save, s); } catch (e) {}
function persist() { try { localStorage.setItem('obbyrush_save', JSON.stringify(save)); } catch (e) {} }

const config = {
    type: Phaser.AUTO, width: VIEW_W, height: VIEW_H, parent: 'game', backgroundColor: '#78c6ff',
    physics: { default: 'arcade', arcade: { gravity: { y: 1400 }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: { preload: preload, create: create, update: update }
};
let game;
const fontReady = (document.fonts && document.fonts.load)
    ? Promise.race([document.fonts.load('700 24px Fredoka'), new Promise(r => setTimeout(r, 1200))])
    : Promise.resolve();
fontReady.then(() => { game = new Phaser.Game(config); });

let sc, player, avatar, keys, cursors, plats, hazards, coinGrp, pads, sparks, sky, lava;
let spinners = [], movers = [], tracked = [], clouds = [], stars = [];
let hud = {}, shopObjs = [], shopRows = [], skinBtns = [], menuObjs = [];
let S, G;
let muted = false, actx;
const J = Phaser.Input.Keyboard.JustDown;
const rnd = (a, b) => Phaser.Math.Between(a, b);

// ---------- Texturas ----------
function tex(scene, key, w, h, draw) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
}

function drawAvatar(g, torso) {
    g.fillStyle(0x4b974b); g.fillRect(6, 31, 8, 15); g.fillRect(14, 31, 8, 15);        // piernas
    g.fillStyle(torso); g.fillRect(5, 15, 18, 16);                                      // torso
    g.fillStyle(0xf5cd30); g.fillRect(0, 15, 5, 16); g.fillRect(23, 15, 5, 16);         // brazos
    g.fillRect(7, 1, 14, 14);                                                           // cabeza
    g.fillStyle(0x222222); g.fillRect(10, 6, 2, 3); g.fillRect(16, 6, 2, 3);            // ojos
    g.fillRect(10, 10, 1, 1); g.fillRect(11, 11, 6, 1); g.fillRect(17, 10, 1, 1);       // sonrisa
    g.lineStyle(1, 0x1b1b1b, 0.6); g.strokeRect(7.5, 1.5, 13, 13); g.strokeRect(5.5, 15.5, 17, 15);
}

function preload() {
    SKINS.forEach((s, i) => tex(this, 'avatar' + i, 28, 46, g => drawAvatar(g, s.c)));
    tex(this, 'coin', 20, 20, g => {
        g.fillStyle(0xb8860b); g.fillCircle(10, 10, 10);
        g.fillStyle(0xf5cd30); g.fillCircle(10, 10, 8);
        g.fillStyle(0xffe27a); g.fillCircle(10, 10, 5);
    });
    tex(this, 'spike', 24, 20, g => {
        g.fillStyle(0xe53935); g.fillTriangle(0, 20, 12, 0, 24, 20);
        g.fillStyle(0xffffff, 0.35); g.fillTriangle(12, 2, 12, 20, 4, 20);
    });
    tex(this, 'pad', 40, 16, g => {
        g.fillStyle(0x37474f); g.fillRect(6, 8, 28, 8);
        g.fillStyle(0x39d353); g.fillRoundedRect(0, 0, 40, 9, 4);
        g.fillStyle(0xffeb3b); g.fillRect(8, 0, 6, 9); g.fillRect(26, 0, 6, 9);
    });
    tex(this, 'bar', 150, 10, g => {
        g.fillStyle(0xe53935); g.fillRect(0, 0, 150, 10);
        g.fillStyle(0xffffff); for (let i = 10; i < 150; i += 30) g.fillRect(i, 0, 12, 10);
    });
    tex(this, 'hub', 24, 24, g => { g.fillStyle(0x263238); g.fillCircle(12, 12, 12); g.fillStyle(0x90a4ae); g.fillCircle(12, 12, 5); });
    tex(this, 'cloud', 140, 50, g => {
        g.fillStyle(0xffffff);
        g.fillRoundedRect(0, 20, 140, 30, 15); g.fillRoundedRect(22, 6, 60, 34, 17); g.fillRoundedRect(70, 0, 50, 40, 20);
    });
    tex(this, 'spark', 6, 6, g => { g.fillStyle(0xffffff); g.fillRect(0, 0, 6, 6); });
    tex(this, 'lava', 64, 64, g => {
        g.fillStyle(0xff4d12); g.fillRect(0, 0, 64, 64);
        g.fillStyle(0xd63a00); g.fillRect(0, 36, 64, 28);
        g.fillStyle(0xffb02e); for (let i = 0; i < 4; i++) g.fillCircle(i * 16 + 8, 6, 10);
        g.fillStyle(0xffd966, 0.6); g.fillCircle(24, 24, 5); g.fillCircle(52, 40, 4);
    });
    tex(this, 'flag', 40, 70, g => {
        g.fillStyle(0x9e9e9e); g.fillRect(4, 0, 4, 70);
        g.fillStyle(0xf5cd30); g.fillTriangle(8, 4, 38, 16, 8, 28);
        g.lineStyle(2, 0xb8860b); g.strokeTriangle(8, 4, 38, 16, 8, 28);
    });
}

function platTex(tiles, kind) {
    const key = 'pl' + tiles + '_' + kind;
    if (sc.textures.exists(key)) return key;
    const w = tiles * 32, h = 32;
    const col = kind === 'crumble' ? 0xb08968 : kind === 'check' ? 0xf5cd30 : PALETTE[kind];
    const base = Phaser.Display.Color.ValueToColor(col);
    const dark = Phaser.Display.Color.ValueToColor(col).darken(30).color;
    const light = Phaser.Display.Color.ValueToColor(col).lighten(22).color;
    const g = sc.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(base.color); g.fillRect(0, 0, w, h);
    g.fillStyle(dark); g.fillRect(0, h - 8, w, 8);
    g.fillStyle(0xffffff, 0.28); g.fillRect(0, 0, w, 3);
    for (let i = 0; i < tiles; i++) {                                   // tachuelas estilo Roblox
        g.fillStyle(dark); g.fillCircle(i * 32 + 16, 12, 7);
        g.fillStyle(light); g.fillCircle(i * 32 + 16, 11, 6);
    }
    if (kind === 'crumble') {
        g.lineStyle(2, 0x6b4f35);
        for (let i = 1; i < tiles; i++) { g.lineBetween(i * 32 - 4, 0, i * 32 + 4, 12); g.lineBetween(i * 32 + 4, 12, i * 32 - 2, 22); }
    }
    g.lineStyle(2, dark); g.strokeRect(1, 1, w - 2, h - 2);
    g.generateTexture(key, w, h);
    g.destroy();
    return key;
}

// ---------- Sonido y musica (WebAudio, sin archivos) ----------
const SFX = {
    jump:    [[420, 0.12, 'square', 0.04, 380, 0]],
    djump:   [[600, 0.14, 'square', 0.04, 420, 0]],
    coin:    [[988, 0.07, 'square', 0.04, 0, 0], [1319, 0.14, 'square', 0.04, 0, 0.07]],
    oof:     [[330, 0.12, 'square', 0.12, -90, 0], [210, 0.30, 'square', 0.12, -150, 0.11]],
    check:   [[523, 0.12, 'square', 0.06, 0, 0], [659, 0.12, 'square', 0.06, 0, 0.1], [784, 0.12, 'square', 0.06, 0, 0.2], [1047, 0.3, 'square', 0.06, 0, 0.3]],
    pad:     [[200, 0.25, 'sine', 0.14, 800, 0]],
    crumble: [[130, 0.22, 'sawtooth', 0.05, -70, 0]],
    land:    [[150, 0.06, 'triangle', 0.05, -50, 0]],
    buy:     [[660, 0.09, 'square', 0.05, 0, 0], [990, 0.16, 'square', 0.05, 0, 0.08]],
    nope:    [[150, 0.2, 'square', 0.06, -40, 0]]
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

// Musica: pop/chiptune alegre a 138 BPM, progresion C G Am F; mas capas conforme subes de etapa
const BPM = 138, STEP = 60 / BPM / 4;
const CHORDS = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]];
const BASS = [36, 31, 33, 29];
const MUSIC_VOL = 0.4;
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
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(48, t + 0.1);
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g); g.connect(music.gain);
    o.start(t); o.stop(t + 0.22);
}
function musicStep(s, t) {
    const lvl = S && S.stage >= 6 ? 3 : S && S.stage >= 3 ? 2 : 1;
    const c = Math.floor(s / 16) % 4;
    if (s % 4 === 0) mKick(t);
    if (s % 4 === 2) mNoise(t, 0.04, 0.08, 8000);
    if (lvl >= 3 && s % 8 === 4) { mNoise(t, 0.14, 0.18, 2000); mOsc(t, 200, 0.09, 'triangle', 0.12, 1600); }
    if (s % 4 === 0) mOsc(t, mtof(BASS[c]), STEP * 3, 'sawtooth', 0.18, 520);
    if (s % 8 === 6) mOsc(t, mtof(BASS[c] + 7), STEP * 1.8, 'sawtooth', 0.14, 520);
    if (lvl >= 2) mOsc(t, mtof(CHORDS[c][[0, 1, 2, 1, 2, 1, 0, 1][s % 8]] + 12), STEP * 0.9, 'square', 0.04, 3000);
    if (lvl >= 3 && s % 8 === 0) mOsc(t, mtof(CHORDS[c][2] + 24), STEP * 3, 'triangle', 0.08, 4000);
    if (s % 16 === 0) CHORDS[c].forEach(n => mOsc(t, mtof(n), STEP * 14, 'triangle', 0.05, 1400));
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
    const t = sc.add.text(x, y, str, { fontFamily: FONT, fontStyle: 'bold', fontSize: '22px', color: color || '#ffd54a' }).setOrigin(0.5).setDepth(50).setStroke('#1a1a1a', 4);
    sc.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 700, onComplete: () => t.destroy() });
}
function banner(title, sub, color) {
    if (!hud.banner) {
        hud.banner = T(VIEW_W / 2, 190, '', 76, '#ffffff', 0.5, 0.5).setDepth(150).setStroke('#1a1a1a', 8);
        hud.bannerSub = T(VIEW_W / 2, 250, '', 30, '#ffffff', 0.5, 0.5).setDepth(150);
    }
    sc.tweens.killTweensOf([hud.banner, hud.bannerSub]);
    hud.banner.setText(title).setColor(color || '#ffffff').setAlpha(1).setScale(0.5);
    hud.bannerSub.setText(sub || '').setAlpha(1);
    sc.tweens.add({ targets: hud.banner, scale: 1, duration: 300, ease: 'Back.out' });
    sc.tweens.add({ targets: [hud.banner, hud.bannerSub], alpha: 0, delay: 1400, duration: 500 });
}
function fmt(ms) {
    const s = Math.floor(ms / 1000), d = Math.floor((ms % 1000) / 100);
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0') + '.' + d;
}
const mult = () => S.streak >= 6 ? 3 : S.streak >= 3 ? 2 : 1;
const jumpV = () => BASE_JUMP * (1 + 0.05 * save.jump);
const runV = () => BASE_SPEED * (1 + 0.06 * save.speed);

// ---------- create ----------
function create() {
    sc = this;
    spinners = []; movers = []; tracked = []; clouds = []; stars = []; shopObjs = []; shopRows = []; skinBtns = []; menuObjs = [];
    S = {
        state: 'menu', t: 0, stage: 1, streak: 0, deaths: 0, stageT: 0, dead: false, invuln: 0, coyote: 0, buffer: 0,
        jumps: 0, jumping: false, cp: { x: 160, y: 480 }, riding: null, padCd: 0, air: 0, shopOpen: false, theme: -1,
        lastClean: 0, sq: { x: 1, y: 1 }, touch: { left: false, right: false, jump: false, edge: false }, runCoins: 0
    };
    G = { x: 0, y: 480, d: 1, seg: 0, last: '', forceSolid: false, gapBoost: 0 };

    sc.physics.world.setBounds(0, -2000, 1e7, 4000);
    sc.physics.pause();

    // fondo
    sky = sc.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, THEMES[0]).setScrollFactor(0).setDepth(-100);
    for (let i = 0; i < 40; i++) stars.push(sc.add.rectangle(rnd(0, VIEW_W), rnd(0, 360), 3, 3, 0xffffff).setScrollFactor(0).setDepth(-95).setAlpha(0));
    for (let i = 0; i < 8; i++) {
        const c = sc.add.image(0, 0, 'cloud').setScrollFactor(0).setDepth(-90).setAlpha(0.9).setScale(Phaser.Math.FloatBetween(0.7, 1.4));
        c.base = rnd(0, 1000); c.par = Phaser.Math.FloatBetween(0.08, 0.3); c.cy = rnd(30, 260);
        clouds.push(c);
    }
    lava = sc.add.tileSprite(0, LAVA_Y, VIEW_W, 140, 'lava').setOrigin(0).setScrollFactor(0).setDepth(30);

    plats = sc.physics.add.group({ allowGravity: false, immovable: true });
    hazards = sc.physics.add.group({ allowGravity: false, immovable: true });
    coinGrp = sc.physics.add.group({ allowGravity: false });
    pads = sc.physics.add.group({ allowGravity: false, immovable: true });

    sparks = sc.add.particles(0, 0, 'spark', {
        speed: { min: 60, max: 380 }, angle: { min: -170, max: -10 }, gravityY: 700, lifespan: { min: 350, max: 800 },
        scale: { start: 1.6, end: 0.2 }, rotate: { min: 0, max: 360 }, emitting: false
    }).setDepth(20);

    // jugador: cuerpo fisico invisible + imagen (asi el "squash" no cambia el hitbox)
    player = sc.physics.add.sprite(120, 400, 'avatar' + save.skin).setAlpha(0);
    player.body.setSize(18, 42).setOffset(5, 4);
    player.setCollideWorldBounds(true);
    avatar = sc.add.image(player.x, player.y, 'avatar' + save.skin).setDepth(10).setOrigin(0.5, 1);

    sc.physics.add.collider(player, plats, platCollide, platProcess);
    sc.physics.add.overlap(player, hazards, () => { if (S.invuln <= 0) die(); });
    sc.physics.add.overlap(player, coinGrp, takeCoin);
    sc.physics.add.overlap(player, pads, usePad);

    keys = sc.input.keyboard.addKeys('W,A,S,D,SPACE,E,R,M,ESC,ONE,TWO,THREE,FOUR');
    cursors = sc.input.keyboard.createCursorKeys();

    // nivel inicial: plataforma de salida (ya reclamada) y unos segmentos
    const start = addPlat(0, 480, 10, 'check');
    start.check = true; start.claimed = true; start.stageNo = 1;
    sc.add.image(250, 480, 'flag').setOrigin(0.5, 1).setDepth(6);
    G.x = 320; G.y = 480;
    while (G.x < VIEW_W + 900) genSegment();

    buildHud();
    buildShop();
    if (sc.sys.game.device.input.touch) buildTouch();
    showMenu();
    setTheme(0);
}

// ---------- Generacion del nivel ----------
function track(o, right) { tracked.push({ o, right }); }

function addPlat(left, top, tiles, kind) {
    const p = plats.create(left + tiles * 16, top + 16, platTex(tiles, kind)).setDepth(5);
    p.body.setAllowGravity(false); p.body.setImmovable(true);
    p.kind = kind; p.rightEdge = left + tiles * 32; p.dx = 0; p.dy = 0; p.ox = p.x; p.oy = p.y;
    track(p, p.rightEdge);
    return p;
}

function addCoin(x, y) {
    const c = coinGrp.create(x, y, 'coin').setDepth(8);
    c.body.setAllowGravity(false);
    const tw = sc.tweens.add({ targets: c, scaleX: 0.25, yoyo: true, repeat: -1, duration: 420 + rnd(0, 200) });
    c.once('destroy', () => tw.remove());
    track(c, x);
}

function arcCoins(x1, y1, x2, y2) {
    if (Math.random() < 0.25) return;
    const n = rnd(1, 4);
    for (let i = 0; i < n; i++) {
        const t = (i + 1) / (n + 1);
        const cy = Phaser.Math.Linear(y1, y2, t) - 60 - 45 * Math.sin(Math.PI * t);
        addCoin(Phaser.Math.Linear(x1, x2, t), Math.max(110, cy));
    }
}

function addSpinner(cx, cy, right) {
    const s = { cx, cy, a: Math.random() * Math.PI, spd: Math.min(3.2, 1.3 + 0.08 * G.d) * (Math.random() < 0.5 ? 1 : -1), dead: false };
    s.bar = sc.add.image(cx, cy, 'bar').setDepth(7);
    s.hub = sc.add.image(cx, cy, 'hub').setDepth(8);
    s.destroy = () => { s.dead = true; s.bar.destroy(); s.hub.destroy(); };
    spinners.push(s);
    track(s, right);
}

function pickType(d) {
    const table = [['solid', 38], ['crumble', d >= 2 ? 14 : 0], ['spikes', d >= 2 ? 14 : 0], ['moving', d >= 3 ? 14 : 0],
                   ['pad', d >= 4 ? 9 : 0], ['vmoving', d >= 5 ? 10 : 0], ['bar', d >= 6 ? 11 : 0]];
    let r = Math.random() * table.reduce((a, row) => a + row[1], 0), type = 'solid';
    for (const [k, w] of table) { if ((r -= w) < 0) { type = k; break; } }
    if (type === G.last && type !== 'solid') type = 'solid';
    return type;
}

function genSegment() {
    if (G.seg >= SEGMENTS_PER_STAGE) return genCheckpoint();
    const d = G.d;
    const type = G.forceSolid ? 'solid' : pickType(d);
    const forced = G.forceSolid;
    G.forceSolid = false;
    const y = Phaser.Math.Clamp(G.y + rnd(-100, 95), 330, 530);
    const rise = Math.max(0, G.y - y);
    const gMax = Math.min(110 + Math.min(d, 20) * 6, 178 - 0.45 * rise);
    const gMin = Math.min(70 + Math.min(d, 20) * 4, gMax - 20);
    let gap = rnd(Math.round(gMin), Math.round(gMax));
    if (G.gapBoost) { gap = G.gapBoost; G.gapBoost = 0; }
    const prevX = G.x, prevY = G.y, color = rnd(0, PALETTE.length - 1);
    const left = G.x + gap;

    if (type === 'solid') {
        const tiles = forced ? rnd(5, 7) : Phaser.Math.Clamp(rnd(3, 7) - Math.floor(d / 6), 3, 7);
        addPlat(left, y, tiles, color);
        arcCoins(prevX, prevY, left, y);
        G.x = left + tiles * 32; G.y = y;
    } else if (type === 'crumble') {
        const tiles = rnd(3, 4);
        addPlat(left, y, tiles, 'crumble');
        arcCoins(prevX, prevY, left, y);
        G.x = left + tiles * 32; G.y = y;
    } else if (type === 'spikes') {
        addPlat(left, y, 7, color);
        const n = rnd(1, 3), mid = left + 112;
        for (let i = 0; i < n; i++) {
            const sp = hazards.create(mid + (i - (n - 1) / 2) * 26, y, 'spike').setOrigin(0.5, 1).setDepth(6);
            sp.body.setAllowGravity(false); sp.body.setImmovable(true); sp.body.setSize(14, 12); sp.body.setOffset(5, 8);
            track(sp, left + 224);
        }
        addCoin(mid, y - 95); if (Math.random() < 0.6) { addCoin(mid - 30, y - 80); addCoin(mid + 30, y - 80); }
        arcCoins(prevX, prevY, left, y);
        G.x = left + 224; G.y = y;
    } else if (type === 'pad') {
        addPlat(left, y, 3, color);
        const pd = pads.create(left + 48, y, 'pad').setOrigin(0.5, 1).setDepth(6);
        pd.body.setAllowGravity(false); pd.body.setImmovable(true); pd.body.setSize(36, 10); pd.body.setOffset(2, 6);
        track(pd, left + 96);
        G.x = left + 96; G.y = y; G.forceSolid = true; G.gapBoost = rnd(190, 270);
    } else if (type === 'bar') {
        addPlat(left, y, 8, color);
        addSpinner(left + 128, y - 72, left + 256);
        G.x = left + 256; G.y = y; G.forceSolid = true;
    } else if (type === 'moving') {
        const A = 110, lx = G.x + rnd(55, 80);
        const p = addPlat(lx, y, 4, color);
        p.x = lx + A + 64; p.ox = p.x;
        const m = { p, kind: 'h', cx: p.x, A, w: 1.5, ph: 0 };
        p.mov = m; movers.push(m);
        p.rightEdge = lx + 2 * A + 128; track(p, p.rightEdge);
        G.x = p.rightEdge; G.y = y;
        addCoin(p.x, y - 70);
    } else if (type === 'vmoving') {
        const vy = Phaser.Math.Clamp(y, 390, 470), lx = G.x + rnd(80, 130);
        const p = addPlat(lx, vy, 4, color);
        const m = { p, kind: 'v', cy: p.y, A: 60, w: 1.7 };
        p.mov = m; movers.push(m);
        G.x = lx + 128; G.y = vy;
        addCoin(p.x, vy - 100);
    }
    G.last = type;
    G.seg++;
}

function genCheckpoint() {
    const y = Phaser.Math.Clamp(G.y + rnd(-60, 60), 380, 480);
    const left = G.x + rnd(80, 130);
    const p = addPlat(left, y, 6, 'check');
    p.check = true; p.stageNo = G.d + 1;
    const flag = sc.add.image(left + 150, y, 'flag').setOrigin(0.5, 1).setDepth(6);
    track(flag, left + 192);
    const lbl = sc.add.text(left + 96, y - 92, 'ETAPA ' + (G.d + 1), { fontFamily: FONT, fontStyle: 'bold', fontSize: '26px', color: '#ffffff' })
        .setOrigin(0.5).setDepth(6).setStroke('#1a1a1a', 5);
    track(lbl, left + 192);
    arcCoins(G.x, G.y, left, y);
    G.x = left + 192; G.y = y; G.seg = 0; G.d++; G.last = 'check';
}

function clean() {
    const cleanX = Math.min(player.x, S.cp.x) - 1100;
    tracked = tracked.filter(t => { if (t.right < cleanX) { t.o.destroy(); return false; } return true; });
    movers = movers.filter(m => m.p.active);
    spinners = spinners.filter(s => !s.dead);
}

// ---------- Colisiones y eventos ----------
function platProcess(pl, plat) {
    return pl.body.velocity.y >= 0 &&
        (pl.body.bottom - pl.body.deltaY()) <= plat.body.top + 14 + Math.max(0, -plat.dy);
}

function platCollide(pl, plat) {
    if (!pl.body.touching.down) return;
    if (plat.mov) S.riding = plat;
    if (plat.kind === 'crumble') crumble(plat);
    if (plat.check && !plat.claimed) claim(plat);
}

function crumble(p) {
    if (p.trig) return;
    p.trig = true;
    sfx('crumble');
    sc.tweens.add({ targets: p, x: p.ox + 3, yoyo: true, repeat: 6, duration: 40 });
    sc.time.delayedCall(450, () => {
        if (!p.active) return;
        p.body.enable = false;
        sc.tweens.add({ targets: p, y: p.oy + 80, alpha: 0, duration: 350 });
        sc.time.delayedCall(2400, () => {
            if (!p.active) return;
            p.setPosition(p.ox, p.oy).setAlpha(1);
            p.body.enable = true; p.body.updateFromGameObject();
            p.trig = false;
        });
    });
}

function claim(plat) {
    plat.claimed = true;
    S.cp = { x: plat.x, y: plat.y - 16 };
    S.stage = plat.stageNo;
    const m = mult();
    const bonus = (10 + 5 * S.stage) * m;
    S.streak++;
    save.coins += bonus;
    if (S.stage > save.best) save.best = S.stage;
    persist();
    let sub = '+' + bonus + ' monedas · ' + fmt(S.stageT);
    if (S.stage % 10 === 0) { save.coins += 100; persist(); sub += ' · ¡BONO +100!'; }
    banner('ETAPA ' + S.stage, sub, S.stage % 10 === 0 ? '#ffd54a' : '#ffffff');
    sfx('check');
    PALETTE.forEach(c => burst(player.x, player.y - 20, c, 6));
    sc.cameras.main.flash(180, 255, 255, 255, true);
    setTheme(Math.floor((S.stage - 1) / 5) % THEMES.length);
    S.stageT = 0;
}

function takeCoin(pl, c) {
    const v = mult();
    c.destroy();
    save.coins += v; S.runCoins += v;
    persist();
    popup(pl.x, pl.y - 40, '+' + v);
    sfx('coin');
    burst(c.x, c.y, 0xf5cd30, 5);
}

function usePad(pl, pd) {
    if (S.padCd > 0 || pl.body.velocity.y < -50) return;
    pl.setVelocityY(-1000);
    S.padCd = 300; S.jumping = false; S.jumps = 1;
    sc.tweens.add({ targets: pd, scaleY: 0.4, yoyo: true, duration: 90 });
    sfx('pad');
    burst(pd.x, pd.y - 10, 0x39d353, 10);
    squash(0.75, 1.3);
}

function die() {
    if (S.dead || S.state !== 'play') return;
    S.dead = true; S.deaths++; S.streak = 0;
    [SKINS[save.skin].c, 0xf5cd30, 0x4b974b, 0xffffff].forEach(c => burst(player.x, player.y, c, 8));
    sfx('oof');
    sc.cameras.main.shake(200, 0.008);
    avatar.setVisible(false);
    player.body.enable = false;
    sc.time.delayedCall(650, respawn);
}

function respawn() {
    player.body.enable = true;
    player.body.reset(S.cp.x, S.cp.y - 60);
    player.setVelocity(0, 0);
    avatar.setVisible(true);
    S.dead = false; S.invuln = 1500; S.stageT = 0; S.jumps = 0; S.jumping = false;
    sc.cameras.main.scrollX = S.cp.x - 250;
}

function setTheme(i) {
    if (S.theme === i) return;
    const first = S.theme < 0;
    S.theme = i;
    const from = Phaser.Display.Color.ValueToColor(sky.fillColor), to = Phaser.Display.Color.ValueToColor(THEMES[i]);
    if (first) sky.setFillStyle(THEMES[i]);
    else sc.tweens.addCounter({
        from: 0, to: 100, duration: 1500,
        onUpdate: tw => {
            const c = Phaser.Display.Color.Interpolate.ColorWithColor(from, to, 100, tw.getValue());
            sky.setFillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b));
        }
    });
    const night = i >= 2;
    sc.tweens.add({ targets: stars, alpha: night ? 1 : 0, duration: 1500 });
    sc.tweens.add({ targets: clouds, alpha: night ? 0.25 : 0.9, duration: 1500 });
}

function squash(x, y) {
    sc.tweens.killTweensOf(S.sq);
    S.sq.x = x; S.sq.y = y;
    sc.tweens.add({ targets: S.sq, x: 1, y: 1, duration: 170, ease: 'Sine.out' });
}

// ---------- Interfaz ----------
function buildHud() {
    const before = sc.children.list.length;
    const g = sc.add.graphics().setScrollFactor(0).setDepth(100);
    g.fillStyle(0x000000, 0.45);
    g.fillRoundedRect(12, 12, 200, 46, 14); g.fillRoundedRect(12, 64, 150, 40, 14);
    g.fillRoundedRect(VIEW_W - 232, 12, 220, 40, 14); g.fillRoundedRect(VIEW_W / 2 - 80, 12, 160, 36, 14);
    hud.stage = T(28, 16, 'ETAPA 1', 30);
    sc.add.image(36, 84, 'coin').setScrollFactor(0).setDepth(101).setScale(1.2);
    hud.coins = T(56, 68, '0', 28, '#ffd54a');
    hud.best = T(VIEW_W - 222, 18, '', 24, '#cfe8ff');
    hud.time = T(VIEW_W / 2, 30, '00:00.0', 24, '#ffffff', 0.5, 0.5);
    hud.streak = T(VIEW_W / 2, 66, '', 22, '#ffb347', 0.5, 0);
    hud.hint = T(16, VIEW_H - 36, 'E: tienda', 22, '#ffffff').setAlpha(0.85);
    hud.all = sc.children.list.slice(before);            // el HUD se muestra al empezar, no en el menu
    hud.all.forEach(o => o.setVisible(false));
}

function buildTouch() {
    sc.input.addPointer(2);
    const btn = (x, y, r, label, down, up) => {
        const c = sc.add.circle(x, y, r, 0xffffff, 0.22).setStrokeStyle(4, 0xffffff, 0.7).setScrollFactor(0).setDepth(110).setInteractive();
        T(x, y, label, 34, '#ffffff', 0.5, 0.5).setDepth(111);
        c.on('pointerdown', down); c.on('pointerup', up); c.on('pointerout', up);
    };
    btn(70, 515, 48, '<', () => S.touch.left = true, () => S.touch.left = false);
    btn(190, 515, 48, '>', () => S.touch.right = true, () => S.touch.right = false);
    btn(730, 515, 56, '^', () => { S.touch.jump = true; S.touch.edge = true; }, () => S.touch.jump = false);
    btn(VIEW_W - 36, 84, 26, '$', () => toggleShop(), () => {});
    hud.hint.setVisible(false);
}

function sh(o) { o.setScrollFactor(0).setDepth(200).setVisible(false); shopObjs.push(o); return o; }

const SHOP_ITEMS = [
    { key: 'jump', name: 'Salto alto', desc: '+5% de salto por nivel', max: 5, cost: l => JUMP_COST[l] },
    { key: 'speed', name: 'Velocidad', desc: '+6% de velocidad por nivel', max: 5, cost: l => SPEED_COST[l] },
    { key: 'magnet', name: 'Imán de monedas', desc: 'Atrae las monedas cercanas', max: 3, cost: l => MAGNET_COST[l] },
    { key: 'dbl', name: 'Doble salto', desc: 'Salta otra vez en el aire', max: 1, cost: () => DOUBLE_COST }
];
const lvl = key => key === 'dbl' ? (save.dbl ? 1 : 0) : save[key];

function buildShop() {
    sh(sc.add.rectangle(VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x000000, 0.6).setInteractive());
    const g = sh(sc.add.graphics());
    g.fillStyle(0x2b2f3a); g.fillRoundedRect(130, 40, 540, 520, 18);
    g.lineStyle(4, 0xffffff, 0.15); g.strokeRoundedRect(130, 40, 540, 520, 18);
    const tx = (x, y, s, size, color, ox) => { const t = T(x, y, s, size, color, ox === undefined ? 0 : ox, 0); sh(t); t.setDepth(202); return t; };
    tx(150, 52, 'TIENDA', 36, '#ffd54a');
    shopObjs.coin = tx(612, 58, '', 26, '#ffd54a', 1);
    const close = sh(sc.add.text(648, 50, 'X', { fontFamily: FONT, fontStyle: 'bold', fontSize: '30px', color: '#ff6b6b' }).setInteractive({ useHandCursor: true }));
    close.setDepth(203).setOrigin(0.5, 0); close.on('pointerdown', () => toggleShop());
    SHOP_ITEMS.forEach((it, i) => {
        const y = 110 + i * 70;
        const bg = sh(sc.add.rectangle(400, y + 29, 500, 58, 0x3a4050).setInteractive({ useHandCursor: true }));
        bg.setDepth(201); bg.on('pointerdown', () => buy(it.key));
        const name = tx(170, y + 5, '', 24, '#ffffff');
        const desc = tx(170, y + 34, it.desc, 16, '#b0bec5');
        const price = tx(630, y + 16, '', 22, '#ffd54a', 1);
        shopRows.push({ it, bg, name, price, i });
    });
    tx(150, 400, 'Color de tu avatar', 22, '#ffffff');
    SKINS.forEach((s, i) => {
        const x = 190 + i * 84;
        const sq = sh(sc.add.rectangle(x, 462, 46, 46, s.c).setStrokeStyle(4, 0x2b2f3a).setInteractive({ useHandCursor: true }));
        sq.setDepth(201); sq.on('pointerdown', () => skinAction(i));
        const label = tx(x, 492, '', 16, '#ffd54a', 0.5);
        skinBtns.push({ sq, label });
    });
    tx(400, 525, 'E o ESC para cerrar · teclas 1-4 para comprar', 16, '#b0bec5', 0.5);
}

function refreshShop() {
    shopObjs.coin.setText(save.coins + ' monedas');
    hud.coins.setText(String(save.coins));
    shopRows.forEach(r => {
        const l = lvl(r.it.key);
        r.name.setText((r.i + 1) + '  ' + r.it.name + (r.it.key === 'dbl' ? '' : '  Nv ' + l + '/' + r.it.max));
        if (l >= r.it.max) r.price.setText(r.it.key === 'dbl' ? 'COMPRADO' : 'MAX').setColor('#7bed9f');
        else { const c = r.it.cost(l); r.price.setText(c + ' monedas').setColor(save.coins >= c ? '#ffd54a' : '#ff6b6b'); }
    });
    skinBtns.forEach((b, i) => {
        const owned = save.owned[i];
        b.sq.setStrokeStyle(4, save.skin === i ? 0xffffff : 0x2b2f3a).setAlpha(owned ? 1 : 0.55);
        b.label.setText(save.skin === i ? 'USANDO' : owned ? 'USAR' : SKINS[i].cost);
    });
}

function toggleShop() {
    if (S.state !== 'play') return;
    S.shopOpen = !S.shopOpen;
    shopObjs.forEach(o => o.setVisible(S.shopOpen));
    if (S.shopOpen) { sc.physics.pause(); refreshShop(); sfx('buy'); } else sc.physics.resume();
}

function buy(key) {
    const it = SHOP_ITEMS.find(i => i.key === key), l = lvl(key);
    if (l >= it.max) { sfx('nope'); return; }
    const c = it.cost(l);
    if (save.coins < c) { sfx('nope'); sc.cameras.main.shake(120, 0.004); return; }
    save.coins -= c;
    if (key === 'dbl') save.dbl = true; else save[key]++;
    persist(); sfx('buy'); refreshShop();
}

function skinAction(i) {
    if (!save.owned[i]) {
        if (save.coins < SKINS[i].cost) { sfx('nope'); return; }
        save.coins -= SKINS[i].cost; save.owned[i] = true; sfx('buy');
    }
    save.skin = i; persist();
    avatar.setTexture('avatar' + i);
    refreshShop();
}

function showMenu() {
    const title = T(VIEW_W / 2, 120, 'OBBY RUSH', 96, '#ffd54a', 0.5, 0.5).setStroke('#1a1a1a', 10);
    sc.tweens.add({ targets: title, scale: 1.05, yoyo: true, repeat: -1, duration: 700 });
    const go = T(VIEW_W / 2 + 30, 392, 'PRESIONA ESPACIO O TOCA PARA EMPEZAR', 26, '#ffffff', 0.5, 0.5);
    sc.tweens.add({ targets: go, alpha: 0.25, yoyo: true, repeat: -1, duration: 500 });
    menuObjs = [title, go,
        T(VIEW_W / 2, 196, 'Salta, esquiva la lava y sube de etapa', 28, '#ffffff', 0.5, 0.5),
        T(VIEW_W / 2, 250, '← →  o  A D   mover      ESPACIO  saltar (mantén = más alto)', 20, '#ffffff', 0.5, 0.5),
        T(VIEW_W / 2, 278, 'E  tienda      R  volver al checkpoint      M  silencio', 20, '#ffffff', 0.5, 0.5),
        T(VIEW_W / 2, 330, save.best > 1 ? 'MEJOR: ETAPA ' + save.best : '', 26, '#ffb347', 0.5, 0.5)
    ];
    sc.input.once('pointerdown', () => { if (S.state === 'menu') startGame(); });
}

function startGame() {
    menuObjs.forEach(o => o.destroy()); menuObjs = [];
    hud.all.forEach(o => o.setVisible(true));
    if (sc.sys.game.device.input.touch) hud.hint.setVisible(false);
    S.state = 'play';
    sc.physics.resume();
    musicStart();
    S.stageT = 0;
    banner('ETAPA 1', 'Llega a la bandera', '#ffffff');
}

// ---------- update ----------
function segDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const t = Phaser.Math.Clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1);
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function syncAvatar(time, delta) {
    const vx = player.body.velocity.x;
    avatar.setPosition(player.x, player.y + 23);
    avatar.setScale(S.sq.x, S.sq.y);
    avatar.setRotation(Phaser.Math.DegToRad(Phaser.Math.Clamp(vx / BASE_SPEED * 8, -10, 10)));
    avatar.setAlpha(S.invuln > 0 ? (Math.floor(S.invuln / 80) % 2 ? 0.35 : 1) : 1);
}

function update(time, delta) {
    const cam = sc.cameras.main;
    if (J(keys.M)) toggleMute();
    const t = time / 1000;
    clouds.forEach(c => c.setPosition((((c.base - cam.scrollX * c.par - t * c.par * 40) % 1000) + 1000) % 1000 - 100, c.cy));
    lava.tilePositionX = cam.scrollX + time * 0.04;
    lava.tilePositionY = Math.sin(t * 2) * 3;

    if (S.state === 'menu') {
        if (J(keys.SPACE) || J(cursors.up) || J(keys.W)) startGame();
        avatar.setPosition(player.x, player.y + 23 - Math.abs(Math.sin(time / 300)) * 16);
        return;
    }
    if (J(keys.E) || (S.shopOpen && J(keys.ESC))) toggleShop();
    if (S.shopOpen) {
        [keys.ONE, keys.TWO, keys.THREE, keys.FOUR].forEach((k, i) => { if (J(k)) buy(SHOP_ITEMS[i].key); });
        return;
    }

    S.invuln -= delta; S.padCd -= delta;
    if (!S.dead) S.stageT += delta;
    if (J(keys.R)) die();

    // plataformas moviles (despues de la fisica, y arrastran al jugador)
    movers.forEach(m => {
        const p = m.p;
        if (!p.active) return;
        if (m.kind === 'h') { const nx = m.cx + m.A * Math.sin(m.w * t + m.ph); p.dx = nx - p.x; p.dy = 0; p.x = nx; }
        else { const ny = m.cy + m.A * Math.sin(m.w * t); p.dy = ny - p.y; p.dx = 0; p.y = ny; }
    });
    if (S.riding && !S.dead && (player.body.touching.down || player.body.blocked.down)) {
        player.x += S.riding.dx;
        if (S.riding.dy > 0) player.y += S.riding.dy;
    }
    S.riding = null;

    if (!S.dead) control(delta);

    // barras giratorias
    spinners.forEach(s => {
        if (s.dead) return;
        s.a += s.spd * delta / 1000;
        s.bar.rotation = s.a;
        if (S.dead || S.invuln > 0) return;
        const ex = Math.cos(s.a) * 75, ey = Math.sin(s.a) * 75;
        for (const dy of [-16, 2, 18]) {
            if (segDist(player.x, player.y + dy, s.cx - ex, s.cy - ey, s.cx + ex, s.cy + ey) < 13) { die(); break; }
        }
    });

    // iman de monedas
    if (save.magnet > 0 && !S.dead) {
        const r = 60 * save.magnet;
        coinGrp.getChildren().forEach(c => {
            if (Math.hypot(c.x - player.x, c.y - player.y) < r) sc.physics.moveToObject(c, player, 520);
        });
    }

    // caer a la lava
    if (!S.dead && player.body.bottom > KILL_Y) die();

    // camara y generacion
    const targetX = player.x - 250;
    cam.scrollX += (targetX - cam.scrollX) * (1 - Math.exp(-delta / 130));
    cam.scrollX = Math.max(cam.scrollX, -40);
    cam.scrollY = 0;
    while (G.x < cam.scrollX + VIEW_W + 900) genSegment();
    if (time - S.lastClean > 400) { S.lastClean = time; clean(); }

    // HUD
    hud.stage.setText('ETAPA ' + S.stage);
    hud.coins.setText(String(save.coins));
    hud.best.setText('MEJOR: ETAPA ' + save.best);
    hud.time.setText(fmt(S.stageT));
    const m = mult();
    hud.streak.setText(S.streak >= 1 ? 'RACHA ' + S.streak + (m > 1 ? '  ·  MONEDAS x' + m : '') : '');
    syncAvatar(time, delta);
}

function control(delta) {
    const b = player.body;
    const onGround = b.blocked.down || b.touching.down;
    const left = cursors.left.isDown || keys.A.isDown || S.touch.left;
    const right = cursors.right.isDown || keys.D.isDown || S.touch.right;
    const held = cursors.up.isDown || keys.W.isDown || keys.SPACE.isDown || S.touch.jump;
    const pressed = J(cursors.up) || J(keys.W) || J(keys.SPACE) || S.touch.edge;
    S.touch.edge = false;

    const target = ((right ? 1 : 0) - (left ? 1 : 0)) * runV();
    const k = 1 - Math.exp(-delta / (onGround ? 35 : 70));
    player.setVelocityX(b.velocity.x + (target - b.velocity.x) * k);

    if (onGround) {
        if (S.air > 6) { squash(1.25, 0.75); sfx('land'); burst(player.x, player.y + 24, 0xffffff, 4); }
        S.air = 0; S.coyote = 110; S.jumps = 0; S.jumping = false;
    } else { S.air++; S.coyote -= delta; }
    if (pressed) S.buffer = 130; else S.buffer -= delta;

    if (S.buffer > 0 && S.coyote > 0) {
        player.setVelocityY(-jumpV());
        S.jumping = true; S.coyote = 0; S.buffer = 0; S.jumps = 1;
        squash(0.8, 1.25); sfx('jump');
    } else if (S.buffer > 0 && save.dbl && S.jumps < 2 && !onGround && S.coyote <= 0) {
        player.setVelocityY(-jumpV() * 0.92);
        S.jumping = true; S.buffer = 0; S.jumps = 2;
        squash(0.8, 1.25); sfx('djump'); burst(player.x, player.y + 22, 0xffffff, 6);
    }
    if (S.jumping) {                                   // salto variable: suelta la tecla para saltar menos
        if (b.velocity.y > 0) S.jumping = false;
        else if (!held && b.velocity.y < -200) player.setVelocityY(-200);
    }
}
