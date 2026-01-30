/* ============================
   AUDIO SETUP
============================ */
const AudioContext = window.AudioContext || window.webkitAudioContext;
const ctx = new AudioContext();
const player = new WebAudioFontPlayer();
const masterGain = ctx.createGain();
masterGain.gain.value = 0.6;
masterGain.connect(ctx.destination);

const INSTRUMENTS = {
  piano: _tone_0000_FluidR3_GM_sf2_file,
  violin: _tone_0400_FluidR3_GM_sf2_file,
  viola: _tone_0410_FluidR3_GM_sf2_file,
  cello: _tone_0420_FluidR3_GM_sf2_file,
};

/* ============================
   STATE
============================ */
let mode = "piano";
let octaveOffset = 0;
let sustainTime = 0.5;
let fullRange = true;

const activeNotes = new Map();
const recorded = [];
let recording = false;
let recordStart = 0;

/* ============================
   RANGES (MIDI)
============================ */
const INSTRUMENT_RANGES = {
  piano: { min: 21, max: 108 },
  violin: { min: 55, max: 103 },
  viola: { min: 48, max: 91 },
  cello: { min: 36, max: 76 },
};

/* ============================
   KEY MAP
============================ */
const KEY_LAYOUT = "awsedftgyhujkolp;'";
const BASE_MIDI = 60;

function keyToMidi(key) {
  const idx = KEY_LAYOUT.indexOf(key);
  if (idx === -1) return null;
  return BASE_MIDI + idx + octaveOffset * 12;
}

/* ============================
   PIANO BUILD
============================ */
const pianoEl = document.getElementById("pianoKeyboard");

const WHITE_NOTES = [0, 2, 4, 5, 7, 9, 11];
const BLACK_MAP = { 1: 0.65, 3: 1.65, 6: 3.65, 8: 4.65, 10: 5.65 };

function buildPiano() {
  pianoEl.innerHTML = "";
  let whiteIndex = 0;

  const range = INSTRUMENT_RANGES[mode];

  for (let midi = range.min; midi <= range.max; midi++) {
    const note = midi % 12;

    if (WHITE_NOTES.includes(note)) {
      const key = document.createElement("div");
      key.className = "white-key";
      key.style.left = `${whiteIndex * 40}px`;
      key.dataset.midi = midi;
      key.onmousedown = () => play(midi);
      key.onmouseup = () => stop(midi);
      pianoEl.appendChild(key);
      whiteIndex++;
    } else if (BLACK_MAP[note] !== undefined) {
      const key = document.createElement("div");
      key.className = "black-key";
      key.style.left = `${(whiteIndex - 1 + BLACK_MAP[note]) * 40}px`;
      key.dataset.midi = midi;
      key.onmousedown = () => play(midi);
      key.onmouseup = () => stop(midi);
      pianoEl.appendChild(key);
    }
  }
}

/* ============================
   PLAY / STOP
============================ */
function play(midi) {
  if (activeNotes.has(midi)) return;

  const inst = INSTRUMENTS[mode];
  const gain = player.queueWaveTable(
    ctx,
    masterGain,
    inst,
    ctx.currentTime,
    midi,
    60,
    0.3,
  );

  activeNotes.set(midi, gain);
  highlight(midi, true);

  if (recording) {
    recorded.push({ midi, t: ctx.currentTime - recordStart, on: true });
  }
}

function stop(midi) {
  const g = activeNotes.get(midi);
  if (!g) return;

  g.gain.cancelScheduledValues(ctx.currentTime);
  g.gain.linearRampToValueAtTime(0, ctx.currentTime + sustainTime);

  activeNotes.delete(midi);
  highlight(midi, false);

  if (recording) {
    recorded.push({ midi, t: ctx.currentTime - recordStart, on: false });
  }
}

function highlight(midi, on) {
  document
    .querySelectorAll(`[data-midi="${midi}"]`)
    .forEach((k) => k.classList.toggle("active", on));
}

/* ============================
   KEYBOARD INPUT
============================ */
window.addEventListener("keydown", (e) => {
  if (e.repeat) return;

  if (e.key === "z") octaveOffset--;
  if (e.key === "x") octaveOffset++;

  const midi = keyToMidi(e.key);
  if (midi !== null) play(midi);
});

window.addEventListener("keyup", (e) => {
  const midi = keyToMidi(e.key);
  if (midi !== null) stop(midi);
});

/* ============================
   RECORDING
============================ */
document.getElementById("recordBtn").onclick = () => {
  recording = !recording;
  recorded.length = 0;
  recordStart = ctx.currentTime;
};

document.getElementById("playBtn").onclick = () => {
  recorded.forEach((ev) => {
    setTimeout(() => {
      ev.on ? play(ev.midi) : stop(ev.midi);
    }, ev.t * 1000);
  });
};

/* ============================
   CONTROLS
============================ */
document.getElementById("modeBtn").onclick = () => {
  const modes = Object.keys(INSTRUMENTS);
  mode = modes[(modes.indexOf(mode) + 1) % modes.length];
  document.getElementById("modeBtn").textContent = "Mode: " + mode;
  buildPiano();
};

document.getElementById("rangeBtn").onclick = () => {
  fullRange = !fullRange;
  document.getElementById("rangeBtn").textContent =
    "Range: " + (fullRange ? "Full" : "Compact");
  buildPiano();
};

/* ============================
   INIT
============================ */
buildPiano();
