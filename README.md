# Drawful-Clone

## A local server-based clone of the Jackbox party game Drawful built using Node.js and Socket.IO.

This project was built from my previous party game template at https://github.com/AJW8/Party-Game-Template.

### Host
- Each game has a single host whose screen must be publically displayed at all times.
- During a game, press 'Continue' to move to the next state. This controls the flow of the game as opposed to timers like in the real Drawful.
- After a game, press 'Same Players' to restart the game, or press the 'New Players' button to disconnect all players and start a new lobby.
- At any time, press 'Leave Game' to disconnect all users from the current game.
- Currently, the presentation is very bare-bones as I'm no visual designer.  Feel free to copy this project and update the graphics to be more like the real thing.

### Player
- Once a game has been created, users can join as a player by entering the matching room code displayed on the host's screen.
- Before the start of the game, each player can submit their own drawing which will be their personal icon.
- Players actively compete against each other to win by ending up with the highest score.
- The player view is exclusive to the player and should not be shown to anyone else.
- Each round, players submit a drawing for a secret prompt.
- For each drawing submitted by someone else, players submit a decoy title.
- Once all decoy titles are in, players vote for the actual title among all decoys submitted by everyone else.
- After voting, players get to award a 'like' to whichever titles they want.

### Audience
- If the maximum number of players have already joined or the game has started, any further users who try to join will be put in the audience.
- Audience members get to vote for the actual title too, with a bonus being awarded to the player who submitted it (or the artist if they guessed correctly).
- After voting, audience members get to award a single 'like' to their favourite title.

### Project Setup
After downloading and unzipping the GIT folder, you will need to install dependencies before you can play.  You can do so with the following command:
```
npm install
```

### Preferences
The root folder contains a prefs.json file for customising preferences.  These include:
- The password required to host a game.
- The minimum number of players required to start a game (must be at least 3).
- The maximum number of players that can join a game (preferably 8).
- The list of stroke colours randomly assigned to players for drawing with.
- The list of all prompts for players to draw.
You may also add your own preferences e.g. enable audience, hide code.

### Local Server
Run the local server with the following command:
```
node app.js
```

### Creating a new game
- Go to http://localhost:3000 on your web browser
- Under the 'Create Game' heading, enter the correct password then click 'Create'
- You will be taken to the host page, where you will be shown the room code and the lobby
- Once enough players have joined, you may start the game whenever you are ready

### Joining a game
- First make sure you are connected to the same wifi network as the host
- Go to http://******:3000 on your web browser, replacing ****** with the host's IPv4 address
- Under the 'Join Game' heading, enter your desired name and the matching room code then click 'Connect'
- You will be taken to the game page, where you will need to wait for the host to start the game
