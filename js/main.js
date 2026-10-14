import { resumeAudio, loadSample, play } from './audio-engine.js';
import { bindKeyboard } from './keyboard.js';
import { createRecorder } from './recorder.js';

const SOUND_ATTR = 'data-sound';
const KEY_ATTR = 'data-key';

const ACTIVE_CLASS = 'active';
const ACTIVE_MS = 100;

const padGrid = document.querySelector('.pad-grid');
const recStart = document.querySelector('#rec-start');
const recStop = document.querySelector('#rec-stop');
const recPlay = document.querySelector('#rec-play');
const recStatus = document.querySelector('#rec-status');
const activeTimers = new Map();
const recorder = createRecorder();

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

function hitPad(pad) {
  triggerPad(pad);
  recorder.record(pad.getAttribute(KEY_ATTR));
}

function replayKey(key) {
  const pad = findPad(key);
  if (pad) {
    triggerPad(pad);
  }
}

function showControls({ recording = false, playing = false } = {}) {
  const busy = recording || playing;
  recStart.disabled = busy;
  recStop.disabled = !busy;
  recPlay.disabled = busy || recorder.size() === 0;
}

function startRecording() {
  recorder.start();
  showControls({ recording: true });
  recStatus.textContent = 'Recording...';
}

function stopRecording() {
  recorder.stop();
  const count = recorder.size();
  showControls();
  recStatus.textContent = `Recorded ${count} ${count === 1 ? 'hit' : 'hits'}.`;
}

async function playRecording() {
  showControls({ playing: true });
  recStatus.textContent = 'Playing...';
  await recorder.play(replayKey);
  showControls();
  recStatus.textContent = 'Ready.';
}

function handleStop() {
  if (recorder.isRecording()) {
    stopRecording();
  } else {
    recorder.cancel();
  }
}

for (const pad of document.querySelectorAll(`[${SOUND_ATTR}]`)) {
  loadSample(pad.getAttribute(SOUND_ATTR));
}

bindKeyboard((key) => {
  const pad = findPad(key);
  if (!pad) {
    return false;
  }
  hitPad(pad);
  return true;
});

padGrid.addEventListener('click', (event) => {
  const pad = event.target.closest('.drum-pad');
  if (pad && padGrid.contains(pad)) {
    hitPad(pad);
  }
});

recStart.addEventListener('click', startRecording);
recStop.addEventListener('click', handleStop);
recPlay.addEventListener('click', playRecording);

window.addEventListener('pointerdown', resumeAudio, { once: true });
window.addEventListener('keydown', resumeAudio, { once: true });
