// grid.js

// Grid dimensions
const rows = 45;
const cols = 60;

// Random slant duration constants
const DEFAULT_MIN_DURATION = 0.6;
const DEFAULT_MAX_DURATION = 2.3;

// Motion and animation constants
const PING_PONG_MIDPOINT = 0.5; // Midpoint for ping-pong animation effects
const DEFAULT_JUMP_AMOUNT = 0.5; // Default jump amount for random slant motion
const RANDOM_DIRECTION_THRESHOLD = 0.5; // Threshold for random direction assignment (50/50 chance)

let text = "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG 0123456789".repeat(10);

// Performance optimization: Cache DOM references and space cells
let cells = []; // Cached cell references
let spaceCellIndices = []; // Indices of cells containing spaces
let nonSpaceCellIndices = []; // Indices of cells that are not spaces
let spaceCellSet = new Set(); // Set for O(1) space cell lookups
let lastWeightValue = null; // Track last weight value to avoid unnecessary updates
let lastSlntValue = null; // Track last slant value to avoid unnecessary updates

// Performance optimization: Mapping for random slant values
let randomValueToCellIndex = []; // Maps random array index to actual cell index
let cellIndexToRandomIndex = new Map(); // Maps cell index to random array index

// Restore grid div
const grid = document.getElementById('grid');
const fileInput = document.getElementById('fileInput');
const weightVideoInput = document.getElementById('weightVideoInput');
const weightVideo = document.getElementById('weightVideo');

// Mode dropdowns
const weightMode = document.getElementById('weightMode');
const slantMode = document.getElementById('slantMode');

// Weight controls
const weightSlider = document.getElementById('weight');
const weightMotionSlider = document.getElementById('weightMotionSlider');
const weightSpeed = document.getElementById('weightSpeed');

// Slant controls
const slntSlider = document.getElementById('slnt');
const slntMotionSlider = document.getElementById('slntMotionSlider');
const slntSpeed = document.getElementById('slntSpeed');

// Random slant controls
const slntRandomMinDuration = document.getElementById('slntRandomMinDuration');
const slntRandomMaxDuration = document.getElementById('slntRandomMaxDuration');
const slntRandomJump = document.getElementById('slntRandomJump');

// Smooth Random Jump controls
const slntSmoothRandomSpeed = document.getElementById('slntSmoothRandomSpeed');
const slntSmoothRandomMinDuration = document.getElementById('slntSmoothRandomMinDuration');
const slntSmoothRandomMaxDuration = document.getElementById('slntSmoothRandomMaxDuration');
const slntSmoothRandomJump = document.getElementById('slntSmoothRandomJump');

// Dark mode toggle
const darkModeToggle = document.getElementById('darkModeToggle');

let weightVideoLoaded = false;
let frameCounter = 0;
let frameDirection = 1;
let totalFrames = 0;

// Slider motion variables
let weightMotionActive = false;
let slntMotionActive = false;
let weightMotionDirection = 1;
let slntMotionDirection = 1;
let weightMotionTime = 0;
let slntMotionTime = 0;

// Random slant motion variables
let slntRandomActive = false;
let slntRandomTimes = []; // Array to store random times for each character
let slntRandomValues = []; // Array to store current slant values for each character
let slntRandomDirections = []; // Array to store direction for each character (1 or -1)

// Smooth Random Jump motion variables
let slntSmoothRandomActive = false;
let slntSmoothRandomTimes = []; // Array to store random times for each character
let slntSmoothRandomValues = []; // Array to store current slant values for each character
let slntSmoothRandomDirections = []; // Array to store direction for each character (1 or -1)

// Canvas for sampling video pixels (hidden)
const sampleCanvas = document.createElement('canvas');
const sampleCtx = sampleCanvas.getContext('2d');
sampleCanvas.style.display = 'none';
document.body.appendChild(sampleCanvas);

const weightSampleCanvas = document.createElement('canvas');
const weightSampleCtx = weightSampleCanvas.getContext('2d', { willReadFrequently: true });
weightSampleCanvas.style.display = 'none';
document.body.appendChild(weightSampleCanvas);

// FPS counter variables
let lastFpsTime = performance.now();
let frameCount = 0;

// Motion timing variable
let lastMotionTime = performance.now();

// Throttle function to limit frame rate
function throttle(callback, limit) {
  let waiting = false;
  return function () {
    if (!waiting) {
      callback.apply(this, arguments);
      waiting = true;
      setTimeout(() => {
        waiting = false;
      }, limit);
    }
  }
}

// Pre-calculate common values
const totalCells = rows * cols;
const cellSize = 20; // Base cell size in pixels

// Performance optimization: Update cell styles efficiently
function updateCellStyle(cell, weight, slnt) {
  // Only update if values have actually changed
  const currentWeight = cell.style.getPropertyValue('--weight');
  const currentSlnt = cell.style.getPropertyValue('--slnt');

  if (currentWeight !== weight.toString() || currentSlnt !== slnt.toString()) {
    cell.style.setProperty('--weight', weight);
    cell.style.setProperty('--slnt', slnt);
    cell.style.fontVariationSettings = `'wght' ${weight}, 'slnt' ${slnt}`;
  }
}

// Performance optimization: Efficient boundary clamping with modular arithmetic
function clampSlantWithBounce(value, min = -16, max = 0) {
  const range = max - min;
  const doubleRange = range * 2;

  // Normalize to 0-based range for easier modular arithmetic
  const normalizedValue = value - min;

  // Use modular arithmetic to handle bouncing
  let result = normalizedValue % doubleRange;

  // Handle negative values
  if (result < 0) {
    result += doubleRange;
  }

  // If result is in the second half of the range, bounce it back
  if (result > range) {
    result = doubleRange - result;
  }

  // Convert back to original range
  return result + min;
}

// Performance optimization: Detect boundary crossing for direction changes
function detectBoundaryCrossing(oldValue, newValue, min = -16, max = 0) {
  // Check if we crossed the minimum boundary (going below -16)
  if (oldValue >= min && newValue < min) {
    return 'min';
  }
  // Check if we crossed the maximum boundary (going above 0)
  if (oldValue <= max && newValue > max) {
    return 'max';
  }
  return null;
}

// Mode switching functions
function switchWeightMode() {
  const mode = weightMode.value;

  // Hide all weight mode controls
  document.getElementById('weightInteractive').classList.remove('active');
  document.getElementById('weightMotion').classList.remove('active');
  document.getElementById('weightVideoMode').classList.remove('active');

  // Show and configure the selected mode
  switch (mode) {
    case 'interactive':
      document.getElementById('weightInteractive').classList.add('active');
      weightMotionActive = false;
      weightVideo.style.opacity = 0;
      weightVideo.style.pointerEvents = 'none';
      break;
    case 'motion':
      document.getElementById('weightMotion').classList.add('active');
      weightMotionActive = true;
      weightMotionTime = 0;
      weightMotionDirection = 1;
      weightVideo.style.opacity = 0;
      weightVideo.style.pointerEvents = 'none';
      break;
    case 'video':
      document.getElementById('weightVideoMode').classList.add('active');
      weightMotionActive = false;
      weightVideo.style.opacity = 1;
      weightVideo.style.pointerEvents = 'auto';
      if (weightVideoLoaded) {
        weightVideo.play();
      }
      break;
  }
}

function switchSlantMode() {
  const mode = slantMode.value;

  // Hide all slant mode controls
  document.getElementById('slantInteractive').classList.remove('active');
  document.getElementById('slantMotion').classList.remove('active');
  document.getElementById('slantRandom').classList.remove('active');
  document.getElementById('slantSmoothRandom').classList.remove('active');

  // Remove slant-random-mode class from grid
  grid.classList.remove('slant-random-mode');

  // Show and configure the selected mode
  switch (mode) {
    case 'interactive':
      document.getElementById('slantInteractive').classList.add('active');
      slntMotionActive = false;
      slntRandomActive = false;
      slntSmoothRandomActive = false;
      break;
    case 'motion':
      document.getElementById('slantMotion').classList.add('active');
      slntMotionActive = true;
      slntRandomActive = false;
      slntSmoothRandomActive = false;
      slntMotionTime = 0;
      slntMotionDirection = 1;
      break;
    case 'random':
      document.getElementById('slantRandom').classList.add('active');
      slntMotionActive = false;
      slntRandomActive = true;
      slntSmoothRandomActive = false;
      // Add slant-random-mode class to grid
      grid.classList.add('slant-random-mode');
      initializeSlntRandom();
      break;
    case 'smoothRandom':
      document.getElementById('slantSmoothRandom').classList.add('active');
      slntMotionActive = false;
      slntRandomActive = false;
      slntSmoothRandomActive = true;
      initializeSlntSmoothRandom();
      break;
  }
}

function fillGrid() {
  grid.innerHTML = '';

  // Reset cached arrays
  cells = [];
  spaceCellIndices = [];
  nonSpaceCellIndices = [];

  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const span = document.createElement('span');
      span.className = 'cell';
      const char = text[idx % text.length];
      span.textContent = char;
      // span.style.transform = 'translateZ(0)'; // Force GPU acceleration
      grid.appendChild(span);

      // Cache cell reference
      cells.push(span);

      // Track space vs non-space cells for performance
      if (char === ' ') {
        spaceCellIndices.push(idx);
        spaceCellSet.add(idx);
      } else {
        nonSpaceCellIndices.push(idx);
      }

      idx++;
    }
  }

  // Reset last values to force initial update
  lastWeightValue = null;
  lastSlntValue = null;

  // Initialize random slant system if it's active
  if (slntRandomActive) {
    initializeSlntRandom();
  }

  // Initialize smooth random slant system if it's active
  if (slntSmoothRandomActive) {
    initializeSlntSmoothRandom();
  }
}

fileInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (evt) {
    text = evt.target.result.replace(/\r?\n/g, ' ');
    fillGrid();
  };
  reader.readAsText(file);
});

weightVideoInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  weightVideo.src = url;
  weightVideo.load();
  weightVideo.onloadeddata = () => {
    weightVideoLoaded = true;
    if (weightMode.value === 'video') {
      weightVideo.style.opacity = 1;
      weightVideo.style.pointerEvents = 'auto';
      weightVideo.play();
    }
    console.log('Video loaded:', weightVideo.duration, 'seconds');
  };
});

function getGridPixel(ctx, r, c) {
  const data = ctx.getImageData(c, r, 1, 1).data;
  return data[0];
}

function updateGrid() {
  // Use cached cells instead of querying DOM every frame
  // const cells = document.querySelectorAll('.cell'); // REMOVED - using cached cells array
  let idx = 0;

  // Handle timing for motion
  const now = performance.now();
  const deltaTime = (now - lastMotionTime) / 1000; // Convert to seconds
  lastMotionTime = now;

  // Handle weight motion based on current mode
  const currentWeightMode = weightMode.value;
  let weightValue = weightSlider.value;

  if (currentWeightMode === 'motion' && weightMotionActive) {
    const speed = parseFloat(weightSpeed.value) || 1;
    weightMotionTime += deltaTime * speed;

    // Calculate progress (0 to 1) with ping-pong effect
    const cycleTime = 2; // 2 seconds for full cycle
    const progress = (weightMotionTime % cycleTime) / cycleTime;
    const pingPongProgress = progress <= PING_PONG_MIDPOINT ? progress * 2 : (1 - progress) * 2;

    // Map to slider range
    weightValue = Math.round(map(pingPongProgress, 0, 1, 100, 900));
    weightMotionSlider.value = weightValue;
  }

  // Handle slant motion based on current mode
  const currentSlantMode = slantMode.value;
  let slntValue = slntSlider.value;

  if (currentSlantMode === 'motion' && slntMotionActive) {
    const speed = parseFloat(slntSpeed.value) || 1;
    slntMotionTime += deltaTime * speed;

    // Calculate progress (0 to 1) with ping-pong effect
    const cycleTime = 2; // 2 seconds for full cycle
    const progress = (slntMotionTime % cycleTime) / cycleTime;
    const pingPongProgress = progress <= PING_PONG_MIDPOINT ? progress * 2 : (1 - progress) * 2;

    // Map to slider range
    slntValue = map(pingPongProgress, 0, 1, -16, 0);
    slntMotionSlider.value = slntValue;
  }

  // Handle random slant motion
  if (currentSlantMode === 'random' && slntRandomActive) {
    const jumpAmount = parseFloat(slntRandomJump.value) || DEFAULT_JUMP_AMOUNT;

    // Process all cells (original behavior)
    for (let i = 0; i < slntRandomTimes.length; i++) {
      slntRandomTimes[i] -= deltaTime;

      if (slntRandomTimes[i] <= 0) {
        // Time to jump - move the slant value in the current direction
        const currentSlnt = slntRandomValues[i];
        const slntRange = 16; // -16 to 0
        const jumpInRange = (jumpAmount / 2) * slntRange; // Convert seconds to slant range

        // Calculate new value
        let newSlnt = currentSlnt + (slntRandomDirections[i] * jumpInRange);

        // Bounce back if we hit the boundaries (original logic)
        if (newSlnt <= -16) {
          // Bounce back by the excess amount
          const excess = Math.abs(newSlnt + 16);
          newSlnt = -16 + excess;
          slntRandomDirections[i] = 1; // Reverse direction
        } else if (newSlnt >= 0) {
          // Bounce back by the excess amount
          const excess = newSlnt;
          newSlnt = -excess;
          slntRandomDirections[i] = -1; // Reverse direction
        }

        slntRandomValues[i] = newSlnt;

        // Reset timer with new random duration
        const minDuration = parseFloat(slntRandomMinDuration.value) || DEFAULT_MIN_DURATION;
        const maxDuration = parseFloat(slntRandomMaxDuration.value) || DEFAULT_MAX_DURATION;
        slntRandomTimes[i] = Math.random() * (maxDuration - minDuration) + minDuration;
      }
    }
  }

  // Handle smooth random slant motion
  if (currentSlantMode === 'smoothRandom' && slntSmoothRandomActive) {
    const speed = parseFloat(slntSmoothRandomSpeed.value) || 1;
    const jumpAmount = parseFloat(slntSmoothRandomJump.value) || DEFAULT_JUMP_AMOUNT;

    // Process only initialized cells (non-space cells)
    for (let i = 0; i < slntSmoothRandomTimes.length; i++) {
      slntSmoothRandomTimes[i] -= deltaTime;

      if (slntSmoothRandomTimes[i] <= 0) {
        // Time to jump - add jump amount in current direction
        const currentSlnt = slntSmoothRandomValues[i];
        const slntRange = 16; // -16 to 0
        const jumpInRange = (jumpAmount / 2) * slntRange; // Convert seconds to slant range

        // Calculate raw new value before clamping
        const rawNewSlnt = currentSlnt + (slntSmoothRandomDirections[i] * jumpInRange);

        // Calculate new value with efficient boundary clamping
        const newSlnt = clampSlantWithBounce(rawNewSlnt);

        // Update direction based on boundary crossing
        const boundaryCrossed = detectBoundaryCrossing(currentSlnt, rawNewSlnt);
        if (boundaryCrossed) {
          slntSmoothRandomDirections[i] *= -1; // Reverse direction
        }

        slntSmoothRandomValues[i] = newSlnt;

        // Reset timer with new random duration
        const minDuration = parseFloat(slntSmoothRandomMinDuration.value) || DEFAULT_MIN_DURATION;
        const maxDuration = parseFloat(slntSmoothRandomMaxDuration.value) || DEFAULT_MAX_DURATION;
        slntSmoothRandomTimes[i] = Math.random() * (maxDuration - minDuration) + minDuration;
      } else {
        // Continuously move towards the edge in the current direction
        const currentSlnt = slntSmoothRandomValues[i];
        const slntRange = 16;
        const moveAmount = deltaTime * speed * 2; // Speed of continuous movement

        // Calculate raw new value before clamping
        const rawNewSlnt = currentSlnt + (slntSmoothRandomDirections[i] * moveAmount);

        // Calculate new value with efficient boundary clamping
        const newSlnt = clampSlantWithBounce(rawNewSlnt);

        // Update direction based on boundary crossing
        const boundaryCrossed = detectBoundaryCrossing(currentSlnt, rawNewSlnt);
        if (boundaryCrossed) {
          slntSmoothRandomDirections[i] *= -1; // Reverse direction
        }

        slntSmoothRandomValues[i] = newSlnt;
      }
    }
  }

  if (currentWeightMode === 'video' && weightVideoLoaded && weightVideo.readyState >= 2) {
    if (weightSampleCanvas.width !== cols || weightSampleCanvas.height !== rows) {
      weightSampleCanvas.width = cols;
      weightSampleCanvas.height = rows;
    }
    // Sample the current frame from the playing video
    weightSampleCtx.drawImage(weightVideo, 0, 0, cols, rows);
    const imageData = weightSampleCtx.getImageData(0, 0, cols, rows);
    const pixels = imageData.data;

    // Only process non-space cells for video mode
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cellIndex = r * cols + c;
        const cell = cells[cellIndex];

        // Skip space cells - they don't need video processing
        if (spaceCellSet.has(cellIndex)) {
          continue;
        }

        const pixelIndex = (r * cols + c) * 4;
        const val = pixels[pixelIndex];
        const weight = Math.round(map(val, 0, 255, 1000, 300));
        const slnt = currentSlantMode === 'random' && slntRandomValues[cellIndex] !== undefined ?
          slntRandomValues[cellIndex] :
          currentSlantMode === 'smoothRandom' && cellIndexToRandomIndex.has(cellIndex) ?
            slntSmoothRandomValues[cellIndexToRandomIndex.get(cellIndex)] : slntValue;
        updateCellStyle(cell, weight, slnt);
      }
    }
    return;
  } else {
    // If no video or not in video mode, use slider values for all cells
    // Performance optimization: Only update if values have changed
    // BUT: Always update in random modes since values change internally
    if (weightValue === lastWeightValue && slntValue === lastSlntValue &&
      currentSlantMode !== 'random' && currentSlantMode !== 'smoothRandom') {
      return; // Skip update if nothing has changed (except in random modes)
    }

    // Batch update cells based on mode
    requestAnimationFrame(() => {
      if (currentSlantMode === 'random') {
        // For random mode, process all cells (original behavior)
        for (let i = 0; i < cells.length; i++) {
          const cell = cells[i];
          const cellText = cell.textContent;

          // Skip spaces for performance improvement
          if (cellText === ' ') {
            continue;
          }

          // Use random slant value if random mode is active, otherwise use slider value
          const slnt = slntRandomValues[i] !== undefined ? slntRandomValues[i] : slntValue;

          updateCellStyle(cell, weightValue, slnt);
        }
      } else {
        // For other modes, process only non-space cells (optimized)
        for (let i = 0; i < nonSpaceCellIndices.length; i++) {
          const cellIndex = nonSpaceCellIndices[i];
          const cell = cells[cellIndex];

          // Use random slant value if smooth random mode is active, otherwise use slider value
          const slnt = currentSlantMode === 'smoothRandom' && cellIndexToRandomIndex.has(cellIndex) ?
            slntSmoothRandomValues[cellIndexToRandomIndex.get(cellIndex)] : slntValue;

          updateCellStyle(cell, weightValue, slnt);
        }
      }
    });

    // Update last values (but only for non-random modes to allow continuous updates)
    if (currentSlantMode !== 'random' && currentSlantMode !== 'smoothRandom') {
      lastWeightValue = weightValue;
      lastSlntValue = slntValue;
    }
  }
}

function map(x, in_min, in_max, out_min, out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

// Initialize random slant system
function initializeSlntRandom() {
  slntRandomTimes = [];
  slntRandomValues = [];
  slntRandomDirections = [];

  // Initialize for all cells (original behavior)
  for (let i = 0; i < totalCells; i++) {
    // Random time between min and max duration
    const minDuration = parseFloat(slntRandomMinDuration.value) || DEFAULT_MIN_DURATION;
    const maxDuration = parseFloat(slntRandomMaxDuration.value) || DEFAULT_MAX_DURATION;
    slntRandomTimes.push(Math.random() * (maxDuration - minDuration) + minDuration);
    slntRandomValues.push(parseFloat(slntSlider.value) || 0);
    slntRandomDirections.push(Math.random() < RANDOM_DIRECTION_THRESHOLD ? 1 : -1);
  }

  console.log(`Random slant initialized: ${slntRandomTimes.length} cells`);
}

// Initialize smooth random slant system
function initializeSlntSmoothRandom() {
  slntSmoothRandomTimes = [];
  slntSmoothRandomValues = [];
  slntSmoothRandomDirections = [];
  randomValueToCellIndex = [];
  cellIndexToRandomIndex.clear();

  // Only initialize for non-space cells
  for (let i = 0; i < totalCells; i++) {
    // Skip space cells - don't initialize them at all
    if (spaceCellSet.has(i)) {
      continue;
    }

    // Random time between min and max duration
    const minDuration = parseFloat(slntSmoothRandomMinDuration.value) || DEFAULT_MIN_DURATION;
    const maxDuration = parseFloat(slntSmoothRandomMaxDuration.value) || DEFAULT_MAX_DURATION;
    slntSmoothRandomTimes.push(Math.random() * (maxDuration - minDuration) + minDuration);
    slntSmoothRandomValues.push(parseFloat(slntSlider.value) || 0);
    slntSmoothRandomDirections.push(Math.random() < RANDOM_DIRECTION_THRESHOLD ? 1 : -1);

    // Build mappings
    const randomIndex = slntSmoothRandomTimes.length - 1;
    randomValueToCellIndex.push(i);
    cellIndexToRandomIndex.set(i, randomIndex);
  }

  console.log(`Smooth random slant initialized: ${slntSmoothRandomTimes.length} active cells`);
}

// Event listeners for mode switching
weightMode.addEventListener('change', switchWeightMode);
slantMode.addEventListener('change', switchSlantMode);

// Event listeners for sliders
[weightSlider, slntSlider].forEach(input => {
  input.addEventListener('input', updateGrid);
});

// Dark mode toggle functionality
darkModeToggle.addEventListener('change', () => {
  if (darkModeToggle.checked) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
});

// Throttle the animation to 30fps
const throttledUpdate = throttle(() => {
  updateGrid();
}, 1000 / 30);

function animate() {
  throttledUpdate();
  requestAnimationFrame(animate);

  // FPS counter - only log if FPS is below 30
  frameCount++;
  const now = performance.now();
  if (now - lastFpsTime >= 1000) {
    const fps = frameCount;
    if (fps < 30) {
      console.log('FPS:', fps);
    }
    frameCount = 0;
    lastFpsTime = now;
  }
}

fillGrid();
animate();

// When switching away from video mode, pause the video
weightMode.addEventListener('change', () => {
  if (weightMode.value !== 'video') {
    weightVideo.pause();
    weightVideo.style.opacity = 0;
    weightVideo.style.pointerEvents = 'none';
  }
  switchWeightMode();
  updateGrid();
});