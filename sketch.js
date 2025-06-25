let rows = 45;
let cols = 60;
let canvasW = 1080;
let canvasH = 1920;
let cellW, cellH;
let letters = [];
let video;
let videoSlant;
let textInput, videoInput, videoSlantInput;
let loadedText = false, loadedVideo = false, loadedVideoSlant = false;
let textLabel, videoLabel, videoSlantLabel;
let exportBtn;
let fontLoaded = false;

function setup() {
  cellW = canvasW / cols;
  cellH = canvasH / rows;
  createCanvas(canvasW, canvasH);
  textAlign(CENTER, CENTER);
  textSize(cellH * 0.7);
  frameRate(15);

  // UI Container
  let uiContainer = createDiv('');
  uiContainer.position(canvasW + 100, 20); // Move to the right of the canvas
  uiContainer.style('display', 'flex');
  uiContainer.style('flex-direction', 'column');
  uiContainer.style('gap', '20px');

  // Text input section
  textLabel = createDiv('Text file');
  textLabel.parent(uiContainer);
  textInput = createFileInput(handleTextFile);
  textInput.parent(uiContainer);

  // Weight video input section
  videoLabel = createDiv('Weight Video file');
  videoLabel.parent(uiContainer);
  videoInput = createFileInput(handleVideoFile);
  videoInput.parent(uiContainer);

  // Slant video input section
  videoSlantLabel = createDiv('Slant Video file');
  videoSlantLabel.parent(uiContainer);
  videoSlantInput = createFileInput(handleVideoSlantFile);
  videoSlantInput.parent(uiContainer);

  // Export PNG button
  exportBtn = createButton('Export PNG');
  exportBtn.parent(uiContainer);
  exportBtn.mousePressed(() => saveCanvas('grid_export', 'png'));

  // Wait for MarfaVar font to load
  document.fonts.load('100 10px MarfaVar').then(() => {
    fontLoaded = true;
    redraw();
  });
}

function handleTextFile(file) {
  if (file.type === 'text') {
    let lines = file.data.split('\n');
    letters = lines.map(line => line.split('').slice(0, cols));
    loadedText = true;
    redraw();
  }
}

function handleVideoFile(file) {
  if (file.type.startsWith('video')) {
    if (video) {
      video.remove();
    }
    video = createVideo([file.data], () => {
      video.hide();
      video.play();
      video.loop();
      loadedVideo = true;
      loop();
    });
  }
}

function handleVideoSlantFile(file) {
  if (file.type.startsWith('video')) {
    if (videoSlant) {
      videoSlant.remove();
    }
    videoSlant = createVideo([file.data], () => {
      videoSlant.hide();
      videoSlant.play();
      videoSlant.loop();
      loadedVideoSlant = true;
      loop();
    });
  }
}

function draw() {
  background(255);

  if (!loadedText || !loadedVideo || !loadedVideoSlant) return;

  video.loadPixels();
  videoSlant.loadPixels();

  if (!video.pixels.length || !videoSlant.pixels.length) return;

  let vW = video.width;
  let vH = video.height;
  let vSlantW = videoSlant.width;
  let vSlantH = videoSlant.height;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let x = c * cellW;
      let y = r * cellH;

      // Get letter
      let ch = letters[r] && letters[r][c] ? letters[r][c] : ' ';

      // Sample corresponding pixel from weight video
      let vRow = Math.floor(r * vH / rows);
      let vCol = Math.floor(c * vW / cols);
      let idx = 4 * (vRow * vW + vCol);
      let val = video.pixels[idx];

      // Sample corresponding pixel from slant video
      let vSlantRow = Math.floor(r * vSlantH / rows);
      let vSlantCol = Math.floor(c * vSlantW / cols);
      let idxSlant = 4 * (vSlantRow * vSlantW + vSlantCol);
      let valSlant = videoSlant.pixels[idxSlant];

      // Map grayscale to Recursive font axes
      let weight = map(val, 0, 255, 1000, 300); // Recursive's wght: 300–1000
      let slant = map(valSlant, 0, 255, -15, 0); // Recursive's slnt: -15–0
      let mono = 1; // fixed, or map from another source
      let casl = 0; // fixed, or map from another source
      let crsv = 0.5; // fixed, or map from another source

      let pxSize = cellH * 0.7;
      drawingContext.font = `normal ${weight} ${pxSize}px "Recursive"`;
      drawingContext.textAlign = "center";
      drawingContext.textBaseline = "middle";
      drawingContext.fillStyle = "#000";

      // Set all Recursive axes
      drawingContext.fontVariationSettings = `'wght' ${weight}, 'slnt' ${slant}, 'CASL' ${casl}, 'CRSV' ${crsv}, 'MONO' ${mono}`;

      drawingContext.fillText(ch, x + cellW / 2, y + cellH / 2);
    }
  }
}
