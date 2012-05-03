/**
 * Entity Factory
 */

var entityFactory = new AbstractFactory();

/**
 * @constructor
 */
entityFactory.createEntitiesFromJson = function(json) {
	this.createObjectsFromJson(json, function(name, params) {
		params['id'] = name;
	}, function(name, obj, params) {
		assert(Account.instance);
		Account.instance.addEntity(obj, name, params);
	});
};
