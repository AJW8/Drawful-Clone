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

function GameView(){
	var state = false;
	var name = false;
	var strokeColour = false;
	var drawing = false;
	var prompt = false;
	var submitted = false;
	var artist = false;
	var titles = false;
	var titleIndex = false;
	var voting = false;
	var liking = false;
	
	this.init = function(){
		this.initSocket();
		this.bindViewEvents();
		this.bindSocketEvents();
		socket.emit('game_init');
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
		state = data.state;
		if(!name) name = data.name;
		if(name){
			strokeColour = data.stroke_colour;
			submitted = data.submitted;
			prompt = data.prompt;
			titleIndex = data.title_index;
		}
		artist = data.artist;
		titles = data.titles;
		voting = data.voting;
		if(name && liking && !data.liking){
			for(let i = 0; i < 8; i++){
				var check = document.getElementById("check_player_like" + (i + 1));
				if(check.checked){
					this.submitVote(i);
					check.checked = false;
				}
			}
		}
		liking = data.liking;
		this.updateView();
	}
	
	this.updateView = function(){
		$("#title").html("<b>" + (name ? name : "AUDIENCE") + "</b>");
		$("#show_prompt").hide();
		$("#drawing").hide();
		$("#lobby_drawn").hide();
		$("#submitted").hide();
		$("#my_prompt").hide();
		$("#voted").hide();
		var idle = true;
		if(state == states.LOBBY && name){
			idle = false;
			if(submitted) $("#lobby_drawn").show();
			else{
				$("#show_prompt").show();
				$("#show_prompt").html("<p>Draw a picture of yourself!</p>");
				$("#drawing").show();
			}
		}
		else if(state == states.DRAW_PROMPTS && name){
			idle = false;
			if(submitted) $("#submitted").show();
			else{
				$("#show_prompt").show();
				$("#show_prompt").html("<p>" + prompt + "</p>");
				$("#drawing").show();
			}
		}
		if(state == states.WRITE_TITLES && name){
			idle = false;
			if(artist){
				$("#write_title").hide();
				$("#my_prompt").show();
			}
			else if(submitted){
				$("#write_title").hide();
				$("#submitted").show();
			}
			else $("#write_title").show();
		}
		else{
			$("#write_title").hide();
			document.getElementById("title_input").value = "";
		}
		if(state == states.GUESS_TITLE || state == states.CURRENT_GUESS || state == states.GUESS_RESULTS){
			if(state == states.GUESS_TITLE && (voting || artist)){
				idle = false;
				if(name && artist){
					$("#my_prompt").show();
					$("#vote").hide();
				}
				else{
					$("#vote").show();
					$("#audience_likes").hide();
					for(let i = 0; i < titles.length; i++){
						const button = "#btn_vote" + (i + 1);
						if((!name || titleIndex === false || i != titleIndex) && titles[i]){
							$(button).show();
							$(button).html(titles[i]);
						}
						else $(button).hide();
					}
					for(let i = titles.length + 1; i < 9; i++) $("#btn_vote" + i).hide();
				}
			}
			else if(liking){
				idle = false;
				if(name){
					$("#vote").hide();
					$("#player_likes").show();
					for(let i = 0; i < titles.length; i++){
						if((titleIndex === false || i != titleIndex) && titles[i]){
							$("#player_like" + (i + 1)).show();
							$("#label_check_player_like" + (i + 1)).text(titles[i] + " ");
						}
						else $("#player_like" + (i + 1)).hide();
					}
					for(let i = titles.length + 1; i < 9; i++) $("#player_like" + i).hide();
				}
				else{
					$("#player_likes").hide();
					$("#vote").show();
					$("#audience_likes").show();
					for(let i = 0; i < titles.length; i++){
						const button = "#btn_vote" + (i + 1);
						if((titleIndex === false || i != titleIndex) && titles[i]){
							$(button).show();
							$(button).html(titles[i]);
						}
						else $(button).hide();
					}
					for(let i = titles.length + 1; i < 9; i++) $("#btn_vote" + i).hide();
				}
			}
			else{
				$("#vote").hide();
				$("#player_likes").hide();
			}
		}
		else{
			$("#vote").hide();
			$("#player_likes").hide();
			//for(let i = 1; i < 9; i++) document.getElementById("check_player_like" + i).checked = false;
		}
		if(state == states.END){
			idle = false;
			$("#end").show();
		}
		else $("#end").hide();
		if(idle) $("#idle").show();
		else $("#idle").hide();
	}
	
	this.submitVote = function(vote){
		if(!(titleIndex === false) && vote == titleIndex) return;
		socket.emit('game_submit_vote', vote);
		voting = false;
		liking = false;
		this.updateView();
	}
	
	this.bindViewEvents = function(){
		window.addEventListener('load', function(){
			var canvas = document.getElementById("drawing_canvas");
			var context = canvas.getContext("2d");
			var isIdle = true;
			var currentPath = false;
			function drawstart(event){
				if(state != states.LOBBY && state != states.DRAW_PROMPTS) return;
				if(!drawing) drawing = [];
				currentPath = [{
					x: (event.pageX - canvas.offsetLeft) / canvas.width,
					y: (event.pageY - canvas.offsetTop) / canvas.height
				}];
				context.beginPath();
				context.moveTo(event.pageX - canvas.offsetLeft, event.pageY - canvas.offsetTop);
				isIdle = false;
			}
			function drawmove(event){
				if(state != states.LOBBY && state != states.DRAW_PROMPTS || isIdle) return;
				currentPath.push({
					x: (event.pageX - canvas.offsetLeft) / canvas.width,
					y: (event.pageY - canvas.offsetTop) / canvas.height
				});
				context.lineTo(event.pageX - canvas.offsetLeft, event.pageY - canvas.offsetTop);
				context.strokeStyle = strokeColour;
				context.stroke();
			}
			function drawend(event){
				if (state != states.LOBBY && state != states.DRAW_PROMPTS || isIdle) return;
				drawmove(event);
				drawing.push(currentPath);
				isIdle = true;
				currentPath = false;
			}
			function touchstart(event){ drawstart(event.touches[0]) }
			function touchmove(event){ drawmove(event.touches[0]); event.preventDefault(); }
			function touchend(event){ drawend(event.changedTouches[0]) }
			canvas.addEventListener('touchstart', touchstart, false);
			canvas.addEventListener('touchmove', touchmove, false);
			canvas.addEventListener('touchend', touchend, false);        
			canvas.addEventListener('mousedown', drawstart, false);
			canvas.addEventListener('mousemove', drawmove, false);
			canvas.addEventListener('mouseup', drawend, false);
		}, false);
		$('#btn_submit_drawing').click(function(game){
			return function(){
				if(!drawing){
					alert("You cannot submit a blank drawing.");
					return false;
				}
				socket.emit('game_submit_drawing', drawing);
				var canvas = document.getElementById("drawing_canvas");
				canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
				drawing = false;
				submitted = true;
				game.updateView();
				return false;
			}
		}(this));
		$('#btn_submit_title').click(function(game){
			return function(){
				if($("#title_input").val().length == 0) alert("You cannot submit an empty field.");
				else socket.emit('game_submit_title', $("#title_input").val().toLowerCase());
				return false;
			}
		}(this));
		$('#btn_vote1').click(function(game){
			return function(){
				game.submitVote(0);
				return false;
			}
		}(this));
		$('#btn_vote2').click(function(game){
			return function(){
				game.submitVote(1);
				return false;
			}
		}(this));
		$('#btn_vote3').click(function(game){
			return function(){
				game.submitVote(2);
				return false;
			}
		}(this));
		$('#btn_vote4').click(function(game){
			return function(){
				game.submitVote(3);
				return false;
			}
		}(this));
		$('#btn_vote5').click(function(game){
			return function(){
				game.submitVote(4);
				return false;
			}
		}(this));
		$('#btn_vote6').click(function(game){
			return function(){
				game.submitVote(5);
				return false;
			}
		}(this));
		$('#btn_vote7').click(function(game){
			return function(){
				game.submitVote(6);
				return false;
			}
		}(this));
		$('#btn_vote8').click(function(game){
			return function(){
				game.submitVote(7);
				return false;
			}
		}(this));
	}
	
	this.bindSocketEvents = function(){
		socket.on('game_init_ok', function(game){
			return function(data){
				game.updateData(data);
				return false;
			}
		}(this));
		socket.on('game_init_nok', function(){
			alert('You were disconnected.');
			location.href = '/';
		});
		socket.on('game_state_update', function(game){
			return function(data){
				if(state != data.state) game.updateData(data);
				return false;
			}
		}(this));
		socket.on('game_check_audience_connection', function(){
			socket.emit('game_verify_audience_connection');
		});
		socket.on('game_check_title', function(game){
			return function(accepted){
				if(accepted){
					submitted = true;
					currentPrompt = false;
					game.updateView();
				}
				else alert("That title either was already submitted or is the actual title. Please write something else.");
				return false;
			}
		}(this));
		socket.on('game_prompt_liking', function(game){
			return function(){
				liking = true;
				game.updateView();
			}
		}(this));
	}
}

$(document).ready(function(){
	var game = new GameView();
	game.init();
});