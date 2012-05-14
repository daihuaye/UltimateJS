/*
 *  Pseudo server API to emulate connection with Server on local storage.
 *  Can also be useful for saving app state in localStorage. 
 */

/**
 * @constructor
 */
function LocalStorageServer() {
};

LocalStorageServer.prototype.init = function(params) {

	this.params = params;
	this.food = 10;
	//this.purity = 10;
	this.attention = 10;
	if (params['newAccount']) {
		Device.removeStorageItem("entities");
	}
	this.userAccount = params['account'];
	assert(this.userAccount,
			" User account must be specified to work with server");
	this.pseudoPing = selectValue(params['ping'], 0);

	if (Device.getStorageItem('entities')) {
		this.entities = JSON.parse(Device.getStorageItem('entities'));
	}

	if (!this.entities) {
		var json_file = params['data'];

		var that = this;

		// getting item descriptions
		$['getJSON']("resources/descriptions.json", function(data) {
			that.descriptions = data;
		}).error(function() {
			assert(false, "error reading JSON " + json_file);
		});

		$['getJSON'](json_file, function(data) {
			$['each'](data, function(index, value) {
				if (value['children']) {
					$['each'](value['children'], function(idx, val) {
						data[idx] = val;
					});
					value['children'] = null;
				}
				// $['extend'](true, data, value);
			});
			that.entities = data;
			Device.setStorageItem("entities", JSON.stringify(data));
			that.ready();
		}).error(function() {
			assert(false, "error reading JSON " + json_file);
		});

	} else {
		this.ready();
	}

	this.commands = {};
	var that = this;
	this.addCommand("petCat", function() {
		entities = that.entities;
		entities['Account01']['energy'] -= 3;
		that.attention += 3;
		return true;
	});
	this.addCommand("changeStat", function(args) {
		entities = that.entities;
		entities['Account01'][args[0]] += args[1];
		if(args[0] == "happyness"){
			that.attention += args[1];
			that.food += args[1];
			//add purity
		}
		return true;
	});
	this.addCommand("feedCat", function(args) {
		var entities = that.entities;
		var id = args[0];
		entities['Account01']['energy'] -= 3;
		that.food += args[1];
		entities[id]['id'] = id;
		entities[id]['class'] = "Item";
		entities[id].parent = null;
		return true;
	});
	this.addCommand("changeParent", function(args) {
		var entities = that.entities;
		var id = args[0];
		var newParent = args[1];
		entities[id]['id'] = id;
		entities[id]['class'] = "Item";
		entities[id].parent = newParent;
		return true;
	});

	this
			.addCommand(
					"buyItem",
					function(args) {
						var entities = that.entities;
						var id = args[0] + uniqueId();
						if (that.descriptions[args[0]]['money'] == "game") {
							if (entities['Account01']['money'] >= that.descriptions[args[0]]['price']) {
								entities['Account01']['money'] -= that.descriptions[args[0]]['price'];
							}
						} else {
							if (entities['Account01']['premiumMoney'] >= that.descriptions[args[0]]['price']) {
								entities['Account01']['premiumMoney'] -= that.descriptions[args[0]]['price'];
							}
						}
						entities[id] = {};
						entities[id]['id'] = id;
						entities[id].newEntity = true;
						entities[id]['class'] = "Item";
						entities[id].parent = "Inventory01";
						entities[id].description = args[0];
						return true;
					});

	this
			.addCommand(
					"sellItem",
					function(args) {
						var entities = that.entities;
						// entities[args[0]]['newEntity'] = false;
						if (that.descriptions[entities[args[0]]['description']]['money'] == "game") {
							entities['Account01']['money'] += that.descriptions[entities[args[0]]['description']]['price'];
						} else {
							entities['Account01']['premiumMoney'] += that.descriptions[entities[args[0]]['description']]['price'];
						}
						entities[args[0]]['parent'] = null;
						return true;
					});
	var that = this;
	this.statsRefill = setInterval(
			function() {
				if (that.entities['Account01']['energy'] >= 100) {
					that.entities['Account01']['energy'] = 100;
				} else {
					if(that.entities['Account01']['energy'] <= 0){
							that.entities['Account01']['energy'] = 0;
						}
					that.entities['Account01']['energy'] += 1;
				}
				if (that.entities['Account01']['happyness'] > 100) {
					that.entities['Account01']['happyness'] = 100;
				} else {
					that.entities['Account01']['happyness'] = (selectValue(
							that.food, that.purity, that.attention, 0)
							+ selectValue(that.purity, that.food,
									that.attention, 0) + selectValue(
							that.attention, that.purity, that.food, 0)) / 3;
					if (that.food) {
						that.food -= 1;
						if (that.food <= 0) {
							that.food = 0;
						}
						//that.food = Math.floor(that.food);
					}
					if (that.purity) {
						that.purity -= 0.5;
						if (that.purity <= 0) {
							that.purity = 0;
						}
						//that.purity = Math.floor(that.purity)
					}
					if (that.attention) {
						that.attention -= 0.7;
						if (that.attention <= 0) {
							that.attention = 0;
						}
						that.attention = Math.floor(that.attention);
					}
				}
			}, 2000);
};

LocalStorageServer.prototype.ready = function() {
	this.entities = JSON.parse(Device.getStorageItem('entities'));
	if (this.params['ready']) {
		this.sendData(this.entities, this.params['ready']);
	}
};

LocalStorageServer.prototype.selectSubject = function() {
	var curriculum = [ "Biology", "Art" ];
	var subject = curriculum[Math.floor(Math.random() * curriculum.length)];
	this.entities["cardPool"]["itemDescription"] = "cardItem" + subject;
	this.entities["MemoryGameWellDoneState01"]["subject"] = subject;
}

LocalStorageServer.prototype.addCommand = function(name, func) {
	this.commands[name] = func;
};

LocalStorageServer.prototype.sendData = function(data, callback) {
	var entities = this.entities;
	$['each'](data, function(index, value) {
		if (index) {
			assert((entities[index] || value.newEntity),
					"Server has no entity with id=" + index);
			delete value.newEntity;
			if (value['parent'] != entities[index]['parent']) {
				if (value['parent'] == null) {
					entities[index].destroy = true;
				}
			}
		}
	});
	$['extend'](true, entities, data);

	Device.setStorageItem("entities", JSON.stringify(entities));

	this.selectSubject();
	if (this.entities['Account01']['experience'] >= 5000) {
		entities[id] = {};
		entities[id]['id'] = id;
		entities[id].newEntity = true;
		entities[id]['class'] = "Item";
		entities[id].parent = "Inventory01";
		entities[id].description = args[0];
	}
	// return updated data back to client
	this.receiveData(callback);
};

LocalStorageServer.prototype.receiveData = function(callback) {
	var entities = this.entities;
	var data = {};
	var addByParent = function(parentId) {
		$['each'](entities, function(id, entity) {
			if (entity.parent == parentId) {
				data[id] = entity;
				addByParent(id);
			}
		});
	};
	data[this.userAccount] = entities[this.userAccount];
	addByParent(this.userAccount);
	$['each'](entities, function(id, entity) {
		if ((entity['parent'] === null) && (entity['destroy'])) {
			data[id] = entity;
		}
	});

	var sendToClient = function() {
		if (callback) {
			callback(data);
		}
		// after 'destroy' flag was sent to client don't need it anymore
		$['each'](entities, function(id, entity) {
			if ((entity['parent'] === null) && (entity['destroy'])) {
				delete entity['destroy'];
			}
		});
		Device.setStorageItem("entities", JSON.stringify(entities));
	};

	if (this.pseudoPing) {
		setTimeout(function() {
			sendToClient();
		}, this.pseudoPing);
	} else {
		sendToClient();
	}
};

LocalStorageServer.prototype.command = function(name, args, callback) {
	var command = this.commands[name];
	if (command) {
		var result = command(args);
		this.sendData(this.entities, function(data) {
			if (callback) {
				callback(result, data);
			}
		});
	} else {
		console.log("Unknow command: " + command);
	}
};
