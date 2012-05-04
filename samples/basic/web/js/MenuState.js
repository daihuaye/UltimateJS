///
///

var HOME_URL = "http://kittyworldon.appspot.com/";

var GAME_STATE_UI_FILE = 'resources/ui/gameState.json';
var MENU_GUI_JSON = "resources/ui/menuState.json";

var DESCRIPTIONS_FILE = 'resources/descriptions.json';

var TOTAL_SPRITE_FILE = "images/home/jsonImage.png";

var ART_ENTITY_WIDTH = 176;
var ART_ENTITY_HEIGHT = 261;

// var ART_ENTITY_WIDTH = 250;
// var ART_ENTITY_HEIGHT = 370;

// var ROOM_WIDTH = 1024;
var ROOM_WIDTH = 800;
var ROOM_HEIGHT = 500;



MenuState.prototype = new BaseState();
MenuState.prototype.constructor = MenuState;
//Sound.add("click", "sounds/memoryGame/click", 1, 1.2);
/**
 * @constructor
 */
function MenuState() {
	this.preloadJson(MENU_GUI_JSON);
	this.preloadJson(DESCRIPTIONS_FILE);
	MenuState.parent.constructor.call(this);
};

MenuState.inheritsFrom(BaseState);

MenuState.prototype.className = "MenuState";
MenuState.prototype.createInstance = function(params) {
	var entity = new MenuState();
	entity.activate(params);
	return entity;
};

entityFactory.addClass(MenuState);

MenuState.prototype.jsonPreloadComplete = function() {
	MenuState.parent.jsonPreloadComplete.call(this);
};

MenuState.prototype.init = function(params) {
	MenuState.parent.init.call(this, params);

	
	guiFactory.createGuiFromJson(this.resources.json[MENU_GUI_JSON], this);
	var that = this;

	var playButton = this.getGui("play");
	playButton.bind(function(e) {
		Account.instance.switchState("GameState01", that.id, that.parent.id);
	});

	if (Loader['loadingMessageShowed']()) {
		Account.instance.backgroundState.fadeIn(LEVEL_FADE_TIME, "white",
				function() {
					Account.instance.backgroundState.fadeOut(LEVEL_FADE_TIME);
					Loader['hideLoadingMessage']();
					$(window)['trigger']("resize");
				});
	} else {
		Account.instance.backgroundState.fadeOut(LEVEL_FADE_TIME, function() {
			$(window)['trigger']("resize");
		});
	}
	// loadGame();
	
	//this.resize();
	console.log(this.getGui("enhancedScene"));
};
MenuState.prototype.resize = function() {
	MenuState.parent.resize.call(this);
};
