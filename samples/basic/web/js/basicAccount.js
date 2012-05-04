/**
 * 
 */

BasicAccount.prototype = new Account();
BasicAccount.prototype.constructor = BasicAccount;

/**
 * @constructor
 */
function BasicAccount(parent) {
	BasicAccount.parent.constructor.call(this);
};

BasicAccount.inheritsFrom(Account);
BasicAccount.prototype.className = "BasicAccount";

BasicAccount.prototype.jsonPreloadComplete = function() {
	Account.instance.descriptionsData = this.resources.json[DESCRIPTIONS_FILE];
};

BasicAccount.prototype.init = function() {
	BasicAccount.parent.init.call(this);
	this.states = new Object();
	//
	this.states["MenuState01"] = {
	"MenuState01" : {
		"class" : "MenuState",
		"parent" : "Account01",
		"children" : {}
	}
};

this.states["GameState01"] = {
	"GameState01" : {
		"class" : "GameState",
		"parent" : "Account01"
	}
};
	
	Account.instance = this;
};

BasicAccount.prototype.switchState = function(stateName, id,
		parentId) {
	var that = this;
	this.backgroundState.fadeIn(LEVEL_FADE_TIME, "white", function() {
		var data = new Object();
		$['each'](Account.instance.states, function(key, value) {
			if (key === stateName) {
				data = Account.instance.states[key];
				data[key]["parent"] = parentId;
				data[id] = {
					"destroy" : true
				};
				console.log(stateName,data);
				that.readGlobalUpdate(data);
			}
		});
	});
};
