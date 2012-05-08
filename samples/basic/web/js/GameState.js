/*
 * Game state is a application state where all the game logic is happens
 */

GameState.prototype = new BaseState();
GameState.prototype.constructor = GameState;

/**
 * @constructor
 */
function GameState() {
	// loading json with GUI info
	this.preloadJson(GAME_STATE_UI_FILE);
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
	
	guiFactory.createGuiFromJson(this.resources.json[GAME_STATE_UI_FILE], this);
	var that = this;

	var playButton = this.getGui("backToMenu");
	playButton.bind(function(e) {
		Sound.play("click");
		Account.instance.switchState("MenuState01", that.id, that.parent.id);
	});
	
	this.scene = Account.instance.getEntity(params['scene']);
	this.scene.attachToGui(this.getGui("mainScene"));
	
	//fading out from previous switch state
	Account.instance.backgroundState.fadeOut(LEVEL_FADE_TIME, function() {
	});
};