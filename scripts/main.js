document.addEventListener('DOMContentLoaded', function () {
    let db;

    // Открытие базы данных
    function openDatabase() {
        const request = indexedDB.open('minesweeper', 1);

        request.onupgradeneeded = function (event) {
            const db = event.target.result;
            const objectStore = db.createObjectStore('games', { keyPath: 'id', autoIncrement: true });
            objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        };

        request.onsuccess = function (event) {
            db = event.target.result;
        };

        request.onerror = function (event) {
            console.error('Ошибка при открытии базы данных:', event.target.error);
        };
    }

    openDatabase();

    let width, height, mines, gameBoard, cells, gameStatus, gameOver = false, playerName;
    let gameSaved = false; // Флаг для проверки, была ли игра сохранена

    // Привязка кнопок и модального окна
    const startBtn = document.getElementById('startBtn');
    const openModalButton = document.getElementById('openModal');
    const closeModalButton = document.getElementById('closeModal');
    const modal = document.getElementById('modal');
    const errorMessageDiv = document.getElementById('error-message');

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


    const viewPastGamesBtn = document.getElementById('view-past-games');
    viewPastGamesBtn.addEventListener('click', loadPastGames);

    const clearDbBtn = document.getElementById('clear-db');
    clearDbBtn.addEventListener('click', clearDatabase);

    // Начало новой игры
    function startNewGame() {
        playerName = document.getElementById('player-name').value.trim();
        if (!playerName) {
            showError('Пожалуйста, введите имя перед игрой.');
            modal.showModal();
            return;
        }

        width = parseInt(document.getElementById('width').value);
        height = parseInt(document.getElementById('height').value);
        mines = parseInt(document.getElementById('mines').value);

        if (mines > width * height) {
            showError('Количество мин не может превышать количество ячеек.');
            modal.showModal();
            return;
        }

        gameBoard = document.getElementById('game-board');
        gameStatus = document.getElementById('game-status');
        gameOver = false;
        gameSaved = false;

        gameBoard.innerHTML = '';
        gameStatus.textContent = '';
        cells = [];

        const allCells = width * height;
        const minePositions = generateMines(allCells, mines);

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

        document.querySelector('.game-container').style.display = 'block';
        document.getElementById('past-games-container').style.display = 'none';
    }

    // Генерация позиций мин
    function generateMines(totalCells, mineCount) {
        const minePositions = new Set();
        while (minePositions.size < mineCount) {
            minePositions.add(Math.floor(Math.random() * totalCells));
        }
        return minePositions;
    }

    // Обработка клика по ячейке
    function handleCellClick(cell, minePositions) {
        const index = parseInt(cell.dataset.index);

        if (minePositions.has(index)) {
            cell.classList.add('revealed', 'mine');
            gameOver = true;
            gameStatus.textContent = 'Game Over!';
            revealMines(minePositions); // Раскрываем все мины
            if (!gameSaved) {
                saveGame(false);
                gameSaved = true;
            }
            return;
        }

        revealCell(cell, minePositions);
    }

    // Раскрытие ячейки
    function revealCell(cell, minePositions) {
        const index = parseInt(cell.dataset.index);
        if (cell.classList.contains('revealed')) return;

        cell.classList.add('revealed');
        const adjacentMines = countAdjacentMines(index, minePositions);

        if (adjacentMines > 0) {
            cell.textContent = adjacentMines;
            cell.style.color = getNumberColor(adjacentMines);
        } else {
            revealAdjacentCells(index, minePositions);
        }

        if (checkForWin(minePositions) && !gameSaved) {
            gameStatus.textContent = 'Вы выиграли!';
            gameOver = true;
            saveGame(true);
            gameSaved = true;
        }
    }

    function revealMines(minePositions) {
        cells.forEach(cell => {
            const index = parseInt(cell.dataset.index);
            if (minePositions.has(index)) {
                cell.classList.add('revealed', 'mine'); // Добавляем классы, чтобы визуально обозначить мину
            }
        });
    }

    // Цвет текста в зависимости от числа
    function getNumberColor(number) {
        const colors = {
            1: '#4299E1',
            2: 'green',
            3: 'red',
            4: 'purple',
            5: 'maroon',
            6: 'turquoise',
            7: 'black',
            8: 'gray'
        };
        return colors[number] || 'black';
    }

    // Раскрытие соседних ячеек
    function revealAdjacentCells(index, minePositions) {
        const neighbors = [-1, 1, -width, width, -width - 1, -width + 1, width - 1, width + 1];

        neighbors.forEach(offset => {
            const neighborIndex = index + offset;

            if (neighborIndex < 0 || neighborIndex >= width * height) return;

            if ((index % width === 0 && offset === -1) ||
                ((index + 1) % width === 0 && offset === 1)) {
                return;
            }

            const neighborCell = cells[neighborIndex];
            if (!neighborCell.classList.contains('revealed') && !minePositions.has(neighborIndex)) {
                revealCell(neighborCell, minePositions);
            }
        });
    }

    // Подсчет мин вокруг
    function countAdjacentMines(index, minePositions) {
        const neighbors = [-1, 1, -width, width, -width - 1, -width + 1, width - 1, width + 1];
        return neighbors.reduce((count, offset) => {
            const neighborIndex = index + offset;

            if (neighborIndex < 0 || neighborIndex >= width * height) return count;

            if ((index % width === 0 && offset === -1) ||
                ((index + 1) % width === 0 && offset === 1)) {
                return count;
            }

            return count + (minePositions.has(neighborIndex) ? 1 : 0);
        }, 0);
    }

    // Проверка победы
    function checkForWin(minePositions) {
        return cells.every(cell => {
            const index = parseInt(cell.dataset.index);
            return minePositions.has(index) || cell.classList.contains('revealed');
        });
    }

    // Сохранение игры
    function saveGame(winStatus) {
        const gameData = {
            playerName,
            size: `${width}x${height}`,
            mines,
            winStatus: winStatus ? 'Won' : 'Lost',
            timestamp: new Date().toISOString(),
        };

        const transaction = db.transaction(['games'], 'readwrite');
        const objectStore = transaction.objectStore('games');
        const request = objectStore.add(gameData);

        request.onsuccess = () => console.log('Игра сохранена.');
        request.onerror = (event) => console.error('Ошибка при сохранении игры:', event.target.error);

    }

    // Загрузка прошлых игр
    function loadPastGames() {
        const transaction = db.transaction(['games'], 'readonly');
        const objectStore = transaction.objectStore('games');
        const request = objectStore.getAll();

        request.onsuccess = function (event) {
            const games = event.target.result;
            const gameList = document.getElementById('game-list');
            gameList.innerHTML = ''; // Очищаем список

            // Проверяем, есть ли игры
            if (games.length === 0) {
                const noGamesMessage = document.createElement('li');
                noGamesMessage.textContent = 'Нет доступных игр. Начните новую игру!';
                noGamesMessage.style.color = '#ff7f11'; // Например, меняем цвет текста
                gameList.appendChild(noGamesMessage);
            } else {
                games.forEach(game => {
                    const listItem = document.createElement('li');
                    const timestamp = new Date(game.timestamp).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
                    listItem.textContent = `Игрок: ${game.playerName} - Игра: ${timestamp} - Размер: ${game.size} - Мин: ${game.mines} - ${game.winStatus}`;
                    gameList.appendChild(listItem);
                });
            }

            document.getElementById('past-games-container').style.display = 'block';
        };

        request.onerror = function (event) {
            console.error('Ошибка при загрузке прошлых игр:', event.target.error);
        };
    }


    // Очистка базы данных
    function clearDatabase() {
        const transaction = db.transaction(['games'], 'readwrite');
        const objectStore = transaction.objectStore('games');
        const request = objectStore.clear();

        request.onsuccess = function () {
            loadPastGames();
            console.log('База данных очищена');
        };
        request.onerror = function (event) {
            console.error('Ошибка при очистке базы данных:', event.target.error);
        };
    }
});
