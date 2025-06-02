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
  speed: 0,
  maxSpeed: 3,
  pathOffset: 0, // For following the winding path
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
let isMoving = false;

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
  isMoving = true;
  console.log("Touch start - isMoving:", isMoving);
});

btnMove.addEventListener("touchend", (e) => {
  e.preventDefault();
  isMoving = false;
  console.log("Touch end - isMoving:", isMoving);
});

// For desktop testing: also listen to mousedown/mouseup
btnMove.addEventListener("mousedown", () => {
  isMoving = true;
  console.log("Mouse down - isMoving:", isMoving);
});

btnMove.addEventListener("mouseup", () => {
  isMoving = false;
  console.log("Mouse up - isMoving:", isMoving);
});

// Also handle mouse leaving the button while pressed
btnMove.addEventListener("mouseleave", () => {
  isMoving = false;
  console.log("Mouse leave - isMoving:", isMoving);
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
  eventOverlay.classList.remove("hidden");
  
  // Add click handlers for cards
  const cards = document.querySelectorAll('.card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      card.classList.add('flipped');
      
      // Check if all cards are flipped
      const allFlipped = Array.from(cards).every(c => c.classList.contains('flipped'));
      if (allFlipped) {
        // Hide the overlay after all cards are flipped
        setTimeout(() => {
          eventOverlay.classList.add("hidden");
          // Reset cards for next time
          cards.forEach(c => c.classList.remove('flipped'));
        }, 2000);
      }
    });
  });
}

function resetGame() {
  character.x = canvas.width * 0.05;
  character.y = getPathY(character.x);
  resetEventSpots();
  eventOverlay.classList.add("hidden");
}

function updateCharacterPosition() {
  if (isMoving) {
    character.speed = character.maxSpeed;
  } else {
    character.speed = 0;
  }
  
  // Only update position if speed is not 0
  if (character.speed > 0) {
    character.x += character.speed;
    character.y = getPathY(character.x);
  }
  
  // Update hair wave animation
  character.hairWave += 0.1;
  
  // If character reaches the end, reset the game
  if (character.x > canvas.width - character.radius) {
    resetGame();
  }
}

function checkForEvents() {
  for (let i = 0; i < eventSpots.length; i++) {
    const spot = eventSpots[i];
    if (!spot.triggered && 
        Math.abs(character.x - spot.x) < character.radius + 5 &&
        Math.abs(character.y - spot.y) < character.radius + 5) {
      spot.triggered = true;
      if (i === 0) { // Only show tarot cards for the first event spot
        showEvent();
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
  checkForEvents();
  requestAnimationFrame(gameLoop);
}

// Initialize the game
console.log("Initializing game...");
resetGame();
// Start the loop
console.log("Starting game loop...");
requestAnimationFrame(gameLoop);
