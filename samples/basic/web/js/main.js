/**
 * Main.js
 * Entry point of the whole game
 */

// Entry point of the game
$(document).ready(function() {
	// Creating account a singleton
	(new BasicAccount()).init();

	var DESCRIPTIONS_FILE = 'resources/descriptions.json';
	Account.instance.preloadJson(DESCRIPTIONS_FILE);
	Account.instance.preload.call(Account.instance);
	Device.init();
	Resources.init();

	//disable console
	//console.log = function(){};

	
	// IMAGES
	// in images/low we can put low-resolution images for the slower devices
	Resources.addResolution("low", "images/low/");
	Resources.addResolution("normal", "images/", true);

	// Init sound-sprites audio
	Sound.init("sounds/total", true, "js/");
	Sound.add("click", "", 0, 0.3);
	Sound.add("monkey", "", 1.0, 1.0);
	Sound.add("final", "", 4.0, 2.0);
	
	Screen.init(Account.instance);

	$(document)['bind']('keydown', function(e) {
		// Ctrl-Shift-Space
		if ((e.which == 32) && e.shiftKey && e.ctrlKey) {
			console.log("OUR ACCOUNT", Account.instance);
			e.stopPropagation();
			e.preventDefault();
			return false;
		}
	});

	
	// Initial state of the game - active MenuState
	var data = {
			"Account01" : {
				"class" : "Account",
				"state" : "MenuState01"
			},
			"MenuState01" : {
				"class" : "MenuState",
				"parent" : "Account01",
				"children" : {}
			}
			
	};
	Account.instance.readGlobalUpdate(data);

});
