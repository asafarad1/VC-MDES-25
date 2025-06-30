// grid.js

// Grid dimensions
const rows = 45;
const cols = 59;

// Random slant duration constants
const DEFAULT_MIN_DURATION = 0.6;
const DEFAULT_MAX_DURATION = 2.3;

// Motion and animation constants
const PING_PONG_MIDPOINT = 0.5; // Midpoint for ping-pong animation effects
const DEFAULT_JUMP_AMOUNT = 0.5; // Default jump amount for smooth random motion
const RANDOM_DIRECTION_THRESHOLD = 0.5; // Threshold for random direction assignment (50/50 chance)

let text = "A B C D E F G H I J K L M N O P Q R S T U V W X Y Z " + "a b c d e f g h i j k l m n o p q r s t u v w x y z " + "0 1 2 3 4 5 6 7 8 9 ";

// Performance optimization: Cache DOM references and space cells
let cells = []; // Cached cell references
let spaceCellIndices = []; // Indices of cells containing spaces
let nonSpaceCellIndices = []; // Indices of cells that are not spaces
let lastWeightValue = null; // Track last weight value to avoid unnecessary updates
let lastSlntValue = null; // Track last slant value to avoid unnecessary updates

// Performance optimization: Mapping for smooth random slant values
let randomValueToCellIndex = []; // Maps random array index to actual cell index
let cellIndexToRandomIndex = new Map(); // Maps cell index to random array index

// Performance optimization: Track smooth random changes to avoid unnecessary DOM updates
let slntSmoothRandomLastValues = []; // Track last values to detect changes
let slntSmoothRandomChangeThreshold = 0.1; // Minimum change threshold to trigger update
let slntSmoothRandomDirtyCells = new Set(); // Track which cells need updates

// Performance monitoring
let slntSmoothRandomUpdateCount = 0; // Count of cells updated per frame
let slntSmoothRandomLastUpdateCount = 0; // Last frame's update count

// Adaptive change threshold based on performance
function updateChangeThreshold() {
  const fps = frameCount;
  if (fps >= 30) {
    slntSmoothRandomChangeThreshold = 0.05; // More responsive when performance is good
  } else if (fps >= 25) {
    slntSmoothRandomChangeThreshold = 0.1; // Default threshold
  } else if (fps >= 20) {
    slntSmoothRandomChangeThreshold = 0.15; // Less responsive
  } else {
    slntSmoothRandomChangeThreshold = 0.2; // Much less responsive when performance is poor
  }
}

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
const weightPingPongToggle = document.getElementById('weightPingPongToggle');

// Slant controls
const slntSlider = document.getElementById('slnt');
const slntMotionSlider = document.getElementById('slntMotionSlider');
const slntSpeed = document.getElementById('slntSpeed');
const slantPingPongToggle = document.getElementById('slantPingPongToggle');
const slantEasing = document.getElementById('slantEasing');

// Weight easing dropdown
const weightEasing = document.getElementById('weightEasing');

// Toggle random slant controls
const slntToggleRandomMinDuration = document.getElementById('slntToggleRandomMinDuration');
const slntToggleRandomMaxDuration = document.getElementById('slntToggleRandomMaxDuration');
const slntToggleRandomTransition = document.getElementById('slntToggleRandomTransition');

// Toggle delay slant controls
const slntToggleDelayTimeGap = document.getElementById('slntToggleDelayTimeGap');
const slntToggleDelayWaveGap = document.getElementById('slntToggleDelayWaveGap');
const slntToggleDelayType = document.getElementById('slntToggleDelayType');
const slntToggleDelayTransition = document.getElementById('slntToggleDelayTransition');
const slntToggleDelayResetToggle = document.getElementById('slntToggleDelayResetToggle');

// Smooth Random Motion controls
const slntSmoothRandomSpeed = document.getElementById('slntSmoothRandomSpeed');
const slntSmoothRandomMinDuration = document.getElementById('slntSmoothRandomMinDuration');
const slntSmoothRandomMaxDuration = document.getElementById('slntSmoothRandomMaxDuration');
const slntSmoothRandomJump = document.getElementById('slntSmoothRandomJump');
const slntSmoothRandomEasing = document.getElementById('slntSmoothRandomEasing');

// Dark mode toggle
const darkModeToggle = document.getElementById('darkModeToggle');

// Slider motion variables
let weightMotionActive = false;
let slntMotionActive = false;
let weightMotionDirection = 1;
let slntMotionDirection = 1;
let weightMotionTime = 0;
let slntMotionTime = 0;

// Toggle random slant motion variables
let slntToggleRandomActive = false;
let slntToggleRandomTimes = []; // Array to store random times for each character
let slntToggleRandomValues = []; // Array to store current slant values for each character

// Toggle delay slant motion variables
let slntToggleDelayActive = false;
let slntToggleDelayValues = []; // Array to store current slant values for each character
let slntToggleDelayOrder = []; // Array to store the order of cell activation
let slntToggleDelayCurrentIndex = 0; // Current index in the activation order
let slntToggleDelayTimer = 0; // Timer for the current delay

// New variables for overlapping waves
let slntToggleDelayWaves = []; // Array to track multiple waves
let slntToggleDelayWaveTimer = 0; // Timer for starting new waves

// Smooth Random Motion variables
let slntSmoothRandomActive = false;
let slntSmoothRandomTimes = []; // Array to store random times for each character
let slntSmoothRandomValues = []; // Array to store current slant values for each character
let slntSmoothRandomDirections = []; // Array to store current directions for each character

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

let weightVideoLoaded = false;

// Throttle function to limit frame rate
function throttle(callback, limit) {
  let waiting = false;
  let lastCall = 0;
  return function () {
    const now = performance.now();
    if (now - lastCall >= limit) {
      callback.apply(this, arguments);
      lastCall = now;
    }
  }
}

// Performance-based throttling for smooth random mode
function getThrottleLimit() {
  const currentSlantMode = slantMode.value;
  if (currentSlantMode === 'smoothRandom') {
    // Use adaptive throttling based on performance
    const fps = frameCount;
    if (fps < 25) {
      return 1000 / 20; // Reduce to 20fps if performance is poor
    } else if (fps < 30) {
      return 1000 / 25; // Reduce to 25fps if performance is moderate
    }
  }
  return 1000 / 30; // Default 30fps
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
      lastMotionTime = performance.now(); // Reset timing to prevent frozen motion
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
  document.getElementById('slantToggleRandom').classList.remove('active');
  document.getElementById('slantToggleDelay').classList.remove('active');
  document.getElementById('slantSmoothRandom').classList.remove('active');

  // Remove slant-toggleRandom-mode and slant-toggleDelay-mode classes from grid
  grid.classList.remove('slant-toggleRandom-mode');
  grid.classList.remove('slant-toggleDelay-mode');

  // Show and configure the selected mode
  switch (mode) {
    case 'interactive':
      document.getElementById('slantInteractive').classList.add('active');
      slntMotionActive = false;
      slntToggleRandomActive = false;
      slntToggleDelayActive = false;
      slntSmoothRandomActive = false;
      break;
    case 'motion':
      document.getElementById('slantMotion').classList.add('active');
      slntMotionActive = true;
      slntToggleRandomActive = false;
      slntToggleDelayActive = false;
      slntSmoothRandomActive = false;
      slntMotionTime = 0;
      slntMotionDirection = 1;
      lastMotionTime = performance.now(); // Reset timing to prevent frozen motion
      break;
    case 'toggleRandom':
      document.getElementById('slantToggleRandom').classList.add('active');
      slntMotionActive = false;
      slntToggleRandomActive = true;
      slntToggleDelayActive = false;
      slntSmoothRandomActive = false;
      // Add slant-toggleRandom-mode class to grid
      grid.classList.add('slant-toggleRandom-mode');
      lastMotionTime = performance.now(); // Reset timing to prevent frozen motion
      initializeSlntToggleRandom();
      // Initialize transition time
      updateTransitionTime();
      break;
    case 'toggleDelay':
      document.getElementById('slantToggleDelay').classList.add('active');
      slntMotionActive = false;
      slntToggleRandomActive = false;
      slntToggleDelayActive = true;
      slntSmoothRandomActive = false;
      // Add slant-toggleDelay-mode class to grid
      grid.classList.add('slant-toggleDelay-mode');
      lastMotionTime = performance.now(); // Reset timing to prevent frozen motion
      initializeSlntToggleDelay();
      // Initialize transition time
      updateToggleDelayTransitionTime();
      // Set initial wave gap visibility
      toggleWaveGapVisibility();
      break;
    case 'smoothRandom':
      document.getElementById('slantSmoothRandom').classList.add('active');
      slntMotionActive = false;
      slntToggleRandomActive = false;
      slntToggleDelayActive = false;
      slntSmoothRandomActive = true;
      lastMotionTime = performance.now(); // Reset timing to prevent frozen motion
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

  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();

  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const span = document.createElement('span');
      span.className = 'cell';
      const char = text[idx % text.length];
      span.textContent = char;
      fragment.appendChild(span);

      // Cache cell reference
      cells.push(span);

      // Track space vs non-space cells for performance
      if (char === ' ') {
        spaceCellIndices.push(idx);
      } else {
        nonSpaceCellIndices.push(idx);
      }

      idx++;
    }
  }

  // Append all cells at once
  grid.appendChild(fragment);

  // Reset last values to force initial update
  lastWeightValue = null;
  lastSlntValue = null;

  // Initialize toggle random slant system if it's active
  if (slntToggleRandomActive) {
    initializeSlntToggleRandom();
  }

  // Initialize toggle delay slant system if it's active
  if (slntToggleDelayActive) {
    initializeSlntToggleDelay();
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
    // Completely remove line breaks - don't replace with spaces
    text = evt.target.result
      .replace(/<br\s*\/?>/gi, '') // Remove <br> tags completely
      .replace(/\r?\n/g, '') // Remove line breaks completely
      .replace(/\r/g, '') // Remove carriage returns completely
      .replace(/\t/g, '') // Remove tabs completely
      .replace(/\f/g, '') // Remove form feeds completely
      .replace(/\v/g, ''); // Remove vertical tabs completely

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

    // Calculate progress (0 to 1) with optional ping-pong effect
    const cycleTime = 2; // 2 seconds for full cycle
    const progress = (weightMotionTime % cycleTime) / cycleTime;

    let finalProgress;
    if (weightPingPongToggle.checked) {
      // Ping-pong effect: go from 0 to 1, then back to 0
      finalProgress = progress <= PING_PONG_MIDPOINT ? progress * 2 : (1 - progress) * 2;
    } else {
      // Continuous motion: go from 0 to 1, then reset to 0
      finalProgress = progress;
    }

    // Apply easing to the progress
    const easingType = weightEasing.value;
    const easedProgress = applyEasing(finalProgress, easingType);

    // Map to slider range
    weightValue = (map(easedProgress, 0, 1, 100, 900) + 0.5) | 0;
    weightMotionSlider.value = weightValue;
  }

  // Handle slant motion based on current mode
  const currentSlantMode = slantMode.value;
  let slntValue = slntSlider.value;

  if (currentSlantMode === 'motion' && slntMotionActive) {
    const speed = parseFloat(slntSpeed.value) || 1;
    slntMotionTime += deltaTime * speed;

    // Calculate progress (0 to 1) with optional ping-pong effect
    const cycleTime = 2; // 2 seconds for full cycle
    const progress = (slntMotionTime % cycleTime) / cycleTime;

    let finalProgress;
    if (slantPingPongToggle.checked) {
      // Ping-pong effect: go from 0 to 1, then back to 0
      finalProgress = progress <= PING_PONG_MIDPOINT ? progress * 2 : (1 - progress) * 2;
    } else {
      // Continuous motion: go from 0 to 1, then reset to 0
      finalProgress = progress;
    }

    // Apply easing to the progress
    const easingType = slantEasing.value;
    const easedProgress = applyEasing(finalProgress, easingType);

    // Map to slider range
    slntValue = map(easedProgress, 0, 1, -16, 0);
    slntMotionSlider.value = slntValue;
  }

  // Handle toggle random slant motion
  if (currentSlantMode === 'toggleRandom' && slntToggleRandomActive) {
    // Process all cells (original behavior)
    for (let i = 0; i < slntToggleRandomTimes.length; i++) {
      slntToggleRandomTimes[i] -= deltaTime;

      if (slntToggleRandomTimes[i] <= 0) {
        // Time to jump - simply toggle between -16 and 0
        slntToggleRandomValues[i] = slntToggleRandomValues[i] === -16 ? 0 : -16;

        // Reset timer with new random duration
        const minDuration = parseFloat(slntToggleRandomMinDuration.value) || DEFAULT_MIN_DURATION;
        const maxDuration = parseFloat(slntToggleRandomMaxDuration.value) || DEFAULT_MAX_DURATION;
        slntToggleRandomTimes[i] = Math.random() * (maxDuration - minDuration) + minDuration;
      }
    }
  }

  // Handle toggle delay slant motion
  if (currentSlantMode === 'toggleDelay' && slntToggleDelayActive) {
    const timeGap = parseFloat(slntToggleDelayTimeGap.value) || 0.1;
    const waveGap = parseFloat(slntToggleDelayWaveGap.value) || 4.0;
    const transitionTime = parseFloat(slntToggleDelayTransition.value) || 0.7;

    if (slntToggleDelayResetToggle.checked) {
      // Reset mode: sequential behavior like before
      slntToggleDelayTimer -= deltaTime;

      if (slntToggleDelayTimer <= 0) {
        // Time to activate the next cell/row in the sequence
        if (slntToggleDelayCurrentIndex < slntToggleDelayOrder.length) {
          const cellIndex = slntToggleDelayOrder[slntToggleDelayCurrentIndex];

          // Check if this is a row-based mode
          const delayType = slntToggleDelayType.value;
          if (delayType === 'rowsAscending' || delayType === 'rowsDescending') {
            // For row modes, activate the entire row at once
            const rowIndex = Math.floor(cellIndex / cols);
            const startCellIndex = rowIndex * cols;
            const endCellIndex = startCellIndex + cols;

            // Toggle all cells in this row
            for (let i = startCellIndex; i < endCellIndex; i++) {
              slntToggleDelayValues[i] = slntToggleDelayValues[i] === -16 ? 0 : -16;
            }
          } else {
            // For cell modes, activate just this cell
            slntToggleDelayValues[cellIndex] = slntToggleDelayValues[cellIndex] === -16 ? 0 : -16;
          }

          slntToggleDelayCurrentIndex++;

          // Check if this was the last item
          if (slntToggleDelayCurrentIndex >= slntToggleDelayOrder.length) {
            // Last item activated - wait for transition to complete before resetting
            slntToggleDelayTimer = transitionTime;
            console.log('Toggle delay: reset mode - last item activated, waiting for transition');
          } else {
            slntToggleDelayTimer = timeGap; // Set timer for next activation
          }
        } else {
          // Transition completed - reset all cells and start over
          for (let i = 0; i < slntToggleDelayValues.length; i++) {
            slntToggleDelayValues[i] = 0; // Reset to default state
          }
          slntToggleDelayCurrentIndex = 0;
          slntToggleDelayTimer = transitionTime + timeGap; // Wait for transition + delay before starting first item of new cycle
          console.log('Toggle delay: reset mode - transition completed, resetting all cells, waiting transition + delay before new cycle');
        }
      }
    } else {
      // Wave gap mode: overlapping waves behavior
      slntToggleDelayWaveTimer -= deltaTime;

      // Start new wave if timer expired
      if (slntToggleDelayWaveTimer <= 0) {
        const delayType = slntToggleDelayType.value;
        const newWave = new ToggleDelayWave(performance.now(), delayType, slntToggleDelayOrder);
        slntToggleDelayWaves.push(newWave);

        // Set timer for next wave
        slntToggleDelayWaveTimer = waveGap;

        console.log('Toggle delay: started new wave, total waves:', slntToggleDelayWaves.length);
      }

      // Update all active waves
      for (let i = slntToggleDelayWaves.length - 1; i >= 0; i--) {
        const wave = slntToggleDelayWaves[i];
        wave.update(deltaTime, timeGap);

        // Remove completed waves
        if (!wave.active) {
          slntToggleDelayWaves.splice(i, 1);
          console.log('Toggle delay: wave completed, remaining waves:', slntToggleDelayWaves.length);
        }
      }
    }
  }

  // Handle smooth random slant motion
  if (currentSlantMode === 'smoothRandom' && slntSmoothRandomActive) {
    const speed = parseFloat(slntSmoothRandomSpeed.value) || 1;
    const jumpAmount = parseFloat(slntSmoothRandomJump.value) || DEFAULT_JUMP_AMOUNT;

    // Debug: Check if arrays are properly initialized
    if (slntSmoothRandomTimes.length === 0) {
      console.log('Smooth random arrays not initialized, reinitializing...');
      initializeSlntSmoothRandom();
    }

    // Performance optimization: Pre-calculate constants
    const slntRange = 16; // -16 to 0
    const jumpInRange = (jumpAmount / 2) * slntRange;
    const moveAmount = deltaTime * speed * 2;
    const minDuration = parseFloat(slntSmoothRandomMinDuration.value) || DEFAULT_MIN_DURATION;
    const maxDuration = parseFloat(slntSmoothRandomMaxDuration.value) || DEFAULT_MAX_DURATION;
    const durationRange = maxDuration - minDuration;

    // Clear dirty cells set for this frame
    slntSmoothRandomDirtyCells.clear();

    // Process only initialized cells (non-space cells)
    for (let i = 0; i < slntSmoothRandomTimes.length; i++) {
      slntSmoothRandomTimes[i] -= deltaTime;

      if (slntSmoothRandomTimes[i] <= 0) {
        // Time to jump - add jump amount in current direction
        const currentSlnt = slntSmoothRandomValues[i];
        const rawNewSlnt = currentSlnt + (slntSmoothRandomDirections[i] * jumpInRange);

        // Calculate new value with efficient boundary clamping
        const newSlnt = clampSlantWithBounce(rawNewSlnt);

        // Update direction based on boundary crossing (only if we actually crossed)
        if (rawNewSlnt < -16 || rawNewSlnt > 0) {
          slntSmoothRandomDirections[i] *= -1; // Reverse direction
        }

        slntSmoothRandomValues[i] = newSlnt;

        // Mark this cell as dirty for update
        const cellIndex = randomValueToCellIndex[i];
        slntSmoothRandomDirtyCells.add(cellIndex);

        // Reset timer with new random duration
        slntSmoothRandomTimes[i] = Math.random() * durationRange + minDuration;
      } else {
        // Continuously move towards the edge in the current direction
        const currentSlnt = slntSmoothRandomValues[i];
        const rawNewSlnt = currentSlnt + (slntSmoothRandomDirections[i] * moveAmount);

        // Calculate new value with efficient boundary clamping
        const newSlnt = clampSlantWithBounce(rawNewSlnt);

        // Update direction based on boundary crossing (only if we actually crossed)
        if (rawNewSlnt < -16 || rawNewSlnt > 0) {
          slntSmoothRandomDirections[i] *= -1; // Reverse direction
        }

        slntSmoothRandomValues[i] = newSlnt;

        // Mark this cell as dirty for update
        const cellIndex = randomValueToCellIndex[i];
        slntSmoothRandomDirtyCells.add(cellIndex);
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
        if (spaceCellIndices.includes(cellIndex)) {
          continue;
        }

        const pixelIndex = (r * cols + c) * 4;
        const val = pixels[pixelIndex];
        const weight = (map(val, 0, 255, 1000, 300) + 0.5) | 0;
        const slnt = currentSlantMode === 'toggleRandom' && slntToggleRandomValues[cellIndex] !== undefined ?
          slntToggleRandomValues[cellIndex] :
          currentSlantMode === 'toggleDelay' && slntToggleDelayValues[cellIndex] !== undefined ?
            slntToggleDelayValues[cellIndex] :
            currentSlantMode === 'smoothRandom' && cellIndexToRandomIndex.has(cellIndex) ?
              slntSmoothRandomValues[cellIndexToRandomIndex.get(cellIndex)] : slntValue;
        updateCellStyle(cell, weight, slnt);
      }
    }
    return;
  } else {
    // If no video or not in video mode, use slider values for all cells
    // Performance optimization: Only update if values have changed
    // BUT: Always update in toggleRandom modes since values change internally
    if (weightValue === lastWeightValue && slntValue === lastSlntValue &&
      currentSlantMode !== 'toggleRandom' && currentSlantMode !== 'toggleDelay' && currentSlantMode !== 'smoothRandom') {
      return; // Skip update if nothing has changed (except in toggleRandom modes)
    }

    // Batch update cells based on mode
    if (currentSlantMode === 'toggleRandom') {
      // For toggleRandom mode, process all cells (original behavior)
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const cellText = cell.textContent;

        // Skip spaces for performance improvement
        if (cellText === ' ') {
          continue;
        }

        // Use toggle random slant value if toggleRandom mode is active, otherwise use slider value
        const slnt = slntToggleRandomValues[i] !== undefined ? slntToggleRandomValues[i] : slntValue;

        updateCellStyle(cell, weightValue, slnt);
      }
    } else if (currentSlantMode === 'toggleDelay') {
      // For toggleDelay mode, process all cells
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const cellText = cell.textContent;

        // Skip spaces for performance improvement
        if (cellText === ' ') {
          continue;
        }

        // Use toggle delay slant value if toggleDelay mode is active, otherwise use slider value
        const slnt = slntToggleDelayValues[i] !== undefined ? slntToggleDelayValues[i] : slntValue;

        updateCellStyle(cell, weightValue, slnt);
      }
    } else {
      // For other modes, process only non-space cells (optimized)
      if (currentSlantMode === 'smoothRandom') {
        // For smooth random mode, only update dirty cells
        slntSmoothRandomUpdateCount = slntSmoothRandomDirtyCells.size;
        for (const cellIndex of slntSmoothRandomDirtyCells) {
          const cell = cells[cellIndex];
          const randomIndex = cellIndexToRandomIndex.get(cellIndex);
          const slnt = slntSmoothRandomValues[randomIndex];
          updateCellStyle(cell, weightValue, slnt);
        }
      } else {
        // For other modes, process only non-space cells (optimized)
        for (let i = 0; i < nonSpaceCellIndices.length; i++) {
          const cellIndex = nonSpaceCellIndices[i];
          const cell = cells[cellIndex];
          updateCellStyle(cell, weightValue, slntValue);
        }
      }
    }

    // Update last values (but only for non-toggleRandom modes to allow continuous updates)
    if (currentSlantMode !== 'toggleRandom' && currentSlantMode !== 'toggleDelay' && currentSlantMode !== 'smoothRandom') {
      lastWeightValue = weightValue;
      lastSlntValue = slntValue;
    }
  }

  // Log smooth random performance metrics when performance is poor
  if (slantMode.value === 'smoothRandom' && slntSmoothRandomActive) {
    console.log('Smooth Random - Updates per frame:', slntSmoothRandomUpdateCount,
      'Dirty cells:', slntSmoothRandomDirtyCells.size,
      'Change threshold:', slntSmoothRandomChangeThreshold);
  }
}

function map(x, in_min, in_max, out_min, out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

// Initialize toggle random slant system
function initializeSlntToggleRandom() {
  slntToggleRandomTimes = [];
  slntToggleRandomValues = [];

  // Initialize for all cells (original behavior)
  for (let i = 0; i < totalCells; i++) {
    // Random time between min and max duration
    const minDuration = parseFloat(slntToggleRandomMinDuration.value) || DEFAULT_MIN_DURATION;
    const maxDuration = parseFloat(slntToggleRandomMaxDuration.value) || DEFAULT_MAX_DURATION;
    slntToggleRandomTimes.push(Math.random() * (maxDuration - minDuration) + minDuration);
    slntToggleRandomValues.push(0); // Start at 0, will toggle to -16 on first jump
  }

  console.log(`Toggle random slant initialized: ${slntToggleRandomTimes.length} cells`);
}

// Initialize toggle delay slant system
function initializeSlntToggleDelay() {
  slntToggleDelayValues = [];
  slntToggleDelayOrder = [];
  slntToggleDelayWaves = []; // Clear existing waves
  slntToggleDelayCurrentIndex = 0; // Reset current index
  slntToggleDelayTimer = 0; // Start immediately for reset mode
  slntToggleDelayWaveTimer = 0; // Start first wave immediately for wave gap mode

  console.log('Initializing toggle delay system');

  // Initialize slant values for all cells
  for (let i = 0; i < totalCells; i++) {
    slntToggleDelayValues.push(0); // Start at 0, will toggle to -16 on first activation
  }

  // Create the activation order based on delay type
  const delayType = slntToggleDelayType.value;

  if (delayType === 'rowsAscending') {
    // Process rows from top to bottom - only include first cell of each row
    for (let r = 0; r < rows; r++) {
      const cellIndex = r * cols; // First cell of each row
      slntToggleDelayOrder.push(cellIndex);
    }
  } else if (delayType === 'rowsDescending') {
    // Process rows from bottom to top - only include first cell of each row
    for (let r = rows - 1; r >= 0; r--) {
      const cellIndex = r * cols; // First cell of each row
      slntToggleDelayOrder.push(cellIndex);
    }
  } else if (delayType === 'cellsAscending') {
    // Process cells in ascending order (left to right, top to bottom) - skip spaces
    for (let i = 0; i < totalCells; i++) {
      // Skip space cells
      if (!spaceCellIndices.includes(i)) {
        slntToggleDelayOrder.push(i);
      }
    }
  } else if (delayType === 'cellsDescending') {
    // Process cells in descending order (right to left, bottom to top) - skip spaces
    for (let i = totalCells - 1; i >= 0; i--) {
      // Skip space cells
      if (!spaceCellIndices.includes(i)) {
        slntToggleDelayOrder.push(i);
      }
    }
  }

  console.log(`Toggle delay slant initialized: ${slntToggleDelayOrder.length} cells, type: ${delayType}`);
  console.log('First few cells in order:', slntToggleDelayOrder.slice(0, 10));
}

// Initialize smooth random slant system
function initializeSlntSmoothRandom() {
  slntSmoothRandomTimes = [];
  slntSmoothRandomValues = [];
  slntSmoothRandomDirections = [];
  slntSmoothRandomLastValues = []; // Initialize last values tracking
  slntSmoothRandomDirtyCells.clear(); // Clear dirty cells
  randomValueToCellIndex = [];
  cellIndexToRandomIndex.clear();

  // Only initialize for non-space cells
  for (let i = 0; i < totalCells; i++) {
    // Skip space cells - don't initialize them at all
    if (spaceCellIndices.includes(i)) {
      continue;
    }

    // Random time between min and max duration
    const minDuration = parseFloat(slntSmoothRandomMinDuration.value) || DEFAULT_MIN_DURATION;
    const maxDuration = parseFloat(slntSmoothRandomMaxDuration.value) || DEFAULT_MAX_DURATION;
    slntSmoothRandomTimes.push(Math.random() * (maxDuration - minDuration) + minDuration);
    const initialSlnt = parseFloat(slntSlider.value) || 0;
    slntSmoothRandomValues.push(initialSlnt);
    slntSmoothRandomLastValues.push(initialSlnt); // Initialize last values
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

// Event listener for transition time
slntToggleRandomTransition.addEventListener('input', updateTransitionTime);

// Event listener for toggle delay transition time
slntToggleDelayTransition.addEventListener('input', updateToggleDelayTransitionTime);

// Event listeners for toggle delay controls
slntToggleDelayTimeGap.addEventListener('input', () => {
  if (slntToggleDelayActive) {
    console.log('Delay updated to:', parseFloat(slntToggleDelayTimeGap.value) || 0.1);
    // The new delay value will be used by existing waves on their next update
  }
});

slntToggleDelayWaveGap.addEventListener('input', () => {
  // Wave gap changes don't immediately affect the timer, but will be used on next wave
  if (slntToggleDelayActive) {
    console.log('Wave gap updated to:', parseFloat(slntToggleDelayWaveGap.value) || 4.0);
  }
});

slntToggleDelayResetToggle.addEventListener('change', () => {
  if (slntToggleDelayActive) {
    console.log('Reset toggle changed to:', slntToggleDelayResetToggle.checked);

    if (slntToggleDelayResetToggle.checked) {
      // Switching to reset mode: clear waves and reset all cells
      slntToggleDelayWaves = [];
      slntToggleDelayCurrentIndex = 0;
      slntToggleDelayTimer = 0; // Start immediately

      // Reset all cells to default state
      for (let i = 0; i < slntToggleDelayValues.length; i++) {
        slntToggleDelayValues[i] = 0;
      }
      console.log('Toggle delay: switched to reset mode, cleared all cells');
    } else {
      // Switching to wave gap mode: clear sequential state and start waves
      slntToggleDelayCurrentIndex = 0;
      slntToggleDelayWaves = [];
      slntToggleDelayWaveTimer = 0; // Start first wave immediately
      console.log('Toggle delay: switched to wave gap mode, starting waves');
    }
  }
  // Toggle visibility of wave gap field
  toggleWaveGapVisibility();
});

slntToggleDelayType.addEventListener('change', () => {
  if (slntToggleDelayActive) {
    initializeSlntToggleDelay();
  }
});

// Function to toggle wave gap field visibility
function toggleWaveGapVisibility() {
  const waveGapLabel = slntToggleDelayWaveGap.parentElement;
  if (slntToggleDelayResetToggle.checked) {
    // Reset mode: disable wave gap field
    waveGapLabel.classList.remove('wave-gap-hidden');
    waveGapLabel.classList.add('wave-gap-disabled');
    slntToggleDelayWaveGap.disabled = true;
  } else {
    // Wave gap mode: enable wave gap field
    waveGapLabel.classList.remove('wave-gap-hidden');
    waveGapLabel.classList.remove('wave-gap-disabled');
    slntToggleDelayWaveGap.disabled = false;
  }
}

// Function to update transition time
function updateTransitionTime() {
  const transitionTime = slntToggleRandomTransition.value;
  grid.style.setProperty('--slant-toggle-transition', transitionTime + 's');
}

// Function to update toggle delay transition time
function updateToggleDelayTransitionTime() {
  const transitionTime = slntToggleDelayTransition.value;
  grid.style.setProperty('--slant-toggle-transition', transitionTime + 's');
}

// Dark mode toggle functionality
darkModeToggle.addEventListener('change', () => {
  if (darkModeToggle.checked) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
});

// Throttle the animation to 30fps
let currentThrottleLimit = 1000 / 30;
let lastUpdateTime = 0;

function animate() {
  const now = performance.now();

  // Use adaptive throttling for smooth random mode
  const newThrottleLimit = getThrottleLimit();
  if (newThrottleLimit !== currentThrottleLimit) {
    currentThrottleLimit = newThrottleLimit;
    lastUpdateTime = 0; // Reset to allow immediate update with new limit
  }

  if (now - lastUpdateTime >= currentThrottleLimit) {
    updateGrid();
    lastUpdateTime = now;
  }

  requestAnimationFrame(animate);

  // FPS counter - only log if FPS is below 30
  frameCount++;
  if (now - lastFpsTime >= 1000) {
    const fps = frameCount;
    if (fps < 30) {
      console.log('FPS:', fps);
      // Update adaptive thresholds based on performance
      updateChangeThreshold();
    }
    frameCount = 0;
    lastFpsTime = now;
  }
}

fillGrid();
animate();

// Set initial wave gap visibility
toggleWaveGapVisibility();

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

// Easing functions
function easeIn(t) {
  return t * t;
}

function easeOut(t) {
  return 1 - (1 - t) * (1 - t);
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function applyEasing(t, easingType) {
  switch (easingType) {
    case 'easeIn':
      return easeIn(t);
    case 'easeOut':
      return easeOut(t);
    case 'easeInOut':
      return easeInOut(t);
    case 'linear':
    default:
      return t;
  }
}

// Wave class for managing individual waves
class ToggleDelayWave {
  constructor(startTime, delayType, order) {
    this.startTime = startTime;
    this.delayType = delayType;
    this.order = [...order]; // Copy the order array
    this.currentIndex = 0;
    this.timer = 0;
    this.active = true;
  }

  update(deltaTime, timeGap) {
    if (!this.active) return;

    this.timer -= deltaTime;

    if (this.timer <= 0) {
      if (this.currentIndex < this.order.length) {
        // Activate next item in this wave
        const cellIndex = this.order[this.currentIndex];

        // Check if this is a row-based mode
        if (this.delayType === 'rowsAscending' || this.delayType === 'rowsDescending') {
          // For row modes, activate the entire row at once
          const rowIndex = Math.floor(cellIndex / cols);
          const startCellIndex = rowIndex * cols;
          const endCellIndex = startCellIndex + cols;

          // Toggle all cells in this row
          for (let i = startCellIndex; i < endCellIndex; i++) {
            slntToggleDelayValues[i] = slntToggleDelayValues[i] === -16 ? 0 : -16;
          }
        } else {
          // For cell modes, activate just this cell
          slntToggleDelayValues[cellIndex] = slntToggleDelayValues[cellIndex] === -16 ? 0 : -16;
        }

        this.currentIndex++;
        this.timer = timeGap; // Set timer for next activation
      } else {
        // Wave completed
        this.active = false;
      }
    }
  }
}