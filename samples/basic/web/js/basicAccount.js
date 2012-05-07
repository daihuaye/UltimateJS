/**
 * BasicAccount is derived from Account. Accounts handle all system information,
 * perform serialization and networking. All entities are childrens of account.
 * Account.instance - is a singletone for account.
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

	// Description of states
this.states["GameState01"] = {
	"GameState01" : {
		"class" : "GameState",
		"parent" : "Account01",
		"scene" : "Scene01",
		"children": {
		}
	},
	"Scene01" : {
		"class" : "BasicScene",
		"parent" : "GameState01",
		"wall" : "WallRoomRich00",
		"floor" : "FloorBathBeginner01",
		"x" : 0,
		"y" : 0,
		"width" : 800,
		"height" : 500
	},
	"basicCharacter01" : {
		"class" : "BasicCharacter",
		"parent" : "Scene01",
		"description" : "monkey",
		"x" : 300,
		"y" : 352
	}
};
	
	Account.instance = this;
};

//SwitchState perform fading in, and  swithching state,
//which mean changing entities from one account to another.
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
