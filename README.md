# Web Drum Kit (HW2)

An electronic drum kit that runs in the browser. Play eight synthesized drum sounds with the keyboard, the mouse or touch, and record a short beat to play it back. It is built with vanilla HTML5, modern CSS and ES6+ JavaScript (ES modules) and the Web Audio API. There are no frameworks, npm packages, bundlers or CDNs. The layout is mobile-first and designed for a 375px screen first.

## Run it

Serve the folder with the **Live Server** extension and open `http://localhost:5500`.

Do not open `index.html` through `file:///`. ES modules and `fetch` for the audio files are blocked there, and the page's Content-Security-Policy is written for an HTTP origin.

Browsers keep audio locked until the first user gesture. Click the page or press a key once, then the pads will make sound.

## Key map

| Key | Pad | Sample |
|-----|-----|--------|
| A | Kick | `sounds/kick.wav` |
| S | Snare | `sounds/snare.wav` |
| D | Hi-hat | `sounds/hihat.wav` |
| F | Open hat | `sounds/openhat.wav` |
| G | Clap | `sounds/clap.wav` |
| H | Tom high | `sounds/tom-high.wav` |
| J | Tom low | `sounds/tom-low.wav` |
| K | Crash | `sounds/crash.wav` |

Holding a key plays the sound once. Ctrl/Alt/Meta combinations are ignored.

## Beat recorder

Press **Record**, hit some pads, then press **Stop**. **Play** replays the hits with their original timing. **Stop** also cancels a replay in progress. The recorder keeps at most 256 hits and drops the oldest one first (FIFO).

## Project structure

```text
index.html            Pads and recorder controls (the HTML data contract)
css/reset.css         box-sizing reset and base styles
css/tokens.css        Design tokens (the only file with color values)
css/layout.css        Page layout, pad grid, recorder controls
js/main.js            Wiring only; the only file that knows the attribute names
js/keyboard.js        keydown listener, no knowledge of audio
js/audio-engine.js    Web Audio API engine, no DOM access
js/recorder.js        FIFO queue and beat recorder, no audio or DOM
sounds/*.wav          Synthesized drum samples
tools/generate-sounds.py   Script that generates the samples
```

## Architecture

```text
index.html  (HTML data contract: data-key, data-sound on each pad)
     |
     v
js/main.js  (reads the attributes, connects everything)
     |
     +--> js/keyboard.js      key press  --> main.js callback
     |
     +--> js/audio-engine.js  play(url)   <-- main.js
     |
     +--> js/recorder.js      record(key) <-- main.js
                              play(cb)    --> main.js callback --> pad + sound
```

The modules never import each other. Only `main.js` imports them and passes data between them.

## HTML data contract

Each pad is a `<button>` inside a list item of `ul.pad-grid`:

```html
<button type="button" class="drum-pad" data-key="a" data-sound="sounds/kick.wav" aria-keyshortcuts="A">
  <kbd>A</kbd>
  <span class="pad-name">Kick</span>
</button>
```

`data-key` is always one lowercase letter and `data-sound` is the sample URL. All configuration lives in the HTML, and the JavaScript has no `switch` over keys.

## Synthesized sounds

The samples are generated, not recorded. The script uses only the Python 3 standard library and a fixed random seed, so it always produces the same files.

```text
python tools/generate-sounds.py
```

It writes eight mono, 16-bit, 44100 Hz `.wav` files into `sounds/` and prints each file name, length and size. Edit the frequencies and decay times in the script to change a sound, then run it again.

## Live defense cheat sheet

### Test A: rename `data-sound` to `data-audio-src`

| Where | Change |
|-------|--------|
| `js/main.js` | Set `SOUND_ATTR = 'data-audio-src'` (1 line) |
| `index.html` | Rename the attribute on the 8 pads |

Why it is quick: `main.js` is the only JavaScript file that knows the attribute name. The audio engine only receives a URL string, and the keyboard module never sees pads.

### Test B: Space stops all sound

| Where | Change |
|-------|--------|
| `js/main.js` | In the `bindKeyboard` callback, add a branch: if `key === ' '`, call `stopAll()` and return `true` |
| `js/main.js` | Add `stopAll` to the import from `./audio-engine.js` |

Why it is quick: `stopAll()` already exists in the engine, and `keyboard.js` passes every key through to the callback. Returning `true` makes the keyboard module call `preventDefault()`, so the page does not scroll. No HTML or CSS changes.

### Test C: container query instead of `repeat(auto-fit, minmax(...))`

| Where | Change |
|-------|--------|
| `index.html` | Wrap `ul.pad-grid` in an element (or reuse its parent `section`) |
| `css/layout.css` | Give that element `container-type: inline-size` and replace the `repeat(auto-fit, minmax(...))` columns with `@container` rules for the column count |

Why it is quick: the grid is pure CSS in one file. JavaScript only finds pads by their data attributes and does not depend on the layout.

### Test D: change the key of a pad

| Where | Change |
|-------|--------|
| `index.html` | Edit `data-key`, `aria-keyshortcuts` and the `<kbd>` label of that pad |

Why it is quick: `main.js` looks up the pad by `data-key` when a key is pressed, so there is no key table in the JavaScript to update.

## Why these changes are small

- Configuration lives in HTML data attributes, not in JavaScript.
- Each module has one job: `keyboard.js` only reads keys, `audio-engine.js` only plays URLs, `recorder.js` only stores and replays events.
- Only `main.js` knows the attribute names and connects the modules.
- All colors, spacing and sizes are design tokens, so layout changes do not touch colors.
