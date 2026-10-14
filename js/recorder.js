const DEFAULT_MAX_EVENTS = 256;

/**
 * Creates a bounded FIFO queue. When it is full, enqueue drops the oldest item.
 * @param {number} [maxEvents] Maximum number of items kept.
 * @returns {{ enqueue: (item: any) => void, dequeue: () => any, size: () => number,
 *   toArray: () => any[], clear: () => void }}
 */
export function createQueue(maxEvents = DEFAULT_MAX_EVENTS) {
  const limit = Number.isInteger(maxEvents) && maxEvents > 0 ? maxEvents : DEFAULT_MAX_EVENTS;
  const items = [];

  return {
    enqueue(item) {
      items.push(item);
      if (items.length > limit) {
        items.shift();
      }
    },
    dequeue() {
      return items.shift();
    },
    size() {
      return items.length;
    },
    toArray() {
      return [...items];
    },
    clear() {
      items.length = 0;
    },
  };
}

/**
 * Records key hits with their timing and replays them. Knows nothing about
 * audio or the DOM: replay hands each key back through a callback.
 * @param {{ maxEvents?: number }} [options]
 * @returns {{ start: () => void, stop: () => void, record: (key: string) => void,
 *   play: (onEvent: (key: string) => void) => Promise<void>, cancel: () => void,
 *   isRecording: () => boolean, size: () => number }}
 */
export function createRecorder(options = {}) {
  const queue = createQueue(options.maxEvents);
  let recording = false;
  let startTime = 0;
  let timer = null;
  let finishPlayback = null;

  function start() {
    queue.clear();
    startTime = performance.now();
    recording = true;
  }

  function stop() {
    recording = false;
  }

  function record(key) {
    if (!recording) {
      return;
    }
    queue.enqueue({ key, t: performance.now() - startTime });
  }

  function cancel() {
    clearTimeout(timer);
    timer = null;
    if (finishPlayback) {
      finishPlayback();
    }
  }

  function play(onEvent) {
    if (finishPlayback) {
      return Promise.resolve();
    }
    const snapshot = queue.toArray();
    if (snapshot.length === 0) {
      return Promise.resolve();
    }
    const replay = createQueue(snapshot.length);
    for (const event of snapshot) {
      replay.enqueue(event);
    }
    const offset = snapshot[0].t;

    return new Promise((resolve) => {
      const playStart = performance.now();

      finishPlayback = () => {
        finishPlayback = null;
        resolve();
      };

      function scheduleNext() {
        if (!finishPlayback) {
          return;
        }
        if (replay.size() === 0) {
          finishPlayback();
          return;
        }
        const event = replay.dequeue();
        const delay = Math.max(0, playStart + (event.t - offset) - performance.now());
        timer = setTimeout(() => {
          timer = null;
          onEvent(event.key);
          scheduleNext();
        }, delay);
      }

      scheduleNext();
    });
  }

  return {
    start,
    stop,
    record,
    play,
    cancel,
    isRecording: () => recording,
    size: () => queue.size(),
  };
}
