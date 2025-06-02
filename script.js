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

// Adjust canvas size to fill the viewport (minus controls)
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight - 60; // 60px reserved for controls
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ==== Game variables ====
// Remove the fixed river height since it will now extend from path to top
const pathHeight = canvas.height * 0.4; // Path takes up 40% of the screen
const treesHeight = canvas.height * 0.3; // Trees take up 30% of the screen

// Wave animation variables
let waveOffset1 = 0;
let waveOffset2 = 0;
let waveOffset3 = 0;
let waveOffset4 = 0;
let waveOffset5 = 0;
const waveSpeed = 0.05;
const waveHeight = 8;
const waveFrequency = 0.015;

// Character properties
const character = {
  x: canvas.width * 0.05,
  y: canvas.height * 0.5, // Start in the middle of the screen
  radius: 15,
  color: "#FFD700",
  stepSize: 100, // Adjusted step size
  hairWave: 0 // For hair animation
};

// Define four event spots along the winding path
let eventSpots = [];
function resetEventSpots() {
  eventSpots = [];
  for (let i = 1; i <= 4; i++) {
    const x = canvas.width * (i * 0.2);
    const y = getPathY(x);
    eventSpots.push({
      x: x,
      y: y,
      triggered: false,
      message: `You've reached event #${i}!`,
    });
  }
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
    // Calculate y position between path and bottom of screen
    const pathY = getPathY(x);
    const maxY = canvas.height - 60; // Account for controls
    // Add minimum distance from path (30 pixels) to prevent overlap
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

// Call generateTrees when canvas is resized
window.addEventListener("resize", () => {
  resizeCanvas();
  generateTrees();
});

// Generate initial trees
generateTrees();

// ==== Input Handlers ====
// When touch (or mouse) starts on the move button, move character
btnMove.addEventListener("touchstart", (e) => {
  e.preventDefault();
  if (buttonPressesRemaining > 0) {
    moveCharacter();
    buttonPressesRemaining--;
    console.log("Touch start - Presses remaining:", buttonPressesRemaining);
  }
});

// For desktop testing: also listen to mousedown
btnMove.addEventListener("mousedown", () => {
  if (buttonPressesRemaining > 0) {
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
  const waveHeights = [0.1, 0.25, 0.4, 0.55, 0.7]; // Adjusted to be more concentrated at the top

  for (let i = 0; i < 5; i++) {
    ctx.strokeStyle = waveColors[i];
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let x = 0; x < canvas.width; x += 5) {
      const pathY = getPathY(x);
      const waterHeight = pathY; // Height from top to path
      const waveY = waterHeight * waveHeights[i]; // Start from top
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
      const waterHeight = pathY; // Height from top to path
      const waveY = waterHeight * waveHeights[i]; // Start from top
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
  
  // Update wave offsets with different speeds for more dynamic movement
  waveOffset1 += waveSpeed;
  waveOffset2 += waveSpeed * 1.2;
  waveOffset3 += waveSpeed * 0.8;
  waveOffset4 += waveSpeed * 1.1;
  waveOffset5 += waveSpeed * 0.9;
}

function drawPath() {
  ctx.strokeStyle = "#8B4513";
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
}

function getPathY(x) {
  // Create a winding path using sine waves
  return canvas.height * 0.5 + pathHeight * 0.5 + Math.sin(x * 0.005) * 50;
}

function drawTrees() {
  trees.forEach(tree => {
    ctx.save();
    ctx.translate(tree.x, tree.y);
    
    // Draw tree trunk
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(
      -tree.type.trunkWidth / 2,
      0,
      tree.type.trunkWidth,
      tree.type.trunkHeight
    );
    
    // Draw tree top
    ctx.fillStyle = tree.type.color;
    ctx.beginPath();
    ctx.moveTo(-tree.type.width / 2, 0);
    ctx.lineTo(tree.type.width / 2, 0);
    ctx.lineTo(0, -tree.type.height);
    ctx.closePath();
    ctx.fill();
    
    // Add some detail to the tree
    ctx.strokeStyle = "#006400";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-tree.type.width / 4, -tree.type.height / 3);
    ctx.lineTo(tree.type.width / 4, -tree.type.height / 2);
    ctx.stroke();
    
    ctx.restore();
  });
}

function drawEventSpots() {
  eventSpots.forEach((spot) => {
    ctx.fillStyle = "#8B0000";
    ctx.beginPath();
    ctx.arc(spot.x, spot.y, 8, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawCharacter() {
  // Save the current context state
  ctx.save();
  
  // Move to character's position
  ctx.translate(character.x, character.y);
  
  // Draw the hair (long flowing hair)
  ctx.fillStyle = "#D4AF37"; // Golden blonde color
  ctx.beginPath();
  // Main hair body with wave effect
  ctx.ellipse(0, 0, 20, 25, Math.sin(character.hairWave) * 0.2, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw hair details (some strands with wave effect)
  ctx.strokeStyle = "#B8860B"; // Darker blonde for strands
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI / 2.5) - Math.PI / 2;
    const waveOffset = Math.sin(character.hairWave + i) * 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(
      Math.cos(angle) * 15 + waveOffset,
      Math.sin(angle) * 15,
      Math.cos(angle) * 25 + waveOffset * 1.5,
      Math.sin(angle) * 25
    );
    ctx.stroke();
  }
  
  // Draw the head (smaller circle on top)
  ctx.fillStyle = "#D4AF37"; // Same color as hair
  ctx.beginPath();
  ctx.arc(0, -10, 8, 0, Math.PI * 2);
  ctx.fill();
  
  // Restore the context state
  ctx.restore();
}

function showEvent() {
  console.log("Showing tarot cards event");
  eventOverlay.classList.remove("hidden");
  
  // Add click handlers for cards
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      card.classList.add('flipped');
      
      // Check if all cards are flipped
      const allFlipped = Array.from(cards).every(c => c.classList.contains('flipped'));
      if (allFlipped) {
        // Wait 1 second before hiding the overlay
        setTimeout(() => {
          eventOverlay.classList.add("hidden");
          // Reset cards for next time
          cards.forEach(c => c.classList.remove('flipped'));
          // Reset button presses after tarot cards with more moves
          buttonPressesRemaining = 5; // Adjusted number of moves
        }, 1000); // 1 second delay
      }
    });
  });
}

function resetGame() {
  character.x = canvas.width * 0.05;
  character.y = getPathY(character.x);
  resetEventSpots();
  eventOverlay.classList.add("hidden");
  buttonPressesRemaining = 3; // Reset button presses
}

function moveCharacter() {
  character.x += character.stepSize;
  character.y = getPathY(character.x);
  
  // If character reaches the end, reset the game
  if (character.x > canvas.width - character.radius) {
    resetGame();
  }
}

function updateCharacterPosition() {
  // Update hair wave animation
  character.hairWave += 0.1;
}

// Dog animation properties
const dog = {
  imgDog: new Image(),
  frameHeight: 0,
  frameIndex: 0,
  x: -100, // Start off-screen to the left
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
  
  // Update animation
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
    // Update dog's y position to follow the path
    dog.y = getPathY(dog.x) - 30; // Position dog above the path
    
    // Reset when dog reaches the right edge of the screen
    if (dog.x > canvas.width + 100) {
      dog.isRunning = false;
      dog.x = -100; // Reset position to off-screen left
    }
  }
}

function showDogEvent() {
  dog.isRunning = true;
  dog.x = -100; // Start from off-screen left
  dog.y = getPathY(character.x) - 30; // Position dog above the path
  dog.frameIndex = 0;
  dog.frameHeight = 0;
  dog.count = 0;
}

// Set up dog animation interval
setInterval(function() {
  if (dog.isRunning) {
    ++dog.frameIndex;
    dog.count++;
  }
}, 1000 / dog.frameRate);

function checkForEvents() {
  for (let i = 0; i < eventSpots.length; i++) {
    const spot = eventSpots[i];
    // Increased trigger radius for better detection
    if (!spot.triggered && 
        Math.abs(character.x - spot.x) < character.radius + 20 &&
        Math.abs(character.y - spot.y) < character.radius + 20) {
      console.log("Event triggered:", i, "at position:", character.x, character.y);
      spot.triggered = true;
      if (i === 0) { // First event - tarot cards
        showEvent();
      } else if (i === 1) { // Second event - dog
        showDogEvent();
        buttonPressesRemaining = 3; // Reset button presses for next event
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
  drawTrees();
  drawEventSpots();
  updateCharacterPosition();
  drawCharacter();
  updateDog();
  drawDog();
  checkForEvents();
  requestAnimationFrame(gameLoop);
}

// Initialize the game
console.log("Initializing game...");
resetGame();
// Start the loop
console.log("Starting game loop...");
requestAnimationFrame(gameLoop);
