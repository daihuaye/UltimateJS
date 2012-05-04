/**
 * Main.js
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
	Resources.addResolution("low", "images/low/");
	Resources.addResolution("normal", "images/", true);

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
