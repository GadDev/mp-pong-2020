(() => {
	const CANVAS = document.getElementById('game-canvas');
	const CANVAS_CONTEXT = CANVAS.getContext('2d');
	const FRAMES_PER_SECOND = 30;
	let ballX = 50;
	let ballY = 50;
	let ballSpeedX = 10;
	let ballSpeedY = 4;

	let paddle_oneY = 250;
	let paddle_twoY = 250;
	const PADDLE_THICKNESS = 10;
	const PADDLE_HEIGHT = 100;

	let playerOneScore = 0;
	let playerTwoScore = 0;

	const init = () => {
		setInterval(function () {
			moveElements();
			drawGame();
		}, 1000 / FRAMES_PER_SECOND);
		CANVAS.addEventListener('mousemove', (evt) => {
			let mousePos = calculateMousePosition(evt);
			paddle_oneY = mousePos.y - PADDLE_HEIGHT / 2;
		});
	};
	const computerMouvement = () => {
		let paddle_two_center = paddle_twoY + PADDLE_HEIGHT / 2;
		if (paddle_two_center < ballY - 35) {
			paddle_twoY += 6;
		} else if (paddle_two_center > ballY + 35) {
			paddle_twoY -= 6;
		}
	};
	const moveElements = () => {
		computerMouvement();
		ballX = ballX + ballSpeedX;
		ballY = ballY + ballSpeedY;
		// if close to left side
		if (ballX < 0) {
			if (ballY > paddle_oneY && ballY < paddle_oneY + PADDLE_HEIGHT) {
				ballSpeedX = -ballSpeedX;
				//increase speed if ball touch edge of the paddle
				let deltaY = ballY - (paddle_oneY + PADDLE_HEIGHT / 2);
				ballSpeedY = deltaY * 0.35;
			} else {
				ballReset();
				playerTwoScore++;
			}
		}
		// if close to left side
		if (ballX > CANVAS.width) {
			if (ballY > paddle_twoY && ballY < paddle_twoY + PADDLE_HEIGHT) {
				ballSpeedX = -ballSpeedX;

				let deltaY = ballY - (paddle_twoY + PADDLE_HEIGHT / 2);
				ballSpeedY = deltaY * 0.35;
			} else {
				ballReset();
				playerOneScore++;
			}
		}
		if (ballY < 0) {
			ballSpeedY = -ballSpeedY;
		}
		if (ballY > CANVAS.height) {
			ballSpeedY = -ballSpeedY;
		}
	};

	const drawGame = () => {
		// draws the board
		drawRect(0, 0, CANVAS.width, CANVAS.height, '#bb5522');
		// draws the left pad (left PLAYER)
		drawRect(0, paddle_oneY, PADDLE_THICKNESS, PADDLE_HEIGHT, 'white');
		// draws the right pad (AI PLAYER)
		drawRect(
			CANVAS.width - 10,
			paddle_twoY,
			PADDLE_THICKNESS,
			PADDLE_HEIGHT,
			'white'
		);
		// draws the ball
		drawCircle(ballX, ballY, 10, '#ccff00');
		CANVAS_CONTEXT.fillText(playerOneScore, 100, 100);
		CANVAS_CONTEXT.fillText(playerTwoScore, CANVAS.width - 100, 100);
	};
	const drawRect = (leftX, topY, width, height, drawColor) => {
		CANVAS_CONTEXT.fillStyle = drawColor;
		CANVAS_CONTEXT.fillRect(leftX, topY, width, height);
	};
	const drawCircle = (centerX, centerY, radius, drawColor) => {
		CANVAS_CONTEXT.fillStyle = drawColor;
		CANVAS_CONTEXT.beginPath();
		CANVAS_CONTEXT.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
		CANVAS_CONTEXT.fill();
	};

	const calculateMousePosition = (event) => {
		let rect = CANVAS.getBoundingClientRect();
		let root = document.documentElement;
		let mouseX = event.clientX - rect.left - root.scrollLeft;
		let mouseY = event.clientY - rect.top - root.scrollTop;

		return {
			x: mouseX,
			y: mouseY,
		};
	};

	const ballReset = () => {
		ballSpeedX = -ballSpeedX;
		ballX = CANVAS.width / 2;
		ballY = CANVAS.height / 2;
	};
	init();
})();
