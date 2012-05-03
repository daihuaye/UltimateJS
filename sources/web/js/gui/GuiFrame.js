/**
 * GuiFrame is a GuiElement with ability to scaling using CSS transform scale. 
 * It's particularly useful for scaling iframes objects (like advertising) since
 * there's no other method to scale content inside iframe.
 */


GuiFrame.prototype = new GuiElement();
GuiFrame.prototype.constructor = GuiFrame;

/**
 * @constructor
 */
function GuiFrame() {
	GuiFrame.parent.constructor.call(this);
}

GuiFrame.inheritsFrom(GuiElement);
GuiFrame.prototype.className = "GuiFrame";

GuiFrame.prototype.createInstance = function(params) {
	var entity = new GuiFrame(params['parent'], "dialogButton",
			params['width'], params['height']);
	entity.initialize(params);
	return entity;
};

GuiFrame.prototype.initialize = function(params) {
	GuiFrame.parent.initialize.call(this, params);

	this.attachedDiv = params['attachedDiv'];
	this.attachedDiv = $("#" + params['attachedDiv']);
	
	if(this.attachedDiv.length <= 0) {
		this.hide();
		console.log( "Object attched to GuiFrame not exists " + params['attachedDiv']);
		return;
	}
	
	this.attachedDiv['show']();
	this.realWidth = this.attachedDiv['width']();
	var originalWidth = params['originalWidth'] ? params['originalWidth'] : params['width'];
	this.scaleFactor = params['width'] / originalWidth;
	this.attachedDiv['width'](0);
	this.attachedDiv['height'](0);
	this.attachedDiv['css']("position", "absolute");
	// this.jObject['css']("transform-origin", "left bottom");

	this.jObject['css']("display", "none");
	this.jObject['css']("position", "absolute");

	this.jObject['css']("display", "block");
//	this.jObject['css']("border", "solid");

	// this.setRealSize(0, 0);
	// this.rootOffsetX = this.rootOffsetY = 0;
	this.setZ(this.z);
	this.attachedDiv['css']("z-index", 999);
};


GuiFrame.prototype.resize = function() {
	GuiFrame.parent.resize.call(this);

	// this.realWidth = this.attachedDiv.width();
	if (this.attachedDiv) {
		var scaleX = Screen.widthRatio() * this.scaleFactor;
		var scaleY = Screen.heightRatio() * this.scaleFactor;

		var pos = this.jObject.offset();
		cssTransform(this.attachedDiv, null, null, scaleX, scaleY, {
			"x" : pos.left,
			"y" : pos.top
		});
	}
};

GuiFrame.prototype.setZ = function(z) {
	GuiFrame.parent.setZ.call(this, z);
	if (this.attachedDiv && this.z) {
		this.attachedDiv['css']("z-index", this.z);
	};
};

GuiFrame.prototype.show = function() {
	GuiFrame.parent.show.call(this);
	if (this.attachedDiv) {
		this.attachedDiv['show']();
		this.resize();
	}
};

GuiFrame.prototype.hide = function() {
	GuiFrame.parent.hide.call(this);
	if (this.attachedDiv) {
		this.attachedDiv['hide']();
	}
};

GuiFrame.prototype.remove = function() {
	GuiFrame.parent.remove.call(this);
	if (this.attachedDiv) {
		this.attachedDiv['hide']();
	}
};

guiFactory.addClass(GuiFrame);