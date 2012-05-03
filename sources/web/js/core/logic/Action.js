/*
 *  Action is a object with member functions:
 *  init
 *  update
 *  terminate
 */

/**
 * @constructor
 */
function Action() {
	Action.parent.constructor.call(this);
};

Action.inheritsFrom(Entity);
Action.prototype.className = "Action";

Actor.prototype.createInstance = function(params) {
	var entity = new Action();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Action);

Actor.prototype.init = function(params) {
	Actor.parent.init.call(this, params);
};

Actor.prototype.update = function(params) {
};
