# The Flash Seer

A coin-op fortune cabinet for FM-1 owners. Put a coin in, answer seven strange questions, and the Flash Seer prints a
fortune ticket: three omens, your lucky MIDI channel, tempo, CC and waveform, and the firmware from The Firmware Hub
that you must flash.

- **Tilt:** the Tilt switch at the foot of the page (or `#tilt` on the address) rigs the machine: it always prescribes
  AISLING, leans the omens to the ambient ones, tilts the cabinet and lights a TILT lamp.
- **Hear her say it:** the browser's own voice on the site, Claude's voice in the claude.ai artifact.

## Build

```
python3 build.py        # dist/index.html (the site) and dist/artifact.html (the claude.ai page)
```

`src/data/firmwares.json` is a trimmed copy of The Firmware Hub's `catalog.json` (CC BY 4.0), dated in `build.py`.

## Deploy to seer.stephen8n.com (Cloudflare Pages)

From this folder, logged in to wrangler as for aisling.stephen8n.com:

```
python3 build.py
npx wrangler pages deploy dist --project-name seer --branch main
```

The first run creates the `seer` project. Then, once: Cloudflare dashboard > Workers & Pages > seer > Custom domains >
Set up a custom domain > `seer.stephen8n.com`. With stephen8n.com on the same account, Cloudflare adds the DNS record.
