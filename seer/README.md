# The Flash Seer

A coin-op fortune cabinet for FM-1 owners, in the Celtic night colours of Sídhe. Put a coin in and an animatronic
seer (a porcelain mask in a hood, with a hinged chin, wandering eyes and hands that circle her crystal ball) asks seven
strange questions to spooky music. Then, as the visitor chose at the top:

- **The machine:** the bulbs go mad and a card pops out of the slot: a card of the Voltage Arcana, a synth Major
  Arcana, with the firmware from The Firmware Hub you must flash printed at its foot.
- **The reading:** three cards of Sídhe's Celtic Mythology deck slide out of the slot and turn over one by one (what
  hums in you, what you seek, what you must flash); she names each, the page gives their Celtic meanings and myths,
  and the cards name the firmware.

- **The Voltage Arcana** is drawn in `src/voltage.js`: 22 module panels from The First Patch (0) to The Bounce (XXI),
  each with its meaning and lore. Your answers decide which cards come out, and which firmware.
- **Tilt:** the Tilt switch at the foot of the page (or `#tilt` on the address) rigs the machine: it always prescribes
  AISLING, deals the ambient cards in both modes, tilts the cabinet and lights a TILT lamp. Now and then the seer winks.
- **Sound:** FM bells, a drone in D with a music box and a theremin, all made in the browser; her lines spoken by the
  browser's voice on the site (Claude's voice in the claude.ai artifact). One switch turns it all off.

## Build

```
python3 build.py        # dist/index.html (the site), dist/artifact.html (the claude.ai page), dist/cards, dist/img
```

`src/data/firmwares.json` is a trimmed copy of The Firmware Hub's `catalog.json` (CC BY 4.0), dated in `build.py`.
The knotwork, the card back and the Celtic cards in `assets/` (and their meanings and myths in
`src/data/sidhe-majors.json`) are Sídhe's.

## Deploy to seer.stephen8n.com (Cloudflare Pages)

```
python3 build.py
npx wrangler pages deploy dist --project-name seer --branch main
```
