/**
 * Room is scene for furniture and characters
 */

var FLOOR_LEVEL = 352;

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
	visual.clampByParentViewport();

	var descriptionWall = Account.instance.descriptionsData[this.params['wall']];
	var descriptionFloor = Account.instance.descriptionsData[this.params['floor']];
	visual.setBackground("images/" + descriptionWall['image'],
			descriptionWall['width'], descriptionWall['height'], 0, -70,
			"repeat-x", 0);
	visual.setBackground("images/" + descriptionFloor['image'],
			descriptionFloor['width'], descriptionFloor['height'], 0,
			FLOOR_LEVEL, "repeat-x", 1);
	this.parent.resize();

	var that = this;
	$(document)['bind'](Device.event("cursorUp"), function(e) {
		that.monkey = Account.instance.getEntity("basicCharacter01");
		if(that.monkey.flagMove == false){
			that.monkey.clickPosition = that.getVisual().getEventPosition(e);
			that.monkey.move();
		}else{
			that.monkey.stop();
		}
	});

};

BasicScene.prototype.attachChildVisual = function(child) {
	BasicScene.parent.attachChildVisual.call(this, child);
	var that = this;
	// adding items to the scene
	if (child instanceof Item) {
		var item = child;
		this.initItem(item);
	} else if (child instanceof Actor) {
		child.getVisual().clampByParentViewport();
	}
};

BasicScene.prototype.initItem = function(item) {
	var that = this;
	var visual = item.getVisual();
	visual.clampByParentViewport();
	visual.roomParent = that.getVisual();
	// dragable
	// visual.setDragable(false);
	visual.onDragBegin = function() {
		visual.oldPosition = {
			x : visual.x,
			y : visual.y
		};

		visual.clampByParentViewport(false);
		visual.setRealBackgroundPosition(0, 0);
		visual.setParent("#root", true);
		visual.setZ(9999);

	};
	visual.onDragEnd = function(dragListener) {
		if (!dragListener) {
			if (visual.onDragEndNoListener) {
				visual.onDragEndNoListener();
			} else {
				console.log("no drag listener");
				// return to old position if listener is not correct
				visual.setPosition(visual.oldPosition.x, visual.oldPosition.y);
				visual.setParent(visual.roomParent);
			}

		} else {
			visual.setParent(visual.roomParent, true);
		}

		visual.clampByParentViewport();

		// restore Z index
		visual.visualEntity.setZ(null);
	};
};

BasicScene.prototype.destroy = function() {
	BasicScene.parent.destroy.call(this);
	$(document)['unbind'](".roomEvent");
};
