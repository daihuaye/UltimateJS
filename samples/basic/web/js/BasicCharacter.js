var SPEED_MOVE = 100;
BasicCharacter.prototype = new VisualEntity();
BasicCharacter.prototype.constructor = BasicCharacter;

/**
 * @constructor
 */
function BasicCharacter() {
	BasicCharacter.parent.constructor.call(this);
};

BasicCharacter.inheritsFrom(VisualEntity);
BasicCharacter.prototype.className = "BasicCharacter";

BasicCharacter.prototype.createInstance = function(params) {
	var entity = new BasicCharacter();
	entity.init(params);
	return entity;
};

entityFactory.addClass(BasicCharacter);

BasicCharacter.prototype.init = function(params) {
	BasicCharacter.parent.init.call(this, params);
	this.speed = selectValue(params['speed'], SPEED_MOVE);
	this.stashed = params['stashed'];
	this.flagMove = false;
	this.clickPosition = {};
	this.lastDirection = null;

	if (this.stashed) {
		return;
	} else {
		var guiParent = this.params['guiParent'] ? this.params['guiParent']
				: this.parent.visual;
		if (guiParent) {
			this.attachToGui(guiParent);
		}
	}

	this.z = (this.z != null) ? this.z : 0;
};

BasicCharacter.prototype.createVisual = function() {
	this.assert(this.guiParent, "No gui parent provided for creating visuals");
	this.description = Account.instance.descriptionsData[this.params['description']];
	this.assert(this.description, "There is no correct description");

	var totalImage = Resources.getImage(this.description['totalImage']);

	visual = guiFactory.createObject("GuiSprite", {
		parent : this.guiParent,
		style : "sprite",
		x : this.params['x'],
		y : this.params['y'],
		width : this.description['width'],
		height : this.description['height'],
		totalImage : totalImage,
		totalImageWidth : this.description['totalImageWidth'],
		totalImageHeight : this.description['totalImageHeight'],
		totalTile : this.description['totalTile'],
		"spriteAnimations" : {
			"idle" : {
				"frames" : [ 1, 1, 2, 2, 1 ],
				"row" : 0
			},
			"walk" : {
				"frames" : [ 4, 5, 6, 7, 8, 9, 10, 11 ],
				"row" : 0,
				"frameDuration" : 100
			}
		}
	});

	var visualInfo = {};
	visualInfo.visual = visual;
	visualInfo.z = this.description['z-index'];
	visualInfo.offsetX = this.description['centerX'] ? calcPercentage(
			this.description['centerX'], this.description['width']) : 0;
	visualInfo.offsetY = this.description['centerY'] ? calcPercentage(
			this.description['centerY'], this.description['height']) : 0;

	this.addVisual(null, visualInfo);
	this.setPosition(this.x, this.y);
	this.startX = this.x;
	this.startY = this.y;
	this.setZ(null);
	visual.playAnimation("idle", 5, true);
};

BasicCharacter.prototype.update = function(updateTime) {
	if (this.flagMove == true) {
		if ((Math.abs(this.clickPosition.x - this.x) > 4)
				|| (Math.abs(this.clickPosition.y - this.y) > 4)) {
			this.x += this.speed * (updateTime / 1000) * this.normX;
			this.y += this.speed * (updateTime / 1000) * this.normY;
			this.setPosition(this.x, this.y);
		} else {
			this.startX = this.x;
			this.startY = this.y;
			this.stop();
		}
	} else {
		this.startX = this.x;
		this.startY = this.y;
	}
	this.getVisual().update();
};


BasicCharacter.prototype.move = function() {
	this.flagMove = true;
	this.getVisual().stopAnimation();
	this.normX = (this.clickPosition.x - this.startX)
			/ Math.sqrt(Math.pow((this.clickPosition.x - this.startX), 2)
					+ Math.pow((this.clickPosition.y - this.startY), 2));
	this.normY = (this.clickPosition.y - this.startY)
			/ Math.sqrt(Math.pow((this.clickPosition.x - this.startX), 2)
					+ Math.pow((this.clickPosition.y - this.startY), 2));
	if(this.normX < 0){
		this.getVisual().flip(true);
	}else{
		this.getVisual().flip(false);
	}
	this.getVisual().playAnimation("walk", null, true);
};
BasicCharacter.prototype.stop = function() {
	this.flagMove = false;
	this.getVisual().stopAnimation();
	this.getVisual().playAnimation("idle", 5, true);
};
