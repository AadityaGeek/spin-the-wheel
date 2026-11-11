// DOM Element References
const canvas = document.getElementById("wheelCanvas");
const ctx = canvas.getContext("2d");
const optionInput = document.getElementById("optionInput");
const addOptionBtn = document.getElementById("addOptionBtn");
const spinBtn = document.getElementById("spinBtn");
const spinBtnText = document.getElementById("spinBtnText");
const spinIcon = document.getElementById("spinIcon");
const optionList = document.getElementById("optionList");
const optionsCountBadge = document.getElementById("optionsCountBadge");
const totalWeightLabel = document.getElementById("totalWeightLabel");
const pointerWrapper = document.getElementById("pointerWrapper");

// Header & Utility Controls
const soundToggleBtn = document.getElementById("soundToggleBtn");
const soundOnIcon = document.getElementById("soundOnIcon");
const soundOffIcon = document.getElementById("soundOffIcon");
const shuffleBtn = document.getElementById("shuffleBtn");
const resetBtn = document.getElementById("resetBtn");

// Modal Elements
const resultModal = document.getElementById("resultModal");
const modalCard = document.getElementById("modalCard");
const modalIcon = document.getElementById("modalIcon");
const modalTitle = document.getElementById("modalTitle");
const resultSubtitle = document.getElementById("resultSubtitle");
const resultText = document.getElementById("resultText");
const resultHighlight = document.getElementById("resultHighlight");
const closeModalBtn = document.getElementById("closeModalBtn");

// Confetti Particle Canvas
const confettiCanvas = document.getElementById("confettiCanvas");
const confettiCtx = confettiCanvas ? confettiCanvas.getContext("2d") : null;
let confettiParticles = [];
let confettiAnimId = null;

// Initial Default Options & Presets
const DEFAULT_OPTIONS = [
  { text: "Spin Again", weight: 1 },
  { text: "Next Time", weight: 1 },
  { text: "Big Prize!", weight: 1 },
  { text: "Small Gift", weight: 1 },
  { text: "Good Luck", weight: 1 },
];

const PRESETS = {
  raffle: [
    { text: "Spin Again", weight: 1 },
    { text: "Next Time", weight: 1 },
    { text: "Big Prize!", weight: 1 },
    { text: "Small Gift", weight: 1 },
    { text: "Good Luck", weight: 1 },
  ],
  yesno: [
    { text: "Yes!", weight: 1 },
    { text: "No", weight: 1 },
    { text: "Maybe", weight: 1 },
    { text: "Definitely", weight: 1 },
    { text: "Ask Again", weight: 1 },
  ],
  dice: [
    { text: "One (1)", weight: 1 },
    { text: "Two (2)", weight: 1 },
    { text: "Three (3)", weight: 1 },
    { text: "Four (4)", weight: 1 },
    { text: "Five (5)", weight: 1 },
    { text: "Six (6)", weight: 1 },
  ],
  dinner: [
    { text: "Pizza", weight: 1 },
    { text: "Burgers", weight: 1 },
    { text: "Sushi", weight: 1 },
    { text: "Tacos", weight: 1 },
    { text: "Pasta", weight: 1 },
    { text: "Salad", weight: 1 },
  ],
  team: [
    { text: "Alex", weight: 1 },
    { text: "Jordan", weight: 1 },
    { text: "Taylor", weight: 1 },
    { text: "Morgan", weight: 1 },
  ],
};

function saveOptionsToStorage() {
  try {
    localStorage.setItem("spin_wheel_options", JSON.stringify(options));
  } catch {}
}

function loadOptionsFromStorage() {
  try {
    const saved = localStorage.getItem("spin_wheel_options");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return JSON.parse(JSON.stringify(DEFAULT_OPTIONS));
}

// Wheel State
let options = loadOptionsFromStorage();
let currentRotationAngle = 0; // In radians
let arc = 0;
let isSpinning = false;
let editingIndex = null; // Track which option is in edit mode
let virtualCanvasSize = 440; // Virtual drawing resolution
let winningHighlightIndex = null; // Flash winning slice on completion

// Audio State (persisted in localStorage)
let isMuted = localStorage.getItem("spin_wheel_muted") === "true";
let audioCtx = null;

function updateSoundToggleUI() {
  if (isMuted) {
    soundOnIcon.classList.add("hidden");
    soundOffIcon.classList.remove("hidden");
  } else {
    soundOnIcon.classList.remove("hidden");
    soundOffIcon.classList.add("hidden");
  }
}
updateSoundToggleUI();

if (soundToggleBtn) {
  soundToggleBtn.addEventListener("click", () => {
    isMuted = !isMuted;
    localStorage.setItem("spin_wheel_muted", isMuted ? "true" : "false");
    updateSoundToggleUI();
  });
}

// Modern, high-contrast 16-color palette
const colors = [
  "#4F46E5", // Indigo
  "#EC4899", // Pink
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#8B5CF6", // Violet
  "#06B6D4", // Cyan
  "#EF4444", // Red
  "#14B8A6", // Teal
  "#F97316", // Orange
  "#3B82F6", // Blue
  "#84CC16", // Lime
  "#D946EF", // Fuchsia
  "#E11D48", // Rose
  "#0EA5E9", // Sky
  "#D97706", // Dark Amber
  "#6366F1", // Bright Indigo
];

// Web Audio API Synthesizer (Zero Dependencies)
function getAudioContext() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// Mechanical Tick Sound (Wheel Flapper Striking Peg)
function playTickSound() {
  if (isMuted) return;
  try {
    const ctxAudio = getAudioContext();
    if (!ctxAudio) return;

    const osc = ctxAudio.createOscillator();
    const gain = ctxAudio.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(680, ctxAudio.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, ctxAudio.currentTime + 0.035);

    gain.gain.setValueAtTime(0.09, ctxAudio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctxAudio.currentTime + 0.035);

    osc.connect(gain);
    gain.connect(ctxAudio.destination);

    osc.start();
    osc.stop(ctxAudio.currentTime + 0.035);
  } catch {
    // Non-fatal if audio is blocked by browser policy
  }
}

// Winner Fanfare Chime (Joyful 4-Note Arpeggio)
function playWinFanfare() {
  if (isMuted) return;
  try {
    const ctxAudio = getAudioContext();
    if (!ctxAudio) return;

    const now = ctxAudio.currentTime;
    const chord = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    chord.forEach((freq, idx) => {
      const osc = ctxAudio.createOscillator();
      const gain = ctxAudio.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.1);

      gain.gain.setValueAtTime(0, now + idx * 0.1);
      gain.gain.linearRampToValueAtTime(0.12, now + idx * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.5);

      osc.connect(gain);
      gain.connect(ctxAudio.destination);

      osc.start(now + idx * 0.1);
      osc.stop(now + idx * 0.1 + 0.5);
    });
  } catch {
    // Non-fatal
  }
}

// Trigger pointer wiggle animation
function triggerPointerTick() {
  if (!pointerWrapper) return;
  pointerWrapper.classList.remove("tick");
  void pointerWrapper.offsetWidth; // Force browser reflow to restart CSS animation
  pointerWrapper.classList.add("tick");
}

// Confetti Particle Explosion
function resizeConfetti() {
  if (!confettiCanvas) return;
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeConfetti);
resizeConfetti();

function triggerConfetti() {
  if (!confettiCanvas || !confettiCtx) return;
  resizeConfetti();
  confettiParticles = [];

  const count = 90;
  const confettiColors = [
    "#6366F1", "#EC4899", "#F59E0B", "#10B981",
    "#3B82F6", "#8B5CF6", "#EF4444", "#FACC15"
  ];

  for (let i = 0; i < count; i++) {
    confettiParticles.push({
      x: window.innerWidth * (0.35 + Math.random() * 0.3),
      y: window.innerHeight * 0.42,
      vx: (Math.random() - 0.5) * 18,
      vy: -Math.random() * 15 - 5,
      size: Math.random() * 8 + 4,
      color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      gravity: 0.38,
      opacity: 1,
    });
  }

  if (confettiAnimId) cancelAnimationFrame(confettiAnimId);

  function renderConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    let active = false;

    for (let p of confettiParticles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      p.rotation += p.rotSpeed;
      p.opacity -= 0.0075;

      if (p.opacity > 0 && p.y < confettiCanvas.height + 20) {
        active = true;
        confettiCtx.save();
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate((p.rotation * Math.PI) / 180);
        confettiCtx.fillStyle = p.color;
        confettiCtx.globalAlpha = Math.max(0, p.opacity);
        confettiCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        confettiCtx.restore();
      }
    }

    if (active) {
      confettiAnimId = requestAnimationFrame(renderConfetti);
    } else {
      confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  renderConfetti();
}

/**
 * Configure Canvas resolution for High-DPI (Retina) displays.
 */
function resizeCanvas() {
  const container = canvas.parentElement;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const size = Math.floor(rect.width) || 440;
  if (size <= 0) return;

  virtualCanvasSize = size;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(size * dpr);
  canvas.height = Math.floor(size * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  drawWheelCanvas();
}

/**
 * Render the wheel on the canvas.
 * High-performance 60fps render with dedicated outer rim track and polished metallic striker pins.
 */
function drawWheelCanvas() {
  const size = virtualCanvasSize;
  const cx = size / 2;
  const cy = size / 2;
  const outsideRadius = Math.max(10, cx - 8);
  const rimThickness = 14;
  const sliceRadius = outsideRadius - rimThickness; // Wedge slices cleanly bounded within rim
  const insideRadius = 26;
  const pegRadius = outsideRadius - rimThickness / 2; // Striker pins sit perfectly centered on the rim

  ctx.clearRect(0, 0, size, size);

  // Update arc
  arc = options.length > 0 ? (2 * Math.PI) / options.length : 0;

  // Handle empty wheel
  if (options.length === 0) {
    ctx.beginPath();
    ctx.arc(cx, cy, outsideRadius, 0, 2 * Math.PI);
    ctx.fillStyle = "#F8FAFC";
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#CBD5E1";
    ctx.stroke();

    ctx.fillStyle = "#64748B";
    ctx.font = "bold 16px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Add Options to Spin!", cx, cy);
    return;
  }

  // 1. Draw Sector Slices
  for (let i = 0; i < options.length; i++) {
    const angle = currentRotationAngle + i * arc;
    const baseColor = colors[i % colors.length];

    // Sector slice path bounded by sliceRadius
    ctx.beginPath();
    ctx.arc(cx, cy, sliceRadius, angle, angle + arc, false);
    ctx.arc(cx, cy, insideRadius, angle + arc, angle, true);
    ctx.closePath();

    // Radial depth gradient
    const sliceGrad = ctx.createRadialGradient(cx, cy, insideRadius, cx, cy, sliceRadius);
    sliceGrad.addColorStop(0, adjustBrightness(baseColor, 15));
    sliceGrad.addColorStop(1, baseColor);
    ctx.fillStyle = sliceGrad;
    ctx.fill();

    // Winning slice glowing flash
    if (winningHighlightIndex === i) {
      ctx.save();
      ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
      ctx.fill();
      ctx.restore();
    }

    // Clean white dividing line between slices
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * insideRadius, cy + Math.sin(angle) * insideRadius);
    ctx.lineTo(cx + Math.cos(angle) * sliceRadius, cy + Math.sin(angle) * sliceRadius);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.65)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Slice Text (Radial layout from outer edge inwards)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle + arc / 2);

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#FFFFFF";

    // Text drop shadow for legibility
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    // Dynamically scale font size based on slice count
    const baseFontSize = Math.max(11, Math.min(15, Math.floor(arc * 50)));
    ctx.font = `bold ${baseFontSize}px Inter, sans-serif`;

    let text = options[i].text;
    const maxAvailableWidth = sliceRadius - insideRadius - 20;

    // Truncate text with ellipsis if it exceeds radial space
    if (ctx.measureText(text).width > maxAvailableWidth) {
      while (text.length > 0 && ctx.measureText(text + "...").width > maxAvailableWidth) {
        text = text.slice(0, -1);
      }
      text += "...";
    }

    ctx.fillText(text, sliceRadius - 12, 0);
    ctx.restore();
  }

  // 2. Outer Bezel & Dedicated Striker Rim Track
  ctx.save();
  // Outer rim band fill
  ctx.beginPath();
  ctx.arc(cx, cy, outsideRadius, 0, 2 * Math.PI, false);
  ctx.arc(cx, cy, sliceRadius, 0, 2 * Math.PI, true);
  ctx.fillStyle = "#0F172A"; // Dark luxury bezel
  ctx.fill();

  // Outer edge border
  ctx.beginPath();
  ctx.arc(cx, cy, outsideRadius, 0, 2 * Math.PI);
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#1E293B";
  ctx.stroke();

  // Inner track border dividing rim from slices
  ctx.beginPath();
  ctx.arc(cx, cy, sliceRadius, 0, 2 * Math.PI);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.stroke();
  ctx.restore();

  // 3. Polished Metallic Striker Pins on the Rim
  const pegSize = Math.max(3.2, Math.min(4.5, Math.floor(outsideRadius * 0.021)));

  for (let i = 0; i < options.length; i++) {
    const dividerAngle = currentRotationAngle + i * arc;
    const px = cx + Math.cos(dividerAngle) * pegRadius;
    const py = cy + Math.sin(dividerAngle) * pegRadius;

    // Hairline tick on the rim aligning divider to the pin
    ctx.beginPath();
    ctx.moveTo(
      cx + Math.cos(dividerAngle) * sliceRadius,
      cy + Math.sin(dividerAngle) * sliceRadius
    );
    ctx.lineTo(
      cx + Math.cos(dividerAngle) * outsideRadius,
      cy + Math.sin(dividerAngle) * outsideRadius
    );
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // 1. Subtle peg drop shadow
    ctx.beginPath();
    ctx.arc(px, py + 1.2, pegSize, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fill();

    // 2. Polished Chrome Metallic Body
    ctx.beginPath();
    ctx.arc(px, py, pegSize, 0, 2 * Math.PI);
    const pegGrad = ctx.createRadialGradient(
      px - pegSize * 0.35,
      py - pegSize * 0.35,
      pegSize * 0.1,
      px,
      py,
      pegSize
    );
    pegGrad.addColorStop(0, "#FFFFFF");
    pegGrad.addColorStop(0.3, "#F8FAFC");
    pegGrad.addColorStop(0.7, "#94A3B8");
    pegGrad.addColorStop(1, "#334155");
    ctx.fillStyle = pegGrad;
    ctx.fill();

    ctx.strokeStyle = "#1E293B";
    ctx.lineWidth = 1;
    ctx.stroke();

    // 3. Crisp specular glint
    ctx.beginPath();
    ctx.arc(px - pegSize * 0.28, py - pegSize * 0.28, pegSize * 0.26, 0, 2 * Math.PI);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
  }

  // 4. Center Hub (Luxury Concentric Metallic Boss)
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, insideRadius, 0, 2 * Math.PI);
  ctx.fillStyle = "#0F172A";
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.stroke();

  // Silver middle ring
  ctx.beginPath();
  ctx.arc(cx, cy, insideRadius - 6, 0, 2 * Math.PI);
  ctx.fillStyle = "#334155";
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "#E2E8F0";
  ctx.stroke();

  // Inner center chrome jewel
  ctx.beginPath();
  ctx.arc(cx, cy, 7, 0, 2 * Math.PI);
  const knobGrad = ctx.createRadialGradient(cx - 2, cy - 2, 1, cx, cy, 7);
  knobGrad.addColorStop(0, "#FFFFFF");
  knobGrad.addColorStop(0.5, "#E2E8F0");
  knobGrad.addColorStop(1, "#64748B");
  ctx.fillStyle = knobGrad;
  ctx.fill();
  ctx.restore();
}

/**
 * Utility: Adjust HEX color brightness for radial depth
 */
function adjustBrightness(hex, percent) {
  let num = parseInt(hex.replace("#", ""), 16);
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00ff) + percent;
  let b = (num & 0x0000ff) + percent;
  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Update the options list in the DOM.
 */
function renderOptionList() {
  optionList.innerHTML = "";

  const totalWeight = options.reduce(
    (sum, opt) => sum + (Number(opt.weight) || 1),
    0
  );

  // Update badges
  optionsCountBadge.textContent = `${options.length}/16`;
  totalWeightLabel.textContent = `(wt: ${totalWeight.toFixed(1).replace(/\.0$/, "")})`;
  spinBtn.disabled = options.length === 0 || isSpinning;

  options.forEach((option, index) => {
    const li = document.createElement("li");
    li.className =
      "flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 hover:border-indigo-200 transition-colors gap-2 text-sm shadow-xs";

    const color = colors[index % colors.length];

    if (editingIndex === index) {
      // --- INLINE EDIT MODE ---
      li.classList.add("ring-2", "ring-indigo-500", "bg-indigo-50/20");

      const formWrapper = document.createElement("div");
      formWrapper.className = "flex items-center gap-1.5 w-full";

      // Color swatch
      const swatch = document.createElement("span");
      swatch.className = "w-3 h-3 rounded-full flex-shrink-0";
      swatch.style.backgroundColor = color;
      formWrapper.appendChild(swatch);

      // Text input
      const textInput = document.createElement("input");
      textInput.type = "text";
      textInput.value = option.text;
      textInput.maxLength = 32;
      textInput.className =
        "flex-1 min-w-0 px-2 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium";

      // Weight input
      const weightInput = document.createElement("input");
      weightInput.type = "number";
      weightInput.value = option.weight;
      weightInput.min = "0.1";
      weightInput.step = "0.5";
      weightInput.title = "Weight";
      weightInput.className =
        "w-14 px-1.5 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 text-center font-medium";

      // Save button
      const saveBtn = document.createElement("button");
      saveBtn.className =
        "p-1 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors flex-shrink-0";
      saveBtn.setAttribute("aria-label", "Save option");
      saveBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
        </svg>
      `;

      // Cancel button
      const cancelBtn = document.createElement("button");
      cancelBtn.className =
        "p-1 text-slate-400 hover:bg-slate-100 rounded-md transition-colors flex-shrink-0";
      cancelBtn.setAttribute("aria-label", "Cancel editing");
      cancelBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      `;

      const commitSave = () => {
        const newText = textInput.value.trim().slice(0, 32);
        const newWeight = parseFloat(weightInput.value);

        if (!newText) {
          showModal({
            title: "Invalid Text",
            message: "Option label cannot be empty.",
            isWinner: false,
          });
          return;
        }

        if (isNaN(newWeight) || newWeight <= 0) {
          showModal({
            title: "Invalid Weight",
            message: "Please enter a positive number for weight.",
            isWinner: false,
          });
          return;
        }

        option.text = newText;
        option.weight = newWeight;
        editingIndex = null;
        saveOptionsToStorage();
        renderOptionList();
        drawWheelCanvas();
      };

      const cancelEdit = () => {
        editingIndex = null;
        renderOptionList();
      };

      saveBtn.addEventListener("click", commitSave);
      cancelBtn.addEventListener("click", cancelEdit);

      textInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") commitSave();
        if (e.key === "Escape") cancelEdit();
      });
      weightInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") commitSave();
        if (e.key === "Escape") cancelEdit();
      });

      formWrapper.appendChild(textInput);
      formWrapper.appendChild(weightInput);
      formWrapper.appendChild(saveBtn);
      formWrapper.appendChild(cancelBtn);
      li.appendChild(formWrapper);

      setTimeout(() => textInput.focus(), 20);
    } else {
      // --- DISPLAY MODE ---
      const leftCol = document.createElement("div");
      leftCol.className = "flex items-center gap-2 min-w-0 flex-1";

      // Color Swatch
      const swatch = document.createElement("span");
      swatch.className = "w-3 h-3 rounded-full flex-shrink-0";
      swatch.style.backgroundColor = color;
      leftCol.appendChild(swatch);

      // Label text
      const textSpan = document.createElement("span");
      textSpan.className = "text-slate-700 font-medium truncate flex-1";
      textSpan.textContent = option.text;
      textSpan.title = option.text;
      leftCol.appendChild(textSpan);

      // Probability percentage badge
      const probPct =
        totalWeight > 0
          ? ((Number(option.weight || 1) / totalWeight) * 100).toFixed(1)
          : 0;
      const probBadge = document.createElement("span");
      probBadge.className =
        "text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md flex-shrink-0";
      probBadge.textContent = `${probPct}%`;
      leftCol.appendChild(probBadge);

      li.appendChild(leftCol);

      // Right action buttons (Edit & Remove)
      const actionsWrapper = document.createElement("div");
      actionsWrapper.className = "flex items-center gap-0.5 flex-shrink-0";

      // Edit Button
      const editBtn = document.createElement("button");
      editBtn.className =
        "p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors";
      editBtn.setAttribute("aria-label", `Edit ${option.text}`);
      editBtn.disabled = isSpinning;
      editBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      `;
      editBtn.addEventListener("click", () => {
        if (isSpinning) return;
        editingIndex = index;
        renderOptionList();
      });

      // Remove Button
      const removeBtn = document.createElement("button");
      removeBtn.className =
        "p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors";
      removeBtn.setAttribute("aria-label", `Remove ${option.text}`);
      removeBtn.disabled = isSpinning;
      removeBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      `;
      removeBtn.addEventListener("click", () => {
        if (isSpinning) return;
        options.splice(index, 1);
        if (editingIndex === index) editingIndex = null;
        saveOptionsToStorage();
        renderOptionList();
        drawWheelCanvas();
      });

      actionsWrapper.appendChild(editBtn);
      actionsWrapper.appendChild(removeBtn);
      li.appendChild(actionsWrapper);
    }

    optionList.appendChild(li);
  });
}

// Utility: Shuffle Options Order
if (shuffleBtn) {
  shuffleBtn.addEventListener("click", () => {
    if (isSpinning || options.length <= 1) return;
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    saveOptionsToStorage();
    renderOptionList();
    drawWheelCanvas();
  });
}

// Utility: Reset to Defaults
if (resetBtn) {
  resetBtn.addEventListener("click", () => {
    if (isSpinning) return;
    options = JSON.parse(JSON.stringify(DEFAULT_OPTIONS));
    editingIndex = null;
    const presetSelect = document.getElementById("presetSelect");
    if (presetSelect) presetSelect.value = "";
    saveOptionsToStorage();
    renderOptionList();
    drawWheelCanvas();
  });
}

// Utility: Presets Template Selector
const presetSelect = document.getElementById("presetSelect");
if (presetSelect) {
  presetSelect.addEventListener("change", (e) => {
    if (isSpinning) return;
    const val = e.target.value;
    if (PRESETS[val]) {
      options = JSON.parse(JSON.stringify(PRESETS[val]));
      editingIndex = null;
      saveOptionsToStorage();
      renderOptionList();
      drawWheelCanvas();
    }
  });
}

// Modal Icons (Clean modern SVG icons)
const MODAL_ICONS = {
  trophy: `
    <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M5 3h14a2 2 0 012 2v2a6 6 0 01-5 5.91V16h2a2 2 0 012 2v2H4v-2a2 2 0 012-2h2v-3.09A6 6 0 013 7V5a2 2 0 012-2zM3 7a4 4 0 004 4m14-4a4 4 0 01-4 4" />
    </svg>
  `,
  warning: `
    <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  `,
};

/**
 * Unified Modal System for Winners and Alerts
 */
function showModal({ title, subtitle, message, isWinner = false }) {
  modalTitle.textContent = title;
  modalIcon.innerHTML = isWinner ? MODAL_ICONS.trophy : MODAL_ICONS.warning;
  resultSubtitle.textContent = subtitle || (isWinner ? "Winning Option" : "Notice");
  resultText.textContent = message;

  if (isWinner) {
    modalIcon.className =
      "w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 shadow-sm";
    resultHighlight.className =
      "bg-indigo-50/80 border border-indigo-200 text-indigo-700 py-3.5 px-4 rounded-2xl break-words shadow-inner";
    resultText.className = "text-xl sm:text-2xl font-black";
    triggerConfetti();
    playWinFanfare();
  } else {
    modalIcon.className =
      "w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-4 shadow-sm";
    resultHighlight.className =
      "bg-slate-50 border border-slate-200 text-slate-700 py-3 px-4 rounded-2xl break-words";
    resultText.className = "text-sm sm:text-base font-semibold";
  }

  resultModal.classList.add("show");
  closeModalBtn.focus();
}

function hideModal() {
  resultModal.classList.remove("show");
  winningHighlightIndex = null;
  drawWheelCanvas();
}

// Add Option Handler
function handleAddOption() {
  if (isSpinning) return;

  const text = optionInput.value.trim();
  if (!text) {
    showModal({
      title: "Input Required",
      message: "Please enter an option name before adding.",
      isWinner: false,
    });
    return;
  }

  if (options.length >= 16) {
    showModal({
      title: "Limit Reached",
      message: "The wheel supports a maximum of 16 options.",
      isWinner: false,
    });
    return;
  }

  options.push({ text: text.slice(0, 32), weight: 1 });
  optionInput.value = "";
  saveOptionsToStorage();
  renderOptionList();
  drawWheelCanvas();
}

addOptionBtn.addEventListener("click", handleAddOption);
optionInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleAddOption();
});

/**
 * Spin Animation Logic
 */
let spinAnimFrame = null;

function spin() {
  if (isSpinning) return;

  if (options.length === 0) {
    showModal({
      title: "Wheel Empty",
      message: "Please add at least one option before spinning!",
      isWinner: false,
    });
    return;
  }

  // If in edit mode, finish it first
  if (editingIndex !== null) {
    editingIndex = null;
    renderOptionList();
  }

  winningHighlightIndex = null;
  isSpinning = true;
  spinBtn.disabled = true;
  addOptionBtn.disabled = true;
  optionInput.disabled = true;
  spinBtnText.textContent = "SPINNING...";
  if (spinIcon) spinIcon.classList.add("animate-spin");

  // 1. Probabilistically choose winning segment
  const totalWeight = options.reduce(
    (sum, opt) => sum + (Number(opt.weight) || 1),
    0
  );
  let randomChoice = Math.random() * totalWeight;
  let accumulated = 0;
  let winningIndex = 0;

  for (let i = 0; i < options.length; i++) {
    accumulated += Number(options[i].weight) || 1;
    if (randomChoice < accumulated) {
      winningIndex = i;
      break;
    }
  }

  const winningOption = options[winningIndex];

  // 2. Calculate target rotation angle
  // Pointer is located at 12 o'clock (3*Math.PI/2 radians).
  // Center of segment `i` is at `angle + i * arc + arc / 2`.
  // At stop: `(currentRotationAngle + winningIndex * arc + arc / 2) === 3 * Math.PI / 2`.
  const targetSegmentCenter = winningIndex * arc + arc / 2;
  let requiredRotation = (3 * Math.PI) / 2 - targetSegmentCenter;

  // Add a slight natural randomness within +/- 32% of segment width
  const randomOffset = (Math.random() - 0.5) * arc * 0.64;
  requiredRotation += randomOffset;

  // Normalize target rotation to [0, 2*PI)
  const normTarget = ((requiredRotation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  const normCurrent = ((currentRotationAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  let angularDiff = normTarget - normCurrent;
  if (angularDiff < 0) {
    angularDiff += 2 * Math.PI;
  }

  // 5 to 8 full revolutions for suspense
  const fullRotations = (5 + Math.floor(Math.random() * 4)) * (2 * Math.PI);
  const totalDelta = fullRotations + angularDiff;

  const startAngle = currentRotationAngle;
  const finalAngle = startAngle + totalDelta;
  const duration = 4300 + Math.random() * 1000; // 4.3s to 5.3s
  const startTime = performance.now();

  let lastSegment = -1;

  function animate(now) {
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);

    // Smooth cubic ease-out
    const eased = 1 - Math.pow(1 - progress, 3);
    currentRotationAngle = startAngle + (finalAngle - startAngle) * eased;

    // Track when pointer crosses segment boundaries to play tick sound & wiggle
    const angleUnderPointer =
      ((3 * Math.PI) / 2 - currentRotationAngle % (2 * Math.PI) + 2 * Math.PI) %
      (2 * Math.PI);
    const segmentUnderPointer = Math.floor(angleUnderPointer / arc);

    if (segmentUnderPointer !== lastSegment) {
      lastSegment = segmentUnderPointer;
      playTickSound();
      triggerPointerTick();
    }

    drawWheelCanvas();

    if (progress < 1) {
      spinAnimFrame = requestAnimationFrame(animate);
    } else {
      currentRotationAngle = finalAngle;
      winningHighlightIndex = winningIndex;
      drawWheelCanvas();
      endSpin(winningOption);
    }
  }

  spinAnimFrame = requestAnimationFrame(animate);
}

function endSpin(winner) {
  isSpinning = false;
  spinBtn.disabled = false;
  addOptionBtn.disabled = false;
  optionInput.disabled = false;
  spinBtnText.textContent = "SPIN THE WHEEL!";
  if (spinIcon) spinIcon.classList.remove("animate-spin");

  renderOptionList(); // Re-enable edit/delete buttons

  // Show winning modal with slight delay for dramatic effect
  setTimeout(() => {
    showModal({
      title: "Winner!",
      subtitle: "The Wheel Has Spoken",
      message: winner.text,
      isWinner: true,
    });
  }, 220);
}

spinBtn.addEventListener("click", spin);

// Modal Event Listeners
closeModalBtn.addEventListener("click", hideModal);
resultModal.addEventListener("click", (e) => {
  if (e.target === resultModal) hideModal();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (resultModal.classList.contains("show")) {
      hideModal();
    } else if (editingIndex !== null) {
      editingIndex = null;
      renderOptionList();
    }
  }
});

// Window Resize Handler (Debounced)
let resizeTimer = null;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    resizeCanvas();
  }, 100);
});

// Initialization
window.addEventListener("DOMContentLoaded", () => {
  resizeCanvas();
  renderOptionList();
});
