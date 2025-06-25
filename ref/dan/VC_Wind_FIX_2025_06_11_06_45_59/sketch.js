let img;
let visited;
let lines = [];

let baseW = 1080;
let baseH = 1920;
let scaleFactor = 1;

let cycleDuration = 7;       // סיבוב + הפסקה
let rotationDuration = 7;    // משך סיבוב בודד
let unitDelay = 0.1;         // דיליי קטן בין שלבי גל

function preload() {
  img = loadImage('ascii_9.jpg');
}

function setup() {
  calculateScale();
  createCanvas(windowWidth, windowHeight);
  pixelDensity(window.devicePixelRatio || 2);

  img.resize(baseW, baseH);
  img.loadPixels();

  visited = Array(baseH).fill().map(() => Array(baseW).fill(false));

  for (let y = 0; y < baseH; y++) {
    for (let x = 0; x < baseW; x++) {
      if (!visited[y][x] && isBlack(x, y)) {
        let cluster = collectCluster(x, y);
        if (cluster.length > 1) {
          let maxDist = 0;
          let a = cluster[0];
          let b = cluster[1];

          for (let i = 0; i < cluster.length; i++) {
            for (let j = i + 1; j < cluster.length; j++) {
              let d = dist(cluster[i].x, cluster[i].y, cluster[j].x, cluster[j].y);
              if (d > maxDist) {
                maxDist = d;
                a = cluster[i];
                b = cluster[j];
              }
            }
          }

          let base = a.y > b.y ? a : b;
          let tip  = a.y > b.y ? b : a;

          let exists = lines.some(l =>
            dist(l.baseX, l.baseY, base.x, base.y) < 5
          );

          if (!exists) {
            let dx = tip.x - base.x;
            let dy = tip.y - base.y;
            let length = dist(tip.x, tip.y, base.x, base.y);
            let angle0 = atan2(dy, dx);

            lines.push({
              baseX: base.x,
              baseY: base.y,
              length: length,
              baseAngle: angle0,
              waveStep: -1 // נאתחל -1, יימצא בהמשך
            });
          }
        }
      }
    }
  }

  calculateWaveSteps();

  noFill();
}

function calculateWaveSteps() {
  if (lines.length === 0) return;

  // מיון לפי עליון-שמאל (baseY ואז baseX)
  lines.sort((a, b) => a.baseY - b.baseY || a.baseX - b.baseX);
  let start = lines[0];

  // נקודת ההתחלה
  let startX = start.baseX;
  let startY = start.baseY;

  let stepRadius = 15; // כמה פיקסלים כל שלב בגל

  for (let l of lines) {
    let d = dist(l.baseX, l.baseY, startX, startY);
    l.waveStep = Math.floor(d / stepRadius);
  }
}

function draw() {
  background(0);

  translate((width - baseW * scaleFactor) / 2, (height - baseH * scaleFactor) / 2);
  scale(scaleFactor);

  // רקע לבן לפוסטר
  noStroke();
  fill(255);
  rect(0, 0, baseW, baseH);

  stroke(0);
  strokeWeight(3);

  let t = millis() / 1000; // זמן בשניות

  for (let l of lines) {
    let localT = t - (l.waveStep * unitDelay);
    let phase = localT % cycleDuration;
    let angle = l.baseAngle;

    if (phase < rotationDuration && phase >= 0) {
      let progress = phase / rotationDuration;
      angle += progress * TWO_PI;
    }

    let tipX = l.baseX + cos(angle) * l.length;
    let tipY = l.baseY + sin(angle) * l.length;

    line(l.baseX, l.baseY, tipX, tipY);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  calculateScale();
}

function calculateScale() {
  let scaleW = windowWidth / baseW;
  let scaleH = windowHeight / baseH;
  scaleFactor = min(scaleW, scaleH);
}

function collectCluster(x, y) {
  let stack = [{ x, y }];
  let cluster = [];

  while (stack.length > 0) {
    let { x, y } = stack.pop();
    if (x < 0 || x >= baseW || y < 0 || y >= baseH) continue;
    if (visited[y][x]) continue;
    if (!isBlack(x, y)) continue;

    visited[y][x] = true;
    cluster.push({ x, y });

    stack.push({ x: x + 1, y: y + 1 });
    stack.push({ x: x - 1, y: y + 1 });
    stack.push({ x: x + 1, y: y - 1 });
    stack.push({ x: x - 1, y: y - 1 });
  }

  return cluster;
}

function isBlack(x, y) {
  let index = (x + y * baseW) * 4;
  let r = img.pixels[index];
  let g = img.pixels[index + 1];
  let b = img.pixels[index + 2];
  return r < 128 && g < 128 && b < 128;
}
