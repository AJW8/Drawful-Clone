var states = {
	LOBBY: 0,
	INTRO: 1,
	DRAW_PROMPTS: 2,
	WRITE_TITLES: 3,
	GUESS_TITLE: 4,
	CURRENT_GUESS: 5,
	GUESS_RESULTS: 6,
	ACTUAL_TITLE: 7,
	PROMPT_SCORES: 8,
	SCORES: 9,
	WINNER: 10,
	END: 11
};

function HostView(){
	var code = false;
	var state = false;
	var minPlayers = false;
	var maxPlayers = false;
	var players = false;
	var sortedPlayers = false;
	var audience = false;
	var round = false;
	var drawing = false;
	var titles = false;
	var audienceVotes = false;
	var currentGuess = false;
	
	this.init = function(){
		this.initSocket();
		this.bindViewEvents();
		this.bindSocketEvents();
		socket.emit('host_init');
	}
	
	this.initSocket = function(){
		socket = io.connect({
			'reconnection':true,
			'reconnectionDelay': 1000,
			'reconnectionDelayMax' : 1000,
			'reconnectionAttempts': 1000
		});
	}
	
	this.updateData = function(data){
		code = data.code;
		state = data.state;
		audience = data.audience;
		if(!minPlayers) minPlayers = data.min_players;
		if(!maxPlayers) maxPlayers = data.max_players;
		players = data.players;
		sortedPlayers = data.sorted_players;
		audience = data.audience;
		round = data.round;
		drawing = data.drawing;
		titles = data.titles;
		audienceVotes = data.audience_votes;
		currentGuess = data.current_guess;
		this.updateView();
	}
	
	this.updateView = function(){
		$("#room_code").html("Code: " + code);
		if(state == states.LOBBY){
			$("#lobby").show();
			$("#game_start").hide();
			$("#lobby_room_code").html("<p>Code: " + code + "</p>");
			var html = "";
			for(let i = 0; i < maxPlayers; i++) html += "<p>" + (i < players.length ? players[i].name + "</p><canvas id=\"lobby_canvas" + (i + 1) + "\" width=\"100\" height=\"100\"" + (players[i].drawing ? "" : "style=\"border:1px solid black\"") + "/>" : "<i>join now!</i></p>");
			if(players.length < minPlayers) $("#btn_start_game").html((minPlayers - players.length) + (minPlayers - players.length > 1 ? " more players needed" : " more player needed"));
			else{
				$("#btn_start_game").html('Start Game');
				if(players.length == maxPlayers) html += "<p>" + (audience > 0 ? audience + " in audience" : "Join the audience!") + "</p>";
			}
			$('#lobby_players').html(html);
			for(let i = 0; i < players.length; i++){
				const currentDrawing = players[i].drawing;
				if(currentDrawing){
					var canvas = document.getElementById("lobby_canvas" + (i + 1));
					var context = canvas.getContext("2d");
					context.strokeStyle = players[i].colour;
					context.beginPath();
					for(let j = 0; j < currentDrawing.length; j++){
						const currentPath = currentDrawing[j];
						for(let k = 0; k < currentPath.length; k++){
							if(k == 0) context.moveTo(currentPath[0].x * canvas.width, currentPath[0].y * canvas.height);
							else{
								context.lineTo(currentPath[k].x * canvas.width, currentPath[k].y * canvas.height);
								context.stroke();
							}
						}
					}
				}
			}
		}
		else{
			$("#lobby").hide();
			$("#game_start").show();
			$("#game").show();
			$("#prompt_canvas").hide();
			$("#game_audience_count").html("<p>" + (audience > 0 ? audience + " in audience</p>" : "Join the audience!</p>"));
			if(state == states.INTRO){
				$("#intro").show();
				$("#intro").html("<p>Welcome to Drawful!</p><p>For each round, you will draw a picture that matches a secret prompt. Just be warned: there is no undo button!</p><p>For each drawing, all players (except the artist) write a decoy title.</p><p>Finally, they must vote for which one they think is the original title.</p>" + (audience > 0 ? "<p>Audience members get to vote too!</p>" : "") + (players.length < 4 ? "<p>There will be 3 rounds this game.</p>" : players.length < 5 ? "<p>There will be 2 rounds this game.</p>" : "<p>There will be only 1 round this game, so make it count!</p>"));
			}
			else $("#intro").hide();
			if(state == states.DRAW_PROMPTS){
				$("#draw_prompts").show();
				var html = "";
				for(let i = 0; i < players.length; i++) html += "<canvas id=\"drawn_canvas" + (i + 1) + "\" width=\"100\" height=\"100\"" + (players[i].submitted ? "" : "style=\"border:1px solid black\"") + "/>";
				$("#players_drawn").html(html);
				for(let i = 0; i < players.length; i++){
					const currentDrawing = players[i].drawing;
					if(players[i].submitted && currentDrawing){
						var canvas = document.getElementById("drawn_canvas" + (i + 1));
						var context = canvas.getContext("2d");
						context.strokeStyle = players[i].colour;
						context.beginPath();
						for(let j = 0; j < currentDrawing.length; j++){
							const currentPath = currentDrawing[j];
							for(let k = 0; k < currentPath.length; k++){
								if(k == 0) context.moveTo(currentPath[0].x * canvas.width, currentPath[0].y * canvas.height);
								else{
									context.lineTo(currentPath[k].x * canvas.width, currentPath[k].y * canvas.height);
									context.stroke();
								}
							}
						}
					}
				}
			}
			else $("#draw_prompts").hide();
			if(state == states.WRITE_TITLES){
				$("#prompt_canvas").show();
				$("#current_prompt").show();
				$("#write_title").show();
				var canvas = document.getElementById("prompt_canvas");
				var context = canvas.getContext("2d");
				context.clearRect(0, 0, canvas.width, canvas.height);
				if(drawing){
					var colour = "black";
					for(let i = 0; i < players.length; i++) if(players[i].artist) colour = players[i].colour;
					context.strokeStyle = colour;
					context.beginPath();
					for(let i = 0; i < drawing.length; i++){
						const currentPath = drawing[i];
						for(let j = 0; j < currentPath.length; j++){
							if(j == 0) context.moveTo(currentPath[0].x * canvas.width, currentPath[0].y * canvas.height);
							else{
								context.lineTo(currentPath[j].x * canvas.width, currentPath[j].y * canvas.height);
								context.stroke();
							}
						}
					}
				}
				$("#guess_title").hide();
				var html = "";
				for(let i = 0; i < players.length; i++) if(!players[i].artist) html += "<canvas id=\"written_canvas" + (i + 1) + "\" width=\"100\" height=\"100\"" + (players[i].submitted ? "" : "style=\"border:1px solid black\"") + "/>";
				$("#players_written").html(html);
				for(let i = 0; i < players.length; i++){
					const currentDrawing = players[i].drawing;
					if(!players[i].artist && players[i].submitted && currentDrawing){
						var canvas = document.getElementById("written_canvas" + (i + 1));
						var context = canvas.getContext("2d");
						context.strokeStyle = players[i].colour;
						context.beginPath();
						for(let j = 0; j < currentDrawing.length; j++){
							const currentPath = currentDrawing[j];
							for(let k = 0; k < currentPath.length; k++){
								if(k == 0) context.moveTo(currentPath[0].x * canvas.width, currentPath[0].y * canvas.height);
								else{
									context.lineTo(currentPath[k].x * canvas.width, currentPath[k].y * canvas.height);
									context.stroke();
								}
							}
						}
					}
				}
				$("#audience_votes").hide();
			}
			else if(state == states.GUESS_TITLE){
				$("#prompt_canvas").show();
				$("#current_prompt").show();
				$("#write_title").hide();
				$("#guess_title").show();
				var html = "";
				for(let i = 0; i < titles.length; i++) if(titles[i].title) html += "<p>" + titles[i].title + "</p>";
				$("#show_titles").html(html);
				$("#audience_votes").show();
				$("#audience_votes").html(audienceVotes > 0 ? "<p>Audience votes: " + audienceVotes + "</p>" : "");
			}
			else $("#current_prompt").hide();
			if(state == states.CURRENT_GUESS){
				$("#prompt_canvas").show();
				$("#current_guess").show();
				$("#show_guess_result").hide();
				const guess = titles[currentGuess];
				const playerVotes = guess.player_votes;
				var html = "";
				if(playerVotes){
					for(let i = 0; i < playerVotes.length; i++) html += "<p>" + playerVotes[i] + "</p>";
				}
				const audiencePercentage = guess.audience_percentage;
				if(audiencePercentage > 0) html += "<p>" + (playerVotes && playerVotes.length > 0 ? "+ " : "") + audiencePercentage + "% of the audience</p>";
				if(playerVotes && playerVotes.length > 0 || audiencePercentage > 0) html += "<p>voted for</p>";
				$("#all_votes").html(html);
				$("#show_guess").html("<p>" + guess.title + "</p>");
			}
			else if(state == states.GUESS_RESULTS){
				$("#prompt_canvas").show();
				$("#current_guess").show();
				$("#show_guess_result").show();
				const guess = titles[currentGuess];
				$("#show_guess_result").html(guess.player ? guess.player : "actual title");
				const playerVotes = guess.player_votes;
				var html = "";
				if(playerVotes){
					for(let i = 0; i < playerVotes.length; i++) html += guess.player ? "<p>+500</p>" : "<p>+1000</p>";
				}
				const audiencePercentage = guess.audience_percentage;
				if(audiencePercentage > 0) html += "<p>+" + (audiencePercentage * (guess.player ? 5 : 10)) + "</p>";
				$("#all_votes").html(html);
			}
			else $("#current_guess").hide();
			if(state == states.ACTUAL_TITLE){
				$("#prompt_canvas").show();
				if(!drawing){
					var canvas = document.getElementById("prompt_canvas");
					var context = canvas.getContext("2d");
					context.clearRect(0, 0, canvas.width, canvas.height);
				}
				$("#actual_title").show();
				$("#actual_title").html(titles[currentGuess].title);
			}
			else $("#actual_title").hide();
			if(state == states.PROMPT_SCORES || state == states.SCORES){
				$("#scores").show();
				var html = state == states.PROMPT_SCORES ? "<p>PROMPT SCORES</p>" : "<p>SCORES</p>";
				for(let i = 0; i < sortedPlayers.length; i++) html += "<canvas id=\"score_canvas" + (i + 1) + "\" width=\"100\" height=\"100\"/><br><p>" + (i + 1) + " " + sortedPlayers[i].name + (state == states.PROMPT_SCORES ? " (" + (sortedPlayers[i].artist ? "ARTIST" : sortedPlayers[i].title ? sortedPlayers[i].title : "NO SUBMISSION") + ")" : "") + ": " + sortedPlayers[i].score + ((state == states.SCORES || sortedPlayers[i].title) && sortedPlayers[i].likes > 0 ? (" + " + sortedPlayers[i].likes + (sortedPlayers[i].likes > 1 ? " likes" : " like")) : "") + "</p>";
				$("#scores").html(html);
				for(let i = 0; i < sortedPlayers.length; i++){
					const currentDrawing = sortedPlayers[i].drawing;
					if(currentDrawing){
						var canvas = document.getElementById("score_canvas" + (i + 1));
						var context = canvas.getContext("2d");
						context.strokeStyle = sortedPlayers[i].colour;
						context.beginPath();
						for(let j = 0; j < currentDrawing.length; j++){
							const currentPath = currentDrawing[j];
							for(let k = 0; k < currentPath.length; k++){
								if(k == 0) context.moveTo(currentPath[0].x * canvas.width, currentPath[0].y * canvas.height);
								else{
									context.lineTo(currentPath[k].x * canvas.width, currentPath[k].y * canvas.height);
									context.stroke();
								}
							}
						}
					}
				}
			}
			else $("#scores").hide();
			if(state == states.WINNER){
				$("#winner").show();
				var winners = [];
				var maxScore = 0;
				for(let i = 0; i < sortedPlayers.length; i++){
					var currentScore = sortedPlayers[i].score;
					if(i == 0) maxScore = currentScore;
					if(currentScore == maxScore) winners.push(i);
				}
				var html = winners.length > 1 ? "<p>WINNERS:<p>" : "<p>WINNER:</p>";
				for(let i = 0; i < winners.length; i++) html += "<canvas id=\"winner_canvas" + (i + 1) + "\" width=\"100\" height=\"100\"/><br><p>" + sortedPlayers[winners[i]].name + "</p>";
				$("#winner").html(html);
				for(let i = 0; i < winners.length; i++){
					const currentDrawing = sortedPlayers[winners[i]].drawing;
					if(currentDrawing){
						var canvas = document.getElementById("winner_canvas" + (i + 1));
						var context = canvas.getContext("2d");
						context.strokeStyle = sortedPlayers[winners[i]].colour;
						context.beginPath();
						for(let j = 0; j < currentDrawing.length; j++){
							const currentPath = currentDrawing[j];
							for(let k = 0; k < currentPath.length; k++){
								if(k == 0) context.moveTo(currentPath[0].x * canvas.width, currentPath[0].y * canvas.height);
								else{
									context.lineTo(currentPath[k].x * canvas.width, currentPath[k].y * canvas.height);
									context.stroke();
								}
							}
						}
					}
				}
			}
			else $("#winner").hide();
			if(state == states.END){
				$("#game").hide();
				$("#end").show();
				var html = "<p>FINAL SCORES</p>";
				for(let i = 0; i < sortedPlayers.length; i++) html += "<p>" + (i + 1) + " " + sortedPlayers[i].name + ": " + sortedPlayers[i].score + (sortedPlayers[i].likes > 0 ? (" + " + sortedPlayers[i].likes + (sortedPlayers[i].likes > 1 ? " likes</p>" : " like</p>")) : "</p>");
				$("#final_scores").html(html);
			}
			else $("#end").hide();
		}
	}
	
	this.bindViewEvents = function(){
		$('#btn_start_game').click(function(){
			if(!players || players.length < minPlayers) alert((players ? minPlayers - players.length : minPlayers) + (minPlayers - players.length > 1 ? " more players needed to start." : " more player needed to start."));
			else if(confirm("Start the game?")) socket.emit('host_start_game');
			return false;
		});
		$('#btn_continue').click(function(){
			socket.emit('host_continue');
			return false;
		});
		$('#btn_end_game').click(function(){
			socket.emit('host_end_game');
			return false;
		});
		$('#btn_leave_game').click(function(){
			if(confirm("Destroy the current game? All data associated with this game will be lost.")) socket.emit('host_leave_game');
			return false;
		});
		$('#btn_same_players').click(function(){
			if(confirm("Play again with the same players?")) socket.emit('host_start_game');
			return false;
		});
		$('#btn_new_players').click(function(){
			if(confirm("Start a new lobby? You as the host will remain connected.")) socket.emit('host_new_lobby');
			return false;
		});
	}
	
	this.bindSocketEvents = function(){
		socket.on('host_init_ok', function(host){
			return function(data){
				host.updateData(data);
				return false;
			}
		}(this));
		socket.on('host_init_nok', function(){
			location.href = '/';
		});
		socket.on('host_players_update', function(host){
			return function(newPlayers){
				players = newPlayers;
				host.updateView();
				return false;
			}
		}(this));
		socket.on('host_audience_update', function(host){
			return function(newAudience){
				audience = newAudience;
				host.updateView();
				return false;
			}
		}(this));
		socket.on('host_state_update', function(host){
			return function(data){
				if(state != data.state) host.updateData(data);
				return false;
			}
		}(this));
		socket.on('host_set_audience_votes', function(host){
			return function(votes){
				if(state != states.CURRENT_PROMPT) return false;
				audienceVotes = votes;
				host.updateView();
				return false;
			}
		}(this));
	}
}

$(document).ready(function(){
	var game = new HostView();
	game.init();
});