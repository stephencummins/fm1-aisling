/* The Voltage Arcana: a Major Arcana for people who think in patch cables. Twenty-two cards drawn here as panels,
   each with the traditional card it stands for (sent to Sídhe's engine), its traits, meanings and a short lore. */
const VOLTAGE = (() => {
  const C = { orange: "#ff5a1f", yellow: "#f2c500", blue: "#2a6fdb", red: "#e2332b", green: "#2fa35a", black: "#1b1b1b", white: "#f4f2ec", grey: "#9a968c" };
  const P = { white: "#f4f2ec", grey: "#9a968c", panel: "#dedad1", panel2: "#c9c4b8", ink: "#1d1c1a", soft: "#6f6a60", screen: "#151a16", glow: "#9dff7a" };

  /* ---- drawing helpers (SVG strings, viewBox 0 0 200 300) ---- */
  const knob = (x, y, r = 11, a = -40, cap = P.ink) =>
    `<g><circle cx="${x}" cy="${y}" r="${r + 3}" fill="none" stroke="${P.soft}" stroke-width=".8" stroke-dasharray="1.5 3"/>
     <circle cx="${x}" cy="${y}" r="${r}" fill="${cap}"/><circle cx="${x}" cy="${y}" r="${r * 0.62}" fill="#2c2b28"/>
     <line x1="${x}" y1="${y}" x2="${x + Math.sin(a * Math.PI / 180) * r * 0.9}" y2="${y - Math.cos(a * Math.PI / 180) * r * 0.9}" stroke="${P.white}" stroke-width="2" stroke-linecap="round"/></g>`;
  const jack = (x, y) => `<g><circle cx="${x}" cy="${y}" r="6.5" fill="#bfb9ac" stroke="${P.soft}" stroke-width=".8"/><circle cx="${x}" cy="${y}" r="3.2" fill="${P.ink}"/></g>`;
  const plug = (x, y, col) => `<g><rect x="${x - 4}" y="${y - 10}" width="8" height="12" rx="2" fill="${col}"/><circle cx="${x}" cy="${y}" r="3.4" fill="${P.ink}"/></g>`;
  const cable = (x1, y1, x2, y2, col, sag = 40, cls = "") =>
    `<path class="${cls}" d="M${x1} ${y1} C${x1} ${y1 + sag} ${x2} ${y2 + sag} ${x2} ${y2}" fill="none" stroke="${col}" stroke-width="4.5" stroke-linecap="round"/>`;
  const led = (x, y, col, cls = "") => `<g class="${cls}"><circle cx="${x}" cy="${y}" r="5" fill="${col}" opacity=".25"/><circle cx="${x}" cy="${y}" r="2.8" fill="${col}"/></g>`;
  const screen = (x, y, w, h, inner) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${P.screen}" stroke="${P.ink}" stroke-width="1.5"/>${inner}`;
  const wave = (type, x, y, w, h, col = P.glow, cycles = 2, sw = 2) => {
    const pts = [];
    for (let i = 0; i <= 80; i++) {
      const t = i / 80, ph = (t * cycles) % 1;
      const v = type === "sine" ? Math.sin(t * cycles * 2 * Math.PI) : type === "saw" ? 1 - 2 * ph : type === "square" ? (ph < 0.5 ? 1 : -1)
        : type === "tri" ? 1 - 4 * Math.abs(ph - 0.5) : Math.max(-0.55, Math.min(0.55, 1.6 * Math.sin(t * cycles * 2 * Math.PI)));
      pts.push(`${(x + t * w).toFixed(1)},${(y - v * h / 2).toFixed(1)}`);
    }
    return `<polyline points="${pts.join(" ")}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  };
  const fader = (x, y, h, pos, col = P.ink) => `<g><rect x="${x - 2}" y="${y}" width="4" height="${h}" rx="2" fill="${P.ink}" opacity=".7"/><rect x="${x - 9}" y="${y + h * (1 - pos) - 5}" width="18" height="10" rx="2" fill="${col}"/></g>`;
  const keys = (x, y, w, n, lit = []) => {
    const kw = w / n; let s = "";
    for (let i = 0; i < n; i++) s += `<rect x="${x + i * kw}" y="${y}" width="${kw - 1}" height="34" rx="1.5" fill="${lit.includes(i) ? C.orange : P.white}" stroke="${P.ink}" stroke-width=".8"/>`;
    [0, 1, 3, 4, 5].forEach((b) => { for (let o = 0; o < n; o += 7) { const i = o + b; if (i < n - 1) s += `<rect x="${x + (i + 0.65) * kw}" y="${y}" width="${kw * 0.7}" height="20" rx="1" fill="${P.ink}"/>`; } });
    return s;
  };
  const txt = (x, y, s, size = 9, col = P.ink, anchor = "middle", extra = "") =>
    `<text x="${x}" y="${y}" font-family="DM Mono, ui-monospace, monospace" font-size="${size}" fill="${col}" text-anchor="${anchor}" ${extra}>${s}</text>`;

  function panel(num, title, art, accent) {
    const screw = (x, y) => `<g><circle cx="${x}" cy="${y}" r="4.2" fill="#b7b1a4" stroke="${P.soft}" stroke-width=".7"/><line x1="${x - 2.6}" y1="${y}" x2="${x + 2.6}" y2="${y}" stroke="${P.soft}" stroke-width="1.2"/></g>`;
    return `<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" role="img">
      <defs><linearGradient id="al" x1="0" x2="1"><stop offset="0" stop-color="${P.panel}"/><stop offset=".5" stop-color="#ebe8e1"/><stop offset="1" stop-color="${P.panel2}"/></linearGradient></defs>
      <rect width="200" height="300" rx="10" fill="url(#al)"/>
      <rect x="0" y="0" width="200" height="40" rx="10" fill="${accent}"/><rect x="0" y="30" width="200" height="10" fill="${accent}"/>
      ${screw(14, 14)}${screw(186, 14)}${screw(14, 286)}${screw(186, 286)}
      ${txt(100, 26, num, 15, accent === C.black || accent === C.blue || accent === C.red || accent === C.green ? P.white : P.ink, "middle", 'font-weight="500" letter-spacing="2"')}
      <g>${art}</g>
      <line x1="22" y1="254" x2="178" y2="254" stroke="${P.soft}" stroke-width=".8"/>
      ${txt(100, 272, title.toUpperCase(), title.length > 16 ? 9.5 : 11.5, P.ink, "middle", 'font-weight="500" letter-spacing="1.2"')}
    </svg>`;
  }

  /* ---- the cards ---- */
  const CARDS = [
    { slug: "first-patch", num: "0", name: "The First Patch", trad: "The Fool", accent: C.yellow, traits: ["other", "obscure"],
      kw: ["beginner's ears", "no manual", "one loose cable"],
      up: "Plug something into something and see what happens. Not knowing is the instrument right now.",
      rev: "You bought the case and never patched it. Or you patched everything at once and can't hear which cable matters.",
      lore: "Every wall of modules began with one cable and no idea. The first patch is usually a sine wave into a speaker, played for forty minutes by someone grinning.",
      art: () => `${jack(100, 74)}${cable(100, 74, 60, 238, C.yellow, 90, "sway")}${plug(60, 240, C.yellow)}${led(150, 74, C.red)}${txt(140, 150, "?", 46, P.soft)}` },
    { slug: "oscillator", num: "I", name: "The Oscillator", trad: "The Magician", accent: C.orange, traits: ["synth", "play"],
      kw: ["pure tone", "will", "the source"],
      up: "All sound starts here. You have everything you need: a voltage, a shape and the will to tune it.",
      rev: "Drifting out of tune. The source is fine; you've stopped listening to it.",
      lore: "Sine, triangle, saw and square. Old players say each waveform is a temperament: the sine is honest, the saw is ambitious, the square is stubborn and the triangle is the one that gets on with everyone.",
      art: () => `${screen(30, 54, 140, 104, wave("sine", 38, 76, 124, 22, P.glow, 2) + wave("saw", 38, 106, 124, 22, C.yellow, 3) + wave("square", 38, 136, 124, 22, C.orange, 2))}${knob(70, 204, 20, -30, C.orange)}${knob(140, 200, 11, 50)}${jack(140, 232)}` },
    { slug: "filter", num: "II", name: "The Filter", trad: "The High Priestess", accent: C.black, traits: ["synth", "ambient"],
      kw: ["what is hidden", "resonance", "intuition"],
      up: "Most of the sound is hidden. Close the filter slowly and listen to what it keeps for itself.",
      rev: "Resonance up too far: the filter is singing its own song over yours. Back off and trust the quiet.",
      lore: "A filter never adds anything. It decides what you are allowed to hear, and at high resonance it starts to whistle a secret of its own.",
      art: () => `${screen(30, 54, 140, 100, `<path d="M38 128 L104 128 Q122 128 128 86 Q132 74 136 128 Q146 146 162 146" fill="none" stroke="${P.glow}" stroke-width="2.4"/><line x1="128" y1="62" x2="128" y2="148" stroke="${C.orange}" stroke-dasharray="3 4"/>`)}${knob(68, 204, 20, 20, C.black)}${knob(136, 196, 12, 110, C.orange)}${txt(68, 238, "CUTOFF", 8, P.soft)}${txt(136, 222, "RES", 8, P.soft)}` },
    { slug: "polyphony", num: "III", name: "Polyphony", trad: "The Empress", accent: C.green, traits: ["popular", "chords"],
      kw: ["abundance", "voices", "warmth"],
      up: "Eight voices at once, and room for more. Let the chord be big and generous.",
      rev: "Voice stealing: too many notes and the oldest ones vanish. Play fewer, hold them longer.",
      lore: "Polyphony was once so expensive that a single chord cost as much as a car. Now it fits in a pocket, and the abundance is easy to waste.",
      art: () => `${wave("sine", 30, 80, 140, 24, C.green, 2, 2.2)}${wave("sine", 30, 98, 140, 20, C.orange, 3, 2.2)}${wave("sine", 30, 114, 140, 16, C.blue, 4, 2.2)}${keys(26, 150, 148, 14, [0, 4, 7, 11])}${knob(60, 220, 11, -60)}${knob(100, 220, 11, 0, C.green)}${knob(140, 220, 11, 60)}` },
    { slug: "clock", num: "IV", name: "The Clock", trad: "The Emperor", accent: C.red, traits: ["tracker", "popular"],
      kw: ["structure", "authority", "the grid"],
      up: "Everything follows the master clock. Set the tempo and let order hold the rest together.",
      rev: "Two clocks disagreeing. Something drifts, and nobody knows which one is right.",
      lore: "In every rack there is one module that tells all the others when. It is rarely the most interesting module, and nothing works without it.",
      art: () => `${screen(44, 58, 112, 52, txt(100, 96, "120.0", 30, C.red, "middle", 'font-weight="500"'))}${led(100, 128, C.red, "blink")}${wave("square", 30, 168, 140, 26, P.ink, 6, 2)}${knob(72, 220, 14, -10, C.red)}${jack(128, 214)}${jack(152, 214)}` },
    { slug: "patch-sheet", num: "V", name: "The Patch Sheet", trad: "The Hierophant", accent: C.white, traits: ["vintage"],
      kw: ["tradition", "the diagram", "teachers"],
      up: "Someone drew this patch in 1974 and it still works. Follow the old diagram before you improve it.",
      rev: "The diagram is a starting point, not a rule. Pull one cable from the classic patch.",
      lore: "Before presets there were printed sheets of empty panels, filled in by pencil, passed hand to hand. Some players still keep them in a ring binder like scripture.",
      art: () => `<rect x="34" y="56" width="132" height="168" rx="3" fill="${P.white}" stroke="${P.soft}"/>${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<circle cx="${64 + c * 36}" cy="${92 + r * 46}" r="10" fill="none" stroke="${P.ink}" stroke-width="1.2"/>`).join("")).join("")}<path d="M64 102 C64 120 100 120 100 128 M100 148 C100 170 136 160 136 174" fill="none" stroke="${C.blue}" stroke-width="2"/>${txt(100, 214, "VCO › VCF › VCA", 8, P.soft)}` },
    { slug: "ring-mod", num: "VI", name: "The Ring Modulator", trad: "The Lovers", accent: C.blue, traits: ["chords"],
      kw: ["union", "two become new", "choice"],
      up: "Two signals multiply and a third sound appears that neither could make alone. Choose your partner on purpose.",
      rev: "Two parts clashing into a metallic mess. Change the interval, or let one of them rest.",
      lore: "The ring modulator was named for a ring of four diodes. Players say it is the only module that is a relationship: what comes out depends entirely on what both of you bring.",
      art: () => `${jack(60, 72)}${jack(140, 72)}${cable(60, 72, 100, 150, C.blue, 30)}${cable(140, 72, 100, 150, C.orange, 30)}<circle cx="100" cy="160" r="26" fill="none" stroke="${P.ink}" stroke-width="2.4"/><path d="M84 144 L116 176 M116 144 L84 176" stroke="${P.ink}" stroke-width="2.4"/>${wave("sine", 30, 220, 140, 26, C.blue, 9, 1.8)}` },
    { slug: "sequencer", num: "VII", name: "The Sequencer", trad: "The Chariot", accent: C.orange, traits: ["drums", "groove"],
      kw: ["momentum", "control", "sixteen steps"],
      up: "Sixteen steps and the will to drive them forward. Hold the reins; let it run.",
      rev: "The pattern runs you. Stop, mute half the steps, and steer again.",
      lore: "A sequencer goes on until someone stops it. Its lights move left to right like a chariot that only knows one direction.",
      art: () => `${Array.from({ length: 16 }, (_, i) => `<g class="step" style="animation-delay:${(i * 0.125).toFixed(3)}s">${led(36 + (i % 8) * 18.3, 72 + Math.floor(i / 8) * 26, C.orange)}</g>`).join("")}${Array.from({ length: 8 }, (_, i) => knob(36 + i * 18.3, 152, 6.5, -60 + ((i * 47) % 120))).join("")}${fader(60, 184, 50, 0.7, C.orange)}${fader(100, 184, 50, 0.4)}${fader(140, 184, 50, 0.55)}` },
    { slug: "compressor", num: "VIII", name: "The Compressor", trad: "Strength", accent: C.black, traits: ["drums"],
      kw: ["gentle control", "patience", "glue"],
      up: "Gentle hands on a loud signal. Hold it lightly and it will sit where you want it.",
      rev: "Squashed flat. You've taken the life out of it trying to tame it.",
      lore: "The strongest compressor setting is rarely the best. Engineers talk about it the way old stories talk about calming a lion: slowly, and without showing fear.",
      art: () => `<rect x="34" y="60" width="132" height="86" rx="6" fill="${P.white}" stroke="${P.ink}" stroke-width="1.5"/><path d="M50 128 A56 56 0 0 1 150 128" fill="none" stroke="${P.ink}" stroke-width="1.2"/><path d="M134 104 A56 56 0 0 1 150 128" fill="none" stroke="${C.red}" stroke-width="3"/><line class="needle" x1="100" y1="138" x2="78" y2="86" stroke="${P.ink}" stroke-width="2" stroke-linecap="round"/>${txt(100, 140, "VU", 9, P.soft)}${knob(64, 196, 14, 30)}${knob(136, 196, 14, -50)}${txt(64, 228, "RATIO", 8, P.soft)}${txt(136, 228, "ATTACK", 8, P.soft)}` },
    { slug: "headphones", num: "IX", name: "The Headphones", trad: "The Hermit", accent: C.grey, traits: ["tracker", "ambient"],
      kw: ["solitude", "3 a.m.", "inner listening"],
      up: "Alone with one lamp and a pair of headphones. This is where the real work happens.",
      rev: "You've been inside the cans too long. Play it on a speaker, to a person.",
      lore: "Most music made in small rooms is first heard by one person at three in the morning. The headphones carry the light for them.",
      art: () => `<path d="M48 168 L48 132 A52 52 0 0 1 152 132 L152 168" fill="none" stroke="${P.ink}" stroke-width="8" stroke-linecap="round"/><rect x="34" y="150" width="28" height="48" rx="10" fill="${P.ink}"/><rect x="138" y="150" width="28" height="48" rx="10" fill="${P.ink}"/>${led(100, 120, C.yellow, "blink-slow")}${screen(70, 210, 60, 26, txt(100, 228, "03:00", 12, P.glow))}` },
    { slug: "lfo", num: "X", name: "The LFO", trad: "Wheel of Fortune", accent: C.yellow, traits: ["groove", "play"],
      kw: ["cycles", "change", "the slow wheel"],
      up: "What goes up comes round again. Let the slow wheel move the sound and watch it change.",
      rev: "Rate too fast or depth too deep: the cycle is all anyone hears. Slow it down.",
      lore: "The low-frequency oscillator turns too slowly to hear. You only notice it in what it moves: a filter opening, a voice drifting, a fortune turning.",
      art: () => `<circle cx="100" cy="124" r="56" fill="none" stroke="${P.ink}" stroke-width="2"/><circle cx="100" cy="124" r="40" fill="none" stroke="${P.soft}" stroke-dasharray="2 5"/><g class="spin" style="transform-origin:100px 124px"><line x1="100" y1="124" x2="100" y2="70" stroke="${C.orange}" stroke-width="2.5"/><circle cx="100" cy="68" r="7" fill="${C.orange}"/></g><circle cx="100" cy="124" r="5" fill="${P.ink}"/>${wave("tri", 30, 216, 140, 28, P.ink, 2, 2)}` },
    { slug: "quantiser", num: "XI", name: "The Quantiser", trad: "Justice", accent: C.blue, traits: ["tracker"],
      kw: ["balance", "the scale", "rightness"],
      up: "Every note weighed and set in its place in the scale. Fairness, precision, consequence.",
      rev: "Too correct. Turn the quantiser off for one bar and let a wrong note in.",
      lore: "A quantiser takes any voltage and moves it to the nearest right answer. It forgives nothing, and it makes beginners sound wise.",
      art: () => `${Array.from({ length: 7 }, (_, r) => `<line x1="34" y1="${66 + r * 22}" x2="166" y2="${66 + r * 22}" stroke="${P.soft}" stroke-width=".8"/>`).join("")}${[[46, 3], [68, 5], [90, 2], [112, 4], [134, 1], [156, 3]].map(([x, r]) => `<circle cx="${x}" cy="${66 + r * 22}" r="6" fill="${C.blue}"/><circle cx="${x}" cy="${66 + r * 22 + (x % 3 - 1) * 8}" r="3" fill="none" stroke="${C.orange}"/>`).join("")}${knob(100, 222, 16, 0, C.blue)}` },
    { slug: "feedback", num: "XII", name: "The Feedback Loop", trad: "The Hanged Man", accent: C.red, traits: ["other", "obscure"],
      kw: ["surrender", "suspension", "seeing differently"],
      up: "Patch the output back into the input and let go. Suspended, it shows you something new.",
      rev: "Stuck in the loop, waiting for it to resolve on its own. Pull the cable.",
      lore: "Every modular player has hung for an hour inside a feedback patch, unwilling to touch anything in case it stops being beautiful.",
      art: () => `${jack(60, 210)}${jack(140, 210)}<path d="M60 210 C60 60 140 60 140 210" fill="none" stroke="${C.red}" stroke-width="4.5"/><text x="100" y="140" font-family="DM Mono, monospace" font-size="11" fill="${P.ink}" text-anchor="middle" transform="rotate(180 100 136)">OUT › IN</text>${txt(60, 236, "IN", 8, P.soft)}${txt(140, 236, "OUT", 8, P.soft)}` },
    { slug: "envelope", num: "XIII", name: "The Envelope", trad: "Death", accent: C.black, traits: ["vintage"],
      kw: ["endings", "release", "every note dies"],
      up: "Attack, decay, sustain, release. Every sound ends so the next one can begin.",
      rev: "Release set to infinity: you won't let the note die. Let it go.",
      lore: "The envelope is the shape of a life drawn in four letters. Players argue about attack; everyone agrees the release is the part that matters.",
      art: () => `${screen(30, 60, 140, 110, `<path d="M42 156 L66 76 L96 112 L132 112 L158 156" fill="none" stroke="${P.glow}" stroke-width="2.4"/>${["A", "D", "S", "R"].map((l, i) => txt([54, 82, 114, 146][i], 166, l, 8, P.glow)).join("")}`)}${fader(52, 186, 50, 0.2)}${fader(84, 186, 50, 0.5)}${fader(116, 186, 50, 0.7)}${fader(148, 186, 50, 0.35, C.red)}` },
    { slug: "mixer", num: "XIV", name: "The Mixer", trad: "Temperance", accent: C.green, traits: ["chords", "ambient"],
      kw: ["balance", "blending", "patience"],
      up: "Pour one sound into another, a little at a time, until the blend is right.",
      rev: "Everything at full. Take one channel down and listen to the space it leaves.",
      lore: "Mixing is the slow art of making four things agree to be one. It cannot be rushed, which is why it takes so long.",
      art: () => `${[0, 1, 2, 3].map((i) => knob(46 + i * 36, 74, 9, [-50, 20, -10, 60][i]) + fader(46 + i * 36, 100, 96, [0.6, 0.35, 0.75, 0.5][i], i === 2 ? C.green : P.ink) + led(46 + i * 36, 214, i === 2 ? C.green : C.yellow)).join("")}` },
    { slug: "gas", num: "XV", name: "Gear Acquisition", trad: "The Devil", accent: C.red, traits: ["groove", "drums"],
      kw: ["temptation", "chains", "one more module"],
      up: "The pull of the next module, the next box. Know it for what it is, and enjoy the music you already own.",
      rev: "You notice the chains. Sell one thing you never touch and make a track with what's left.",
      lore: "It is said every rack has one empty space, and that the space is never filled, because the space moves.",
      art: () => `${Array.from({ length: 12 }, (_, i) => `<rect x="${32 + (i % 6) * 23}" y="${60 + Math.floor(i / 6) * 70}" width="20" height="62" rx="2" fill="${[P.white, C.black, P.panel2, C.orange, P.white, C.black][i % 6]}" stroke="${P.ink}" stroke-width=".8"/>`).join("")}${cable(44, 80, 120, 90, C.red, 40)}${cable(66, 150, 158, 140, C.yellow, 50)}${cable(90, 76, 150, 160, C.blue, 70)}<rect x="132" y="204" width="44" height="24" rx="3" fill="${C.yellow}" transform="rotate(-12 154 216)"/>${txt(154, 221, "£££", 11, P.ink, "middle", 'transform="rotate(-12 154 216)"')}` },
    { slug: "clipping", num: "XVI", name: "The Clipping", trad: "The Tower", accent: C.red, traits: ["drums"],
      kw: ["collapse", "sudden change", "overload"],
      up: "Too much signal and the tops are sheared off. It's ugly, and sometimes it's the best thing in the track.",
      rev: "You can see the overload coming. Turn the gain down one notch before it happens.",
      lore: "When the signal hits the rails there is nowhere left to go. The waveform's tower loses its roof, and in the noise something new is heard.",
      art: () => `${screen(30, 64, 140, 96, wave("clip", 38, 112, 124, 70, C.red, 3, 2.6) + `<line x1="38" y1="85" x2="162" y2="85" stroke="${C.yellow}" stroke-dasharray="3 4" stroke-width=".8"/><line x1="38" y1="139" x2="162" y2="139" stroke="${C.yellow}" stroke-dasharray="3 4" stroke-width=".8"/>`)}<polyline points="132,170 112,198 126,198 104,236" fill="none" stroke="${C.yellow}" stroke-width="3.5" stroke-linejoin="round"/>${led(60, 200, C.red, "blink-fast")}${txt(60, 222, "CLIP", 8, P.soft)}` },
    { slug: "reverb", num: "XVII", name: "The Reverb", trad: "The Star", accent: C.blue, traits: ["ambient"],
      kw: ["hope", "space", "after the storm"],
      up: "After the noise, a single note in a vast space, ringing on and on. Hope sounds like this.",
      rev: "Drowned in reverb. Bring the mix down and let the dry signal speak.",
      lore: "Reverb is the sound of a room you are not in. Some players say a long enough tail can hold a whole night sky.",
      art: () => `<g class="ripple">${[14, 30, 46, 62].map((r, i) => `<circle cx="100" cy="132" r="${r}" fill="none" stroke="${C.blue}" stroke-width="${2.4 - i * 0.4}" opacity="${1 - i * 0.2}"/>`).join("")}</g><path d="M100 120 L103 129 L112 132 L103 135 L100 144 L97 135 L88 132 L97 129 Z" fill="${C.yellow}"/>${[[40, 66], [160, 72], [150, 200], [44, 196]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="${P.ink}"/>`).join("")}${knob(70, 222, 11, 80, C.blue)}${knob(130, 222, 11, 40)}` },
    { slug: "noise", num: "XVIII", name: "The Noise Source", trad: "The Moon", accent: C.black, traits: ["ambient", "other"],
      kw: ["illusion", "the random", "dreams"],
      up: "White noise holds every sound at once. Sample it, hold it, and let chance pick the next note.",
      rev: "The randomness is fooling you. Some of what you heard was never there.",
      lore: "Sample and hold catches the noise at random moments and turns it into steps. Players swear the steps are trying to tell them something.",
      art: () => `${screen(30, 58, 140, 90, Array.from({ length: 140 }, (_, i) => `<rect x="${34 + ((i * 37) % 132)}" y="${62 + ((i * 53) % 82)}" width="1.6" height="1.6" fill="${P.glow}" opacity="${0.3 + ((i * 7) % 10) / 14}"/>`).join(""))}<path d="M126 168 A20 20 0 1 0 126 206 A15 15 0 1 1 126 168 Z" fill="${P.ink}"/><polyline points="34,226 54,226 54,206 74,206 74,236 94,236 94,214 114,214" fill="none" stroke="${C.orange}" stroke-width="2.4"/>` },
    { slug: "downbeat", num: "XIX", name: "The Downbeat", trad: "The Sun", accent: C.yellow, traits: ["groove", "popular"],
      kw: ["joy", "clarity", "the one"],
      up: "The kick lands on the one and everyone in the room knows where they are. Dance badly.",
      rev: "Too bright, too loud, too much. Take the low end down and let it breathe.",
      lore: "Every groove has a one. Find it and the rest of the bar organises itself around you like planets round a sun.",
      art: () => `<g class="pulse" style="transform-origin:100px 128px"><circle cx="100" cy="128" r="46" fill="${P.ink}"/><circle cx="100" cy="128" r="30" fill="#36342f"/><circle cx="100" cy="128" r="12" fill="${C.yellow}"/></g>${Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6; return `<line x1="${100 + Math.cos(a) * 56}" y1="${128 + Math.sin(a) * 56}" x2="${100 + Math.cos(a) * 68}" y2="${128 + Math.sin(a) * 68}" stroke="${C.orange}" stroke-width="3" stroke-linecap="round"/>`; }).join("")}${[0, 1, 2, 3].map((i) => led(58 + i * 28, 222, i === 0 ? C.red : C.yellow)).join("")}` },
    { slug: "update", num: "XX", name: "The Firmware Update", trad: "Judgement", accent: C.green, traits: ["vintage", "obscure"],
      kw: ["rebirth", "the call", "a new version"],
      up: "The call comes: flash it, restart, rise as something new. The old machine wakes with a new mind.",
      rev: "You keep ignoring the update. Back up first, then answer the call.",
      lore: "Some instruments are reborn many times. Their owners keep a cable by the bed for the night the new version comes out.",
      art: () => `<path d="M100 60 L100 132 M78 84 L100 60 L122 84" fill="none" stroke="${C.green}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>${screen(34, 148, 132, 40, `<rect x="42" y="160" width="116" height="16" rx="2" fill="none" stroke="${P.glow}"/><rect class="progress" x="44" y="162" width="112" height="12" fill="${P.glow}"/>`)}<rect x="88" y="204" width="24" height="16" rx="2" fill="${P.ink}"/><rect x="94" y="200" width="12" height="6" fill="${P.grey}"/>${cable(100, 220, 100, 240, P.ink, 4)}` },
    { slug: "bounce", num: "XXI", name: "The Bounce", trad: "The World", accent: C.orange, traits: ["popular"],
      kw: ["completion", "release", "the whole"],
      up: "The track is finished and bounced to a file. The world can hear it now.",
      rev: "Ninety per cent done for a year. Bounce it as it is and let it go into the world.",
      lore: "Bouncing the mix is the moment a patch stops being an experiment and becomes a song. Nobody remembers the cables afterwards; everybody remembers the song.",
      art: () => `<circle cx="100" cy="128" r="66" fill="${P.ink}"/>${[56, 46, 36].map((r) => `<circle cx="100" cy="128" r="${r}" fill="none" stroke="#3a3833" stroke-width="1.2"/>`).join("")}<circle cx="100" cy="128" r="20" fill="${C.orange}"/><circle cx="100" cy="128" r="3" fill="${P.white}"/>${wave("sine", 30, 222, 140, 22, P.ink, 7, 1.6)}` },
  ];
  CARDS.forEach((c) => { c.svg = panel(c.num, c.name, c.art(), c.accent); });
  return CARDS;
})();
