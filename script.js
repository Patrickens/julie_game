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
  stepSize: 100, // Reverted back to original step size
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
// Add event state tracking
let isEvent3Active = false;

// When touch (or mouse) starts on the move button, move character
btnMove.addEventListener("touchstart", (e) => {
  e.preventDefault();
  if (buttonPressesRemaining > 0 && !isEvent3Active) {
    moveCharacter();
    buttonPressesRemaining--;
    console.log("Touch start - Presses remaining:", buttonPressesRemaining);
  }
});

// For desktop testing: also listen to mousedown
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
  
  // If character reaches the end, show final event
  if (character.x > canvas.width - character.radius) {
    showFinalEvent();
    // Disable movement after reaching the end
    btnMove.disabled = true;
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

// Add new event elements
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

// Add hand animation properties
const hand = {
  x: 0,
  y: 0,
  angle: 0,
  isVisible: false,
  animationPhase: 0
};

function drawCup() {
  if (!cup.isVisible) return;
  
  // Draw cup with transparency
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
  ctx.strokeStyle = "rgba(139, 69, 19, 0.8)";
  ctx.lineWidth = 2;
  
  // Main cup body
  ctx.beginPath();
  ctx.moveTo(cup.x, cup.y);
  ctx.lineTo(cup.x + cup.width, cup.y);
  ctx.lineTo(cup.x + cup.width - 10, cup.y + cup.height);
  ctx.lineTo(cup.x + 10, cup.y + cup.height);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  
  // Draw handle with proper curve
  ctx.beginPath();
  ctx.moveTo(cup.x + cup.width, cup.y + 20);
  ctx.bezierCurveTo(
    cup.x + cup.width + 30, cup.y + 20,
    cup.x + cup.width + 30, cup.y + cup.height - 20,
    cup.x + cup.width, cup.y + cup.height - 20
  );
  ctx.stroke();
  
  // Draw liquid if cup is full
  if (cup.isFull) {
    // Draw liquid with gradient
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
    
    // Add steam effect
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
    // Draw empty cup effect (slight residue at bottom)
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
  
  // Update hand position and angle
  hand.animationPhase += 0.05;
  const baseX = book.x + book.width/2;
  const baseY = book.y + book.height/2;
  
  // Calculate hand position with slight movement
  hand.x = baseX + Math.sin(hand.animationPhase) * 10;
  hand.y = baseY + Math.cos(hand.animationPhase) * 5;
  hand.angle = Math.sin(hand.animationPhase * 0.5) * 0.2;
  
  ctx.save();
  ctx.translate(hand.x, hand.y);
  ctx.rotate(hand.angle);
  
  // Draw hand
  ctx.fillStyle = "#FFE4C4";
  ctx.beginPath();
  ctx.ellipse(0, 0, 15, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw pencil
  ctx.fillStyle = "#8B4513";
  ctx.beginPath();
  ctx.moveTo(20, -2);
  ctx.lineTo(35, -2);
  ctx.lineTo(35, 2);
  ctx.lineTo(20, 2);
  ctx.closePath();
  ctx.fill();
  
  // Draw pencil tip
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
  
  // Draw book cover
  ctx.fillStyle = "#8B4513";
  ctx.beginPath();
  ctx.roundRect(book.x, book.y, book.width, book.height, 5);
  ctx.fill();
  
  // Draw gutter (spine)
  ctx.fillStyle = "#654321";
  ctx.beginPath();
  ctx.roundRect(book.x + book.width/2 - 3, book.y + 5, 6, book.height - 10, 2);
  ctx.fill();
  
  // Calculate page dimensions
  const pageWidth = book.width/2 - 8;
  const pageHeight = book.height - 10;
  const leftPageX = book.x + 5;
  const rightPageX = book.x + book.width/2 + 3;
  const pageY = book.y + 5;
  
  // Draw left page
  ctx.fillStyle = "#FFF8DC";
  ctx.beginPath();
  ctx.roundRect(leftPageX, pageY, pageWidth, pageHeight, 3);
  ctx.fill();
  
  // Draw right page
  ctx.beginPath();
  ctx.roundRect(rightPageX, pageY, pageWidth, pageHeight, 3);
  ctx.fill();
  
  // Draw squiggly lines and drawing if book has been clicked
  if (book.hasDrawing) {
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    
    // Calculate squiggle parameters
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
    
    // Right page squiggles (different pattern)
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
    
    // Add some random dots on both pages
    for (let i = 0; i < 15; i++) {
      // Left page dots
      ctx.beginPath();
      ctx.arc(
        leftPageX + 30 + Math.random() * (pageWidth - 40),
        pageY + 30 + Math.random() * (pageHeight - 60),
        1, 0, Math.PI * 2
      );
      ctx.fill();
      
      // Right page dots
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
  
  // Disable move button
  btnMove.disabled = true;
  
  // Add click handlers
  canvas.addEventListener('click', handleCupAndBookClick);
}

function handleCupAndBookClick(event) {
  const rect = canvas.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const clickY = event.clientY - rect.top;
  
  // Check cup click
  if (clickX >= cup.x && clickX <= cup.x + cup.width &&
      clickY >= cup.y && clickY <= cup.y + cup.height) {
    cup.isFull = false;
  }
  
  // Check book click
  if (clickX >= book.x && clickX <= book.x + book.width &&
      clickY >= book.y && clickY <= book.y + book.height) {
    book.hasDrawing = true;
  }
  
  // Check if both interactions are complete
  if (!cup.isFull && book.hasDrawing) {
    // Wait 0.5 seconds before hiding everything
    setTimeout(() => {
      cup.isVisible = false;
      book.isVisible = false;
      hand.isVisible = false;
      // Remove the click handler
      canvas.removeEventListener('click', handleCupAndBookClick);
      // Reset button presses for next event
      buttonPressesRemaining = 5; // Increased to 5 moves
      // Re-enable move button
      btnMove.disabled = false;
      isEvent3Active = false;
      // Mark event3 as triggered
      eventsTriggered.event3 = true;
    }, 500);
  }
}

// Add tree hug overlay reference
const treeHugOverlay = document.getElementById('treeHugOverlay');

// Add fourth event coordinates
const event4Coords = { x: 1200, y: 300 };

// Update eventsTriggered object to include event4
const eventsTriggered = {
  event1: false,
  event2: false,
  event3: false,
  event4: false
};

// Add tree hug event function
function showTreeHugEvent() {
  // Create and show the tree hug overlay
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

  // Create and add the GIF
  const gif = document.createElement('img');
  gif.src = 'tree_huggin.gif';
  gif.style.maxWidth = '80%';
  gif.style.maxHeight = '80%';
  overlay.appendChild(gif);

  // Add to document
  document.body.appendChild(overlay);

  // Hide after 10 seconds and enable movement
  setTimeout(() => {
    overlay.remove();
    // Enable movement for final path
    buttonPressesRemaining = 5;
    btnMove.disabled = false;
  }, 10000);
}

function checkForEvents() {
  for (let i = 0; i < eventSpots.length; i++) {
    const spot = eventSpots[i];
    // Increased trigger radius for better detection
    if (!spot.triggered && 
        Math.abs(character.x - spot.x) < character.radius + 50 &&
        Math.abs(character.y - spot.y) < character.radius + 50) {
      console.log("Event triggered:", i, "at position:", character.x, character.y);
      spot.triggered = true;
      if (i === 0) { // First event - tarot cards
        showEvent();
      } else if (i === 1) { // Second event - dog
        showDogEvent();
        buttonPressesRemaining = 5; // Reset button presses for next event
      } else if (i === 2) { // Third event - cup and book
        showCupAndBookEvent();
        buttonPressesRemaining = 3; // Reset button presses for next event
      } else if (i === 3) { // Fourth event - tree hugging
        showTreeHugEvent();
        btnMove.disabled = true; // Disable movement during event
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

// Add final event function
function showFinalEvent() {
  let gifCount = 0;
  const maxGifs = 3;
  
  function showNextGif() {
    if (gifCount >= maxGifs) {
      // Game is complete
      console.log("Game completed!");
      return;
    }

    // Create and show the overlay
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

    // Create and add the GIF
    const gif = document.createElement('img');
    gif.src = 'happy_birthday.gif';
    gif.style.maxWidth = '80%';
    gif.style.maxHeight = '80%';
    overlay.appendChild(gif);

    // Add to document
    document.body.appendChild(overlay);

    // Hide after GIF duration (assuming 3 seconds) and show next one
    setTimeout(() => {
      overlay.remove();
      gifCount++;
      showNextGif();
    }, 3000);
  }

  // Start showing GIFs
  showNextGif();
}
