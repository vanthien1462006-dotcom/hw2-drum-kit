const MASTER_GAIN = 0.9;

const buffers = new Map();
const pendingLoads = new Map();
const activeSources = new Set();

let context = null;
let masterGain = null;

/**
 * Lazily creates the shared AudioContext and the master chain
 * (master gain -> compressor -> speakers).
 * @returns {AudioContext | null} The context, or null if Web Audio is unavailable.
 */
function getContext() {
  if (context) {
    return context;
  }
  try {
    const audioContext = new AudioContext();
    const compressor = audioContext.createDynamicsCompressor();
    const gain = audioContext.createGain();
    gain.gain.value = MASTER_GAIN;
    gain.connect(compressor);
    compressor.connect(audioContext.destination);
    context = audioContext;
    masterGain = gain;
  } catch {
    context = null;
    masterGain = null;
  }
  return context;
}

/**
 * Creates the AudioContext on first use and resumes it if the browser
 * suspended it (autoplay policy). Call it from a user gesture.
 * @returns {Promise<void>}
 */
export async function resumeAudio() {
  const audioContext = getContext();
  if (audioContext && audioContext.state === 'suspended') {
    await audioContext.resume();
  }
}

/**
 * Fetches and decodes a sample, then caches it by URL.
 * Concurrent calls for the same URL share one request.
 * @param {string} url Relative or same-origin URL of the audio file.
 * @returns {Promise<boolean>} True when the sample is ready, false on failure.
 */
export async function loadSample(url) {
  if (buffers.has(url)) {
    return true;
  }
  if (pendingLoads.has(url)) {
    return pendingLoads.get(url);
  }
  const audioContext = getContext();
  if (!audioContext) {
    return false;
  }
  const load = fetch(url)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.arrayBuffer();
    })
    .then((data) => audioContext.decodeAudioData(data))
    .then((buffer) => {
      buffers.set(url, buffer);
      return true;
    })
    .catch((error) => {
      console.warn(`Could not load sample "${url}": ${error.message}`);
      return false;
    })
    .finally(() => {
      pendingLoads.delete(url);
    });
  pendingLoads.set(url, load);
  return load;
}

/**
 * Plays a loaded sample. Every call creates a new source node, so
 * sounds overlap instead of cutting each other off. Never throws.
 * @param {string} url URL previously passed to loadSample.
 * @param {{ volume?: number }} [options] Playback options; volume defaults to 1.
 * @returns {boolean} True if the sound started, false otherwise.
 */
export function play(url, options = {}) {
  const buffer = buffers.get(url);
  if (!buffer || !context || !masterGain) {
    return false;
  }
  try {
    const volume = Number.isFinite(options.volume) ? Math.max(0, options.volume) : 1;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(masterGain);
    source.addEventListener(
      'ended',
      () => {
        activeSources.delete(source);
        source.disconnect();
        gain.disconnect();
      },
      { once: true },
    );
    activeSources.add(source);
    source.start();
    return true;
  } catch {
    return false;
  }
}

/**
 * Stops every sound that is currently playing.
 */
export function stopAll() {
  const sources = [...activeSources];
  activeSources.clear();
  for (const source of sources) {
    try {
      source.stop();
    } catch (error) {
      if (error.name !== 'InvalidStateError') {
        throw error;
      }
    }
  }
}
