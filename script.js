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
let currentDifficulty = difficulties.easy; // Start with easy by default
let board = []; // 2D array representing the game board state
let mineLocations = []; // Array of {row, col} for mine positions
let revealedCells = 0;
let flaggedCells = 0;
let minesLeft = 0;
let timerInterval = null;
let timeElapsed = 0;
let gameOver = false;
let firstClick = true;

// --- Constants based on CSS ---
const CELL_SIZE_DEFAULT = 30; // Default cell size (matches CSS default)
const GAP_SIZE = 2;           // Gap between cells (matches CSS .board { gap: 2px; })
const BORDER_SIZE = 5;        // Border width of the board (matches CSS .board { border: 5px ...; })

// --- Game Initialization ---
function initializeGame() {
    // Reset game state variables
    gameOver = false; firstClick = true; revealedCells = 0; flaggedCells = 0;
    timeElapsed = 0; mineLocations = []; board = [];
    // Set difficulty based on current dropdown value
    currentDifficulty = difficulties[difficultySelect.value];
    minesLeft = currentDifficulty.mines;


    // Reset Timer
    clearInterval(timerInterval); timerInterval = null;
    timerElement.textContent = 'Time: 0s';

    // Update Mine Counter Display
    minesLeftElement.textContent = `Mines Left: ${minesLeft}`;

    // Clear board HTML
    boardElement.innerHTML = '';

    // Determine actual cell size based on media queries for accurate grid layout
    let currentCellSize = CELL_SIZE_DEFAULT;
     if (window.matchMedia("(max-width: 400px)").matches) {
         currentCellSize = 25; // Match the smallest CSS size
     } else if (window.matchMedia("(max-width: 600px)").matches) {
         currentCellSize = 28; // Match the medium CSS size
     }

    // Set CSS Grid columns based on difficulty and cell size
    boardElement.style.gridTemplateColumns = `repeat(${currentDifficulty.cols}, ${currentCellSize}px)`;

    // **Explicitly Calculate and Set Board Width**
    const totalBoardWidth = (currentDifficulty.cols * currentCellSize) + ((currentDifficulty.cols - 1) * GAP_SIZE) + (BORDER_SIZE * 2);
    boardElement.style.width = `${totalBoardWidth}px`; // Set calculated width

    boardElement.style.maxWidth = 'none'; // Remove max-width constraint if previously set by CSS

    // Create board data structure
    for (let r = 0; r < currentDifficulty.rows; r++) {
        board[r] = [];
        for (let c = 0; c < currentDifficulty.cols; c++) {
            board[r][c] = {
                isMine: false, isRevealed: false, isFlagged: false,
                adjacentMines: 0, element: null
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
    for (let r = 0; r < currentDifficulty.rows; r++) {
        for (let c = 0; c < currentDifficulty.cols; c++) {
            const cellElement = document.createElement('div');
            cellElement.classList.add('cell');
            cellElement.dataset.row = r;
            cellElement.dataset.col = c;
            board[r][c].element = cellElement;
            boardElement.appendChild(cellElement);
        }
    }
}

// --- Add Event Listeners to Board ---
function addCellListeners() {
     boardElement.removeEventListener('click', handleCellClick);
     boardElement.removeEventListener('contextmenu', handleCellRightClick);
     boardElement.removeEventListener('dblclick', handleCellDoubleClick);

     boardElement.addEventListener('click', handleCellClick);
     boardElement.addEventListener('contextmenu', handleCellRightClick);
     boardElement.addEventListener('dblclick', handleCellDoubleClick);
}

// --- Mine Placement and Calculation ---
function placeMines(firstClickRow, firstClickCol) {
    let minesPlaced = 0;
    const safeZone = new Set();
     for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            const nr = firstClickRow + i; const nc = firstClickCol + j;
             if (nr >= 0 && nr < currentDifficulty.rows && nc >= 0 && nc < currentDifficulty.cols) {
                 safeZone.add(`${nr}-${nc}`);
             }
        }
    }
    while (minesPlaced < currentDifficulty.mines) {
        const r = Math.floor(Math.random() * currentDifficulty.rows);
        const c = Math.floor(Math.random() * currentDifficulty.cols);
        const cellKey = `${r}-${c}`;
        // Ensure cell exists before checking isMine
        if (board[r] && board[r][c] && !board[r][c].isMine && !safeZone.has(cellKey)) {
            board[r][c].isMine = true;
            mineLocations.push({ row: r, col: c });
            minesPlaced++;
        }
    }
    calculateAdjacentMines();
 }

function calculateAdjacentMines() {
    for (let r = 0; r < currentDifficulty.rows; r++) {
        for (let c = 0; c < currentDifficulty.cols; c++) {
            // Ensure cell exists
            if (board[r] && board[r][c] && !board[r][c].isMine) {
                let count = 0;
                iterateNeighbors(r, c, (nr, nc) => { if (board[nr][nc].isMine) count++; });
                board[r][c].adjacentMines = count;
            }
        }
    }
}

// --- Event Handlers ---
function handleCellClick(event) { // Left Click
     if (gameOver || !event.target.classList.contains('cell')) return;
    const cellElement = event.target;
    const row = parseInt(cellElement.dataset.row); const col = parseInt(cellElement.dataset.col);
     if (!board[row] || !board[row][col]) return;
    const cell = board[row][col];
    if (cell.isRevealed || cell.isFlagged) return;
    if (firstClick) {
        placeMines(row, col);
        startTimer(); // Start timer on first click
        firstClick = false;
    }
    revealCell(row, col); checkWinCondition();
}

function handleCellRightClick(event) { // Right Click
     event.preventDefault();
     if (gameOver || !event.target.classList.contains('cell')) return;
    const cellElement = event.target;
    const row = parseInt(cellElement.dataset.row); const col = parseInt(cellElement.dataset.col);
    if (!board[row] || !board[row][col]) return;
    const cell = board[row][col];
    if (cell.isRevealed) return;
    toggleFlag(row, col);
}

function handleCellDoubleClick(event) { // Double Click (Chording)
     if (gameOver || !event.target.classList.contains('cell')) return;
    const cellElement = event.target;
    const row = parseInt(cellElement.dataset.row); const col = parseInt(cellElement.dataset.col);
     if (!board[row] || !board[row][col]) return;
    const cell = board[row][col];
    if (!cell.isRevealed || cell.adjacentMines === 0) return;
    let adjacentFlags = 0;
    iterateNeighbors(row, col, (nr, nc) => { if (board[nr][nc].isFlagged) adjacentFlags++; });
    if (adjacentFlags === cell.adjacentMines) {
        iterateNeighbors(row, col, (nr, nc) => {
            if (!board[nr][nc].isFlagged && !board[nr][nc].isRevealed) revealCell(nr, nc);
        });
        checkWinCondition();
    }
}

// --- Button Event Listeners ---
hintButton.addEventListener('click', () => { hintModal.style.display = 'flex'; });
hintCloseButton.addEventListener('click', () => { hintModal.style.display = 'none'; });
resetButton.addEventListener('click', () => {
    // No need to update currentDifficulty here, initializeGame reads it
    initializeGame();
});
difficultySelect.addEventListener('change', () => {
    // No need to update currentDifficulty here, initializeGame reads it
    initializeGame();
});
messageCloseButton.addEventListener('click', () => {
    messageBox.style.display = 'none'; initializeGame();
});

// --- Game Logic Functions ---
function revealCell(row, col) {
     if (row < 0 || row >= currentDifficulty.rows || col < 0 || col >= currentDifficulty.cols) return;
     if (!board[row] || !board[row][col]) return;
     const cell = board[row][col];
     if (cell.isRevealed || cell.isFlagged) return;
    cell.isRevealed = true;
    cell.element.classList.add('revealed');
    cell.element.style.cursor = 'default';
    revealedCells++;
    if (cell.isMine) {
        cell.element.classList.add('mine'); cell.element.innerHTML = '💣'; endGame(false);
    } else {
        if (cell.adjacentMines > 0) {
            cell.element.textContent = cell.adjacentMines;
            cell.element.dataset.count = cell.adjacentMines;
            cell.element.style.cursor = 'pointer';
        } else {
            iterateNeighbors(row, col, (nr, nc) => { revealCell(nr, nc); });
        }
    }
}

function toggleFlag(row, col) {
     if (!board[row] || !board[row][col]) return;
    const cell = board[row][col];
    if (cell.isRevealed) return;
    cell.isFlagged = !cell.isFlagged;
    cell.element.classList.toggle('flagged');
    if (cell.isFlagged) {
        cell.element.innerHTML = '🚩'; flaggedCells++;
    } else {
        cell.element.innerHTML = ''; flaggedCells--;
    }
    // Update mine counter display
    minesLeft = currentDifficulty.mines - flaggedCells;
    minesLeftElement.textContent = `Mines Left: ${minesLeft}`;
}

function iterateNeighbors(row, col, callback) {
    for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
            if (i === 0 && j === 0) continue;
            const nr = row + i; const nc = col + j;
            if (nr >= 0 && nr < currentDifficulty.rows && nc >= 0 && nc < currentDifficulty.cols && board[nr] && board[nr][nc]) {
               callback(nr, nc);
            }
        }
    }
 }

// --- Timer Functions ---
function startTimer() {
     if (timerInterval) clearInterval(timerInterval);
    timeElapsed = 0;
    timerElement.textContent = 'Time: 0s';
    timerInterval = setInterval(() => {
        if (!gameOver) { timeElapsed++; timerElement.textContent = `Time: ${timeElapsed}s`; }
        else { clearInterval(timerInterval); timerInterval = null; }
    }, 1000);
}
function stopTimer() { clearInterval(timerInterval); timerInterval = null; }

// --- Win/Loss Condition ---
function checkWinCondition() {
     if (gameOver) return;
    const totalNonMineCells = (currentDifficulty.rows * currentDifficulty.cols) - currentDifficulty.mines;
    if (revealedCells === totalNonMineCells) {
         let allSafeRevealed = true;
         for (let r = 0; r < currentDifficulty.rows; r++) {
             for (let c = 0; c < currentDifficulty.cols; c++) {
                 if (board[r] && board[r][c] && !board[r][c].isMine && !board[r][c].isRevealed) {
                     allSafeRevealed = false; break;
                 }
             }
             if (!allSafeRevealed) break;
         }
         if (allSafeRevealed) endGame(true);
    }
}

function endGame(isWin) {
     if (gameOver) return; gameOver = true; stopTimer();
    mineLocations.forEach(({ row, col }) => {
         if (!board[row] || !board[row][col]) return;
        const cell = board[row][col];
        if (!cell.isRevealed && !cell.isFlagged && !isWin) {
            cell.element.classList.add('revealed', 'mine'); cell.element.innerHTML = '💣';
        } else if (isWin && !cell.isFlagged) {
             cell.element.classList.add('flagged'); cell.element.innerHTML = '🚩'; cell.element.style.backgroundColor = '#2ecc71';
        } else if (isWin && cell.isFlagged) {
             cell.element.style.backgroundColor = '#2ecc71';
        }
    });
     if (!isWin) {
         for (let r = 0; r < currentDifficulty.rows; r++) {
             for (let c = 0; c < currentDifficulty.cols; c++) {
                  if (!board[r] || !board[r][c]) continue;
                 if (board[r][c].isFlagged && !board[r][c].isMine) {
                     board[r][c].element.innerHTML = '❌'; board[r][c].element.style.backgroundColor = '#e74c3c';
                 }
             }
         }
     }
    boardElement.removeEventListener('click', handleCellClick);
    boardElement.removeEventListener('contextmenu', handleCellRightClick);
    boardElement.removeEventListener('dblclick', handleCellDoubleClick);
    // Show Win/Loss Modal
    if (isWin) {
        messageTitle.textContent = 'Congratulations!'; messageText.textContent = `You cleared the board in ${timeElapsed} seconds!`;
    } else {
        messageTitle.textContent = 'Game Over!'; messageText.textContent = 'You hit a mine!';
    }
    messageBox.style.display = 'flex';
}

// --- Initial Load ---
window.onload = () => {
    // Set initial difficulty display value
    difficultySelect.value = 'easy'; // Or whatever default you prefer
    // Initialize game based on initial dropdown value
    initializeGame();
};
