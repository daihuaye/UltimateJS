var GUI_MB_NAME = "GuiMessageBox";

GuiMessageBox.prototype = new GuiDialog();
GuiMessageBox.prototype.constructor = GuiMessageBox;

function GuiMessageBox() {
	GuiMessageBox.parent.constructor.call(this);
};

GuiMessageBox.inheritsFrom(GuiDialog);
GuiMessageBox.prototype.className = "GuiMessageBox";

GuiMessageBox.prototype.createInstance = function(params) {
	var entity = new GuiMessageBox(params['parent']);
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiMessageBox);

GuiMessageBox.prototype.initialize = function(params) {

	GuiMessageBox.parent.initialize.call(this, params);
	this.parent = params['parent'];
	this.x = 800 / 2 - this.width / 2;
	this.y = 500 / 2 - this.height / 2;
	this.buttons = new Object();
	this.labels = new Object();
	this.icons = new Object();
	var that = this;
	// var labelParams = labelParams ? labelParams : params['label']['params'];
	if (params['icons'])
		$['each'](params['icons'], function(index, value) {
			that.icons[index] = guiFactory.createObject("GuiDiv", {
				parent : that,
				background : value['background'],
				style : params['style'],
				width : value['width'],
				height : value['height'],
				x : value['x'] ? value['x'] : that.width / 2 - value['width']
						/ 2,
				y : value['y'] ? value['y'] : that.height * 5 / 18
						- value['height'] / 2
			});
			that.children.addGui(that.icons[index]);
		});
	if (params['labels'])
		$['each'](params['labels'], function(index, value) {
			that.labels[index] = guiFactory.createObject("GuiLabel", {
				parent : that,
				style : value['params']['style'],
				width : value['params']['width'] ? value['params']['height']
						: params['width'],
				height : value['params']['height'],
				text : value['params']['text'],
				fontSize : value['params']['fontSize'],
				align : "center",
				verticalAlign : value['params']['align'],
				x : value['params']['x'] ? value['params']['x'] : that.width
						/ 2 - params['width'] / 2,
				y : value['params']['y'] ? value['params']['y'] : that.height
						* 2 / 3 - value['params']['height'] / 2,
				color : value['params']['color']
			});
			that.children.addGui(that.labels[index]);
		});

	$['each'](params['buttons'], function(index, value) {
		that.buttons[value['name']] = guiFactory.createObject("GuiButton", {
			parent : that,
			style : value['params']['style'],
			width : value['params']['width'],
			height : value['params']['height'],
			params : value['params']['params'],
			normal : value['params']['normal'],
			hover : value['params']['hover'],
			avtive : value['params']['active'],
			x : value['params']['x'],
			y : value['params']['y']
		});
		that.children.addGui(that.buttons[value['name']]);
	});
	this.resize();
	this.hide();
};

GuiMessageBox.prototype.resize = function() {
	GuiMessageBox.parent.resize.call(this);
	this.children.resize();
};