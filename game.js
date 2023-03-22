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

function Games(){
	var games = {};
	
	this.createGame = function(){
		var id = this.generateId();
		games[id] = new Game();
		games[id].setId(id);
		return games[id];
	}
	
	this.generateId = function(){
		var id;
		do{
			id = '';
			var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
			var length = letters.length;
			for(var i = 0; i < 4; i++) id += letters.charAt(Math.floor(Math.random() * length));
			for(var g in games) if(games[id] && games[g].getId() == id) id = false;
		}
		while(!id);
		return id;
	}
	
	this.newLobby = function(gameId){
		var game = games[gameId];
		if(!game) return;
		var id = this.generateId();
		games[id] = game;
		game.setId(id);
		game.newLobby();
	}
	
	this.removeGame = function(gameId){
		if(gameId in games){
			games[gameId].disconnectAll();
			delete games[gameId];
			games[gameId] = false;
		}
	}
	
	this.getGame = function(gameId){
		if(gameId in games) return games[gameId];
		else return false;
	}
}

function Game(){
	var gameId = false;
	var round = false;
	var round = false;
	var playerIds = false;
	var sortedPlayers = false;
	var strokeColours = false;
	var playerData = false;
	var promptData = false;
	var safetyQuips = false;
	var currentPrompt = false;
	var currentGuess = false;
	var audience = false;
	var users = new Users();
	var gameState = new GameState();
	gameState.setState(states.LOBBY, {});
	
	this.setId = function(pId){
		gameId = pId;
	}
	
	this.getId = function(){
		return gameId;
	}
	
	this.addUser = function(user){
		var curState = gameState.get();
		if(user.getPlayer() && curState != states.LOBBY) return;
		users.addUser(user, gameId);
		const allUsers = users.getAll();
		if(user.getPlayer()){
			if(playerIds) playerIds.push(user.getUniqueId());
			else playerIds = [user.getUniqueId()];
			if(!strokeColours) strokeColours = {};
			const colours = prefs.stroke_colours;
			var r;
			do r = Math.floor(Math.random() * colours.length);
			while(strokeColours[r]);
			user.setStrokeColour(colours[r]);
			strokeColours[r] = true;
			if(gameState.get() != states.LOBBY) return;
			for(var u in allUsers) if(allUsers[u] && allUsers[u].getHost()) allUsers[u].sendPlayersUpdate(this.getUserData(u).players);
		}
		else if(user.getAudience()){
			if(!audience) audience = {};
			audience[user.getUniqueId()] = {
				connected: true,
				voting: curState == states.GUESS_TITLE,
				liking: curState == states.CURRENT_GUESS || curState == states.GUESS_RESULTS
			};
		}
	}
	
	this.getUser = function(userId){
		return users.getUser(userId);
	}
	
	this.removeUser = function(userId){
		users.removeUser(userId);
	}
	
	this.getState = function(){
		return gameState.get();
	}
	
	this.getPlayerCount = function(){
		return playerIds ? playerIds.length : 0;
	}
	
	this.getAudienceCount = function(){
		if(!audience) return 0;
		const allUsers = users.getAll();
		var audienceCount = 0;
		for(var a in audience) if(audience[a] && audience[a].connected && allUsers[a] && allUsers[a].getAudience()) audienceCount++;
		return audienceCount;
	}
	
	this.hasPlayer = function(playerName){
		if(!playerIds) return false;
		const allUsers = users.getAll();
		for(let i = 0; i < playerIds.length; i++) if(playerName == allUsers[playerIds[i]].getName()) return true;
		return false;
	}
	
	this.verifyAudienceConnection = function(userId){
		var user = this.getUser(userId);
		if(user && user.getAudience()) audience[userId].connected = true;
	}
	
	this.getUserData = function(userId){
		var user = this.getUser(userId);
		if(!user) return {};
		const allUsers = users.getAll();
		const p = promptData && promptData[currentPrompt];
		if(user.getHost()){
			var titles = false;
			if(p){
				titles = [];
				const currentTitles = promptData[currentPrompt].titles;
				for(let i = 0; i < currentTitles.length; i++){
					const votes = currentTitles[i].player_votes;
					var playerVotes = false;
					if(votes){
						playerVotes = [];
						for(let j = 0; j < votes.length; j++) playerVotes.push(allUsers[playerIds[votes[j]]].getName());
					}
					titles.push({
						title: currentTitles[i].title,
						player: currentTitles[i].player != promptData[currentPrompt].artist ? allUsers[playerIds[currentTitles[i].player]].getName() : false,
						player_votes: playerVotes,
						audience_percentage: currentTitles[i].audience_percentage,
						likes: currentTitles[i].likes
					});
				}
			}
			var players = [];
			if(playerIds){
				for(let i = 0; i < playerIds.length; i++){
					players.push({
						name: allUsers[playerIds[i]].getName(),
						colour: allUsers[playerIds[i]].getStrokeColour(),
						drawing: allUsers[playerIds[i]].getDrawing(),
						submitted: playerData ? playerData[i].submitted : false,
						artist: playerData && p ? i == promptData[currentPrompt].artist : false
					});
				}
			}
			return {
				code: gameId,
				state: gameState.get(),
				min_players: prefs.min_players,
				max_players: prefs.max_players,
				players: players,
				sorted_players: sortedPlayers,
				audience: this.getAudienceCount(),
				round: round,
				stroke_colour: p ? allUsers[playerIds[promptData[currentPrompt].artist]].getStrokeColour() : false,
				drawing: p ? promptData[currentPrompt].drawing : false,
				titles: titles,
				audience_votes: p ? promptData[currentPrompt].audience_votes : false,
				current_guess: p ? promptData[currentPrompt].guesses[currentGuess] : false
			};
		}
		else if(user.getPlayer()){
			const state = gameState.get();
			var prompt = false;
			var submitted = false;
			var artist = false;
			var titles = false;
			var titleIndex = false;
			var voting = false;
			var liking = false;
			if(p){
				for(let i = 0; i < playerData.length; i++){
					if(userId == playerIds[i]){
						prompt = playerData[i].prompts[round];
						submitted = playerData[i].submitted;
						artist = i == promptData[currentPrompt].artist;
					}
				}
				if(state == states.GUESS_TITLE || state == states.CURRENT_GUESS || state == states.GUESS_RESULTS){
					voting = state == states.GUESS_TITLE && !artist && !submitted;
					liking = state != states.GUESS_TITLE || !artist && submitted;
					titles = [];
					const currentTitles = promptData[currentPrompt].titles;
					for(let i = 0; i < currentTitles.length; i++){
						titles.push(currentTitles[i].title);
						if(userId == playerIds[currentTitles[i].player]) titleIndex = i;
					}
				}
			}
			return {
				state: state,
				name: allUsers[userId].getName(),
				stroke_colour: allUsers[userId].getStrokeColour(),
				submitted: submitted,
				prompt: prompt,
				artist: artist,
				titles: titles,
				title_index: titleIndex,
				voting: voting,
				liking: liking
			};
		}
		else if(user.getAudience()){
			const state = gameState.get();
			const voting = audience[userId].voting;
			const liking = audience[userId].liking;
			var titles = false;
			if(voting || liking){
				titles = [];
				const currentTitles = promptData[currentPrompt].titles;
				for(let i = 0; i < currentTitles.length; i++) titles.push(currentTitles[i].title);
			}
			return {
				state: state,
				titles: titles,
				voting: voting,
				liking: liking
			};
		}
		else return {};
	}
	
	this.startGame = function(){
		rounds = playerIds.length < 4 ? 3 : playerIds.length < 5 ? 2 : 1;
		round = 0;
		safetyQuips = {};
		finishedPlayers = [];
		sortedPlayers = [];
		for(let i = 0; i < playerIds.length; i++) sortedPlayers.push(i);
		var curState = gameState.get();
		if(curState != states.LOBBY && curState != states.END) return;
		gameState.setState(states.INTRO, {});
		const allUsers = users.getAll();
		for(let i = 0; i < playerIds.length; i++){
			allUsers[playerIds[i]].resetScore();
			allUsers[playerIds[i]].resetLikes();
		}
		for(var u in allUsers) if(allUsers[u]) allUsers[u].sendStateUpdate(this.getUserData(u));
	}
	
	this.hasStarted = function(){
		var curState = gameState.get();
		return curState != states.LOBBY;
	}
	
	this.continue = function(){
		var curState = gameState.get();
		const allUsers = users.getAll();
		if(curState == states.LOBBY || curState == states.END) return;
		else if(curState == states.GUESS_RESULTS && currentGuess < promptData[currentPrompt].guesses.length - 1){
			currentGuess++;
			curState = states.CURRENT_GUESS;
		}
		else if(curState == states.SCORES){
			if(currentPrompt < playerIds.length - 1){
				currentPrompt++;
				curState = states.WRITE_TITLES;
			}
			else if(round < rounds - 1){
				round++;
				curState = states.DRAW_PROMPTS;
			}
			else curState = states.WINNER;
		}
		else if(curState == states.WINNER){
			this.endGame();
			return;
		}
		else curState++;
		if(curState == states.DRAW_PROMPTS){
			if(round == 0){
				playerData = [];
				var playerIndices = [];
				for(let i = 0; i < playerIds.length; i++) playerIndices.push(true);
				var playerOrder = [];
				for(let i = 0; i < playerIds.length; i++){
					playerData.push({
						prompts: [],
						submitted: false,
						artist: false,
						score: 0,
						likes: 0
					});
					var r;
					do r = Math.floor(Math.random() * playerIds.length);
					while(!playerIndices[r]);
					playerOrder.push(r);
					playerIndices[r] = false;
				}
				const allPrompts = prefs.prompts;
				var promptIndices = [];
				for(let i = 0; i < allPrompts.length; i++) promptIndices.push(true);
				for(let i = 0; i < playerIds.length; i++){
					for(let j = 0; j < rounds; j++){
						var r;
						do r = Math.floor(Math.random() * allPrompts.length);
						while(!promptIndices[r]);
						playerData[playerOrder[i]].prompts.push(allPrompts[r].toLowerCase());
						promptIndices[r] = false;
					}
				}
			}
			finishedPlayers = [];
			currentPrompt = 0;
			promptData = [];
			var playerIndices = [];
			for(let i = 0; i < playerIds.length; i++) playerIndices.push(true);
			for(let i = 0; i < playerIds.length; i++){
				playerData[i].submitted = false;
				var r;
				do r = Math.floor(Math.random() * playerIds.length);
				while(!playerIndices[r]);
				promptData.push({
					prompt: playerData[r].prompts[round],
					artist: r,
					drawing: false,
					titles: [],
					guesses: [],
					audience_votes: 0,
					no_answer: false
				});
				playerIndices[r] = false;
			}
		}
		else if(curState == states.WRITE_TITLES){
			finishedPlayers = [];
			var playerIndices = [];
			for(let i = 0; i < playerIds.length; i++) playerIndices.push(true);
			const artist = promptData[currentPrompt].artist;
			for(let i = 0; i < playerIds.length; i++){
				playerData[i].submitted = false;
				playerData[i].artist = i == artist;
				playerData[i].score = 0;
				playerData[i].likes = 0;
				var r;
				do r = Math.floor(Math.random() * playerIds.length);
				while(!playerIndices[r]);
				promptData[currentPrompt].titles.push({
					title: r == artist ? playerData[artist].prompts[round] : false,
					player: r,
					player_votes: [],
					audience_votes: 0,
					audience_percentage: 0,
					likes: 0
				});
				playerIndices[r] = false;
			}
			if(!promptData[currentPrompt].drawing){
				currentGuess = 0;
				const titles = promptData[currentPrompt].titles;
				for(let i = 0; i < titles.length; i++) if(titles[i].player == promptData[currentPrompt].artist) promptData[currentPrompt].guesses = [i];
				curState = states.ACTUAL_TITLE;
			}
		}
		else if(curState == states.GUESS_TITLE){
			currentGuess = 0;
			var noAnswer = true;
			const titles = promptData[currentPrompt].titles;
			for(let i = 0; i < titles.length; i++) if(titles[i].player != promptData[currentPrompt].artist) noAnswer &= !titles[i].title;
			if(noAnswer){
				for(let i = 0; i < titles.length; i++) if(titles[i].player == promptData[currentPrompt].artist) promptData[currentPrompt].guesses = [i];
				curState = states.ACTUAL_TITLE;
			}
			else{
				for(let i = 0; i < playerIds.length; i++) playerData[i].submitted = false;
				for(var a in audience) if(audience[a] && allUsers[a] && allUsers[a].getAudience()) audience[a].voting = true;
			}
		}
		else if(curState == states.CURRENT_GUESS){
			if(currentGuess == 0){
				for(let i = 0; i < playerIds.length; i++) if(!playerData[i].submitted) allUsers[playerIds[i]].promptLiking();
				const titles = promptData[currentPrompt].titles;
				const artist = promptData[currentPrompt].artist;
				const audienceVotes = promptData[currentPrompt].audience_votes;
				var guesses = [];
				for(let i = 0; i < titles.length; i++){
					if(audienceVotes > 0) titles[i].audience_percentage = Math.floor(titles[i].audience_votes * 100.0 / audienceVotes);
					if(titles[i].player != artist && (titles[i].player_votes && titles[i].player_votes.length > 0 || titles[i].audience_percentage > 0)) guesses.push(i);
				}
				var guessIndices = [];
				for(let i = 0; i < guesses.length; i++) guessIndices.push(true);
				for(let i = 0; i < guesses.length; i++){
					var r;
					do r = Math.floor(Math.random() * guesses.length);
					while(!guessIndices[r]);
					promptData[currentPrompt].guesses.push(guesses[r]);
					guessIndices[r] = false;
				}
				for(let i = 0; i < titles.length; i++) if(titles[i].player == artist) promptData[currentPrompt].guesses.push(i);
			}
		}
		if(curState == states.PROMPT_SCORES){
			const titles = promptData[currentPrompt].titles;
			const guesses = promptData[currentPrompt].guesses;
			for(let i = 0; i < playerIds.length; i++){
				for(let j = 0; j < guesses.length; j++){
					if(i == titles[guesses[j]].player){
						const playerVotes = titles[guesses[j]].player_votes;
						if(i == promptData[currentPrompt].artist){
							for(var v in playerVotes){
								playerData[i].score += 1000;
								playerData[playerVotes[v]].score += 1000;
							}
							playerData[i].score += titles[guesses[j]].audience_percentage * 10;
						}
						else playerData[i].score += (playerVotes ? playerVotes.length * 500 : 0) + titles[guesses[j]].audience_percentage * 5;
					}
				}
			}
			var playerTitles = [];
			for(let i = 0; i < playerIds.length; i++){
				allUsers[playerIds[i]].addToScore(playerData[i].score);
				for(let j = 0; j < titles.length; j++){
					if(i == titles[j].player){
						if(i == promptData[currentPrompt].artist) playerTitles.push(false);
						else{
							playerData[i].likes = titles[j].likes;
							playerTitles.push(titles[j].title);
						}
					}
				}
				allUsers[playerIds[i]].addLikes(playerData[i].likes);
			}
			sortedPlayers = [];
			var playerIndices = [];
			for(let i = 0; i < playerIds.length; i++) playerIndices.push(true);
			for(let i = 0; i < playerIds.length; i++){
				var maxIndex = 0;
				var maxScore = 0;
				var first = true;
				for(let j = 0; j < playerIds.length; j++){
					if(playerIndices[j]){
						var currentScore = playerData[j].score;
						if(first || currentScore > maxScore){
							first = false;
							maxIndex = j;
							maxScore = currentScore;
						}
					}
				}
				var titleIndex = false;
				sortedPlayers.push({
					name: allUsers[playerIds[maxIndex]].getName(),
					colour: allUsers[playerIds[maxIndex]].getStrokeColour(),
					drawing: allUsers[playerIds[maxIndex]].getDrawing(),
					artist: maxIndex == promptData[currentPrompt].artist,
					title: playerTitles[maxIndex],
					score: playerData[maxIndex].score,
					likes: playerData[maxIndex].likes
				});
				playerIndices[maxIndex] = false;
			}
		}
		else if(curState == states.SCORES){
			sortedPlayers = [];
			var playerIndices = [];
			for(let i = 0; i < playerIds.length; i++) playerIndices.push(true);
			for(let i = 0; i < playerIds.length; i++){
				var maxIndex = 0;
				var maxScore = 0;
				var first = true;
				for(let j = 0; j < playerIds.length; j++){
					if(playerIndices[j]){
						var currentScore = allUsers[playerIds[j]].getScore();
						if(first || currentScore > maxScore){
							first = false;
							maxIndex = j;
							maxScore = currentScore;
						}
					}
				}
				sortedPlayers.push({
					name: allUsers[playerIds[maxIndex]].getName(),
					colour: allUsers[playerIds[maxIndex]].getStrokeColour(),
					drawing: allUsers[playerIds[maxIndex]].getDrawing(),
					score: allUsers[playerIds[maxIndex]].getScore(),
					likes: allUsers[playerIds[maxIndex]].getLikes()
				});
				playerIndices[maxIndex] = false;
			}
		}
		gameState.setState(curState, {});
		for(var u in allUsers) if(allUsers[u]) allUsers[u].sendStateUpdate(this.getUserData(u));
	}
	
	this.receiveDrawing = function(userId, drawing){
		const allUsers = users.getAll();
		const user = allUsers[userId];
		if(!user || !user.getPlayer()) return;
		var player = false;
		for(let i = 0; i < playerIds.length; i++) if(userId == playerIds[i]) player = i;
		if(player === false) return;
		const curState = gameState.get();
		var update = false;
		if(curState == states.LOBBY){
			allUsers[userId].setDrawing(drawing);
			update = true;
		}
		else if(curState == states.DRAW_PROMPTS){
			for(let i = 0; i < promptData.length; i++) if(player == promptData[i].artist) promptData[i].drawing = drawing;
			playerData[player].submitted = true;
			update = true;
		}
		if(!update) return;
		for(var u in allUsers) if(allUsers[u] && allUsers[u].getHost()) allUsers[u].sendPlayersUpdate(this.getUserData(allUsers[u].getUniqueId()).players);
	}
	
	this.receiveTitle = function(userId, title){
		if(gameState.get() != states.WRITE_TITLES) return;
		const allUsers = users.getAll();
		const user = allUsers[userId];
		if(!user || !user.getPlayer()) return;
		var player = false;
		for(let i = 0; i < playerIds.length; i++) if(userId == playerIds[i]) player = i;
		if(player === false) return;
		var currentTitles = promptData[currentPrompt].titles;
		var accept = true;
		for(let i = 0; i < currentTitles.length; i++) accept &= !currentTitles[i].title || title != currentTitles[i].title;
		allUsers[playerIds[player]].checkTitle(accept);
		if(!accept) return;
		for(let i = 0; i < currentTitles.length; i++) if(player == currentTitles[i].player) currentTitles[i].title = title;
		playerData[player].submitted = true;
		for(var u in allUsers) if(allUsers[u] && allUsers[u].getHost()) allUsers[u].sendPlayersUpdate(this.getUserData(allUsers[u].getUniqueId()).players);
	}
	
	this.receiveVote = function(userId, vote){
		const curState = gameState.get();
		const allUsers = users.getAll();
		const user = allUsers[userId];
		if(!user || !user.getPlayer() && !user.getAudience()) return;
		var title = promptData[currentPrompt].titles[vote];
		if(!title) return;
		if(user.getPlayer()){
			var player = false;
			for(let i = 0; i < playerIds.length; i++) if(userId == playerIds[i]) player = i;
			if(player === false) return;
			if(curState == states.ACTUAL_TITLE || playerData[player].submitted) title.likes++;
			else if(curState == states.GUESS_TITLE && !playerData[player].submitted){
				title.player_votes.push(player);
				playerData[player].submitted = true;
				allUsers[userId].promptLiking();
			}
		}
		else if(user.getAudience()){
			if(curState == states.GUESS_TITLE && audience[userId].voting){
				promptData[currentPrompt].audience_votes++;
				title.audience_votes++;
				audience[userId].voting = false;
				audience[userId].liking = true;
				allUsers[userId].promptLiking();
			}
			else if((curState == states.CURRENT_GUESS || curState == states.GUESS_RESULTS) && audience[userId].liking){
				title.likes++;
				audience[userId].liking = false;
			}
		}
	}
	
	this.endGame = function(){
		gameState.setState(states.END, {});
		const allUsers = users.getAll();
		for(var u in allUsers) if(allUsers[u]) allUsers[u].sendStateUpdate(this.getUserData(u));
	}
	
	this.newLobby = function(){
		playerIds = false;
		audience = {};
		currentPrompt = false;
		gameState.setState(states.LOBBY, {});
		const allUsers = users.getAll();
		for(var u in allUsers) if(allUsers[u] && !allUsers[u].getHost()) users.removeUser(u);
		for(var u in allUsers) if(allUsers[u] && allUsers[u].getHost()) allUsers[u].sendStateUpdate(this.getUserData(u));
	}
	
	this.disconnectAll = function(){
		const allUsers = users.getAll();
		for(var u in allUsers) users.removeUser(u);
	}
	
	this.sendUpdates = function(user, params){
		//var summary = gameState.getSummary();
		//user.sendUpdates(summary, params);
	}
	
	setInterval(function(game){
		return function(){
			const allUsers = users.getAll();
			var audienceCount = game.getAudienceCount();
			for(var a in audience){
				if(audience[a] && allUsers[a] && allUsers[a].getAudience()){
					audience[a].connected = false;
					allUsers[a].checkAudienceConnection();
				}
			}
			for(var u in allUsers) if(allUsers[u] && allUsers[u].getHost()) allUsers[u].sendAudienceUpdate(audienceCount);
		}
	}(this), 1000);
}

function Users(){
	var users = {};
	
	this.addUser = function(user, gameId){
		var uniqueId = user.getUniqueId();
		if(typeof uniqueId === 'undefined' || !uniqueId) return;
		user.setGameId(gameId);
		users[uniqueId] = user;
	}
	
	this.getUser = function(userId){
		if(userId in users) return users[userId];
		else return false;
	}
	
	this.removeUser = function(userId){
		if(userId in users){
			users[userId].disconnectUser();
			delete users[userId];
			users[userId] = false;
		}
	}
	
	this.getAll = function(){
		return users;
	}
}

function User(pSocket, pName){
	var socket = pSocket;
	
	this.getUniqueId = function(){
		if(socket && socket.handshake && socket.handshake.session && socket.handshake.session.unique_id) return socket.handshake.session.unique_id;
		return false;
	}
	
	if(socket && socket.handshake && socket.handshake.session){
		//if(typeof socket.handshake.session.unique_id === 'undefined'){
		//	console.log('# User connected.');
		//	socket.handshake.session.unique_id = socket.id;
		//}
		console.log('# User connected.');
		socket.handshake.session.unique_id = socket.id;
		
		socket.handshake.session.in_game = true;
		socket.handshake.session.user_id = this.getUniqueId();
		socket.handshake.session.save();
	}
	
	var isHost = pName == 'host';
	var isPlayer;
	var isAudience = pName == 'audience';
	isPlayer = !(isHost || isAudience);
	var name = isPlayer ? pName : false;
	var strokeColour = false;
	var drawing = false;
	var score = false;
	var likes = false;
	
	this.getHost = function(){
		return isHost;
	}
	
	this.getPlayer = function(){
		return isPlayer;
	}
	
	this.getAudience = function(){
		return isAudience;
	}
	
	this.getName = function(){
		return name;
	}
	
	this.setStrokeColour = function(colour){
		if(isPlayer) strokeColour = colour;
	}
	
	this.getStrokeColour = function(){
		return strokeColour;
	}
	
	this.setDrawing = function(d){
		if(isPlayer) drawing = d;
	}
	
	this.getDrawing = function(){
		return drawing;
	}
	
	this.resetScore = function(){
		score = 0;
	}
	
	this.addToScore = function(s){
		if(isPlayer) score += s;
	}
	
	this.getScore = function(){
		return score;
	}
	
	this.resetLikes = function(){
		likes = 0;
	}
	
	this.addLikes = function(l){
		if(isPlayer) likes += l;
	}
	
	this.getLikes = function(){
		return likes;
	}
	
	this.setGameId = function(gameId){
		socket.handshake.session.game_id = gameId;
	}
	
	this.updateSocket = function(pSocket){
		socket = pSocket;
	}
	
	this.disconnectUser = function(){
		socket.handshake.session.in_game = false;
		socket.handshake.session.unique_id = false;
		socket.handshake.session.user_id = false;
		socket.handshake.session.game_id = false;
		socket.handshake.session.save();
		if(isHost) socket.emit('host_init_nok');
		else socket.emit('game_init_nok');
	}
	
	this.sendPlayersUpdate = function(players){
		if(isHost) socket.emit('host_players_update', players);
	}
	
	this.sendAudienceUpdate = function(audience){
		if(isHost) socket.emit('host_audience_update', audience);
	}
	
	this.sendStateUpdate = function(params){
		if(isHost) socket.emit('host_state_update', params);
		else socket.emit('game_state_update', params);
	}
	
	this.setAudienceVotes = function(audienceVotes){
		if(isHost) socket.emit('host_set_audience_votes', audienceVotes);
	}
	
	this.checkTitle = function(accept){
		if(isPlayer) socket.emit('game_check_title', accept);
	}
	
	this.promptLiking = function(){
		if(isPlayer || isAudience) socket.emit('game_prompt_liking');
	}
	
	this.setAudienceVotes = function(audienceVotes){
		if(isHost) socket.emit('host_set_audience_votes', audienceVotes);
	}
	
	this.checkAudienceConnection = function(){
		if(isAudience) socket.emit('game_check_audience_connection');
	}
}

function GameState(){
	var curState = false;
	var stateParams = false;
	var hiddenParams = false;
	
	this.get = function(){
		return curState;
	}
	
	this.setState = function(pState, pStateParams){
		curState = pState;
		stateParams = pStateParams;
	}
	
	this.setHiddenParams = function(pHiddenParams){
		hiddenParams = pHiddenParams;
	}
	
	this.getHiddenParams = function(){
		return hiddenParams;
	}
	
	this.getSummary = function(){
		var obj = {};
		obj.state = curState;
		obj.stateParams = stateParams;
		return obj;
	}
}
