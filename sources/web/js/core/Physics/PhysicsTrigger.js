/**
 * Physics Trigger
 */

CreatePhysicsTrigger = function(world, rect, action) {
	var instance = {};
	instance.rect = rect;
	instance.world = world;
	instance.action = action;

	instance.checkIfIn = function(position) {
		var ifIn = false;
		if (((position.x > instance.rect.left) && (position.x < instance.rect.right))
				&& ((position.y > instance.rect.top) && (position.y < instance.rect.bottom)))
			ifIn = true;
		return ifIn;
	};
	
	instance.move = function(x, y)
	{
		this.rect.left += x;
		this.rect.right += x;
		this.rect.top += y;
		this.rect.bottom += y;
	};
	
	instance.setPosition = function(x, y)
	{
		var w = rect.right - rect.left;
		var h = rect.bottom - rect.top;
		this.rect.left = x;
		this.rect.right = x + w;
		this.rect.top = y;
		this.rect.bottom = y + h;
	};

	instance.update = function() {
		var body = instance.world.m_bodyList;
		for (; body != null; body = body['m_next']) {
			if (instance.checkIfIn(body.m_position))
				instance.action(body);
		}
	};

	return instance;
};