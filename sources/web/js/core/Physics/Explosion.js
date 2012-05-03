var DAMAGE_DECR = 500;
var FORCE_RATING = 100;

// Creates physics explosion without any visual presentation
// just an explosion in physics world.
// center - center of the explosion;
// radiusMin, radiusMax - it`s radius <point>
// force - scalar force of impulse <number>
// damage - scalar force of damage <number>
// duration - explosion effect duration in <ms>
// decr - how fast force decreases by distance from center <number>
// owner - object that initiate explosion, should not affect it
Physics.explode = function(params) {
	//decr = decr ? decr : 1;
	var score = 0;

	var radiusMin = selectValue(params.radiusMin, 1);
	var radius = params.radius;
	// begin
	var world = Physics.getWorld();
	var body = world.m_bodyList;
	for (; body != null; body = body['m_next']) {
		var bodyCenter = body.GetCenterPosition();
		var rVec = new b2Vec2(bodyCenter.x - params.center.x, bodyCenter.y
				- params.center.y);
		var dist = rVec.Length();
		if (dist < radius) {
			var impulse = rVec;
			impulse.Normalize();

			var distK = 1;
			if (radiusMin < radius) {
				distK = 1 - (dist - radiusMin) / (radius - radiusMin);
			}

			impulse.Multiply(params.force * distK);
			if (body.m_userData != params.owner)
				body.ApplyImpulse(impulse, bodyCenter);
			if ((body.m_userData) && (body.m_userData.destructable)) {
				var damage = params.damage * distK;
				body.m_userData.onDamage(damage);
				score += damage;
			}
		}
		;
	}
	;
	return;

	var delta = 10;
	var time = duration / delta;
	function tick() {
		setTimeout(function() {
			var body = world.m_bodyList;
			for (; body != null; body = body['m_next']) {
				var bodyCenter = body.GetCenterPosition();
				var rVec = new b2Vec2(bodyCenter.x - center.x, bodyCenter.y
						- center.y);
				var dist = rVec.Length();
				if (dist < radius) {
					var impulse = rVec;
					impulse.Normalize();
					impulse.Multiply(FORCE_RATING * force
							/ Math.pow(1 + dist, decr));
					if (body.m_userData.params.type != "CannonBall")
						body.ApplyImpulse(impulse, bodyCenter);
					if ((body.m_userData) && (body.m_userData.destructable)) {
						var damage = impulse.Length() / DAMAGE_DECR;
						body.m_userData.onDamage(damage);
						score += damage;
					}
				}
				;
			}
			;
			if (time < duration)
				tick();
			else {
				// if ((owner)&&(score>1)) {
				// var scoreGroup = false;
				// if(score >= 5000) scoreGroup = "5000"; else
				// if(score >= 1000) scoreGroup = "1000"; else
				// if(score >= 500) scoreGroup = "500"; else
				// if(score >= 100) scoreGroup = "100"; else
				// if(score >= 50) scoreGroup = "50"; else
				// if(score >= 15) scoreGroup = "15";
				//					
				// var guiScore = false;
				// if (scoreGroup)
				// $['each'](owner.pool.scores[scoreGroup].guis, function(idx,
				// gui) {
				// if (!gui.visible) {
				// gui.setPosition(center.x + (0.5-Math.random())*100,
				// center.y + (0.5-Math.random())*100);
				// gui.show();
				// IEffect.play(gui, {
				// "slide" : {
				// "x" : (gui.x > center.x) ? 10 : -10,
				// "y" : -10
				// },
				// "iterations" : 10
				// }, 500);
				//									
				// owner.setTimeout(function() {
				// gui.hide();
				// }, 1000);
				// }
				// });
				// }
				return;
			}
			time += delta;
		}, 10);

	}
	;
	tick();
};