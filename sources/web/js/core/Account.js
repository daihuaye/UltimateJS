/*
 * Account - root entity that is parent to all active entities
 */

Account.prototype = new BaseState();
Account.prototype.constructor = Account;

var GLOBAL_UPDATE_INTERVAL = 50;

/**
 * @constructor
 */
function Account(parent) {
	Account.parent.constructor.call(this);
};

Account.inheritsFrom(BaseState);

Account.prototype.init = function(params) {
	params = params ? params : {};
	Account.parent.init.call(this, params);
	// associative array of all active entities
	this.allEntities = new Object();
	// entities that should be update on timely basis
	this.scheduledEntities = new Object();

	// time interval for scheduled synchronization with server
	this.syncWithServerInterval = params['syncWithServerInterval'];
	// adding itself to allEntities for reading updates
	// in automatic mode
	this.id = selectValue(params['id'], "Account01");
	this.globalUpdateInterval = selectValue(params['globalUpdateInterval'],
			GLOBAL_UPDATE_INTERVAL);

	this.addEntity(this);
	// permanent GUI element
	this.backgroundState = new BackgroundState();
	params['backgroundState'] = selectValue(params['backgroundState'], {});
	params['backgroundState']['id'] = selectValue(
			params['backgroundState']['id'], "backgroundState01");
	this.backgroundState.activate(params['backgroundState']);

	// a singleton object
	assert(Account.instance == null,
			"Only one account object at time are allowed");
	Account.instance = this;
};

Account.prototype.addEntity = function(newEntity) {
	assert(typeof (newEntity.id) == "string", "Entity ID must be string");
	assert(this.allEntities[newEntity.id] == null, "Entity with ID '"
			+ newEntity.id + "' already exists");
	this.allEntities[newEntity.id] = newEntity;
};

Account.prototype.getEntity = function(id) {
	return this.allEntities[id];
};

Account.prototype.removeEntity = function(id, dontDestroy) {
	var entity = this.allEntities[id];
	if (entity) {
		if (!dontDestroy) {
			this.removeScheduledEntity(entity);
			this.removeChild(entity);
			entity.destroy();
		}

		delete this.allEntities[id];

	}
};

Account.prototype.removeAllEntities = function(id, dontDestroy) {
	$['each'](this.allEntities, function(id, entity) {
		if (entity !== Account.instance) {
			Account.instance.removeEntity(id, false);
		}
	});
};

/*
 * Scheduling for children entities
 */
Account.prototype.addScheduledEntity = function(newEntity) {
	assert(typeof (newEntity.id) == "string", "Entity ID must be string");
	var that = this;
	var dt = this.globalUpdateInterval;
	// if adding first object to scheduling queue start update interval
	if (!this.globalUpdateIntervalHandle) {
		this.globalUpdateIntervalHandle = this.setInterval(function() {
			that.update(dt);
		}, dt);
	}
	this.scheduledEntities[newEntity.id] = newEntity;
};

Account.prototype.removeScheduledEntity = function(entity) {
	assert(typeof (entity.id) == "string", "Entity ID must be string");
	delete this.scheduledEntities[entity.id];
	// if nothing to schedule anymore stop interval either
	if (!this.globalUpdateIntervalHandle
			&& $['isEmptyObject'](this.scheduledEntities)) {
		this.clearInterval(this.globalUpdateIntervalHandle);
		this.globalUpdateIntervalHandle = null;
	}
};

// Regular scheduled update for registered enities
Account.prototype.update = function(dt) {
	$['each'](this.scheduledEntities, function(id, entity) {
		if (entity && entity.isEnabled()) {
			entity.update(dt);
		}
	});
};
Account.prototype.setEnable = function(isTrue) {
	// if adding first object to scheduling queue start update interval
	if (!this.globalUpdateIntervalHandle) {
		this.globalUpdateIntervalHandle = this.setInterval(this.update,
				this.globalUpdateInterval);
	}
	this.scheduledEntities[newEntity.id] = newEntity;
};

/*
 * Serialization for the network or local data
 */
Account.prototype.readUpdate = function(params) {
	this.money = params['money'];
	this.premiumMoney = params['premiumMoney'];
	this.energy = params['energy'];
	if (this.energy <= 0) {
		this.energy = 0;
	}
	this.happyness = params['happyness'];
	this.experience = params['experience'];
};

Account.prototype.writeUpdate = function(globalData, entityData) {
	// entityData['money'] = this.money;
	this.writeUpdateProperty(entityData, "money", this.money);
	// entityData['premiumMoney'] = this.premiumMoney;
	this.writeUpdateProperty(entityData, "premiuMoney", this.premiumMoney);
	// entityData['energy'] = this.energy;
	this.writeUpdateProperty(entityData, "energy", this.energy);
	// entityData['happyness'] = this.happyness;
	this.writeUpdateProperty(entityData, "happyness", this.happyness);
	// entityData['experience'] = this.experience;
	this.writeUpdateProperty(entityData, "experience", this.experience);
	this.serverCommands = null;
	Account.parent.writeUpdate.call(this, globalData, entityData);
};

// called from outside, to notify entities about
// screen resize
Account.prototype.resize = function() {
	if (this.children == null)
		return;
	$['each'](this.children, function(idx, entity) {
		if (entity && entity.resize) {
			entity.resize();
		}
	});
	// console.log(this);
	if (this.backgroundState) {
		this.backgroundState.resize();
	}
};
Account.prototype.getMoney = function() {
	return this.money;
};
Account.prototype.setMoney = function(money) {
	this.money = money;
};
Account.prototype.getPremiumMoney = function() {
	return this.premiumMoney;
};
Account.prototype.setPremiumMoney = function(money) {
	this.premiumMoney = money;
};

Account.prototype.showDialog = function(dialog) {
	var count = 1;
	this.backgroundState.dialogs["buy"].labels[1].change(count);
	var returnValue = null;
	var that = this;
	if (dialog.type == "settings") {
		if (Sound.isOn()) {
			that.backgroundState.dialogs[dialog.type].buttons["unsound"].hide();
			that.backgroundState.dialogs[dialog.type].buttons["sound"].show();
		} else {
			that.backgroundState.dialogs[dialog.type].buttons["sound"].hide();
			that.backgroundState.dialogs[dialog.type].buttons["unsound"].show();
		}
	}
	if (dialog.price) {
		this.backgroundState.dialogs[dialog.type].labels[2].change(""
				+ (dialog.price));
	}
	if (dialog.text) {
		this.backgroundState.dialogs[dialog.type].labels[0].change(dialog.text);
	}
	if (dialog.icons) {
		$['each']
				(
						dialog.icons,
						function(index, value) {
							if ((value.width) && (value.height)) {
								that.backgroundState.dialogs[dialog.type].icons[index]
										.setSize(value['width'],
												value['height']);
								that.backgroundState.dialogs[dialog.type].icons[index]
										.setPosition(that.backgroundState.dialogs[dialog.type].width
												/ 2 - value['width'] / 2);
								that.backgroundState.dialogs[dialog.type].icons[index]
										.resize();
							}
							that.backgroundState.dialogs[dialog.type].icons[index]
									.setBackground(value['background']['image']);
						});
	}
	if (dialog.callbacks) {
		$['each']
				(
						dialog.callbacks,
						function(index, value) {
							if (index == "plus") {
								that.backgroundState.dialogs[dialog.type].buttons[index]
										.bind(function() {
											if (count < dialog.max) {
												count++;
												that.backgroundState.dialogs[dialog.type].labels[1]
														.change("" + (count));
												that.backgroundState.dialogs[dialog.type].labels[2]
														.change(""
																+ (count * dialog.price));
												dialog.result = count;
												value(dialog);
											}
										});
							} else {
								if (index == "unsound") {
									that.backgroundState.dialogs[dialog.type].buttons[index]
											.bind(function() {
												this.hide();
												that.backgroundState.dialogs[dialog.type].buttons["sound"]
														.show();
												value(dialog);
											});
								} else {
									if (index == "sound") {
										that.backgroundState.dialogs[dialog.type].buttons[index]
												.bind(function() {
													this.hide();
													that.backgroundState.dialogs[dialog.type].buttons["unsound"]
															.show();
													value(dialog);
												});
									} else {
										if (index == "minus") {
											that.backgroundState.dialogs[dialog.type].buttons[index]
													.bind(function() {
														count--;
														if (count <= 1) {
															count = 1;
														}
														that.backgroundState.dialogs[dialog.type].labels[1]
																.change(""
																		+ (count));
														that.backgroundState.dialogs[dialog.type].labels[2]
																.change(""
																		+ (count * dialog.price));
														dialog.result = count;
														value(dialog);
													});
										} else {
											that.backgroundState.dialogs[dialog.type].buttons[index]
													.bind(function() {
														dialog.result = count;
														value(dialog);
														that.backgroundState.dialogs[dialog.type]
																.hide();
													});
										}
									}
								}
							}
						});
	}
	this.backgroundState.dialogs[dialog.type].show();
	dialog.result = returnValue;
};


/*
 * NETWORKING FUNCTIONS dealing with external server
/*
 *  NETWORKING FUNCTIONS
 *  dealing with external server
 */
// Creates/Updates/Destroy all active entities
Account.prototype.readGlobalUpdate = function(data) {
	var that = this;
	$['each'](data, function(id, element) {
		// console.log("readGlobalUpdate key is ", id);
		var entity = Account.instance.getEntity(id);
		// entity already exists
		if (entity) {
			// entity should be destroyed with all of its children
			if (element["destroy"]) {
				// console.log("!!!!!Destroy entity '" + entity.id + "'");
				that.removeEntity(id);
				// remove entity from data
				delete data[id];
			} else {
				// updating the entity
				entity.readUpdate(element);
			}
			return;
		} else {
			var parentEntity = Account.instance.getEntity(element['parent']);
			if (parentEntity) {
				// create new entity
				element["id"] = id;
				entity = entityFactory.createObject(element["class"], element);
				// viking test
				// entity.parent = element.parent;
				that.addEntity(entity);
				// console.log("New entity '" + entity.id + "' of class "
				// + element["class"] + " with parent '"
				// + (entity.parent ? entity.parent.id : "no parent") + "'");
			}
		}
	});
};

// Serialize all entities to JSON
Account.prototype.writeGlobalUpdate = function() {
	var data = {};
	this.writeUpdate(data, new Object());
	return data;
};

// read update data from server
Account.prototype.getUpdateFromServer = function(callback) {
	this.server.receiveData(callback);
};

// send data to server
Account.prototype.saveUpdateToServer = function(data, callback) {
	this.server.sendData(data, callback);
};

// perform specific command on server
Account.prototype.commandToServer = function(name, args, callback) {
	var that = this;
	this.server.command(name, args, function(result, data) {
		that.readGlobalUpdate(data);
		callback(result);
	});
};

// make sure client and server are synchronized at the moment
Account.prototype.syncWithServer = function(callback, data, syncInterval) {
	var writeData = this.writeGlobalUpdate();
	if (data) {
		$['extend'](true, writeData, data);
	}
	var that = this;
	this.server.sendData(writeData, function(data) {
		that.readGlobalUpdate(data);
		if (callback) {
			callback();
		}
	});
	syncInterval = selectValue(syncInterval, this.syncWithServerInterval);
	if (syncInterval != null) {
		this.clearTimeout(this.syncWithServerTimeoutId);
		var that = this;
		this.syncWithServerTimeoutId = this.setTimeout(function() {
			that.syncWithServer();
		}, 5000);
	}
};
