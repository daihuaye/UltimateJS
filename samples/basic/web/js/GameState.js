/*
 * Game state is a application state where all the game logic is happens
 */

GameState.prototype = new BaseState();
GameState.prototype.constructor = GameState;
//Sound.add("click", "sounds/memoryGame/click", 1, 1.2);
/**
 * @constructor
 */
function GameState() {
	this.preloadJson(GAME_STATE_UI_FILE);
	//this.preloadJson(DESCRIPTIONS_FILE);
	GameState.parent.constructor.call(this);
};

GameState.inheritsFrom(BaseState);

GameState.prototype.className = "GameState";
GameState.prototype.createInstance = function(params) {
	var entity = new GameState();
	entity.activate(params);
	return entity;
};

entityFactory.addClass(GameState);

GameState.prototype.jsonPreloadComplete = function() {
	GameState.parent.jsonPreloadComplete.call(this);
};

GameState.prototype.init = function(params) {
	GameState.parent.init.call(this, params);
	Account.instance.backgroundState.fadeOut(LEVEL_FADE_TIME, function() {
		
	});
	guiFactory.createGuiFromJson(this.resources.json[GAME_STATE_UI_FILE], this);
	var that = this;

	var playButton = this.getGui("backToMenu");
	playButton.bind(function(e) {
		Account.instance.switchState("MenuState01", that.id, that.parent.id);
	});

	Loader['hideLoadingMessage']();
	$(window)['trigger']("resize");
	// loadGame();
	
	//this.resize();
	console.log("game scene",this.getGui("enhancedScene"));
};
GameState.prototype.resize = function() {
	GameState.parent.resize.call(this);
};