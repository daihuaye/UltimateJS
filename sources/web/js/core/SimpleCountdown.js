/**
 * SimpleCountdown - VisualEntity with only countdown label.
 */
SimpleCountdown.prototype = new VisualEntity();
SimpleCountdown.prototype.constructor = SimpleCountdown;

/**
 * @constructor
 */
function SimpleCountdown() {
	SimpleCountdown.parent.constructor.call(this);
};

SimpleCountdown.inheritsFrom(VisualEntity);
SimpleCountdown.prototype.className = "SimpleCountdown";

SimpleCountdown.prototype.createInstance = function(params) {
	var entity = new SimpleCountdown();
	entity.init(params);
	return entity;
};

entityFactory.addClass(SimpleCountdown);

SimpleCountdown.prototype.init = function(params) {
	SimpleCountdown.parent.init.call(this, params);
};

/**
 * Will be called after a cycle will be finished
 * 
 * @param animationCycleEndCallback
 */
SimpleCountdown.prototype.setCycleEndCallback = function(cycleEndCallback) {
	this.cycleEndCallback = cycleEndCallback;
};

SimpleCountdown.prototype.createVisual = function() {
	SimpleCountdown.parent.createVisual.call(this);
	this.description['style'] = (this.description['style'] == null) ? "dialogButtonLabel lcdmono-ultra"
			: this.description['style'];
	this.label = guiFactory.createObject("GuiLabel", {
		"parent" : this.guiParent,
		"x" : this.params['x'],
		"y" : this.params['y'],
		"style" : this.description['style'],// "dialogButtonLabel
											// lcdmono-ultra",
		"width" : this.description['width'],
		"height" : this.description['height'],
		"align" : "center",
		"verticalAlign" : "middle",
		"text" : this.params['count'],
		"fontSize" : this.description['fontSize'],
		"color" : this.description['color']
	});
	// this.visual.addGui(this.label);

	var visualInfo = {};
	visualInfo.visual = this.label;
	this.addVisual(null, visualInfo);

	this.count = this.params['count'] * 1000;
	this.alarmCount = this.params['alarmCount'] * 1000;

	this.paused = false;
};

SimpleCountdown.prototype.pause = function() {
	this.paused = true;
};

SimpleCountdown.prototype.resume = function() {
	this.paused = false;
};

SimpleCountdown.prototype.getTimeRemains = function() {
	return this.count;
};

SimpleCountdown.prototype.update = function(updateTime) {
	if (!this.paused) {
		this.count -= updateTime;
		if (this.count > 0) {
			if (this.alarmCount && (this.count < this.alarmCount)) {
				this.label.setColor(this.description['alarmColor']);
				this.alarmCount = null;
			} else {
				this.label.change(Math.floor(this.count / 1000));
			}
		} else {
			this.label.change(this.description['go']);
			if (this.cycleEndCallback) {
				this.cycleEndCallback();
				this.cycleEndCallback = null;
			}
		}
	}
};
