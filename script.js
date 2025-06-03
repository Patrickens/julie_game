// ==== script.js ====

/*
  We choose a "base" resolution of 1920×1080 (16:9). 
  After we compute the actual canvas size (which is also kept at 16:9), 
  we set:
      scale = (canvas.width / BASE_WIDTH)
  and then multiply every hard-coded dimension by that same scale.
*/

const BASE_WIDTH = 1920;
const BASE_HEIGHT = 1080;
let scale = 1;

// ==== Global setup ====
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const btnMove = document.getElementById("btnMove"); // Single movement button
const eventOverlay = document.getElementById("eventOverlay");

// Background music setup
const bgMusic = new Audio('song.mp3');
bgMusic.loop = true;
bgMusic.volume = 0.5; // Set to 50% volume

// Function to start background music
function startBackgroundMusic() {
  // Try to play the music
  const playPromise = bgMusic.play();
  
  if (playPromise !== undefined) {
    playPromise.catch(error => {
      console.log("Auto-play prevented:", error);
      // Add click listener to start music on first user interaction
      document.addEventListener('click', function startMusicOnClick() {
        bgMusic.play();
        document.removeEventListener('click', startMusicOnClick);
      }, { once: true });
    });
  }
}

// Start music when the page loads
window.addEventListener('load', startBackgroundMusic);

// Ensure overlay is hidden at startup
eventOverlay.classList.add("hidden");

// Add debug logging
console.log("Game elements initialized:", {
  canvas: canvas,
  btnMove: btnMove,
  eventOverlay: eventOverlay
});

// We'll store these as "let" so we can recalc them inside resizeCanvas():
let pathHeight = 0;
let treesHeight = 0;

// Game variables that depend on scale (we'll overwrite them after resize)
const character = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  stepSize: 0,
  hairWave: 0
};

const cup = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  isFull: true,
  isVisible: false
};

const book = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  isOpen: true,
  hasDrawing: false,
  isVisible: false
};

const hand = {
  x: 0,
  y: 0,
  angle: 0,
  isVisible: false,
  animationPhase: 0
};

// Dog animation properties (dimensions will be scaled)
const dog = {
  imgDog: new Image(),
  frameHeight: 0,
  frameIndex: 0,
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  speed: 18.15,    // Increased from 15 to 16.5 (10% faster)
  isRunning: false,
  frameCount: 10,
  frameRate: 20,
  count: 0
};

// Sparkles (non-size-critical, but still use scale for offsets if needed)
const sparkles = [];

// Four event spots along the winding path (we'll rebuild these on resize)
let eventSpots = [];

// Track whether event3 (cup/book) is active
let isEvent3Active = false;

// Track which events have fired
const eventsTriggered = {
  event1: false,
  event2: false,
  event3: false,
  event4: false
};

// Tree types: we keep "base" numbers here (un-scaled). When drawing, we multiply by scale.
const treeTypes = [
  {
    color: "#228B22", // Forest green
    height: 60,
    width: 60,
    trunkHeight: 40,
    trunkWidth: 10
  },
  {
    color: "#006400", // Dark green
    height: 50,
    width: 50,
    trunkHeight: 30,
    trunkWidth: 8
  },
  {
    color: "#32CD32", // Lime green
    height: 70,
    width: 70,
    trunkHeight: 45,
    trunkWidth: 12
  },
  {
    color: "#355E3B", // Hunter green
    height: 80,
    width: 80,
    trunkHeight: 50,
    trunkWidth: 15
  }
];

// We'll store actual tree instances here (positions do not need scaling once they're generated in canvas-space)
let trees = [];

// Shrubs (we'll generate sizes * scale)
const shrubs = [];

// Keep track of how many "move" presses remain
let buttonPressesRemaining = 3;

// Character image
const characterImage = new Image();
characterImage.src = 'Julie_char.png';

// ==== RESIZE & SCALE LOGIC ====

function resizeCanvas() {
  // Get the actual screen dimensions
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;

  // Set canvas size to match screen dimensions exactly
  canvas.width = screenWidth;
  canvas.height = screenHeight;

  // Update the CSS size to match
  canvas.style.width = `${screenWidth}px`;
  canvas.style.height = `${screenHeight}px`;

  // Position canvas to fill the entire screen
  canvas.style.position = "fixed";
  canvas.style.top = "0";
  canvas.style.left = "0";
  canvas.style.right = "0";
  canvas.style.bottom = "0";

  // Compute our uniform scale factor (base 1920 wide)
  scale = screenWidth / BASE_WIDTH;

  // Recompute anything that depends on canvas.height or canvas.width
  pathHeight = canvas.height * 0.4;
  treesHeight = canvas.height * 0.3;

  // CHARACTER sizing & position
  character.width = 160 * scale;
  character.height = 240 * scale;
  character.stepSize = 173 * scale;
  character.x = canvas.width * 0.05;
  character.y = getPathY(character.x);

  // CUP sizing & position
  cup.width = 240 * scale;
  cup.height = 300 * scale;
  cup.x = canvas.width - (300 * scale);
  cup.y = canvas.height / 2;

  // BOOK sizing & position
  book.width = 180 * scale;
  book.height = 240 * scale;
  book.x = 150 * scale;
  book.y = canvas.height / 2;

  // DOG sizing & initial position
  dog.width = 246 * scale;
  dog.height = 183 * scale;
  dog.x = -100 * scale;
  dog.y = getPathY(character.x) - 30 * scale;

  // RE-generate trees & shrubs now that the canvas size (and scale) changed
  generateTrees();
  generateShrubs();

  // Reset event spots (positions depend on canvas.width & scale)
  resetEventSpots();
}

// Call resizeCanvas whenever the window changes
window.addEventListener("resize", resizeCanvas);

// Also handle orientation changes specifically
window.addEventListener("orientationchange", () => {
  setTimeout(resizeCanvas, 100); // Small delay to ensure proper dimensions
});

// Initial call
resizeCanvas();

// ==== PATH & SCENE HELPERS ====

// Update the wave frequency to be relative to screen width
const waveFrequency = 0.015 * (1920 / window.innerWidth); // Adjust frequency based on screen width

function getPathY(x) {
  // Winding path via sine wave, adjusted for screen width
  const frequency = 0.005 * (1920 / window.innerWidth); // Adjust frequency based on screen width
  return canvas.height * 0.5 + pathHeight * 0.5 + Math.sin(x * frequency) * (50 * scale);
}

function generateTrees() {
  const treeCount = 200;
  trees = [];
  
  for (let i = 0; i < treeCount; i++) {
    const x = Math.random() * canvas.width;
    const pathY = getPathY(x);
    const maxY = canvas.height; 
    const minDistanceFromPath = 30 * scale;
    const y = pathY + minDistanceFromPath + Math.random() * (maxY - pathY - minDistanceFromPath);
    
    const typeIndex = Math.floor(Math.random() * treeTypes.length);
    const baseType = treeTypes[typeIndex];

    // We store baseType; when drawing, we apply scale
    trees.push({ x: x, y: y, type: baseType });
  }
}

function generateShrubs() {
  const shrubCount = 100;
  shrubs.length = 0;

  for (let i = 0; i < shrubCount; i++) {
    const x = Math.random() * canvas.width;
    const pathY = getPathY(x);
    const y = pathY + (20 * scale) + Math.random() * (30 * scale);

    // Base size 10..25 → multiply by scale
    const baseSize = 10 + Math.random() * 15;
    shrubs.push({
      x: x,
      y: y,
      size: baseSize * scale,
      color: `rgb(${34 + Math.random() * 20}, ${139 + Math.random() * 20}, ${34 + Math.random() * 20})`
    });
  }
}

function resetEventSpots() {
  eventSpots = [];

  // We use "base" pixel distances (350, 500, etc.) but multiply by scale:
  const startX = canvas.width * 0.05;
  // 1st event ~ 350 pixels from the start point (scaled):
  const event1X = startX + 350 * scale;
  const event1Y = getPathY(event1X);
  eventSpots.push({
    x: event1X,
    y: event1Y,
    triggered: false,
    message: "You've reached event #1!"
  });

  // 2nd event is +500 base px (scaled):
  const event2X = event1X + 350 * scale;
  const event2Y = getPathY(event2X);
  eventSpots.push({
    x: event2X,
    y: event2Y,
    triggered: false,
    message: "You've reached event #2!"
  });

  // 3rd event
  const event3X = event2X + 350 * scale;
  const event3Y = getPathY(event3X);
  eventSpots.push({
    x: event3X,
    y: event3Y,
    triggered: false,
    message: "You've reached event #3!"
  });

  // 4th event
  const event4X = event3X + 350 * scale;
  const event4Y = getPathY(event4X);
  eventSpots.push({
    x: event4X,
    y: event4Y,
    triggered: false,
    message: "You've reached event #4!"
  });
}

// ==== SPARKLES ====

function generateSparkles() {
  sparkles.length = 0;
  for (let i = 0; i < 10; i++) {
    sparkles.push({
      x: Math.random() * 100 - 50,  // Random position around character
      y: Math.random() * 100 - 50,
      size: 2 * scale,              // Start small
      maxSize: 8 * scale,           // Maximum size before burst
      color: "rgba(255, 192, 203, 0.8)", // Pink
      burstColor: "rgba(255, 255, 0, 0.8)", // Yellow
      growthRate: 0.1 + Math.random() * 0.2,
      isBursting: false,
      burstProgress: 0,
      rotation: Math.random() * Math.PI * 2
    });
  }
}

function updateSparkles() {
  sparkles.forEach(s => {
    if (!s.isBursting) {
      // Grow the star
      s.size += s.growthRate * scale;
      if (s.size >= s.maxSize) {
        s.isBursting = true;
        s.burstProgress = 0;
      }
    } else {
      // Burst animation
      s.burstProgress += 0.1;
      if (s.burstProgress >= 1) {
        // Reset star
        s.x = Math.random() * 100 - 50;
        s.y = Math.random() * 100 - 50;
        s.size = 2 * scale;
        s.isBursting = false;
      }
    }
  });
}

function drawSparkles() {
  sparkles.forEach(s => {
    ctx.save();
    ctx.translate(character.x + s.x, character.y + s.y);
    ctx.rotate(s.rotation);

    if (!s.isBursting) {
      // Draw growing star
      ctx.fillStyle = s.color;
      drawStar(0, 0, s.size, s.size * 0.5, 5);
    } else {
      // Draw bursting star - three times smaller
      const burstSize = (s.size / 3) * (1 + s.burstProgress);
      ctx.fillStyle = s.burstColor;
      drawStar(0, 0, burstSize, burstSize * 0.5, 5);
      // Add burst rays - also three times smaller
      ctx.strokeStyle = s.burstColor;
      ctx.lineWidth = 2 * scale;
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(
          Math.cos(angle) * burstSize * 1.5,
          Math.sin(angle) * burstSize * 1.5
        );
        ctx.stroke();
      }
    }
    ctx.restore();
  });
}

// Helper function to draw a star
function drawStar(cx, cy, spikes, outerRadius, innerRadius) {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  let step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);
  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }
  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
  ctx.fill();
}

// ==== INPUT HANDLERS ====

btnMove.addEventListener("touchstart", (e) => {
  e.preventDefault();
  if (buttonPressesRemaining > 0 && !isEvent3Active) {
    moveCharacter();
    buttonPressesRemaining--;
    console.log("Touch start - Presses remaining:", buttonPressesRemaining);
  }
});
btnMove.addEventListener("mousedown", () => {
  if (buttonPressesRemaining > 0 && !isEvent3Active) {
    moveCharacter();
    buttonPressesRemaining--;
    console.log("Mouse down - Presses remaining:", buttonPressesRemaining);
  }
});

// ==== DRAWING ROUTINES ====

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawRiver() {
  // Draw river background with curved bottom
  ctx.fillStyle = "#5CACEE";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(canvas.width, 0);
  ctx.lineTo(canvas.width, canvas.height);
  
  // Curved bottom following path
  for (let x = canvas.width; x >= 0; x -= 5) {
    const y = getPathY(x);
    ctx.lineTo(x, y);
  }
  
  ctx.closePath();
  ctx.fill();

  // Draw five sets of waves
  const waveColors = ["#4A90E2", "#357ABD", "#2E5C8A", "#4A90E2", "#357ABD"];
  const waveOffsets = [waveOffset1, waveOffset2, waveOffset3, waveOffset4, waveOffset5];
  const waveHeights = [0.1, 0.25, 0.4, 0.55, 0.7];

  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = waveColors[i];
    ctx.lineWidth = 2 * scale;
    ctx.beginPath();
    
    for (let x = 0; x < canvas.width; x += 5) {
      const pathY = getPathY(x);
      const waterHeight = pathY;
      const waveY = waterHeight * waveHeights[i];
      const adjustedFrequency = waveFrequency * (1920 / window.innerWidth);
      const y = waveY + Math.sin(x * adjustedFrequency + waveOffsets[i]) * (waveHeight * scale);
      
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Foam effect
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x += 5) {
      const pathY = getPathY(x);
      const waveY = pathY * waveHeights[i];
      const adjustedFrequency = waveFrequency * (1920 / window.innerWidth);
      const y = waveY + Math.sin(x * adjustedFrequency + waveOffsets[i]) * (waveHeight * scale);
      
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.lineTo(canvas.width, 0);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
  }
  
  // Update wave offsets for animation
  waveOffset1 += waveSpeed;
  waveOffset2 += waveSpeed * 1.2;
  waveOffset3 += waveSpeed * 0.8;
  waveOffset4 += waveSpeed * 1.1;
  waveOffset5 += waveSpeed * 0.9;
}

function drawPath() {
  // Forest-floor base
  ctx.fillStyle = "#D2B48C"; // Tan
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  for (let x = 0; x < canvas.width; x += 5) {
    const y = getPathY(x);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fill();

  // Path stroke
  ctx.strokeStyle = "#8B4513"; // Saddle brown
  ctx.lineWidth = 40 * scale;
  ctx.beginPath();
  for (let x = 0; x < canvas.width; x += 5) {
    const y = getPathY(x);
    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  // Path texture
  ctx.strokeStyle = "#A0522D"; // Sienna
  ctx.lineWidth = 2 * scale;
  for (let x = 0; x < canvas.width; x += 20) {
    const y = getPathY(x);
    ctx.beginPath();
    ctx.moveTo(x, y - (15 * scale));
    ctx.lineTo(x + (10 * scale), y - (5 * scale));
  ctx.stroke();
}
}

function drawTrees() {
  trees.forEach(tree => {
    const base = tree.type;
    const scaledWidth = base.width * scale;
    const scaledHeight = base.height * scale;
    const scaledTrunkW = base.trunkWidth * scale;
    const scaledTrunkH = base.trunkHeight * scale;

    ctx.save();
    ctx.translate(tree.x, tree.y);
    
    // Draw trunk
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(
      -scaledTrunkW / 2,
      0,
      scaledTrunkW,
      scaledTrunkH
    );
    
    // Draw canopy
    ctx.fillStyle = base.color;
    ctx.beginPath();
    ctx.moveTo(-scaledWidth / 2, 0);
    ctx.lineTo(scaledWidth / 2, 0);
    ctx.lineTo(0, -scaledHeight);
    ctx.closePath();
    ctx.fill();
    
    // Some detail lines
    ctx.strokeStyle = "#006400";
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(-scaledWidth / 4, -scaledHeight / 3);
    ctx.lineTo(scaledWidth / 4, -scaledHeight / 2);
    ctx.stroke();
    
    ctx.restore();
  });
}

function drawShrubs() {
  shrubs.forEach(shrub => {
    ctx.fillStyle = shrub.color;
    ctx.beginPath();
    ctx.arc(shrub.x, shrub.y, shrub.size, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(0, 100, 0, 0.3)";
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.arc(shrub.x, shrub.y, shrub.size * 0.7, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawCharacter() {
  ctx.save();
  ctx.translate(character.x, character.y);
  ctx.drawImage(
    characterImage,
    -character.width / 2,
    -character.height / 2,
    character.width,
    character.height
  );
  ctx.restore();
  drawSparkles();
}

function drawCup() {
  if (!cup.isVisible) return;

  // Cup body
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.strokeStyle = "rgba(139, 69, 19, 0.8)";
  ctx.lineWidth = 3 * scale;

  // Draw main cup body with more natural curve
  ctx.beginPath();
  ctx.moveTo(cup.x + (cup.width * 0.1), cup.y);
  ctx.lineTo(cup.x + (cup.width * 0.9), cup.y);
  ctx.bezierCurveTo(
    cup.x + cup.width + (cup.width * 0.1), cup.y + (cup.height * 0.2),
    cup.x + cup.width + (cup.width * 0.1), cup.y + (cup.height * 0.8),
    cup.x + (cup.width * 0.9), cup.y + cup.height
  );
  ctx.lineTo(cup.x + (cup.width * 0.1), cup.y + cup.height);
  ctx.bezierCurveTo(
    cup.x - (cup.width * 0.1), cup.y + (cup.height * 0.8),
    cup.x - (cup.width * 0.1), cup.y + (cup.height * 0.2),
    cup.x + (cup.width * 0.1), cup.y
  );
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Handle with better proportions (moved to left side and made thicker)
  ctx.lineWidth = 8 * scale; // Made handle thicker
  ctx.beginPath();
  ctx.moveTo(cup.x, cup.y + (cup.height * 0.2));
  ctx.bezierCurveTo(
    cup.x - (cup.width * 0.4), cup.y + (cup.height * 0.2),
    cup.x - (cup.width * 0.4), cup.y + (cup.height * 0.8),
    cup.x, cup.y + (cup.height * 0.8)
  );
  ctx.stroke();

  // Liquid if full
  if (cup.isFull) {
    const gradient = ctx.createLinearGradient(
      cup.x,
      cup.y + (cup.height * 0.2),
      cup.x,
      cup.y + cup.height - (cup.height * 0.1)
    );
    gradient.addColorStop(0, "rgba(139, 69, 19, 0.8)");
    gradient.addColorStop(1, "rgba(101, 67, 33, 0.8)");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(cup.x + (cup.width * 0.15), cup.y + (cup.height * 0.2));
    ctx.lineTo(cup.x + (cup.width * 0.85), cup.y + (cup.height * 0.2));
    ctx.bezierCurveTo(
      cup.x + cup.width - (cup.width * 0.1), cup.y + (cup.height * 0.4),
      cup.x + cup.width - (cup.width * 0.1), cup.y + (cup.height * 0.6),
      cup.x + (cup.width * 0.85), cup.y + cup.height - (cup.height * 0.1)
    );
    ctx.lineTo(cup.x + (cup.width * 0.15), cup.y + cup.height - (cup.height * 0.1));
    ctx.bezierCurveTo(
      cup.x + (cup.width * 0.1), cup.y + (cup.height * 0.6),
      cup.x + (cup.width * 0.1), cup.y + (cup.height * 0.4),
      cup.x + (cup.width * 0.15), cup.y + (cup.height * 0.2)
    );
    ctx.closePath();
    ctx.fill();

    // Steam effect
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2 * scale;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cup.x + (cup.width * 0.5), cup.y);
      ctx.quadraticCurveTo(
        cup.x + (cup.width * 0.5) + (20 * Math.sin(Date.now() / 500 + i) * scale),
        cup.y - (30 * scale) - (i * 15 * scale),
        cup.x + (cup.width * 0.5) + (40 * Math.sin(Date.now() / 500 + i) * scale),
        cup.y - (60 * scale) - (i * 15 * scale)
      );
      ctx.stroke();
    }
  } else {
    // Residue if empty
    ctx.fillStyle = "rgba(139, 69, 19, 0.2)";
    ctx.beginPath();
    ctx.moveTo(cup.x + (cup.width * 0.15), cup.y + cup.height - (cup.height * 0.15));
    ctx.lineTo(cup.x + (cup.width * 0.85), cup.y + cup.height - (cup.height * 0.15));
    ctx.lineTo(cup.x + (cup.width * 0.85), cup.y + cup.height - (cup.height * 0.1));
    ctx.lineTo(cup.x + (cup.width * 0.15), cup.y + cup.height - (cup.height * 0.1));
    ctx.closePath();
    ctx.fill();
  }
}

function drawBook() {
  if (!book.isVisible) return;

  // Book cover
  ctx.fillStyle = "#8B4513";
  ctx.beginPath();
  ctx.roundRect(book.x, book.y, book.width, book.height, 5 * scale);
  ctx.fill();

  // Spine
  ctx.fillStyle = "#654321";
  ctx.beginPath();
  ctx.roundRect(book.x + book.width / 2 - (3 * scale), book.y + (5 * scale), (6 * scale), book.height - (10 * scale), 2 * scale);
  ctx.fill();

  // Pages
  const pageWidth = book.width / 2 - (8 * scale);
  const pageHeight = book.height - (10 * scale);
  const leftPageX = book.x + (5 * scale);
  const rightPageX = book.x + book.width / 2 + (3 * scale);
  const pageY = book.y + (5 * scale);

  ctx.fillStyle = "#FFF8DC";
  ctx.beginPath();
  ctx.roundRect(leftPageX, pageY, pageWidth, pageHeight, 3 * scale);
  ctx.fill();

  ctx.beginPath();
  ctx.roundRect(rightPageX, pageY, pageWidth, pageHeight, 3 * scale);
  ctx.fill();

  if (book.hasDrawing) {
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1 * scale;

    const lineSpacing = pageHeight / 8;
    const startY = pageY + lineSpacing;
    const endY = pageY + pageHeight - lineSpacing;
    const leftPageEndX = leftPageX + pageWidth - (20 * scale);
    const rightPageEndX = rightPageX + pageWidth - (20 * scale);

    // Left-page squiggles
    for (let y = startY; y < endY; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(leftPageX + (20 * scale), y);
      let x = leftPageX + (20 * scale);
      while (x < leftPageEndX) {
        const nextX = x + (15 * scale);
        ctx.quadraticCurveTo(
          x + (7.5 * scale),
          y - (10 * scale) + Math.sin(Date.now() / 1000 + x) * (8 * scale),
          nextX,
          y
        );
        x = nextX;
      }
      ctx.stroke();
    }

    // Right-page squiggles
    for (let y = startY; y < endY; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(rightPageX + (20 * scale), y);
      let x = rightPageX + (20 * scale);
      while (x < rightPageEndX) {
        const nextX = x + (15 * scale);
        ctx.quadraticCurveTo(
          x + (7.5 * scale),
          y - (10 * scale) + Math.cos(Date.now() / 1000 + x) * (8 * scale),
          nextX,
          y
        );
        x = nextX;
      }
    ctx.stroke();
  }
  
    // Random dots
    for (let i = 0; i < 15; i++) {
      // Left-page dot
      ctx.beginPath();
      ctx.arc(
        leftPageX + (30 * scale) + Math.random() * (pageWidth - (40 * scale)),
        pageY + (30 * scale) + Math.random() * (pageHeight - (60 * scale)),
        1 * scale,
        0,
        Math.PI * 2
      );
      ctx.fill();

      // Right-page dot
      ctx.beginPath();
      ctx.arc(
        rightPageX + (30 * scale) + Math.random() * (pageWidth - (40 * scale)),
        pageY + (30 * scale) + Math.random() * (pageHeight - (60 * scale)),
        1 * scale,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }
}

function drawHand() {
  if (!hand.isVisible) return;

  // Animate hand
  hand.animationPhase += 0.05;
  const baseX = book.x - (book.width * 0.3); // Moved hand to the left
  const baseY = book.y + book.height / 2;

  hand.x = baseX + Math.sin(hand.animationPhase) * (10 * scale);
  hand.y = baseY + Math.cos(hand.animationPhase) * (5 * scale);
  hand.angle = Math.sin(hand.animationPhase * 0.5) * 0.2;

  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(hand.angle);

  // Draw palm (ellipse) - tripled size
  ctx.fillStyle = "#FFE4C4";
  ctx.beginPath();
  ctx.ellipse(0, 0, 45 * scale, 30 * scale, 0, 0, Math.PI * 2);
  ctx.fill();

  // Draw pencil body - tripled size
  ctx.fillStyle = "#8B4513";
  ctx.beginPath();
  ctx.moveTo(60 * scale, -6 * scale);
  ctx.lineTo(105 * scale, -6 * scale);
  ctx.lineTo(105 * scale, 6 * scale);
  ctx.lineTo(60 * scale, 6 * scale);
  ctx.closePath();
  ctx.fill();

  // Pencil tip - tripled size
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.moveTo(105 * scale, -6 * scale);
  ctx.lineTo(120 * scale, 0);
  ctx.lineTo(105 * scale, 6 * scale);
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}

function drawDog() {
  if (!dog.isRunning) return;

  // Update animation frames
  if (dog.frameIndex > 0 && dog.frameIndex % 5 === 0) {
    dog.frameIndex = 0;
    dog.frameHeight += 61; // Use original sprite height
  }
  if (dog.count === 9) {
    dog.frameIndex = 0;
    dog.frameHeight = 0;
    dog.count = 0;
  }

  const currFrameX = 82 * (dog.frameIndex % dog.frameCount); // Use original sprite width
  dog.imgDog.src = 'pug-running_transparent.png';
  ctx.drawImage(
    dog.imgDog,
    currFrameX, dog.frameHeight,
    82, 61,           // original sprite frame size (unscaled)
    dog.x, dog.y,
    dog.width, dog.height
  );
}

function drawCharacter() {
  ctx.save();
  ctx.translate(character.x, character.y);
  ctx.drawImage(
    characterImage,
    -character.width / 2,
    -character.height / 2,
    character.width,
    character.height
  );
  ctx.restore();
  drawSparkles();
}

// ==== EVENT LOGIC ====

function showEvent() {
  console.log("Showing tarot cards event");
  eventOverlay.classList.remove("hidden");
  btnMove.disabled = true;

  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      card.classList.add('flipped');

      const allFlipped = Array.from(cards).every(c => c.classList.contains('flipped'));
      if (allFlipped) {
        setTimeout(() => {
          eventOverlay.classList.add("hidden");
          cards.forEach(c => c.classList.remove('flipped'));
          buttonPressesRemaining = 5; // After tarot, allow 5 moves
          btnMove.disabled = false;
        }, 1000);
      }
    });
  });
}

function showDogEvent() {
  // Create and play barking sound
  const barkSound = new Audio('dog_barking.mp3');
  barkSound.play().catch(error => {
    console.log("Audio playback failed:", error);
  });

  dog.isRunning = true;
  dog.x = -100 * scale;
  dog.y = getPathY(character.x) - (30 * scale);
  dog.frameIndex = 0;
  dog.frameHeight = 0;
  dog.count = 0;
  btnMove.disabled = true;

  // Re-enable button after dog runs off screen
  const checkDog = setInterval(() => {
    if (!dog.isRunning) {
      clearInterval(checkDog);
      btnMove.disabled = false;
    }
  }, 100);
}

function showCupAndBookEvent() {
  cup.isVisible = true;
  cup.isFull = true;
  book.isVisible = true;
  book.hasDrawing = false;
  hand.isVisible = true;
  isEvent3Active = true;
  btnMove.disabled = true;

  btnMove.disabled = true;
  canvas.addEventListener('click', handleCupAndBookClick);
}

function handleCupAndBookClick(event) {
  const rect = canvas.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;

  // Cup click
  if (
    clickX >= cup.x && clickX <= cup.x + cup.width &&
    clickY >= cup.y && clickY <= cup.y + cup.height
  ) {
    cup.isFull = false;
  }

  // Book click
  if (
    clickX >= book.x && clickX <= book.x + book.width &&
    clickY >= book.y && clickY <= book.y + book.height
  ) {
    book.hasDrawing = true;
  }

  // If both done, hide after 0.5s
  if (!cup.isFull && book.hasDrawing) {
    setTimeout(() => {
      cup.isVisible = false;
      book.isVisible = false;
      hand.isVisible = false;
      canvas.removeEventListener('click', handleCupAndBookClick);
      buttonPressesRemaining = 5;
      btnMove.disabled = false;
      isEvent3Active = false;
      eventsTriggered.event3 = true;
    }, 500);
  }
}

function showTreeHugEvent() {
  btnMove.disabled = true;
  
  // Create overlay for tree hug
  const overlay = document.createElement('div');
  overlay.id = 'treeHugOverlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100%';
  overlay.style.height = '100%';
  overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.zIndex = '100';

  const gif = document.createElement('img');
  gif.src = 'tree_huggin.gif';
  gif.style.maxWidth = '80%';
  gif.style.maxHeight = '80%';
  overlay.appendChild(gif);

  document.body.appendChild(overlay);

  setTimeout(() => {
    overlay.remove();
    buttonPressesRemaining = 5;
    btnMove.disabled = false;
  }, 10000);
}

function showFinalEvent() {
  btnMove.disabled = true;
  let gifCount = 0;
  const maxGifs = 2; // Reduced to 2 since we'll loop the last one infinitely

  function showNextGif() {
    if (gifCount >= maxGifs) {
      // Show the final GIF and keep it looping
      const overlay = document.createElement('div');
      overlay.id = 'finalEventOverlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
      overlay.style.display = 'flex';
      overlay.style.justifyContent = 'center';
      overlay.style.alignItems = 'center';
      overlay.style.zIndex = '1000';

      const gif = document.createElement('img');
      gif.src = 'happy_birthday.gif';
      gif.style.maxWidth = '80%';
      gif.style.maxHeight = '80%';
      overlay.appendChild(gif);

      document.body.appendChild(overlay);
      return; // Don't set timeout for the final GIF
    }

    const overlay = document.createElement('div');
    overlay.id = 'finalEventOverlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '1000';

    const gif = document.createElement('img');
    gif.src = 'happy_birthday.gif';
    gif.style.maxWidth = '80%';
    gif.style.maxHeight = '80%';
    overlay.appendChild(gif);

    document.body.appendChild(overlay);

    setTimeout(() => {
      overlay.remove();
      gifCount++;
      showNextGif();
    }, 3000);
  }

  showNextGif();
}

// ==== EVENT CHECKER & MOVEMENT ====

function moveCharacter() {
  if (btnMove.disabled) return;
  
  character.x += character.stepSize;
  character.y = getPathY(character.x);
  
  if (character.x > canvas.width - character.width) {
    showFinalEvent();
    btnMove.disabled = true;
  }
}

function checkForEvents() {
  for (let i = 0; i < eventSpots.length; i++) {
    const spot = eventSpots[i];
    if (
      !spot.triggered &&
      Math.abs(character.x - spot.x) < character.width &&
      Math.abs(character.y - spot.y) < character.height
    ) {
      console.log("Event triggered:", i, "at position:", character.x, character.y);
      spot.triggered = true;

      if (i === 0) {
        // First event: tarot cards
        showEvent();
      } else if (i === 1) {
        // Second event: dog
        showDogEvent();
        buttonPressesRemaining = 5;
      } else if (i === 2) {
        // Third event: cup & book
        showCupAndBookEvent();
        buttonPressesRemaining = 3;
      } else if (i === 3) {
        // Fourth event: tree hugging
        showTreeHugEvent();
        btnMove.disabled = true;
      }
      break;
    }
  }
}

function updateCharacterPosition() {
  // (hair wave, etc.)
  character.hairWave += 0.1;
}

function updateDog() {
  if (dog.isRunning) {
    dog.x += dog.speed * scale; // we scale the speed as well
    dog.y = getPathY(dog.x) - (30 * scale);
    if (dog.x > canvas.width + (100 * scale)) {
      dog.isRunning = false;
      dog.x = -100 * scale;
    }
  }
}

// Animate dog frames
setInterval(() => {
  if (dog.isRunning) {
    ++dog.frameIndex;
    dog.count++;
    if (dog.frameIndex > 0 && dog.frameIndex % 5 === 0) {
      dog.frameIndex = 0;
      dog.frameHeight += 61; // Use original sprite height
    }
    if (dog.count === 9) {
      dog.frameIndex = 0;
      dog.frameHeight = 0;
      dog.count = 0;
    }
  }
}, 1000 / dog.frameRate);

// ==== GAME LOOP ====

function gameLoop() {
  clearCanvas();
  drawRiver();
  drawPath();
  drawShrubs();
  drawTrees();
  updateCharacterPosition();
  updateSparkles();
  drawCharacter();
  updateDog();
  drawDog();
  drawCup();
  drawBook();
  drawHand();
  checkForEvents();
  requestAnimationFrame(gameLoop);
}

// Initialize sparkles and game state
generateSparkles();
resetEventSpots();

// Kick off
console.log("Initializing game...");
buttonPressesRemaining = 3;
console.log("Starting game loop...");
requestAnimationFrame(gameLoop);

// ==== WAVE ANIMATION GLOBALS (after everything) ====
let waveOffset1 = 0;
let waveOffset2 = 0;
let waveOffset3 = 0;
let waveOffset4 = 0;
let waveOffset5 = 0;
const waveSpeed = 0.05;
const waveHeight = 8;

