// Global vars for touch event handling
var touchStartX = 0;
var touchStartY = 0;
var touchEndX = 0;
var touchEndY = 0;

var mobileBrowser = null;
function isMobile() {
	// return Crafty.mobile;

	if (mobileBrowser != null) {
		return mobileBrowser;
	}

	var ua = navigator.userAgent.toLowerCase(), match = /(webkit)[ \/]([\w.]+)/.exec(ua) || /(o)pera(?:.*version)?[ \/]([\w.]+)/.exec(ua) || /(ms)ie ([\w.]+)/.exec(ua)
			|| /(moz)illa(?:.*? rv:([\w.]+))?/.exec(ua) || [], mobile = /iPad|iPod|iPhone|Android|webOS/i.exec(ua);

	// if (mobile)
	// Crafty.mobile = mobile[0];
	mobileBrowser = mobile;

	return mobileBrowser;
}

var disableTouchEvents = function() {
	if (isMobile()) {
		document.body.ontouchmove = function(e) {
			e.preventDefault();
		};
		document.body.ontouchstart = function(e) {
			e.preventDefault();
		};
		document.body.ontouchend = function(e) {
			e.preventDefault();
		};
	}
};

var enableTouchEvents = function(push) {
	if (isMobile()) {
		document.body.ontouchstart = function(e) {
			e.preventDefault();
			// if (levelStarted) {
			touchStartX = touchEndX = e.touches[0].pageX;
			touchStartY = touchEndY = e.touches[0].pageY;
			// } else {
			// touchStartX = touchEndX = null;
			// touchStartY = touchEndY = null;
			// }
			return false;
		};

		document.body.ontouchmove = function(e) {
			e.preventDefault();
			// if (levelStarted) {
			touchEndX = e.touches[0].pageX;
			touchEndY = e.touches[0].pageY;
			// }
			//push(e);
			return false;
		};

		document.body.ontouchend = function(e) {
			e.preventDefault();
			if (touchEndX && touchEndY) {
				var e1 = {};
				e1.pageX = touchEndX;
				e1.pageY = touchEndY;
				//push(e1);
			}
			return false;
		};
	}
};
