/*
 *  Moving actor to target position with predefined velocity
 */

/**
 * @constructor
 */

var ACTION_MOVE_PRECISION = 3;

function ActionMove() {
	ActionMove.parent.constructor.call(this);
};

ActionMove.inheritsFrom(Action);
ActionMove.prototype.className = "ActionMove";

ActionMove.prototype.createInstance = function(params) {
	var action = new ActionMove();
	action.init(params);
	return action;
};

Action.factory.addClass(ActionMove);

ActionMove.prototype.init = function(params) {
	ActionMove.parent.init.call(this, params);
	this.actor = params['actor'];
	this.target = params.target;
	this.velocity = params.velocity;
	this.dir = {x : 0, y : 0};
	this.dir.x = (this.target.x > this.actor.x) ? 1 : -1;
};

ActionMove.prototype.update = function(dt) {
	console.log("action update " + this.id);
	
	var delta = (this.actor.x + this.actor.width/2 - this.target.x) * this.dir.x;
	if(delta < 0) {
		this.actor.move(this.dir.x * this.velocity.x, 0);
	} else {
		//this.actor.setPosition(this.target.x, this.actor.y);
		this.terminate(Action.SUCCESS);
	}
};
