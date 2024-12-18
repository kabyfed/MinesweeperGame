import { saveGame, getAllGames, clearDatabase, getGameById } from './dataBase.js';

document.addEventListener('DOMContentLoaded', function () {
    let width, height, mines, gameBoard, cells, gameStatus, gameOver = false, playerName;
    let gameSaved = false;
    let moves = [];

    const startBtn = document.getElementById('startBtn');
    const viewPastGamesBtn = document.getElementById('view-past-games');
    const clearDbBtn = document.getElementById('clear-db');
    const helpBtn = document.getElementById('help');
    const closeHelpBtn = document.getElementById('close-help');
    const replayContainer = document.getElementById('past-games-container');
    const closeReplayBtn = document.getElementById('close-replay');
    const openModalButton = document.getElementById('openModal');
    const closeModalButton = document.getElementById('closeModal');
    const modal = document.getElementById('modal');
    const errorMessageDiv = document.getElementById('error-message');

    startBtn.addEventListener('click', startNewGame);
    viewPastGamesBtn.addEventListener('click', loadPastGames);
    clearDbBtn.addEventListener('click', async () => {
        await clearDatabase();
        alert('База данных очищена!');
        loadPastGames();
    });
    helpBtn.addEventListener('click', () => {
        document.getElementById('help-container').style.display = 'block';
    });
    closeHelpBtn.addEventListener('click', () => {
        document.getElementById('help-container').style.display = 'none';
    });
    closeReplayBtn.addEventListener('click', () => {
        replayContainer.style.display = 'none';
    });

    function showError(message) {
        errorMessageDiv.textContent = message;
    }

    function clearError() {
        errorMessageDiv.textContent = '';
    }

    openModalButton.addEventListener("click", () => modal.showModal());
    startBtn.addEventListener("click", () => {
        clearError();
        modal.close();
        startNewGame();
    });

    modal.addEventListener('click', (event) => {
        if (event.target === modal) modal.close();
    });

    closeModalButton.addEventListener('click', () => {
        modal.close(); // Закрыть модальное окно
    });

    async function startNewGame() {
        playerName = document.getElementById('player-name').value.trim();
        if (!playerName) {
            showError('Пожалуйста, введите имя перед игрой.');
            modal.showModal();
            return;
        }
    
        width = parseInt(document.getElementById('width').value);
        height = parseInt(document.getElementById('height').value);
        mines = parseInt(document.getElementById('mines').value);
    
        if (isNaN(width) || isNaN(height) || isNaN(mines) || width < 5 || height < 5 || mines < 1 || mines >= width * height) {
            showError('Пожалуйста, введите корректные значения для ширины, высоты и количества мин.');
            modal.showModal();
            return;
        }
    
        gameBoard = document.getElementById('game-board');
        gameStatus = document.getElementById('game-status');
        gameOver = false;
        gameSaved = false;
        moves = []; // Сброс шагов при новой игре
    
        gameBoard.innerHTML = '';
        gameStatus.textContent = '';
        cells = [];
        const minePositions = generateMines(width * height, mines);
    
        createBoard(width, height, minePositions);
        document.querySelector('.game-container').style.display = 'block';
        document.getElementById('past-games-container').style.display = 'none';
        document.getElementById('game-list').style.display = 'none';
    }
    

    async function saveGameResult(winStatus) {
        if (!gameSaved) {
            const gameData = {
                playerName,
                size: `${width}x${height}`, // Используем ширину и высоту
                mines,
                winStatus: winStatus ? 'Победа' : 'Поражение',
                timestamp: new Date().toISOString(),
                moves // Сохранение шагов
            };
            await saveGame(gameData);
            gameSaved = true;
        }
    }

    async function loadPastGames() {
        const games = await getAllGames();
        const gameList = document.getElementById('game-list');
        document.getElementById('game-list').style.display = 'block';
        gameList.innerHTML = '';
        if (games.length) {
            const listItem = document.createElement('li');
            listItem.textContent = `Нажмите на игру для просмотра`;
            gameList.appendChild(listItem);
        }
        games.forEach(game => {
            const listItem = document.createElement('li');
            const timestamp = new Date(game.timestamp).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
            listItem.textContent = `Игрок: ${game.playerName} - Дата: ${timestamp} - Размер: ${game.size} - Мины: ${game.mines} - Итог: ${game.winStatus}`;
            listItem.addEventListener('click', () => replayGame(game.id));
            gameList.appendChild(listItem);
        });
    }

    async function replayGame(id) {
        const gameData = await getGameById(id);
        if (!gameData) {
            alert('Игра не найдена!');
            return;
        }

        replayContainer.style.display = 'block';
        const replayList = document.getElementById('replay-list');
        replayList.innerHTML = `<strong>Данные игры:</strong><a> Игрок: ${gameData.playerName} | Размер: ${gameData.size} | Мины: ${gameData.mines} | Итог: ${gameData.winStatus}</a>`;

        if (gameData.moves && gameData.moves.length > 0) {
            const movesList = document.createElement('ul');
            gameData.moves.forEach((move, index) => {
                const moveItem = document.createElement('li');
                const moveText = document.createElement('span');

                // Задаём текст и класс для результата хода
                moveText.textContent = move.result;
                if (move.result === 'Мина') {
                    moveText.classList.add('danger');
                }

                // Формируем строку хода
                moveItem.innerHTML = `Ход ${index + 1}: ${move.row}x${move.col} - `;
                moveItem.appendChild(moveText);

                // Добавляем элемент в список
                movesList.appendChild(moveItem);
            });

            replayList.appendChild(movesList);
        } else {
            const noMoves = document.createElement('p');
            noMoves.textContent = 'Нет записанных ходов.';
            replayList.appendChild(noMoves);
        }
    }

    function createBoard(width, height, minePositions) {
        for (let i = 0; i < height; i++) {
            for (let j = 0; j < width; j++) {
                const cell = document.createElement('div');
                cell.classList.add('cell');
                cell.dataset.index = i * width + j;
                gameBoard.appendChild(cell);
                cells.push(cell);

                cell.addEventListener('click', () => {
                    if (gameOver) return;
                    handleCellClick(cell, minePositions);
                });
            }
        }
        gameBoard.style.gridTemplateColumns = `repeat(${width}, 40px)`;
        gameBoard.style.gridTemplateRows = `repeat(${height}, 40px)`;
    }

    function generateMines(totalCells, mineCount) {
        const minePositions = new Set();
        while (minePositions.size < mineCount) {
            minePositions.add(Math.floor(Math.random() * totalCells));
        }
        return minePositions;
    }

    async function handleCellClick(cell, minePositions) {
        if (gameOver || gameSaved) return;

        const index = parseInt(cell.dataset.index);
        const row = Math.floor(index / width);
        const col = index % width;

        if (minePositions.has(index)) {
            cell.classList.add('revealed', 'mine');
            moves.push({ row, col, result: 'Мина' });
            gameOver = true;
            gameStatus.textContent = 'Игра окончена!';
            await saveGameResult(false);
            return;
        }

        moves.push({ row, col, result: 'Безопасно' });
        revealCell(cell, minePositions);

        if (checkForWin(minePositions)) {
            gameStatus.textContent = 'Вы победили!';
            gameOver = true;
            await saveGameResult(true);
        }
    }

    function revealCell(cell, minePositions) {
        if (cell.classList.contains('revealed')) return;
        cell.classList.add('revealed');
        const adjacentMines = countAdjacentMines(parseInt(cell.dataset.index), minePositions);
    
        if (adjacentMines > 0) {
            cell.textContent = adjacentMines;
            cell.classList.add(`color-${adjacentMines}`); // Присваиваем класс для цвета
        } else {
            revealAdjacentCells(parseInt(cell.dataset.index), minePositions);
        }
    }

    function countAdjacentMines(index, minePositions) {
        const neighbors = [-1, 1, -width, width, -width - 1, -width + 1, width - 1, width + 1];
        return neighbors.reduce((count, offset) => count + (minePositions.has(index + offset) ? 1 : 0), 0);
    }

    function revealAdjacentCells(index, minePositions) {
        const neighbors = [-1, 1, -width, width, -width - 1, -width + 1, width - 1, width + 1];
        neighbors.forEach(offset => {
            const neighborIndex = index + offset;
            const neighborCell = cells[neighborIndex];
            if (neighborCell && !neighborCell.classList.contains('revealed') && !minePositions.has(neighborIndex)) {
                revealCell(neighborCell, minePositions);
            }
        });
    }

    function checkForWin(minePositions) {
        return cells.every(cell => {
            const index = parseInt(cell.dataset.index);
            return minePositions.has(index) || cell.classList.contains('revealed');
        });
    }
});