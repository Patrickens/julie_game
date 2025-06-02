// ==== Global setup ====
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const btnMove = document.getElementById("btnMove"); // Single movement button
const eventOverlay = document.getElementById("eventOverlay");

// Ensure overlay is hidden at startup
eventOverlay.classList.add("hidden");

// Add debug logging
console.log("Game elements initialized:", {
  canvas: canvas,
  btnMove: btnMove,
  eventOverlay: eventOverlay
});

// Adjust canvas size to a 16:9 aspect ratio, letterboxing in black as needed
function resizeCanvas() {
  // Compute the area above controls (controls are 60px tall at the bottom)
  const availableWidth = window.innerWidth;
  const availableHeight = window.innerHeight - 60;

  // Desired 16:9 ratio: width / height = 16/9
  const targetAspect = 16 / 9;

  let newWidth, newHeight;

  // Check whether width or height is the limiting factor
  if (availableWidth / availableHeight > targetAspect) {
    // Available area is “too wide” for 16:9; height is the limiter.
    newHeight = availableHeight;
    newWidth = Math.floor(availableHeight * targetAspect);
  } else {
    // Available area is “too tall” or just fits; width is the limiter.
    newWidth = availableWidth;
    newHeight = Math.floor(availableWidth / targetAspect);
  }

  // Set the canvas drawing buffer to the computed size (this sets ctx coordinate system)
  canvas.width = newWidth;
  canvas.height = newHeight;

  // Set the CSS size so it's exactly that many pixels on‐screen
  canvas.style.width = `${newWidth}px`;
  canvas.style.height = `${newHeight}px`;

  // Position it absolutely so we can center it in the “letterbox” area
  canvas.style.position = "absolute";

  // Center horizontally within availableWidth
  const leftOffset = Math.floor((availableWidth - newWidth) / 2);
  // Center vertically within availableHeight (remember controls are at the bottom)
  const topOffset = Math.floor((availableHeight - newHeight) / 2);

  canvas.style.left = `${leftOffset}px`;
  canvas.style.top = `${topOffset}px`;
}

// Listen for window resizes
window.addEventListener("resize", () => {
  resizeCanvas();
  // If you regenerate scenery on resize, do that here:
  generateTrees();
  generateShrubs();
});

// Run it once on load
resizeCanvas();

// ==== Game variables ====
// Remove the fixed river height since it will now extend from path to top
let pathHeight = canvas.height * 0.4; // Path takes up 40% of the canvas
let treesHeight = canvas.height * 0.3; // Trees take up 30% of the canvas

// Wave animation variables
let waveOffset1 = 0;
let waveOffset2 = 0;
let waveOffset3 = 0;
let waveOffset4 = 0;
let waveOffset5 = 0;
const waveSpeed = 0.05;
const waveHeight = 8;
const waveFrequency = 0.015;

// Add character image
const characterImage = new Image();
characterImage.src = 'Julie_char.png';

// Add sparkle properties
const sparkles = [];
function generateSparkles() {
  sparkles.length = 0;
  for (let i = 0; i < 10; i++) {
    sparkles.push({
      x: 0,
      y: 0,
      size: 3 + Math.random() * 4,
      angle: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1,
      opacity: 0.3 + Math.random() * 0.7
    });
  }
}

function updateSparkles() {
  sparkles.forEach(sparkle => {
    sparkle.angle += 0.1;
    sparkle.x = Math.cos(sparkle.angle) * 20;
    sparkle.y = Math.sin(sparkle.angle) * 20 - 30;
  });
}

function drawSparkles() {
  sparkles.forEach(sparkle => {
    ctx.save();
    ctx.translate(character.x, character.y);
    ctx.fillStyle = `rgba(255, 192, 203, ${sparkle.opacity})`; // Pink with varying opacity
    ctx.beginPath();
    ctx.arc(sparkle.x, sparkle.y, sparkle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// Update character properties
const character = {
  x: canvas.width * 0.05,
  y: canvas.height * 0.5,
  width: 160,
  height: 240,
  stepSize: 173,
  hairWave: 0
};

// Define four event spots along the winding path
let eventSpots = [];
function resetEventSpots() {
  eventSpots = [];
  // First event after ~350px from start
  const event1X = canvas.width * 0.05 + 350;
  const event1Y = getPathY(event1X);
  eventSpots.push({
    x: event1X,
    y: event1Y,
    triggered: false,
    message: "You've reached event #1!"
  });

  // Second event
  const event2X = event1X + 350;
  const event2Y = getPathY(event2X);
  eventSpots.push({
    x: event2X,
    y: event2Y,
    triggered: false,
    message: "You've reached event #2!"
  });

  // Third event
  const event3X = event2X + 350;
  const event3Y = getPathY(event3X);
  eventSpots.push({
    x: event3X,
    y: event3Y,
    triggered: false,
    message: "You've reached event #3!"
  });

  // Fourth event
  const event4X = event3X + 350;
  const event4Y = getPathY(event4X);
  eventSpots.push({
    x: event4X,
    y: event4Y,
    triggered: false,
    message: "You've reached event #4!"
  });
}

// Input state
let buttonPressesRemaining = 3; // Track remaining button presses

// Tree types with different properties
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

// Generate random trees
let trees = [];
function generateTrees() {
  const treeCount = 200;
  trees = [];
  
  for (let i = 0; i < treeCount; i++) {
    const x = Math.random() * canvas.width;
    // Calculate y position between path and bottom of canvas
    const pathY = getPathY(x);
    const maxY = canvas.height;
    // Add minimum distance from path (30px)
    const minDistanceFromPath = 30;
    const y = pathY + minDistanceFromPath + Math.random() * (maxY - pathY - minDistanceFromPath);
    
    const type = treeTypes[Math.floor(Math.random() * treeTypes.length)];
    
    trees.push({
      x: x,
      y: y,
      type: type
    });
  }
}

// Add shrub properties
const shrubs = [];
function generateShrubs() {
  const shrubCount = 100;
  shrubs.length = 0;
  
  for (let i = 0; i < shrubCount; i++) {
    const x = Math.random() * canvas.width;
    const pathY = getPathY(x);
    const y = pathY + 20 + Math.random() * 30; // Position shrubs just above the path
    
    shrubs.push({
      x: x,
      y: y,
      size: 10 + Math.random() * 15,
      color: `rgb(${34 + Math.random() * 20}, ${139 + Math.random() * 20}, ${34 + Math.random() * 20})` // shades of green
    });
  }
}

// Call generateTrees & generateShrubs when canvas is resized
window.addEventListener("resize", () => {
  // (resizeCanvas already fires above, so canvas dimensions are up-to-date)
  generateTrees();
  generateShrubs();
});

// Generate initial trees & shrubs
generateTrees();
generateShrubs();

// ==== Input Handlers ====
// Track event state
let isEvent3Active = false;

// Touch or mouse on “Move” button
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

// ==== Game Loop & Drawing ====
function drawRiver() {
  // Draw river background with curved bottom
  ctx.fillStyle = "#5CACEE";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(canvas.width, 0);
  ctx.lineTo(canvas.width, canvas.height);
  
  // Draw the curved bottom of the river following the path
  for (let x = canvas.width; x >= 0; x -= 5) {
    const y = getPathY(x);
    ctx.lineTo(x, y);
  }
  
  ctx.closePath();
  ctx.fill();

  // Draw five sets of waves at different heights
  const waveColors = ["#4A90E2", "#357ABD", "#2E5C8A", "#4A90E2", "#357ABD"];
  const waveOffsets = [waveOffset1, waveOffset2, waveOffset3, waveOffset4, waveOffset5];
  const waveHeights = [0.1, 0.25, 0.4, 0.55, 0.7]; // Fractional heights from top

  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = waveColors[i];
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let x = 0; x < canvas.width; x += 5) {
      const pathY = getPathY(x);
      const waterHeight = pathY; // Height from top to path
      const waveY = waterHeight * waveHeights[i];
      const y = waveY + Math.sin(x * waveFrequency + waveOffsets[i]) * waveHeight;
      
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Add foam effect
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x += 5) {
      const pathY = getPathY(x);
      const waveY = pathY * waveHeights[i];
      const y = waveY + Math.sin(x * waveFrequency + waveOffsets[i]) * waveHeight;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    // Close the path to the top
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
  // Draw forest floor base
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

  // Draw path stroke
  ctx.strokeStyle = "#8B4513"; // Saddle brown
  ctx.lineWidth = 40;
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

  // Add some texture
  ctx.strokeStyle = "#A0522D"; // Sienna
  ctx.lineWidth = 2;
  for (let x = 0; x < canvas.width; x += 20) {
    const y = getPathY(x);
    ctx.beginPath();
    ctx.moveTo(x, y - 15);
    ctx.lineTo(x + 10, y - 5);
    ctx.stroke();
  }
}

function getPathY(x) {
  // Winding path via sine wave
  return canvas.height * 0.5 + pathHeight * 0.5 + Math.sin(x * 0.005) * 50;
}

function drawTrees() {
  trees.forEach(tree => {
    ctx.save();
    ctx.translate(tree.x, tree.y);
    
    // Trunk
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(
      -tree.type.trunkWidth / 2,
      0,
      tree.type.trunkWidth,
      tree.type.trunkHeight
    );
    
    // Canopy
    ctx.fillStyle = tree.type.color;
    ctx.beginPath();
    ctx.moveTo(-tree.type.width / 2, 0);
    ctx.lineTo(tree.type.width / 2, 0);
    ctx.lineTo(0, -tree.type.height);
    ctx.closePath();
    ctx.fill();
    
    // Some detail
    ctx.strokeStyle = "#006400";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-tree.type.width / 4, -tree.type.height / 3);
    ctx.lineTo(tree.type.width / 4, -tree.type.height / 2);
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
    
    // Some detail
    ctx.strokeStyle = "rgba(0, 100, 0, 0.3)";
    ctx.lineWidth = 1;
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

function showEvent() {
  console.log("Showing tarot cards event");
  eventOverlay.classList.remove("hidden");
  
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      card.classList.add('flipped');
      
      const allFlipped = Array.from(cards).every(c => c.classList.contains('flipped'));
      if (allFlipped) {
        setTimeout(() => {
          eventOverlay.classList.add("hidden");
          cards.forEach(c => c.classList.remove('flipped'));
          buttonPressesRemaining = 5; // After tarot cards, allow 5 moves
        }, 1000);
      }
    });
  });
}

function resetGame() {
  character.x = canvas.width * 0.05;
  character.y = getPathY(character.x);
  resetEventSpots();
  eventOverlay.classList.add("hidden");
  buttonPressesRemaining = 3; // Reset
}

function moveCharacter() {
  character.x += character.stepSize;
  character.y = getPathY(character.x);
  
  if (character.x > canvas.width - character.width) {
    showFinalEvent();
    btnMove.disabled = true;
  }
}

function updateCharacterPosition() {
  // Wiggle hair, etc.
  character.hairWave += 0.1;
}

// Dog animation properties
const dog = {
  imgDog: new Image(),
  frameHeight: 0,
  frameIndex: 0,
  x: -100,
  y: 0,
  width: 82,
  height: 61,
  speed: 5,
  isRunning: false,
  frameCount: 10,
  frameRate: 20,
  count: 0
};

function drawDog() {
  if (!dog.isRunning) return;
  
  if (dog.frameIndex > 0 && dog.frameIndex % 5 === 0) {
    dog.frameIndex = 0;
    dog.frameHeight += 61;
  }
  if (dog.count === 9) {
    dog.frameIndex = 0;
    dog.frameHeight = 0;
    dog.count = 0;
  }
  
  const currFrameX = 82 * (dog.frameIndex % dog.frameCount);
  dog.imgDog.src = 'pug-running_transparent.png';
  ctx.drawImage(dog.imgDog, currFrameX, dog.frameHeight, 82, 61, dog.x, dog.y, 82, 61);
}

function updateDog() {
  if (dog.isRunning) {
    dog.x += dog.speed;
    dog.y = getPathY(dog.x) - 30;
    if (dog.x > canvas.width + 100) {
      dog.isRunning = false;
      dog.x = -100;
    }
  }
}

function showDogEvent() {
  dog.isRunning = true;
  dog.x = -100;
  dog.y = getPathY(character.x) - 30;
  dog.frameIndex = 0;
  dog.frameHeight = 0;
  dog.count = 0;
}

setInterval(function() {
  if (dog.isRunning) {
    ++dog.frameIndex;
    dog.count++;
  }
}, 1000 / dog.frameRate);

// New event elements: cup & book / hand
const cup = {
  x: canvas.width - 150,
  y: canvas.height / 2,
  width: 80,
  height: 100,
  isFull: true,
  isVisible: false
};

const book = {
  x: 100,
  y: canvas.height / 2,
  width: 120,
  height: 160,
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

function drawCup() {
  if (!cup.isVisible) return;
  
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.strokeStyle = "rgba(139, 69, 19, 0.8)";
  ctx.lineWidth = 2;
  
  ctx.beginPath();
  ctx.moveTo(cup.x, cup.y);
  ctx.lineTo(cup.x + cup.width, cup.y);
  ctx.lineTo(cup.x + cup.width - 10, cup.y + cup.height);
  ctx.lineTo(cup.x + 10, cup.y + cup.height);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(cup.x + cup.width, cup.y + 20);
  ctx.bezierCurveTo(
    cup.x + cup.width + 30, cup.y + 20,
    cup.x + cup.width + 30, cup.y + cup.height - 20,
    cup.x + cup.width, cup.y + cup.height - 20
  );
  ctx.stroke();
  
  if (cup.isFull) {
    const gradient = ctx.createLinearGradient(
      cup.x, cup.y + 20,
      cup.x, cup.y + cup.height - 10
    );
    gradient.addColorStop(0, "rgba(139, 69, 19, 0.8)");
    gradient.addColorStop(1, "rgba(101, 67, 33, 0.8)");
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(cup.x + 10, cup.y + 20);
    ctx.lineTo(cup.x + cup.width - 10, cup.y + 20);
    ctx.lineTo(cup.x + cup.width - 15, cup.y + cup.height - 10);
    ctx.lineTo(cup.x + 15, cup.y + cup.height - 10);
    ctx.closePath();
    ctx.fill();
    
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(cup.x + cup.width/2, cup.y);
      ctx.quadraticCurveTo(
        cup.x + cup.width/2 + 10 * Math.sin(Date.now()/500 + i),
        cup.y - 20 - i * 10,
        cup.x + cup.width/2 + 20 * Math.sin(Date.now()/500 + i),
        cup.y - 40 - i * 10
      );
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = "rgba(139, 69, 19, 0.2)";
    ctx.beginPath();
    ctx.moveTo(cup.x + 15, cup.y + cup.height - 15);
    ctx.lineTo(cup.x + cup.width - 15, cup.y + cup.height - 15);
    ctx.lineTo(cup.x + cup.width - 15, cup.y + cup.height - 10);
    ctx.lineTo(cup.x + 15, cup.y + cup.height - 10);
    ctx.closePath();
    ctx.fill();
  }
}

function drawHand() {
  if (!hand.isVisible) return;
  
  hand.animationPhase += 0.05;
  const baseX = book.x + book.width/2;
  const baseY = book.y + book.height/2;
  
  hand.x = baseX + Math.sin(hand.animationPhase) * 10;
  hand.y = baseY + Math.cos(hand.animationPhase) * 5;
  hand.angle = Math.sin(hand.animationPhase * 0.5) * 0.2;
  
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(hand.angle);
  
  ctx.fillStyle = "#FFE4C4";
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = "#8B4513";
  ctx.beginPath();
  ctx.moveTo(20, -2);
  ctx.lineTo(35, -2);
  ctx.lineTo(35, 2);
  ctx.lineTo(20, 2);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.moveTo(35, -2);
  ctx.lineTo(40, 0);
  ctx.lineTo(35, 2);
  ctx.closePath();
  ctx.fill();
  
  ctx.restore();
}

function drawBook() {
  if (!book.isVisible) return;
  
  ctx.fillStyle = "#8B4513";
  ctx.beginPath();
  ctx.roundRect(book.x, book.y, book.width, book.height, 5);
  ctx.fill();
  
  ctx.fillStyle = "#654321";
  ctx.beginPath();
  ctx.roundRect(book.x + book.width/2 - 3, book.y + 5, 6, book.height - 10, 2);
  ctx.fill();
  
  const pageWidth = book.width/2 - 8;
  const pageHeight = book.height - 10;
  const leftPageX = book.x + 5;
  const rightPageX = book.x + book.width/2 + 3;
  const pageY = book.y + 5;
  
  ctx.fillStyle = "#FFF8DC";
  ctx.beginPath();
  ctx.roundRect(leftPageX, pageY, pageWidth, pageHeight, 3);
  ctx.fill();
  
  ctx.beginPath();
  ctx.roundRect(rightPageX, pageY, pageWidth, pageHeight, 3);
  ctx.fill();
  
  if (book.hasDrawing) {
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    
    const lineSpacing = pageHeight / 8;
    const startY = pageY + lineSpacing;
    const endY = pageY + pageHeight - lineSpacing;
    const leftPageEndX = leftPageX + pageWidth - 20;
    const rightPageEndX = rightPageX + pageWidth - 20;
    
    // Left page squiggles
    for (let y = startY; y < endY; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(leftPageX + 20, y);
      let x = leftPageX + 20;
      while (x < leftPageEndX) {
        const nextX = x + 15;
        ctx.quadraticCurveTo(
          x + 7.5,
          y - 10 + Math.sin(Date.now()/1000 + x) * 8,
          nextX,
          y
        );
        x = nextX;
      }
      ctx.stroke();
    }
    
    // Right page squiggles
    for (let y = startY; y < endY; y += lineSpacing) {
      ctx.beginPath();
      ctx.moveTo(rightPageX + 20, y);
      let x = rightPageX + 20;
      while (x < rightPageEndX) {
        const nextX = x + 15;
        ctx.quadraticCurveTo(
          x + 7.5,
          y - 10 + Math.cos(Date.now()/1000 + x) * 8,
          nextX,
          y
        );
        x = nextX;
      }
      ctx.stroke();
    }
    
    // Random dots
    for (let i = 0; i < 15; i++) {
      ctx.beginPath();
      ctx.arc(
        leftPageX + 30 + Math.random() * (pageWidth - 40),
        pageY + 30 + Math.random() * (pageHeight - 60),
        1, 0, Math.PI * 2
      );
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(
        rightPageX + 30 + Math.random() * (pageWidth - 40),
        pageY + 30 + Math.random() * (pageHeight - 60),
        1, 0, Math.PI * 2
      );
      ctx.fill();
    }
  }
}

function showCupAndBookEvent() {
  cup.isVisible = true;
  cup.isFull = true;
  book.isVisible = true;
  book.hasDrawing = false;
  hand.isVisible = true;
  isEvent3Active = true;
  
  btnMove.disabled = true;
  
  canvas.addEventListener('click', handleCupAndBookClick);
}

function handleCupAndBookClick(event) {
  const rect = canvas.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;
  
  if (clickX >= cup.x && clickX <= cup.x + cup.width &&
      clickY >= cup.y && clickY <= cup.y + cup.height) {
    cup.isFull = false;
  }
  
  if (clickX >= book.x && clickX <= book.x + book.width &&
      clickY >= book.y && clickY <= book.y + book.height) {
    book.hasDrawing = true;
  }
  
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

// Fourth event: tree hug
const eventsTriggered = {
  event1: false,
  event2: false,
  event3: false,
  event4: false
};

function showTreeHugEvent() {
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

  // GIF element
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

function checkForEvents() {
  for (let i = 0; i < eventSpots.length; i++) {
    const spot = eventSpots[i];
    if (!spot.triggered &&
        Math.abs(character.x - spot.x) < character.width &&
        Math.abs(character.y - spot.y) < character.height) {
      console.log("Event triggered:", i, "at position:", character.x, character.y);
      spot.triggered = true;
      if (i === 0) { // Tarot cards
        showEvent();
      } else if (i === 1) { // Dog
        showDogEvent();
        buttonPressesRemaining = 5;
      } else if (i === 2) { // Cup & book
        showCupAndBookEvent();
        buttonPressesRemaining = 3;
      } else if (i === 3) { // Tree hug
        showTreeHugEvent();
        btnMove.disabled = true;
      }
      break;
    }
  }
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

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

// Initialize the game
console.log("Initializing game...");
resetGame();
// Start the loop
console.log("Starting game loop...");
requestAnimationFrame(gameLoop);

function showFinalEvent() {
  let gifCount = 0;
  const maxGifs = 3;
  
  function showNextGif() {
    if (gifCount >= maxGifs) {
      console.log("Game completed!");
      return;
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
    overlay.style.zIndex = '100';

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
