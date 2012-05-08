/**
 * Scene is a place to put all sprites in
 */

BasicScene.prototype = new Scene();
BasicScene.prototype.constructor = BasicScene;

/**
 * @constructor
 */
function BasicScene() {
	BasicScene.parent.constructor.call(this);
};

BasicScene.inheritsFrom(Scene);

BasicScene.prototype.className = "BasicScene";
BasicScene.prototype.createInstance = function(params) {
	var entity = new BasicScene();
	entity.init(params);
	return entity;
};

entityFactory.addClass(BasicScene);

BasicScene.prototype.init = function(params) {
	BasicScene.parent.init.call(this, params);
};

BasicScene.prototype.addChild = function(child) {
	BasicScene.parent.addChild.call(this, child);
};

BasicScene.prototype.createVisual = function() {
	BasicScene.parent.createVisual.call(this);
	var visual = this.getVisual();
	var descriptionTile = Account.instance.descriptionsData[this.params['tile']];
	visual.setBackground(Resources.getImage(descriptionTile['image']),
			descriptionTile['width'], descriptionTile['height'], 0, 0,
			"repeat", 0);
	this.parent.resize();

	// Binding touchUp and mouseUp to handle character movement
	var that = this;
	var lastEvent = null;
	visual.jObject['bind'](Device.event("cursorDown"), function(e) {
		lastEvent = e;
	});
	visual.jObject['bind'](Device.event("cursorMove"), function(e) {
		lastEvent = e;
	});
	visual.jObject['bind'](Device.event("cursorUp"), function() {
		if(!lastEvent) {
			return;
		}
		var e = lastEvent;
		that.monkey = Account.instance.getEntity("basicCharacter01");
		if (that.monkey.flagMove == false) {
			that.monkey.clickPosition = that.getVisual().getEventPosition(e);
			that.monkey.move();
		} else {
			that.monkey.stop();
		}
	});

};

// do cleanup here
BasicScene.prototype.destroy = function() {
	BasicScene.parent.destroy.call(this);
};