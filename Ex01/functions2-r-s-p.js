let score = JSON.parse(localStorage.getItem('score')) || {
  wins: 0,
  losses: 0,
  ties: 0
};

updateScoreElement();



document.querySelector('.js-rock-button')
  .addEventListener('click', () => {
    playGame('rock');
  });

document.querySelector('.js-paper-button')
  .addEventListener('click', () => {
    playGame('paper');
  });

document.querySelector('.js-scissors-button')
  .addEventListener('click', () => {
    playGame('scissors');
  });

  /*
  Add an event listener
  if the user presses the key r => play rock
  if the user presses the key p => play paper
  if the user presses the key s => play scissors
  */
 document.addEventListener('keydown',(event) => {
  if (event.key === 'r'){
    playGame('rock');
  } else if (event.key === 'p'){
    playGame('paper');
  } else if (event.key === 's'){
    playGame('scissors');
  }
  }
)

function playGame(playerMove) {
  const computerMove = pickComputerMove();

  let result = '';

  // Game logic - determine result
  if (playerMove === computerMove) {
    result = 'Tie';
    score.ties++;
  } else if (
    (playerMove === 'rock' && computerMove === 'scissors') ||
    (playerMove === 'scissors' && computerMove === 'paper') ||
    (playerMove === 'paper' && computerMove === 'rock')
  ) {
    result = 'You win';
    score.wins++;
  } else {
    result = 'You lose';
    score.losses++;
  }

  // Save updated score to localStorage
  localStorage.setItem('score', JSON.stringify(score));

  // Update score display
  updateScoreElement();

  // Display result and images
  document.querySelector('.js-result')
    .innerHTML = result;
  
  document.querySelector('.js-moves')
    .innerHTML = `You picked <img src="images/${playerMove}-emoji.png" alt="${playerMove}"> 
    Computer picked <img src="images/${computerMove}-emoji.png" alt="${computerMove}">`;
}

function updateScoreElement() {
  document.querySelector('.js-score')
    .innerHTML = `Wins: ${score.wins}, Losses: ${score.losses}, Ties: ${score.ties}`;
}

function pickComputerMove() {
  const randomNumber = Math.random();

  let computerMove = '';

  if (randomNumber >= 0 && randomNumber < 1 / 3) {
    computerMove = 'rock';
  } else if (randomNumber >= 1 / 3 && randomNumber < 2 / 3) {
    computerMove = 'paper';
  } else if (randomNumber >= 2 / 3 && randomNumber < 1) {
    computerMove = 'scissors';
  }

  return computerMove;
}