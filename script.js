// script.js - JavaScript for Minesweeper Game

// --- DOM Element References ---
const boardElement = document.getElementById('board');
const difficultySelect = document.getElementById('difficulty');
const resetButton = document.getElementById('reset-button');
const minesLeftElement = document.getElementById('mines-left');
const timerElement = document.getElementById('timer');
// Game Over/Win Modal Elements
const messageBox = document.getElementById('message-box');
const messageTitle = document.getElementById('message-title');
const messageText = document.getElementById('message-text');
const messageCloseButton = document.getElementById('message-close-button');
// Hint Modal Elements
const hintButton = document.getElementById('hint-button');
const hintModal = document.getElementById('hint-modal');
const hintCloseButton = document.getElementById('hint-close-button');

// --- Game Settings ---
const difficulties = {
    easy: { rows: 9, cols: 9, mines: 10 },
    medium: { rows: 16, cols: 16, mines: 40 },
    hard: { rows: 16, cols: 30, mines: 99 }
};

// --- Game State Variables ---
let currentDifficulty = difficulties.easy;
let board = []; // 2D array representing the game board state
let mineLocations = []; // Array of {row, col} for mine positions
let revealedCells = 0;
let flaggedCells = 0;
let minesLeft = 0;
let timerInterval = null;
let timeElapsed = 0;
let gameOver = false;
let firstClick = true;
const CELL_SIZE_DEFAULT = 30; // Default cell size (used for grid calculation)

// --- Game Initialization ---
function initializeGame() {
    // Reset game state variables
    gameOver = false;
    firstClick = true;
    revealedCells = 0;
    flaggedCells = 0;
    timeElapsed = 0;
    mineLocations = [];
    board = [];
    minesLeft = currentDifficulty.mines;

    // Reset Timer
    clearInterval(timerInterval);
    timerInterval = null;
    timerElement.textContent = 'Time: 0s';

    // Update Mine Counter Display
    minesLeftElement.textContent = `Mines Left: ${minesLeft}`;

    // Clear board HTML
    boardElement.innerHTML = '';

    // Determine cell size based on media queries for accurate grid layout
    let currentCellSize = CELL_SIZE_DEFAULT;
     if (window.matchMedia("(max-width: 400px)").matches) {
         currentCellSize = 25; // Match the smallest CSS size
     } else if (window.matchMedia("(max-width: 600px)").matches) {
         currentCellSize = 28; // Match the medium CSS size
     }

    // Set CSS Grid columns based on difficulty and cell size
    boardElement.style.gridTemplateColumns = `repeat(${currentDifficulty.cols}, ${currentCellSize}px)`;
    boardElement.style.maxWidth = '100%'; // Ensure board fits container

    // Create board data structure
    for (let r = 0; r < currentDifficulty.rows; r++) {
        board[r] = [];
        for (let c = 0; c < currentDifficulty.cols; c++) {
            board[r][c] = {
                isMine: false,
                isRevealed: false,
                isFlagged: false,
                adjacentMines: 0,
                element: null // Reference to the DOM element
            };
        }
    }

    // Create cell DOM elements
    createBoardElements();
    // Add event listeners to the board
    addCellListeners();

    // Hide modals
    messageBox.style.display = 'none';
    hintModal.style.display = 'none';
}

// --- Create Board Elements ---
function createBoardElements() {
    // Loop through rows and columns to create cell divs
    for (let r = 0; r < currentDifficulty.rows; r++) {
        for (let c = 0; c < currentDifficulty.cols; c++) {
            const cellElement = document.createElement('div');
            cellElement.classList.add('cell');
            // Store row and column info on the element for easy access in event handlers
            cellElement.dataset.row = r;
            cellElement.dataset.col = c;
            // Store reference to the DOM element in the board data structure
            board[r][c].element = cellElement;
            // Add the cell element to the board container
            boardElement.appendChild(cellElement);
        }
    }
}

// --- Add Event Listeners to Board ---
function addCellListeners() {
     // Remove previous listeners to prevent duplicates on reset
     boardElement.removeEventListener('click', handleCellClick);
     boardElement.removeEventListener('contextmenu', handleCellRightClick);
     boardElement.removeEventListener('dblclick', handleCellDoubleClick);

     // Add new listeners
     boardElement.addEventListener('click', handleCellClick); // Left click
     boardElement.addEventListener('contextmenu', handleCellRightClick); // Right click
     boardElement.addEventListener('dblclick', handleCellDoubleClick); // Double click
}

// --- Mine Placement and Calculation ---
function placeMines(firstClickRow, firstClickCol) {
    let minesPlaced = 0;
    // Create a safe zone around the first click (3x3 area)
    const safeZone = new Set();
     for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            const nr = firstClickRow + i;
            const nc = firstClickCol + j;
             // Check bounds before adding to safe zone
             if (nr >= 0 && nr < currentDifficulty.rows && nc >= 0 && nc < currentDifficulty.cols) {
                 safeZone.add(`${nr}-${nc}`); // Store coordinates as string key
             }
        }
    }

    // Place mines randomly, avoiding the safe zone
    while (minesPlaced < currentDifficulty.mines) {
        const r = Math.floor(Math.random() * currentDifficulty.rows);
        const c = Math.floor(Math.random() * currentDifficulty.cols);
        const cellKey = `${r}-${c}`;

        // Place mine if the cell is not already a mine AND is outside the safe zone
        if (!board[r][c].isMine && !safeZone.has(cellKey)) {
            board[r][c].isMine = true;
            mineLocations.push({ row: r, col: c }); // Keep track of mine locations
            minesPlaced++;
        }
    }
    // Calculate adjacent mine counts for all cells
    calculateAdjacentMines();
 }

function calculateAdjacentMines() {
    // Loop through all cells
    for (let r = 0; r < currentDifficulty.rows; r++) {
        for (let c = 0; c < currentDifficulty.cols; c++) {
            // Skip if the cell itself is a mine
            if (!board[r][c].isMine) {
                let count = 0;
                // Check all 8 neighbors
                iterateNeighbors(r, c, (nr, nc) => {
                    if (board[nr][nc].isMine) {
                        count++; // Increment count if neighbor is a mine
                    }
                });
                // Store the count in the board data structure
                board[r][c].adjacentMines = count;
            }
        }
    }
}

// --- Event Handlers ---
function handleCellClick(event) { // Left Click
     // Ignore if game is over or click is not directly on a cell
     if (gameOver || !event.target.classList.contains('cell')) return;

    const cellElement = event.target;
    const row = parseInt(cellElement.dataset.row);
    const col = parseInt(cellElement.dataset.col);

     // Check if cell coordinates are valid
     if (!board[row] || !board[row][col]) return;
    const cell = board[row][col];

    // Ignore clicks on revealed or flagged cells
    if (cell.isRevealed || cell.isFlagged) return;

    // Handle the very first click
    if (firstClick) {
        placeMines(row, col); // Place mines away from the first click
        startTimer();         // Start the game timer
        firstClick = false;   // Mark first click as done
    }

    // Reveal the clicked cell
    revealCell(row, col);
    // Check if the game has been won
    checkWinCondition();
}

function handleCellRightClick(event) { // Right Click
     event.preventDefault(); // Prevent the default browser context menu
     // Ignore if game is over or click is not directly on a cell
     if (gameOver || !event.target.classList.contains('cell')) return;

    const cellElement = event.target;
    const row = parseInt(cellElement.dataset.row);
    const col = parseInt(cellElement.dataset.col);

    // Check if cell coordinates are valid
    if (!board[row] || !board[row][col]) return;
    const cell = board[row][col];

    // Cannot flag/unflag an already revealed cell
    if (cell.isRevealed) return;

    // Toggle the flag state
    toggleFlag(row, col);
}

function handleCellDoubleClick(event) { // Double Click (Chording)
     // Ignore if game is over or double-click is not directly on a cell
     if (gameOver || !event.target.classList.contains('cell')) return;

    const cellElement = event.target;
    const row = parseInt(cellElement.dataset.row);
    const col = parseInt(cellElement.dataset.col);

     // Check if cell coordinates are valid
     if (!board[row] || !board[row][col]) return;
    const cell = board[row][col];

    // Chording only works on revealed cells that have adjacent mines (number > 0)
    if (!cell.isRevealed || cell.adjacentMines === 0) return;

    // Count how many adjacent cells are flagged
    let adjacentFlags = 0;
    iterateNeighbors(row, col, (nr, nc) => {
        if (board[nr][nc].isFlagged) {
            adjacentFlags++;
        }
    });

    // If the number of adjacent flags matches the number on the cell...
    if (adjacentFlags === cell.adjacentMines) {
        // ...reveal all adjacent cells that are NOT flagged and NOT already revealed
        iterateNeighbors(row, col, (nr, nc) => {
            if (!board[nr][nc].isFlagged && !board[nr][nc].isRevealed) {
                revealCell(nr, nc); // This might trigger further reveals or game over
            }
        });
        // Check win condition after chording potentially reveals many cells
        checkWinCondition();
    }
}

// --- Button Event Listeners ---

// Hint Button Listener
hintButton.addEventListener('click', () => {
    hintModal.style.display = 'flex'; // Show the hint modal
});

// Hint Modal Close Button Listener
hintCloseButton.addEventListener('click', () => {
    hintModal.style.display = 'none'; // Hide the hint modal
});

// Reset Button Listener
resetButton.addEventListener('click', () => {
    // Update difficulty setting before resetting
    currentDifficulty = difficulties[difficultySelect.value];
    // Re-initialize the game
    initializeGame();
});

// Difficulty Selector Listener
difficultySelect.addEventListener('change', () => {
    // Update difficulty setting before resetting
    currentDifficulty = difficulties[difficultySelect.value];
    // Re-initialize the game
    initializeGame();
});

// Game Over/Win Modal Close Button Listener
messageCloseButton.addEventListener('click', () => {
    messageBox.style.display = 'none'; // Hide the modal
    // Re-initialize the game for a new round
    initializeGame();
});

// --- Game Logic Functions ---
function revealCell(row, col) {
     // Check bounds
     if (row < 0 || row >= currentDifficulty.rows || col < 0 || col >= currentDifficulty.cols) return;
     // Check if cell exists in our data structure
     if (!board[row] || !board[row][col]) return;

     const cell = board[row][col];

     // Stop if cell is already revealed or is flagged
     if (cell.isRevealed || cell.isFlagged) return;

    // Mark cell as revealed
    cell.isRevealed = true;
    cell.element.classList.add('revealed');
    cell.element.style.cursor = 'default'; // Change cursor
    revealedCells++; // Increment count of revealed cells

    // Check if the revealed cell is a mine
    if (cell.isMine) {
        cell.element.classList.add('mine'); // Add mine style
        cell.element.innerHTML = '💣';     // Show bomb emoji
        endGame(false); // Trigger game over (loss)
    } else {
        // If the cell has adjacent mines, display the number
        if (cell.adjacentMines > 0) {
            cell.element.textContent = cell.adjacentMines;
            // Add data-count attribute for CSS styling based on number
            cell.element.dataset.count = cell.adjacentMines;
            // Set cursor to pointer to indicate chording is possible
            cell.element.style.cursor = 'pointer';
        } else {
            // If the cell is empty (0 adjacent mines), reveal neighbors (flood fill)
            iterateNeighbors(row, col, (nr, nc) => {
                // Recursively call revealCell for neighbors
                // Use setTimeout for visual delay (optional, can be removed)
                // setTimeout(() => revealCell(nr, nc), 5);
                 revealCell(nr, nc);
            });
        }
    }
}

function toggleFlag(row, col) {
     // Check if cell exists
     if (!board[row] || !board[row][col]) return;

    const cell = board[row][col];
    // Cannot flag already revealed cells
    if (cell.isRevealed) return;

    // Toggle the flagged state
    cell.isFlagged = !cell.isFlagged;
    // Toggle the 'flagged' CSS class on the element
    cell.element.classList.toggle('flagged');

    // Update display and counter
    if (cell.isFlagged) {
        cell.element.innerHTML = '🚩'; // Show flag emoji
        flaggedCells++;
    } else {
        cell.element.innerHTML = ''; // Remove flag emoji
        flaggedCells--;
    }

    // Update the 'Mines Left' display
    minesLeft = currentDifficulty.mines - flaggedCells;
    minesLeftElement.textContent = `Mines Left: ${minesLeft}`;
}

// Helper function to iterate over the 8 neighbors of a cell
function iterateNeighbors(row, col, callback) {
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            // Skip the cell itself (0, 0 offset)
            if (i === 0 && j === 0) continue;
            const nr = row + i; // Neighbor row
            const nc = col + j; // Neighbor column

            // Check if neighbor coordinates are within the board bounds
            // Also check if the neighbor cell data exists
            if (nr >= 0 && nr < currentDifficulty.rows && nc >= 0 && nc < currentDifficulty.cols && board[nr] && board[nr][nc]) {
               // Execute the callback function for the valid neighbor
               callback(nr, nc);
            }
        }
    }
 }

// --- Timer Functions ---
function startTimer() {
     // Clear any existing timer interval
     if (timerInterval) clearInterval(timerInterval);
    timeElapsed = 0; // Reset timer
    timerElement.textContent = 'Time: 0s'; // Reset display
    // Start new interval, update timer every second
    timerInterval = setInterval(() => {
        // Only increment if game is not over
        if (!gameOver) {
            timeElapsed++;
            timerElement.textContent = `Time: ${timeElapsed}s`;
        } else {
             // Stop timer if game ended unexpectedly while timer was running
             clearInterval(timerInterval);
             timerInterval = null;
        }
    }, 1000); // 1000 milliseconds = 1 second
}

function stopTimer() {
    // Stop the timer interval
    clearInterval(timerInterval);
    timerInterval = null; // Clear the interval ID
 }

// --- Win/Loss Condition ---
function checkWinCondition() {
     // Don't check if game is already over
     if (gameOver) return;

    // Calculate the total number of cells that are NOT mines
    const totalNonMineCells = (currentDifficulty.rows * currentDifficulty.cols) - currentDifficulty.mines;

    // Win condition: The number of revealed cells equals the number of non-mine cells
    if (revealedCells === totalNonMineCells) {
         // Perform a final check to be absolutely sure all non-mines are revealed
         let allSafeRevealed = true;
         for (let r = 0; r < currentDifficulty.rows; r++) {
             for (let c = 0; c < currentDifficulty.cols; c++) {
                 // Check existence and state
                 if (board[r] && board[r][c] && !board[r][c].isMine && !board[r][c].isRevealed) {
                     allSafeRevealed = false;
                     break; // Exit inner loop
                 }
             }
             if (!allSafeRevealed) break; // Exit outer loop
         }
         // If all non-mine cells are indeed revealed, trigger win
         if (allSafeRevealed) {
            endGame(true); // Player won
         }
    }
}

function endGame(isWin) {
     // Prevent function from running multiple times if already game over
     if (gameOver) return;
     gameOver = true; // Set game over flag
     stopTimer(); // Stop the timer

    // Reveal all mine locations
    mineLocations.forEach(({ row, col }) => {
         // Check existence
         if (!board[row] || !board[row][col]) return;
        const cell = board[row][col];
        // If player lost, reveal all unrevealed, unflagged mines
        if (!cell.isRevealed && !cell.isFlagged && !isWin) {
            cell.element.classList.add('revealed', 'mine');
            cell.element.innerHTML = '💣';
        }
        // If player won, ensure all mines are visually marked as flagged (correctly)
        else if (isWin && !cell.isFlagged) {
             cell.element.classList.add('flagged'); // Add flag style if missing
             cell.element.innerHTML = '🚩';
             cell.element.style.backgroundColor = '#2ecc71'; // Green for correctly identified mines
        }
        // If player won and mine was already flagged, just mark it green
        else if (isWin && cell.isFlagged) {
             cell.element.style.backgroundColor = '#2ecc71';
        }
    });

     // If player lost, mark any incorrectly flagged cells
     if (!isWin) {
         for (let r = 0; r < currentDifficulty.rows; r++) {
             for (let c = 0; c < currentDifficulty.cols; c++) {
                  // Check existence
                  if (!board[r] || !board[r][c]) continue;
                 // If a cell is flagged but is NOT a mine
                 if (board[r][c].isFlagged && !board[r][c].isMine) {
                     board[r][c].element.innerHTML = '❌'; // Show cross mark
                     board[r][c].element.style.backgroundColor = '#e74c3c'; // Red background
                 }
             }
         }
     }

    // Disable further interaction by removing board listeners
    boardElement.removeEventListener('click', handleCellClick);
    boardElement.removeEventListener('contextmenu', handleCellRightClick);
    boardElement.removeEventListener('dblclick', handleCellDoubleClick);

    // Prepare and show the appropriate message modal
    if (isWin) {
        messageTitle.textContent = 'Congratulations!';
        messageText.textContent = `You cleared the board in ${timeElapsed} seconds!`;
    } else {
        messageTitle.textContent = 'Game Over!';
        messageText.textContent = 'You hit a mine!';
    }
    messageBox.style.display = 'flex'; // Show the game over/win modal
}

// --- Initial Load ---
// Setup the game when the window finishes loading
window.onload = () => {
    // Set initial difficulty from the dropdown
    currentDifficulty = difficulties[difficultySelect.value];
    // Initialize the game board and state
    initializeGame();
};
