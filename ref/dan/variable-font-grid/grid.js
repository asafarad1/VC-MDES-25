// grid.js

// Grid dimensions
const rows = 45;
const cols = 60;

let text = "THE QUICK BROWN FOX JUMPS OVER THE LAZY DOG 0123456789".repeat(10);

// Restore grid div
const grid = document.getElementById('grid');
const fileInput = document.getElementById('fileInput');
const weightVideoInput = document.getElementById('weightVideoInput');
const weightVideo = document.getElementById('weightVideo');
const exportBtn = document.getElementById('exportBtn');
const darkModeToggle = document.getElementById('darkModeToggle');

let weightVideoLoaded = false;
let videoDirection = 1; // 1 for forward, -1 for reverse

// Controls
const weightSlider = document.getElementById('weight');
const slntSlider = document.getElementById('slnt');
const caslSlider = document.getElementById('casl');
const crsvSlider = document.getElementById('crsv');

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

// Export function to capture grid as PNG using html2canvas
function exportGridAsPNG() {
  const isDarkMode = document.body.classList.contains('dark-mode');
  const backgroundColor = isDarkMode ? '#000000' : '#ffffff';

  html2canvas(document.querySelector('.grid-wrapper'), {
    backgroundColor: backgroundColor,
    scale: 2, // Higher resolution
    useCORS: true,
    allowTaint: true,
    logging: false
  }).then(canvas => {
    // Create download link
    const link = document.createElement('a');
    link.download = `grid-export-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }).catch(error => {
    console.error('Export failed:', error);
    alert('Export failed. Please try again.');
  });
}

function fillGrid() {
  grid.innerHTML = '';
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = `repeat(${cols}, auto`;
  grid.style.gridTemplateRows = `repeat(${rows}, auto`;

  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const span = document.createElement('span');
      span.className = 'cell';
      span.textContent = text[idx % text.length];
      // span.style.transform = 'translateZ(0)'; // Force GPU acceleration
      grid.appendChild(span);
      idx++;
    }
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
    weightVideo.play();
    weightVideo.loop = false; // Disable normal looping
    weightVideoLoaded = true;
  };
});

// Add event listener for video end
weightVideo.addEventListener('ended', () => {
  videoDirection *= -1; // Reverse direction
  if (videoDirection === 1) {
    weightVideo.play();
  } else {
    weightVideo.currentTime = weightVideo.duration;
    weightVideo.playbackRate = -1;
    weightVideo.play();
  }
});

// Add event listener for video start
weightVideo.addEventListener('play', () => {
  if (videoDirection === -1) {
    weightVideo.playbackRate = -1;
  } else {
    weightVideo.playbackRate = 1;
  }
});

function getGridPixel(ctx, r, c) {
  const data = ctx.getImageData(c, r, 1, 1).data;
  return data[0];
}

function updateGrid() {
  const cells = document.querySelectorAll('.cell');
  let idx = 0;

  if (weightVideoLoaded && !weightVideo.paused) {
    if (weightSampleCanvas.width !== cols || weightSampleCanvas.height !== rows) {
      weightSampleCanvas.width = cols;
      weightSampleCanvas.height = rows;
    }
    weightSampleCtx.drawImage(weightVideo, 0, 0, cols, rows);
    const imageData = weightSampleCtx.getImageData(0, 0, cols, rows);
    const pixels = imageData.data;

    // Create a document fragment for batch DOM updates
    const fragment = document.createDocumentFragment();
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'position: absolute; visibility: hidden;';
    document.body.appendChild(tempDiv);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = cells[idx];
        const pixelIndex = (r * cols + c) * 4;
        const val = pixels[pixelIndex];
        const weight = Math.round(map(val, 0, 255, 1000, 300));
        const slnt = map(val, 0, 255, -15, 0).toFixed(2);

        // Use CSS custom properties for better performance
        cell.style.setProperty('--weight', weight);
        cell.style.setProperty('--slnt', slnt);

        // Apply transform for slant instead of font-variation-settings
        // cell.style.transform = `translateZ(0) skew(${slnt}deg)`;
        cell.style.fontVariationSettings = `'wght' ${weight}, 'slnt' ${slnt}`;

        idx++;
      }
    }

    document.body.removeChild(tempDiv);
  } else {
    // If no video, use slider values for all cells
    const weight = weightSlider.value;
    const slnt = slntSlider.value;

    // Batch update all cells
    requestAnimationFrame(() => {
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        cell.style.setProperty('--weight', weight);
        cell.style.setProperty('--slnt', slnt);
        // cell.style.transform = `translateZ(0) skew(${slnt}deg)`;
        cell.style.fontVariationSettings = `'wght' ${weight}, 'slnt' ${slnt}`;
      }
    });
  }
}

function map(x, in_min, in_max, out_min, out_max) {
  return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

[weightSlider, slntSlider].forEach(input => {
  input.addEventListener('input', updateGrid);
});

// Add export button event listener
exportBtn.addEventListener('click', exportGridAsPNG);

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