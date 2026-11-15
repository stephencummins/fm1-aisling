# The Flash Seer

A fortune booth for FM-1 owners. The Bean Feasa asks seven strange questions, deals three cards and tells you which
firmware from The Firmware Hub to flash. Two decks: the Celtic Mythology deck of [Sídhe](https://sidhe.stephen8n.com)
and the Voltage Arcana, a synth Major Arcana drawn in `src/voltage.js`.

- **Tilt:** the Tilt switch at the foot of the page (or `#tilt` on the address) rigs the machine: it always prescribes
  AISLING, leans the cards to the ambient ones, and lights a TILT lamp on the case.
- **The full reading:** on seer.stephen8n.com it comes from Sídhe's engine through `functions/api/reading.js`
  (the engine sends no CORS headers, so the page can't call it directly). In the claude.ai artifact it comes from Claude.
- **Speak it aloud:** the browser's own voice on the site, Claude's voice in the artifact.

## Build

```
python3 build.py        # dist/index.html (the site), dist/artifact.html (the claude.ai page), dist/cards, dist/img
```

`src/data/firmwares.json` is a trimmed copy of The Firmware Hub's `catalog.json` (CC BY 4.0), dated in `build.py`.
`src/data/sidhe-majors.json` and `assets/cards/` come from Sídhe's Celtic Mythology deck (its `/api/decks/.../cards`).

## Deploy to seer.stephen8n.com (Cloudflare Pages)

From this folder, logged in to wrangler as for aisling.stephen8n.com:

```
python3 build.py
npx wrangler pages deploy dist --project-name seer --branch main
```

The first run creates the `seer` project. Then, once: Cloudflare dashboard > Workers & Pages > seer > Custom domains >
Set up a custom domain > `seer.stephen8n.com`. With stephen8n.com on the same account, Cloudflare adds the DNS record.
