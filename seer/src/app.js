(() => {
  const FW = JSON.parse(document.getElementById("fw-data").textContent);
  const $ = (id) => document.getElementById(id);
  $("asof").textContent = "__ASOF__";
  $("count").textContent = `Seven questions, ${FW.length} firmwares. Some of the questions are strange. Answer them anyway.`;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  const inViewer = !!(window.claude && window.claude.use);
  const now = () => performance.now();

  /* ---------- questions: each answer leans toward some traits ---------- */
  const Q = [
    ["A drawer in your kitchen hums at night. What is inside?", [
      ["A metronome nobody wound", { groove: 2, drums: 1 }], ["One candle, still lit", { ambient: 3 }],
      ["Graph paper, every square filled in", { tracker: 3 }], ["A cassette of your uncle's band", { vintage: 3, groove: 1 }]]],
    ["Which weather do you trust?", [
      ["Sea fog", { ambient: 3 }], ["Thunder, close by", { drums: 3 }],
      ["Sleet on a tin roof", { groove: 2, drums: 1 }], ["Heat haze over a motorway", { synth: 3 }]]],
    ["How many fingers should music need?", [
      ["Ten, and both feet", { synth: 2, chords: 2 }], ["One, pressing very carefully", { tracker: 2, chords: 1 }],
      ["None. It should play itself.", { ambient: 2, groove: 1 }], ["A cat's four paws", { other: 3, obscure: 1 }]]],
    ["A stranger hands you a key. It opens:", [
      ["A lighthouse with no keeper", { ambient: 3 }], ["A basement club at three in the morning", { groove: 3, drums: 1 }],
      ["A teenager's bedroom in 1987", { vintage: 3 }], ["A filing cabinet of other people's songs", { tracker: 2, chords: 1 }]]],
    ["What tempo is your heart, honestly?", [
      ["A drip in a cave", { ambient: 3 }], ["Walking pace, with a slight limp", { chords: 2, groove: 1 }],
      ["Hummingbird", { drums: 3 }], ["Whatever the grid says", { tracker: 3 }]]],
    ["Pick a smell.", [
      ["Ozone after a spark", { synth: 3 }], ["Warm solder", { vintage: 2, other: 1 }],
      ["Wet moss", { ambient: 3 }], ["Toast", { chords: 2, popular: 1 }]]],
    ["What frightens you most?", [
      ["Silence", { groove: 2, drums: 2 }], ["A wrong note", { chords: 3 }],
      ["Menus inside menus", { play: 2, popular: 1 }], ["Being understood", { obscure: 3, other: 1 }]]],
    ["Is the moon listening?", [
      ["Yes, and taking notes", { ambient: 2, tracker: 1 }], ["Only to the bass", { groove: 3 }],
      ["The moon is a sample", { vintage: 2, synth: 1 }], ["I would rather not say", { other: 2, obscure: 1 }]]],
    ["Before you flash anything, you:", [
      ["Try it in the browser first", { play: 3 }], ["Flash it and find out", { obscure: 2, synth: 1 }],
      ["Read every comment on GitHub", { popular: 3 }], ["Ask the cat", { other: 2 }]]],
    ["Choose a passenger for a long night drive.", [
      ["A theremin in the back seat", { synth: 2, other: 1 }], ["A drummer who will not stop", { drums: 3 }],
      ["A small choir in the boot", { chords: 2, ambient: 1 }], ["A tape deck that eats tapes", { vintage: 3 }]]],
    ["Do you want what everyone else wants?", [
      ["Yes, and quickly", { popular: 3 }], ["No. Never.", { obscure: 3 }],
      ["Only at weekends", { popular: 1, groove: 1 }], ["I want what the moon wants", { ambient: 2 }]]],
    ["Which number feels warmest?", [
      ["3", { chords: 1, ambient: 1 }], ["16", { tracker: 2, drums: 1 }], ["128", { groove: 2 }], ["0x7D", { other: 2, obscure: 1 }]]],
    ["Something is knocking inside your FM-1. You:", [
      ["Knock back, in four-four", { groove: 2, drums: 1 }], ["Record it", { vintage: 1, other: 1, tracker: 1 }],
      ["Let it in", { ambient: 2, synth: 1 }], ["Reflash it and say nothing", { popular: 1, play: 1 }]]],
    ["A hare crosses the road in front of you. You:", [
      ["Follow it", { obscure: 2, ambient: 1 }], ["Count its hops", { tracker: 2, drums: 1 }],
      ["Hum it a tune", { chords: 2, synth: 1 }], ["Wave. It's an old friend.", { vintage: 2, popular: 1 }]]],
    ["How many cables is too many?", [
      ["One", { chords: 1, popular: 1 }], ["Forty, minimum", { synth: 2, obscure: 1 }],
      ["Cables are a cry for help", { tracker: 1, play: 1 }], ["Ask me after the gig", { groove: 2 }]]],
  ];
  const N = 7;
  const KIND_NAME = { synth: "synth", groove: "groovebox", drums: "drums", tracker: "tracker", chords: "chords", other: "something else" };
  const ECHOES = [
    (a) => `You said "${a}". The machine has made a note.`,
    (a) => `"${a}", you said. The machine believes you.`,
    (a) => `When you said "${a}", a bulb flickered. That is significant.`,
    (a) => `The machine heard "${a}" and will not forget it.`,
  ];
  const MURMURS = ["Hm.", "I see.", "The bulbs flicker.", "Go on.", "As I suspected.", "The orb warms.", "Interesting.", "Noted.", "Oh, my."];
  const GREETINGS = ["Ah. A visitor. Sit, sit.", "Your coin is warm. You have been holding it.", "Welcome, seeker of firmware."];

  /* ---------- bulbs round the glass ---------- */
  const marquee = document.querySelector(".marquee-bulbs");
  marquee.innerHTML = '<i class="bulb"></i>'.repeat(13);
  const frame = $("frame");
  const PER = 13;
  const ring = [];
  for (let i = 0; i < PER; i++) ring.push([i / (PER - 1) * 100, 0]);
  for (let i = 1; i < PER - 1; i++) ring.push([100, i / (PER - 1) * 100]);
  for (let i = PER - 1; i >= 0; i--) ring.push([i / (PER - 1) * 100, 100]);
  for (let i = PER - 2; i > 0; i--) ring.push([0, i / (PER - 1) * 100]);
  frame.insertAdjacentHTML("afterbegin", ring.map(([x, y]) => `<i class="bulb" style="left:calc(7px + (100% - 14px) * ${x / 100});top:calc(7px + (100% - 14px) * ${y / 100})"></i>`).join(""));
  const cabinet = $("cabinet");
  const frenzy = (on) => cabinet.classList.toggle("frenzy", on);

  /* ---------- tilt: the machine always says AISLING ---------- */
  const AISLING = FW.find((f) => f.n === "AISLING") || FW.find((f) => /aisling/i.test(f.n));
  let tilted = location.hash === "#tilt" || store.get("seer-tilt") === "1";
  const tiltBtn = $("tilt");
  function setTilt(on) {
    tilted = on && !!AISLING; store.set("seer-tilt", tilted ? "1" : "0");
    cabinet.classList.toggle("tilted", tilted);
    tiltBtn.setAttribute("aria-pressed", String(tilted));
    tiltBtn.textContent = tilted ? "Tilted" : "Tilt";
  }
  tiltBtn.addEventListener("click", () => { setTilt(!tilted); sfx.bell(tilted ? 220 : 330, 0, 0.5, 1.5, 4, 0.12); rig.jolt(); });
  addEventListener("hashchange", () => { if (location.hash === "#tilt") setTilt(true); });

  /* ---------- the animatronic: a porcelain-masked seer in a hood, on wires and cams ---------- */
  const rig = (() => {
    const cv = $("seer"), g = cv.getContext("2d"), W = cv.width, H = cv.height;
    const s = { yaw: 0, yawT: 0, nod: 0, nodT: 0, tilt: 0, jaw: 0, talkUntil: 0, blink: 0, nextBlink: 1800, nextLook: 0,
      phase: 0, speed: 0.012, up: 0, upT: 0, glow: 0, jolt: 0, mode: "idle", last: 0 };
    const sparks = Array.from({ length: 60 }, () => ({ a: Math.random() * 6.283, r: Math.random() * 0.85, sp: 0.003 + Math.random() * 0.007, z: Math.random() }));
    const ease = (v, t, k) => v + (t - v) * k;

    function candle(x, y, t) {
      g.fillStyle = "#e9dcc0"; g.fillRect(x - 9, y, 18, 70);
      g.fillStyle = "#d6ab4c"; g.fillRect(x - 16, y + 66, 32, 8);
      const f = reduce ? 0 : Math.sin(t / 90 + x) * 2 + Math.sin(t / 37 + x) * 1.2;
      const fl = g.createRadialGradient(x, y - 16, 2, x, y - 14, 46); fl.addColorStop(0, "rgba(255,190,90,.35)"); fl.addColorStop(1, "rgba(255,190,90,0)");
      g.fillStyle = fl; g.fillRect(x - 50, y - 64, 100, 100);
      g.fillStyle = "#ffcf6b"; g.beginPath(); g.moveTo(x - 6, y); g.quadraticCurveTo(x - 7 + f, y - 18, x + f * 1.5, y - 30); g.quadraticCurveTo(x + 7 + f, y - 16, x + 6, y); g.closePath(); g.fill();
      g.fillStyle = "#fff6d8"; g.beginPath(); g.ellipse(x + f * 0.5, y - 7, 2.5, 6, 0, 0, 6.283); g.fill();
    }
    function hand(x, y, dir) {
      g.fillStyle = "#e6d8bf"; g.beginPath(); g.ellipse(x, y, 15, 19, dir * 0.4, 0, 6.283); g.fill();
      g.strokeStyle = "#e6d8bf"; g.lineCap = "round"; g.lineWidth = 7;
      for (let f = 0; f < 4; f++) { const a = -1.9 + f * 0.32 + (dir < 0 ? Math.PI * 0 : 0); g.beginPath(); g.moveTo(x + dir * 6, y - 8 + f * 5); g.lineTo(x + dir * (22 + f % 2 * 3), y - 20 + f * 9 + Math.sin(s.phase * 3 + f) * 3); g.stroke(); }
      g.strokeStyle = "rgba(120,90,60,.35)"; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 8, y + 6); g.lineTo(x + 8, y + 2); g.stroke();
    }
    function draw(t) {
      const dt = Math.min(50, t - (s.last || t)); s.last = t;
      // the cams: where the head looks, when the jaw drops, how the hands circle
      if (!reduce) {
        if (t > s.nextLook && s.mode !== "reveal") { s.yawT = s.mode === "asking" ? (Math.random() - 0.5) * 0.5 : (Math.random() - 0.5) * 1.3; s.nodT = s.mode === "asking" ? 0.5 : (Math.random() - 0.3) * 0.5; s.nextLook = t + 1400 + Math.random() * 2600; }
        s.yaw = ease(s.yaw, s.yawT, 0.06); s.nod = ease(s.nod, s.nodT, 0.06);
        s.tilt = Math.sin(t / 1900) * 0.05 + s.yaw * 0.05 + Math.sin(t / 60) * s.jolt * 0.08;
        s.jaw = t < s.talkUntil ? 0.35 + 0.65 * Math.abs(Math.sin(t / 85)) * (0.6 + 0.4 * Math.sin(t / 230)) : ease(s.jaw, 0, 0.2);
        s.nextBlink -= dt; if (s.nextBlink < 0) { s.blink = 1; s.nextBlink = 2200 + Math.random() * 3400; } s.blink = Math.max(0, s.blink - 0.12);
        s.phase += s.speed * dt / 16; s.up = ease(s.up, s.upT, 0.05); s.glow = ease(s.glow, s.mode === "reveal" ? 1 : s.mode === "asking" ? 0.4 : 0.15, 0.04);
        s.jolt = Math.max(0, s.jolt - 0.02);
      }
      // the booth
      const bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, "#1e0d2e"); bg.addColorStop(1, "#07040b");
      g.fillStyle = bg; g.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 30) { g.fillStyle = `rgba(0,0,0,${0.16 + 0.1 * Math.sin(x / 19)})`; g.fillRect(x, 0, 14, H); }
      const halo = g.createRadialGradient(300, 200, 20, 300, 230, 320);
      halo.addColorStop(0, `rgba(246,217,138,${0.08 + s.glow * 0.18})`); halo.addColorStop(1, "rgba(246,217,138,0)");
      g.fillStyle = halo; g.fillRect(0, 0, W, H);
      candle(70, 400, t); candle(530, 400, t);

      const jx = Math.sin(t / 30) * s.jolt * 6;
      // robe and shoulders
      g.save(); g.translate(jx, Math.sin(t / 1300) * 2);
      const robe = g.createLinearGradient(0, 220, 0, H); robe.addColorStop(0, "#55207e"); robe.addColorStop(1, "#1f0c33");
      g.fillStyle = robe; g.beginPath(); g.moveTo(170, 262); g.bezierCurveTo(110, 290, 80, 380, 70, 540); g.lineTo(530, 540); g.bezierCurveTo(520, 380, 490, 290, 430, 262); g.closePath(); g.fill();
      // gilt torc and a spiral brooch
      g.strokeStyle = "#d6ab4c"; g.lineWidth = 7; g.lineCap = "round"; g.beginPath(); g.arc(300, 238, 64, 0.35, Math.PI - 0.35); g.stroke();
      g.fillStyle = "#f6d98a"; for (const sx of [244, 356]) { g.beginPath(); g.arc(sx, 268, 8, 0, 6.283); g.fill(); }
      g.strokeStyle = "#d6ab4c"; g.lineWidth = 2.2; g.beginPath(); for (let a = 0; a < 14; a += 0.2) { const r = 2 + a * 1.4; g.lineTo(300 + Math.cos(a) * r, 330 + Math.sin(a) * r); } g.stroke();
      g.restore();

      // arms: shoulders to hands, the hands circling the orb (or raised for the card)
      const ox = 300, oy = 430;
      const hands = [-1, 1].map((d) => {
        const ph = s.phase + (d < 0 ? 0 : Math.PI);
        const cx = ox + d * 72 + Math.cos(ph) * 22, cy = oy - 34 + Math.sin(ph) * 12;
        return [cx + d * s.up * 70, cy - s.up * 150, d];
      });
      for (const [hx, hy, d] of hands) {
        g.strokeStyle = "#3f175f"; g.lineWidth = 44; g.lineCap = "round";
        g.beginPath(); g.moveTo(300 + d * 118, 290); g.quadraticCurveTo(300 + d * 150, (290 + hy) / 2 + 40, hx - d * 18, hy + 10); g.stroke();
        g.strokeStyle = "#d6ab4c"; g.lineWidth = 5; g.beginPath(); g.arc(hx - d * 18, hy + 10, 22, 0, 6.283); g.stroke();
      }

      // head: hood, porcelain mask, eyes, hinged jaw
      g.save();
      g.translate(300 + s.yaw * 16 + jx, 168 + s.nod * 10);
      g.rotate(s.tilt);
      g.fillStyle = "#3a1656"; g.beginPath(); g.moveTo(0, -112); g.bezierCurveTo(92, -112, 118, -10, 106, 88); g.lineTo(-106, 88); g.bezierCurveTo(-118, -10, -92, -112, 0, -112); g.fill();
      g.fillStyle = "#07040b"; g.beginPath(); g.ellipse(s.yaw * 6, 0, 72, 90, 0, 0, 6.283); g.fill();
      const fx = s.yaw * 14, sx = 1 - Math.abs(s.yaw) * 0.16;
      g.save(); g.translate(fx, 0); g.scale(sx, 1);
      const mask = g.createLinearGradient(-50 - s.yaw * 30, 0, 50 - s.yaw * 30, 0);
      mask.addColorStop(0, "#f3ead9"); mask.addColorStop(0.6, "#e2d4bb"); mask.addColorStop(1, "#a9977a");
      // the mask, whole; the chin is a separate piece on a hinge, like a ventriloquist's figure
      g.fillStyle = mask; g.beginPath(); g.ellipse(0, -4, 52, 76, 0, 0, 6.283); g.fill();
      // brows, sockets, eyes
      g.strokeStyle = "#5b4630"; g.lineWidth = 3; g.beginPath(); g.moveTo(-36, -30); g.quadraticCurveTo(-20, -40, -6, -30); g.moveTo(6, -30); g.quadraticCurveTo(20, -40, 36, -30); g.stroke();
      const open = 1 - Math.sin(Math.min(1, s.blink) * Math.PI) * 0.95;
      for (const ex of [-20, 20]) {
        g.fillStyle = "#1a0f0a"; g.beginPath(); g.ellipse(ex, -14, 13, 9, 0, 0, 6.283); g.fill();
        const wink = tilted && ex > 0 && Math.sin(t / 2600) > 0.93 ? 0.1 : 1;
        g.save(); g.shadowColor = "#ffcf6b"; g.shadowBlur = 14 + 18 * s.glow;
        g.fillStyle = `rgba(255,214,120,${0.75 + s.glow * 0.25})`;
        g.beginPath(); g.ellipse(ex + s.yaw * 5, -14 + s.nod * 2, 5.5, 5.5 * open * wink + 0.3, 0, 0, 6.283); g.fill(); g.restore();
      }
      g.strokeStyle = "rgba(91,70,48,.7)"; g.lineWidth = 2; g.beginPath(); g.moveTo(s.yaw * 4, -10); g.lineTo(s.yaw * 6 - 4, 10); g.lineTo(s.yaw * 6 + 4, 12); g.stroke();
      // a hairline crack in the porcelain
      g.strokeStyle = "rgba(60,40,30,.45)"; g.lineWidth = 1; g.beginPath(); g.moveTo(30, -60); g.lineTo(24, -44); g.lineTo(30, -36); g.lineTo(26, -22); g.stroke();
      // the hinged chin, which drops when she speaks
      const jd = s.jaw * 12;
      g.fillStyle = "#120806"; g.beginPath(); g.moveTo(-22, 24); g.lineTo(22, 24); g.lineTo(21, 24 + jd); g.lineTo(-21, 24 + jd); g.closePath(); g.fill();
      g.save(); g.translate(0, jd);
      g.fillStyle = mask; g.beginPath(); g.moveTo(-22, 24); g.lineTo(22, 24); g.lineTo(21, 58); g.quadraticCurveTo(0, 80, -21, 58); g.closePath(); g.fill();
      g.strokeStyle = "rgba(60,40,30,.55)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-22, 24); g.lineTo(-21, 58); g.moveTo(22, 24); g.lineTo(21, 58); g.stroke();
      g.strokeStyle = "#7a2b2b"; g.lineWidth = 3; g.beginPath(); g.moveTo(-15, 27); g.quadraticCurveTo(0, 31, 15, 27); g.stroke();
      g.restore();
      g.strokeStyle = "#7a2b2b"; g.lineWidth = 3; g.beginPath(); g.moveTo(-18, 22); g.quadraticCurveTo(0, 18, 18, 22); g.stroke();
      g.fillStyle = "#c98a7a"; g.globalAlpha = 0.35; for (const cx of [-32, 32]) { g.beginPath(); g.arc(cx, 12, 9, 0, 6.283); g.fill(); } g.globalAlpha = 1;
      g.restore();
      // hood rim with gilt edge
      g.strokeStyle = "#d6ab4c"; g.lineWidth = 4; g.beginPath(); g.ellipse(s.yaw * 6, 0, 74, 92, 0, Math.PI * 1.02, Math.PI * 1.98); g.stroke();
      g.strokeStyle = "rgba(214,171,76,.45)"; g.lineWidth = 1.5; g.setLineDash([3, 6]); g.beginPath(); g.ellipse(s.yaw * 6, 0, 84, 102, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); g.setLineDash([]);
      g.restore();

      // the orb
      const R = 64;
      const og = g.createRadialGradient(ox - 22, oy - 26, 8, ox, oy, R);
      og.addColorStop(0, "rgba(255,240,215,.5)"); og.addColorStop(0.5, `rgba(107,47,160,${0.45 + s.glow * 0.35})`); og.addColorStop(1, "rgba(14,6,22,.95)");
      const oh = g.createRadialGradient(ox, oy, R * 0.5, ox, oy, R * 2); oh.addColorStop(0, `rgba(200,140,255,${0.12 + s.glow * 0.3})`); oh.addColorStop(1, "rgba(200,140,255,0)");
      g.fillStyle = oh; g.fillRect(ox - R * 2, oy - R * 2, R * 4, R * 4);
      g.fillStyle = og; g.beginPath(); g.arc(ox, oy, R, 0, 6.283); g.fill();
      g.save(); g.beginPath(); g.arc(ox, oy, R - 2, 0, 6.283); g.clip();
      for (const p of sparks) {
        if (!reduce) { p.a += p.sp * (1 + s.glow * 6); p.r += Math.sin(t / 800 + p.z * 9) * 0.002; }
        const rr = Math.min(0.92, Math.abs(p.r)) * R;
        g.fillStyle = `rgba(255,${200 + p.z * 40},${120 + p.z * 60},${0.3 + p.z * 0.6})`;
        g.beginPath(); g.arc(ox + Math.cos(p.a) * rr, oy + Math.sin(p.a * 1.3) * rr * 0.8, 1 + p.z * 2.2, 0, 6.283); g.fill();
      }
      g.restore();
      g.strokeStyle = "rgba(214,171,76,.8)"; g.lineWidth = 2.5; g.beginPath(); g.arc(ox, oy, R, 0, 6.283); g.stroke();
      g.fillStyle = "rgba(255,255,255,.16)"; g.beginPath(); g.ellipse(ox - 24, oy - 30, 15, 7, -0.6, 0, 6.283); g.fill();
      for (const [hx, hy, d] of hands) hand(hx, hy, d);

      // table, a fan of face-down cards, the glass
      g.fillStyle = "#120a1a"; g.fillRect(0, 498, W, 42);
      g.fillStyle = "#d6ab4c"; g.fillRect(0, 496, W, 3);
      g.fillStyle = "#8f6d2a"; g.beginPath(); g.moveTo(262, 498); g.lineTo(338, 498); g.lineTo(326, 486); g.lineTo(274, 486); g.closePath(); g.fill();
      for (let i = 0; i < 5; i++) { g.save(); g.translate(470 + i * 9, 492); g.rotate(-0.5 + i * 0.18); g.fillStyle = "#2b123f"; g.fillRect(-9, -26, 18, 28); g.strokeStyle = "#d6ab4c"; g.lineWidth = 1; g.strokeRect(-7, -24, 14, 24); g.restore(); }
      const glass = g.createLinearGradient(0, 0, W, H); glass.addColorStop(0.15, "rgba(255,255,255,0)"); glass.addColorStop(0.22, "rgba(255,255,255,.06)"); glass.addColorStop(0.3, "rgba(255,255,255,0)");
      g.fillStyle = glass; g.fillRect(0, 0, W, H);
      if (!reduce) requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
    return {
      talk(ms) { s.talkUntil = now() + ms; if (reduce) requestAnimationFrame(draw); },
      mode(m) { s.mode = m; s.upT = m === "reveal" ? 1 : 0; s.speed = m === "reveal" ? 0.05 : m === "asking" ? 0.02 : 0.012; s.nextLook = 0;
        if (m === "reveal") { s.yawT = 0; s.nodT = -0.4; } if (reduce) requestAnimationFrame(draw); },
      jolt() { s.jolt = 1; },
    };
  })();

  /* ---------- sound: FM bells, and spooky music while the machine is awake ---------- */
  let muted = store.get("seer-muted") === "1";
  const sfx = (() => {
    let ac = null, master = null, wet = null, music = null;
    function ctx() {
      if (!ac) {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination);
        // a dark echo for everything spooky
        const d = ac.createDelay(1), fb = ac.createGain(), lp = ac.createBiquadFilter();
        d.delayTime.value = 0.43; fb.gain.value = 0.42; lp.type = "lowpass"; lp.frequency.value = 2200;
        wet = ac.createGain(); wet.connect(d); d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(master);
      }
      if (ac.state === "suspended") ac.resume();
      return ac;
    }
    function bell(freq, when = 0, dur = 1.6, ratio = 3.5, index = 3, vol = 0.16, echo = 0) {
      try {
        const a = ctx(), t = a.currentTime + when, car = a.createOscillator(), mod = a.createOscillator(), mg = a.createGain(), out = a.createGain();
        car.frequency.value = freq; mod.frequency.value = freq * ratio;
        mg.gain.setValueAtTime(freq * index, t); mg.gain.exponentialRampToValueAtTime(1, t + dur);
        out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(vol, t + 0.01); out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        mod.connect(mg).connect(car.frequency); car.connect(out); out.connect(master); if (echo) { const e = a.createGain(); e.gain.value = echo; out.connect(e).connect(wet); }
        car.start(t); mod.start(t); car.stop(t + dur + 0.05); mod.stop(t + dur + 0.05);
      } catch (e) {}
    }
    // the music: a drone on D and A, a music box wandering in D Dorian, and now and then a theremin's moan
    const SCALE = [587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5, 1174.66];
    function startMusic() {
      if (music) return;
      const a = ctx(), bus = a.createGain(); bus.gain.setValueAtTime(0.0001, a.currentTime); bus.gain.exponentialRampToValueAtTime(0.5, a.currentTime + 3); bus.connect(master);
      const drones = [73.42, 110, 146.83].map((f, i) => {
        const car = a.createOscillator(), mod = a.createOscillator(), mg = a.createGain(), lfo = a.createOscillator(), lg = a.createGain(), out = a.createGain();
        car.frequency.value = f; mod.frequency.value = f * 2.003; mg.gain.value = f * 0.8;
        lfo.frequency.value = 0.07 + i * 0.03; lg.gain.value = f * 0.7; lfo.connect(lg).connect(mg.gain);
        out.gain.value = [0.07, 0.045, 0.025][i];
        mod.connect(mg).connect(car.frequency); car.connect(out).connect(bus);
        car.start(); mod.start(); lfo.start();
        return [car, mod, lfo];
      });
      let step = 3, beat = 0;
      const timer = setInterval(() => {
        beat++;
        if (Math.random() < 0.72) { step = Math.max(0, Math.min(SCALE.length - 1, step + pick([-2, -1, -1, 1, 1, 2]))); bell(SCALE[step], 0, 2.4, 3.5, 2.2, 0.05, 0.6); }
        if (beat % 16 === 0) bell(SCALE[0] / 2, 0, 3.5, 1.5, 1.5, 0.05, 0.5);
        if (beat % 22 === 11) theremin();
      }, 620);
      function theremin() {
        try {
          const t = a.currentTime, o = a.createOscillator(), v = a.createOscillator(), vg = a.createGain(), out = a.createGain();
          const f0 = pick([440, 523.25, 587.33]);
          o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * pick([0.75, 1.335, 0.667]), t + 2.6);
          v.frequency.value = 5.5; vg.gain.value = 7; v.connect(vg).connect(o.frequency);
          out.gain.setValueAtTime(0.0001, t); out.gain.exponentialRampToValueAtTime(0.035, t + 0.8); out.gain.exponentialRampToValueAtTime(0.0001, t + 3.2);
          o.connect(out); out.connect(bus); const e = a.createGain(); e.gain.value = 0.5; out.connect(e).connect(wet);
          o.start(t); v.start(t); o.stop(t + 3.3); v.stop(t + 3.3);
        } catch (e) {}
      }
      music = { bus, drones, timer };
    }
    function stopMusic(fade = 4) {
      if (!music) return;
      const m = music; music = null;
      clearInterval(m.timer);
      const t = ac.currentTime; m.bus.gain.cancelScheduledValues(t); m.bus.gain.setValueAtTime(m.bus.gain.value, t); m.bus.gain.exponentialRampToValueAtTime(0.0001, t + fade);
      m.drones.forEach((os) => os.forEach((o) => o.stop(t + fade + 0.1)));
    }
    function swell() { if (music) { const t = ac.currentTime; music.bus.gain.setValueAtTime(music.bus.gain.value, t); music.bus.gain.linearRampToValueAtTime(0.9, t + 1.5); music.bus.gain.linearRampToValueAtTime(0.5, t + 5); } }
    function setMuted(m) { if (master) master.gain.setTargetAtTime(m ? 0 : 1, ac.currentTime, 0.05); }
    return { bell, startMusic, stopMusic, swell, setMuted };
  })();
  const coinSound = () => { sfx.bell(1320, 0, 0.25, 1.41, 6, 0.11); sfx.bell(990, 0.09, 0.35, 1.41, 5, 0.09); sfx.bell(110, 0.32, 0.4, 1, 3, 0.14); };
  const tick = () => sfx.bell(587 + Math.random() * 196, 0, 0.3, 2, 1.5, 0.06, 0.3);
  const whirr = () => { for (let i = 0; i < 22; i++) sfx.bell(180 + (i % 3) * 30, i * 0.1, 0.08, 1.02, 6, 0.04); };
  const fanfare = () => [587.33, 698.46, 880, 1174.66].forEach((f, i) => sfx.bell(f, i * 0.14, 2.4, 3.5, 2.5, 0.12, 0.5));

  const muteBtn = $("mute");
  const setMute = () => { muteBtn.textContent = muted ? "Sound off" : "Sound on"; muteBtn.setAttribute("aria-pressed", String(muted)); };
  setMute();
  muteBtn.addEventListener("click", () => { muted = !muted; setMute(); store.set("seer-muted", muted ? "1" : "0"); sfx.setMuted(muted); if (muted) stopVoice(); });

  /* ---------- her voice: claude.ai's inside a viewer, the browser's on the site ---------- */
  let tts = null;
  const webVoice = !inViewer && "speechSynthesis" in window;
  if (inViewer) claude.use("tts").then((t) => { tts = t; }).catch(() => {});
  function stopVoice() { try { tts?.stop?.(); } catch (e) {} try { if (webVoice) speechSynthesis.cancel(); } catch (e) {} }
  const voiceEl = $("voice");
  function speak(line, aloud = false) {
    voiceEl.textContent = line;
    rig.talk(Math.min(6000, 400 + line.length * 55));
    if (!aloud || muted) return;
    stopVoice();
    if (inViewer && tts) { tts.speak(line, { voice: "airy", rate: 0.9 }).catch(() => {}); }
    else if (webVoice) {
      const u = new SpeechSynthesisUtterance(line);
      const vs = speechSynthesis.getVoices();
      const v = vs.find((v) => /en-IE/i.test(v.lang)) || vs.find((v) => /en-GB/i.test(v.lang));
      if (v) u.voice = v;
      u.rate = 0.88; u.pitch = 0.8;
      speechSynthesis.speak(u);
    }
  }

  /* ---------- the game ---------- */
  const stage = $("stage"), result = $("result"), dispense = $("dispense"), coinBtn = $("coin");
  const intro = stage.innerHTML;
  let asked = [], traits = {}, heard = [];

  function start() {
    coinSound(); sfx.startMusic(); stopVoice(); rig.jolt();
    coinBtn.disabled = true;
    asked = shuffle(Q).slice(0, N); traits = {}; heard = [];
    result.hidden = true; result.innerHTML = ""; dispense.innerHTML = "";
    rig.mode("asking");
    speak(pick(GREETINGS), true);
    setTimeout(() => ask(0), reduce ? 0 : 1600);
    stage.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }
  function ask(i) {
    const [q, answers] = asked[i];
    speak(q);
    const order = shuffle(answers);
    stage.innerHTML = `
      <div class="progress"><span>Question ${i + 1} of ${N}</span><span class="pips" aria-hidden="true">${Array.from({ length: N }, (_, k) => `<b class="${k <= i ? "on" : ""}"></b>`).join("")}</span></div>
      <ul class="answers">${order.map((a, k) => `<li><button type="button"><kbd>${"ABCD"[k]}</kbd><span>${esc(a[0])}</span></button></li>`).join("")}</ul>`;
    stage.querySelectorAll("button").forEach((b, k) => b.addEventListener("click", () => answer(i, order[k])));
    stage.querySelector("button").focus({ preventScroll: true });
  }
  function answer(i, a) {
    tick();
    heard.push(a[0]);
    for (const [k, v] of Object.entries(a[1])) traits[k] = (traits[k] || 0) + v;
    if (i + 1 < N) { speak(pick(MURMURS)); setTimeout(() => ask(i + 1), reduce ? 0 : 520); }
    else divine();
  }

  function weighted(items) {
    const total = items.reduce((t, [, w]) => t + w, 0);
    let r = Math.random() * total;
    for (const [x, w] of items) { if ((r -= w) <= 0) return x; }
    return items[0][0];
  }
  function chooseFirmware() {
    if (tilted && AISLING) return AISLING;
    const maxI = Math.log10(1 + Math.max(...FW.map((f) => f.i)));
    const T = (k) => traits[k] || 0;
    const top = FW.map((f) => {
      const pop = Math.log10(1 + f.i) / maxI;
      return [2.2 * T(f.k) + 2 * (f.am ? T("ambient") : -0.25 * T("ambient")) + 2 * (f.vi ? T("vintage") : -0.15 * T("vintage"))
        + (f.p ? 1.2 * T("play") : 0) + 2 * pop * T("popular") + 2 * (1 - pop) * T("obscure") + (f.b ? -0.5 : 0) + Math.random() * 2.5, f];
    }).sort((a, b) => b[0] - a[0]).slice(0, 5);
    return weighted(top.map(([, f], k) => [f, 5 - k]));
  }
  function chooseCard() {
    const lean = tilted ? { ...traits, ambient: (traits.ambient || 0) + 8, synth: (traits.synth || 0) + 4 } : traits;
    return weighted(VOLTAGE.cards.map((c) => [c, 1 + c.traits.reduce((t, k) => t + (lean[k] || 0), 0) ** 1.4]));
  }

  function divine() {
    stage.innerHTML = `<p class="note">The machine is consulting the spirits of the flash chip…</p>`;
    rig.mode("reveal"); frenzy(true); sfx.swell(); whirr();
    speak("The spirits are stirring… the card is coming…", true);
    const fw = chooseFirmware(), card = chooseCard();
    setTimeout(() => deal(fw, card), reduce ? 0 : 2400);
  }

  function deal(fw, card) {
    fanfare();
    dispense.innerHTML = `<div class="card out" role="img" aria-label="${esc(card.name)}: the machine says flash ${esc(fw.n)} by ${esc(fw.a)}">${VOLTAGE.render(card, fw)}</div>`;
    speak(`${card.name}. The machine says: flash ${fw.n}.`, true);
    setTimeout(() => {
      frenzy(false); rig.mode("idle"); sfx.stopMusic(8);
      showReading(fw, card);
    }, reduce ? 0 : 3000);
    dispense.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  }

  function showReading(fw, card) {
    const links = [
      fw.r && `<a href="https://github.com/${esc(fw.r)}" target="_blank" rel="noopener">Source on GitHub</a>`,
      fw.p && `<a href="${esc(fw.p)}" target="_blank" rel="noopener">Try it in the browser</a>`,
      `<a href="https://thefirmwarehub.com" target="_blank" rel="noopener">Install from the hub</a>`,
    ].filter(Boolean).join("");
    result.innerHTML = `
      <div class="reading">
        <h2>${esc(card.name)}<small>${card.num} · the Voltage Arcana · stands for ${esc(card.trad)}</small></h2>
        <p class="meaning">${esc(card.up)}</p>
        <p class="echo">${esc(pick(ECHOES)(pick(heard)))} Lucky MIDI channel ${rnd(1, 16)}, lucky tempo ${rnd(62, 174)} BPM.</p>
        <article class="fw" aria-label="Your firmware">
          <span class="eyebrow">The machine says flash</span>
          <h3 class="fw-name">${esc(fw.n)}</h3>
          <p class="fw-by">by ${esc(fw.a)}</p>
          ${fw.w ? `<p class="fw-what">${esc(fw.w)}</p>` : ""}
          <p class="fw-meta">${esc(KIND_NAME[fw.k] || fw.k)}${fw.v ? ` · ${esc(fw.v)}${fw.b ? " beta" : ""}` : ""}${fw.id ? ` · ${esc(fw.id)}` : ""} · ${fw.i.toLocaleString("en-GB")} installs</p>
          <div class="links">${links}</div>
        </article>
        <details class="lore"><summary>The lore of ${esc(card.name)}</summary><p>${esc(card.lore)}</p></details>
        <div class="after"><button class="btn gold" id="again" type="button">Another coin</button></div>
      </div>`;
    result.hidden = false;
    stage.innerHTML = intro;
    $("count").textContent = `She heard: ${heard.join(" · ")}.`;
    coinBtn.disabled = false;
    $("again").addEventListener("click", () => { cabinet.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); start(); });
  }

  coinBtn.addEventListener("click", start);
  setTilt(tilted);
  document.addEventListener("keydown", (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = "abcd".indexOf(e.key.toLowerCase());
    const btns = stage.querySelectorAll(".answers button");
    if (k >= 0 && btns[k]) btns[k].click();
  });
})();
