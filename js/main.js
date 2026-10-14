import { resumeAudio, loadSample, play } from './audio-engine.js';
import { bindKeyboard } from './keyboard.js';

const SOUND_ATTR = 'data-sound';
const KEY_ATTR = 'data-key';

const ACTIVE_CLASS = 'active';
const ACTIVE_MS = 100;

const padGrid = document.querySelector('.pad-grid');
const activeTimers = new Map();

function findPad(key) {
  return document.querySelector(`[${KEY_ATTR}="${CSS.escape(key)}"]`);
}

function flashPad(pad) {
  clearTimeout(activeTimers.get(pad));
  pad.classList.add(ACTIVE_CLASS);
  activeTimers.set(
    pad,
    setTimeout(() => {
      pad.classList.remove(ACTIVE_CLASS);
      activeTimers.delete(pad);
    }, ACTIVE_MS),
  );
}

function triggerPad(pad) {
  play(pad.getAttribute(SOUND_ATTR));
  flashPad(pad);
}

for (const pad of document.querySelectorAll(`[${SOUND_ATTR}]`)) {
  loadSample(pad.getAttribute(SOUND_ATTR));
}

bindKeyboard((key) => {
  const pad = findPad(key);
  if (!pad) {
    return false;
  }
  triggerPad(pad);
  return true;
});

padGrid.addEventListener('click', (event) => {
  const pad = event.target.closest('.drum-pad');
  if (pad && padGrid.contains(pad)) {
    triggerPad(pad);
  }
});

window.addEventListener('pointerdown', resumeAudio, { once: true });
window.addEventListener('keydown', resumeAudio, { once: true });
