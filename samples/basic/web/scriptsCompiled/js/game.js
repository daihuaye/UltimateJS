/*
 * Viewporter
 * http://github.com/zynga/viewporter
 *
 * Copyright 2011, Zynga Inc.
 * Licensed under the MIT License.
 * https://raw.github.com/zynga/viewporter/master/MIT-LICENSE.txt
 */
var viewporter;
(function() {

	// initialize private constants
	var DEFAULT_ROTATION_LANDSCAPE = false;

	// initialize viewporter object
	viewporter = {

		// constants
		ACTIVE: (('ontouchstart' in window) || (/webos/i).test(navigator.userAgent)),
		DEVICE_SUPPORTED: false,
		DEVICE_DENSITY: null,
		META_VIEWPORT_CONTENT: null,

		// settings
		settings: {
			maxDensity: 163 // this is iPhone non-retina, set to false for purist/always native
		},

		// methods
		isLandscape: function() {
			return (!DEFAULT_ROTATION_LANDSCAPE ?
				(window.orientation === 90 || window.orientation === -90)
				: (window.orientation === 0 || window.orientation === 180));
		},

		ready: function(callback) {
			window.addEventListener('viewportready', callback, false);
		}

	};

	// if we are on Desktop, no need to go further
	if (!viewporter.ACTIVE) {
		return;
	}

	// create private constructor with prototype..just looks cooler
	var _Viewporter = function() {

		var that = this;

		this.data = {};
		this.IS_ANDROID = /Android/.test(navigator.userAgent);

		// listen for document ready, then try to prepare the visual viewport and start firing custom events
		document.addEventListener('DOMContentLoaded', function() {

			// initialize viewporter
			that.computeViewportInformation();

			// set and update the meta viewport tag for the first time
			that.setMetaViewport();

			// scroll the shit away and fix the viewport!
			that.prepareVisualViewport();

			// listen for orientation change
			var cachedOrientation = window.orientation;
			window.addEventListener('orientationchange', function() {
				if(window.orientation != cachedOrientation) {
					that.computeViewportInformation();
					that.updateMetaViewport();
					that.prepareVisualViewport();
					cachedOrientation = window.orientation;
				}
			}, false);

		}, false);

	};

	_Viewporter.prototype = {

		computeViewportInformation: function() {
			
			//.logicking
			//viewporter.settings.maxDensity = false;

			// try to fetch a profile
			var profile = this.getProfile();

			 // Y U NO FOUND DEVICE?
			if(!profile) {
				return this.triggerWindowEvent('viewportunknown');
			}

			// find out if the device is landscape per default (i.e. the Motorola Xoom)
			DEFAULT_ROTATION_LANDSCAPE = profile ? profile.inverseLandscape : false;

			// initialize working variables
			var landscape = viewporter.isLandscape(),
				ppi = 0, ppiFactor = 1,
				width = !DEFAULT_ROTATION_LANDSCAPE ? screen.height : screen.width,
				height = !DEFAULT_ROTATION_LANDSCAPE ? screen.width : screen.height,
				scale = this.IS_ANDROID ? 1: 1 / window.devicePixelRatio,
				chromeHeight = 0, chromeWasPrescaled = false;

			// little property getter helper
			var _w = width, _h = height, _c = chromeHeight,
				computeProp = function(n) { return (typeof n == 'function' ? n(_w,_h,ppiFactor) : n); };

			// check if the ppi is higher than the max, normalize if it is
			ppi = typeof profile.ppi == 'function' ? profile.ppi() : profile.ppi;
			if(ppi) {
				viewporter.DEVICE_DENSITY = ppi;
				if(viewporter.settings.maxDensity && ppi > viewporter.settings.maxDensity) {
					ppiFactor *= viewporter.settings.maxDensity/ppi;
					scale = this.IS_ANDROID ? 1 : (scale / ppiFactor);
				}
			}

			// width and height, always scaled afterwards
			width = computeProp(profile.width) || width;
			height = computeProp(profile.height) || height;

			// chrome height, needs to be scaled in callback for iPhone only..
			if(profile.chromePrescale) {
				chromeHeight = computeProp(profile.chromePrescale);
				chromeWasPrescaled = true;
			} else {
				chromeHeight = computeProp(profile.chrome) || 0;
			}

			// specific orientation overrides
			var orientationOverride = profile[landscape ? 'landscape' : 'portrait'];
			if(orientationOverride) {
				width = computeProp(orientationOverride.width) || width;
				height = computeProp(orientationOverride.height) || height;
				chromeHeight = computeProp(orientationOverride.chrome) || chromeHeight || 0;
			}

			// save information
			this.data = {
				width: (landscape ? width : height) * ppiFactor,
				height: (landscape ? height : width) * ppiFactor,
				scale: scale,
				chromeHeight: chromeHeight * (chromeWasPrescaled ? 1 : ppiFactor)
			};

			viewporter.DEVICE_SUPPORTED = true;

		},

		prepareVisualViewport: function() {

			// in an interval, try scrolling the top shit away until the window height fits with the height I think should be the right height
			var that = this,
				currentHeight = window.innerHeight,
				iterationCount = 0,
				interval = window.setInterval(function() {

					// make the height of the document really large, so we actually have a chance to scroll the url bar away
					if(!viewporter.DEVICE_SUPPORTED) {
						that.maximizeDocumentElement();
					}

					// this tries to scroll away the top chrome
					window.scrollTo(0,1);

					// try to see if the best condition matches, otherwise timeout after 10 iterations (100ms)
					//$('body').append('<p>'+window.innerHeight+', '+that.data.chromeHeight+'</p>');
					if( (viewporter.DEVICE_SUPPORTED && ( Math.abs(window.innerHeight - Math.ceil(that.data.height - that.data.chromeHeight)) < 5 )) || (iterationCount > 10) ) {

						// clear the running checks
						clearInterval(interval);

						// reset the height of the document
						if(!viewporter.DEVICE_SUPPORTED) {
							//that.fixDocumentElement(window.innerHeight);
						}

						// let everyone know we're finally ready
						that.triggerWindowEvent(!that._firstUpdateExecuted ? 'viewportready' : 'viewportchange');
						that._firstUpdateExecuted = true;

					}

					iterationCount++;

				}, 10);

		},

		triggerWindowEvent: function(name) {
			var event = document.createEvent("Event");
			event.initEvent(name, false, false);
			window.dispatchEvent(event);
		},

		getProfile: function() {
			for(var searchTerm in viewporter.profiles) {
				if(new RegExp(searchTerm).test(navigator.userAgent)) {
					return viewporter.profiles[searchTerm];
				}
			}
			return null;
		},

		/*
		 * Meta viewport functionality
		 */

		maximizeDocumentElement: function() {
			document.documentElement.style.minHeight = '5000px';
		},

		fixDocumentElement: function(height) {
			document.documentElement.style.minHeight = ( height || (this.data.height - this.data.chromeHeight) )+'px';
			document.documentElement.style.minWidth = this.data.width+'px';
		},

		findMetaNode: function(name) {
			var meta = document.getElementsByTagName('meta');
			for (var i=0; i < meta.length; i++) {
				if(meta[i].getAttribute('name') == name) {
					return meta[i];
				}
			}
			return null;
		},

		setMetaViewport: function() {

			// create meta viewport tag (or reuse existing one)
			var node = this.findMetaNode('viewport') || document.createElement('meta');
			node.setAttribute('name', 'viewport');
			node.id = 'metaviewport';

			// update it for the first time
			this.updateMetaViewport(node);

			// append it to the page
			document.getElementsByTagName('head')[0].appendChild(node);

		},

		updateMetaViewport: function(node) {

			node = node || document.getElementById('metaviewport');

			var content = viewporter.DEVICE_SUPPORTED ? [
					'width=' + this.data.width,
					'height=' + (this.data.height - this.data.chromeHeight),
					'initial-scale=' + this.data.scale,
					'minimum-scale=' + this.data.scale,
					'maximum-scale=' + this.data.scale
				] : ['width=device-width', 'initial-scale=1', 'minimum-scale=1', 'maximum-scale=1'];

			// if we're on Android, we need to give the viewport a target density
			if(this.IS_ANDROID) {
				content.unshift('target-densityDpi='+(viewporter.DEVICE_DENSITY ? (viewporter.settings.maxDensity || 'device-dpi') : 'device-dpi'));
			}

			// apply viewport data
			viewporter.META_VIEWPORT_CONTENT = content.join(',');
			node.setAttribute('content', viewporter.META_VIEWPORT_CONTENT);

			if(viewporter.DEVICE_SUPPORTED) {
				this.fixDocumentElement();
			}

		}

	};

	// initialize
	new _Viewporter();

})();


// profiles for viewporter
viewporter.profiles = {

	'iPhone|iPod': {
		ppi: function() { return window.devicePixelRatio >= 2 ? 326 : 163; },
		width: function(w,h) { return w * window.devicePixelRatio; },
		height: function(w,h) {  return h * window.devicePixelRatio; },
		chromePrescale: function(w,h,scale) {

			// TODO: include status bar style
			// find out iOS specific stuff (web app)
			//var statusBarStyle = _findMeta('apple-mobile-web-app-status-bar-style');
			//if(statusBarStyle) {
			//	IOS_STATUS_BAR_STYLE = statusBarStyle.getAttribute('content');
			//}

			if(window.devicePixelRatio >= 2) {
				return ((navigator.standalone ? 0 : (viewporter.isLandscape() ? 100 : 124)) * scale) + 2;
			} else {
				return ((navigator.standalone ? 0 : (viewporter.isLandscape() ? 50 : 62)) * scale) + 2;
			}

		}
	},

	'iPad': {
		ppi: 132,
		chrome: function(w,h) {
			// old, deprecated one:
			// return (navigator.standalone ? 0 : 78);
			return (navigator.standalone ? 0 : ( /OS 5_/.test(navigator.userAgent) ? 96 : 78) );
		}
	},

	// on Samsung Galaxy S, S2 and Nexus S we must hard set w, h
	'GT-I9000|GT-I9100|Nexus S': {
		ppi: function() { // I literally have no idea why the actual ppi is so different from the one I need to put in here.
			if(/GT-I9000/.test(navigator.userAgent)) { return 239.3; }
			if(/GT-I9100/.test(navigator.userAgent)) { return 239.3; }
			if(/Nexus S/.test(navigator.userAgent)) { return 239; }
		},
		width: 800,
		height: 480,
		chrome: 38
	},

	// Motorola Xoom fabulously rotates the screen size. Die in hell.
	'MZ601': {
		ppi: 160,
		portrait: {
			width: function(w, h) { return h; },
			height: function(w, h) { return w; }
		},
		chrome: 152,
		inverseLandscape: true
	},

	// Samsung Galaxy Pad inverts and randomizes screen size...wtf!
	'GT-P1000': {
		width: 1024,
		height: 600,
		portrait: {
			chrome: 38
		}
	},

	// HTC Desire & HTC Desire HD
	// this guy doesn't have a chrome height, if you scroll away, the thing is actually full screen..
	'Desire_A8181|DesireHD_A9191': {
		width: 800,
		height: 480
	},

	// Asus eePad Transformer TF101
	// Thanks to @cubiq
	'TF101': {
		ppi: 160,
		portrait: {
			width: function(w, h) { return h; },
			height: function(w, h) { return w; }
		},
		chrome: 103,
		inverseLandscape: true
	},
	
	//. Logicking
	// Acer Iconia Tab A500
	'A500': {
		portrait: {
			width: function(w, h) { return h; },
			height: function(w, h) { return w; }
		},
		inverseLandscape: true
	}

};
// Inheritance pattern
Function.prototype.inheritsFrom = function(parentClassOrObject) {
	if (parentClassOrObject.constructor == Function) {
		// Normal Inheritance
		this.prototype = new parentClassOrObject;
		this.prototype.constructor = this;
		this.parent = parentClassOrObject.prototype;
	} else {
		// Pure Virtual Inheritance
		this.prototype = parentClassOrObject;
		this.prototype.constructor = this;
		this.parent = parentClassOrObject;
	}
	return this;
};

function popElementFromArray(item, items) {
	for ( var i = 0; i < items.length; i++) {
		if (items[i] === item) {
			items.splice(i, 1);
			i--;
			return;
		}
	}
};

function popAllElementsFromArray(items) {
	items.splice(0, items.length);
}

function isInArray(item, items) {
	var count = 0;
	for ( var i = 0; i < items.length; i++) {
		if (items[i] === item) {
			count++;
		}
	}
	return count;
}

function getCursorPositionXY(e) {
	var x;
	var y;
	if (isMobile()) {
		x = e.pageX;
		y = e.pageY;
	} else {
		x = e.clientX; // + document.body.scrollLeft +
		// document.documentElement.scrollLeft;
		y = e.clientY; // + document.body.scrollTop +
		// document.documentElement.scrollTop;
	}

	// x = Math.min(x, grid.canvas.width * grid.itemWidth);
	// y = Math.min(y, grid.canvas.height * grid.itemHeight);

	// alert("Cursor position is "+x+":"+y);

	return {
		x : x,
		y : y
	};
};

// Performs crossbrowser transfrom via JQuery
function cssTransform(obj, matrix, rotate, scaleX, scaleY, translate) {

	var transform = "";

	if (matrix != null) {
		transform += "matrix(" + matrix + ")";
	}

	if (Device.supports3dTransfrom()) {
		if (translate != null) {
			transform += " translate3d(" + translate.x + "px, " + translate.y
					+ "px, 0px)";
		}
		if (rotate != null) {
			transform += " rotate3d(0, 0, 1, " + rotate + "deg)";
		}
		if (scaleX || scaleY) {
			scaleX = scaleX ? scaleX : 1;
			scaleY = scaleY ? scaleY : 1;
			transform += " scale3d(" + scaleX + ", " + scaleY + ", 1)";
		}
	} else {
		if (translate != null) {

			transform += " translateX(" + translate.x + "px)";
			transform += " translateY(" + translate.y + "px)";
		}
		if (rotate != null) {
			transform += " rotate(" + rotate + "deg)";
		}
		if (scaleX != null) {
			transform += " scaleX(" + scaleX + ")";
		}
		if (scaleY != null) {
			transform += " scaleY(" + scaleY + ")";
		}
	}

	obj['css']("-webkit-transform", transform);
	obj['css']("-moz-transform", transform);
	obj['css']("transform", transform);
	obj['css']("-o-transform", transform);
	obj['css']("transform", transform);
	obj['css']("msTransform", transform);
	// Should be fixed in the upcoming JQuery to use instead of 'msTransform'
	// http://bugs.jquery.com/ticket/9572
	// obj['css']("-ms-transform", transform);
}

// Generate unique ID number
var uniqueId = (function() {
	var id = 0; // This is the private persistent value
	// The outer function returns a nested function that has access
	// to the persistent value. It is this nested function we're storing
	// in the variable uniqueID above.
	return function() {
		return id++;
	}; // Return and increment
})(); // Invoke the outer function after defining it.

// Console hack for IE
if(typeof console == "undefined") {
	var console = {log : function()  {}};
}


function eLog(message, tag, level) {
	if (!eLog.displayF)
		return;
	if (level && level > eLog.currentLevel)
		return;
	if (tag)
		eLog.displayF(tag + " :  " + message);
	else
		eLog.displayF(message);
};
eLog.displayF = function(msg) {
	try {
		console.log(msg);
	} catch (e) {
	}
};

eLog.currentLevel = 1;

/*
 * Unselectable items
 */

function preventDefaultEventFunction(event) {
	// console.log("preventDefaultEventFunction");
	event.preventDefault();
	return false;
};

function makeUnselectable(obj) {
	obj.addClass("unselectable");
	obj['bind']("touchstart", function(e) {
		e.preventDefault();
		return false;
	});
	obj['bind']("touchmove", function(e) {
		e.preventDefault();
		return false;
	});
	obj['bind']("touchend", function(e) {
		e.preventDefault();
		return false;
	});
};

// either return val is it's a number or calculates
// percentage of parentVal
calcPercentage = function(val, parentVal) {
	if (typeof (val) == "string" && val.indexOf("%") > -1) {
		val = (parseFloat(val.replace("%", "")) * parentVal / 100.0);
	}
	return val;
};

/*
 * 
 * Make divs transparent to clicks
 * http://stackoverflow.com/questions/3680429/click-through-a-div-to-underlying-elements
 * http://www.searchlawrence.com/click-through-a-div-to-underlying-elements.html
 */

function makeClickTransparent(obj) {
	obj['css']("pointer-events", "none");
	// TODO add IE and Opera support
}

var assets = new Array();

function loadMedia(data, oncomplete, onprogress, onerror) {
	var i = 0, l = data.length, current, obj, total = l, j = 0, ext;
	for (; i < l; ++i) {
		current = data[i];
		ext = current.substr(current.lastIndexOf('.') + 1).toLowerCase();

		if (/* Crafty.support.audio && */(ext === "mp3" || ext === "wav"
				|| ext === "ogg" || ext === "mp4")) {
			obj = new Audio(current);
			// Chrome doesn't trigger onload on audio, see
			// http://code.google.com/p/chromium/issues/detail?id=77794
			if (navigator.userAgent.indexOf('Chrome') != -1)
				j++;
		} else if (ext === "jpg" || ext === "jpeg" || ext === "gif"
				|| ext === "png") {
			obj = new Image();
			obj.src = current;
		} else {
			total--;
			continue; // skip if not applicable
		}

		// add to global asset collection
		assets[current] = obj;

		obj.onload = function() {
			++j;

			// if progress callback, give information of assets loaded,
			// total and percent
			if (onprogress) {
				onprogress.call(this, {
					loaded : j,
					total : total,
					percent : (j / total * 100)
				});
			}
			if (j === total) {
				if (oncomplete)
					oncomplete();
			}
		};

		// if there is an error, pass it in the callback (this will be
		// the object that didn't load)
		obj.onerror = function() {
			if (onerror) {
				onerror.call(this, {
					loaded : j,
					total : total,
					percent : (j / total * 100)
				});
			} else {
				j++;
				if (j === total) {
					if (oncomplete)
						oncomplete();
				}
			}
		};
	}
}

function distance(A, B) {
	return Math.sqrt(Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2));
}

// Selects first not null value through the list of argument
// and the last one as default
function selectValue() {
	var result;
	for ( var i = 0; i < arguments.length - 1; i++) {
		result = arguments[i];
		if (result != null) {
			return result;
		}
	}
	var result = arguments[arguments.length - 1];
	return result;
}/**
 * @constructor
 */
function AssertException(message) {
	this.message = message;
}

AssertException.prototype.toString = function() {
	return 'AssertException: ' + this.message;
};

function assert(exp, message) {
	if (!exp) {
		throw new AssertException(message);
	}
}// There two approaches to audio support:
// 1. Audio sprites for iOS and Android devices
// 2. Audio objects for general browsers

var Sound = (function() {
	var MP3_OFFSET = 0.07;
	var APPLE_OFFSET = -0.2 * 0;
	var PATH_TO_JPLAYER_SWF = "scripts/";

	// private interface

	var useAudioSprite;
	var soundOn;
	var canPlayOgg, canPlayMp3, canPlayMp4;
	var playOffset = 0;

	// array of sounds samples
	var sounds = new Object();
	// array of currently playing sounds
	var channels = new Object();

	var addFunc = function() {
	};
	var playFunc = function() {
	};
	var stopFunc = function() {
	};

	// HTML5 Audio Interface
	// supported audio '.ogg' or '.mp3'
	var audioExtention = null;

	function addAudio(id, filename) {
		var url = filename + audioExtention;
		var audio = new Audio(url);
		audio.preload = "auto";
		audio.load();

		sounds[id] = {
			url : url,
			audio : audio
		};
	}

	function playAudio(id, loop, volume) {
		var snd = sounds[id];
		if (!snd || !snd.audio)
			return null;

		if (volume)
			snd.audio.volume = volume;

		snd.audio.play();
		try {
			// .hack fail on mozilla
			snd.audio.currentTime = 0;
		} catch (e) {
		}

		if (loop) {
			snd.audio.addEventListener('ended', function() {
				try {
					this.currentTime = 0;
				} catch (e) {
				}
				this.play();
			}, false);
		}

		// sound instance
		return id;
	}

	function stopAudio(id, repeat) {
		var snd = sounds[id];
		if (!snd)
			return;
		snd.audio.pause();
	}

	// Audio Sprite Interface
	var audioSpriteTimeoutHandler = null;

	// var jPlayerInstance;
	function initAudioSprite(audioSpriteName) {
		if (Device.isAppleMobile()) {
			playOffset = APPLE_OFFSET;
		}

		// add jPlayer
		jQuery['getScript']
				(
						PATH_TO_JPLAYER_SWF + 'jquery.jplayer.min.js',
						function() {
							$("body")['append']
									("<div id='jPlayerInstanceId' style='width: 0px; height: 0px;'></div>");
							jPlayerInstance = $("#jPlayerInstanceId");
							jPlayerInstance['jPlayer']
									({
										ready : function() {
											$(this)['jPlayer']("setMedia", {
												oga : audioSpriteName + ".ogg",
												m4a : audioSpriteName + ".mp4",
												mp3 : audioSpriteName + ".mp3"
											});
											// alert("READY11");
										},
										supplied : "oga, mp3, m4a",
										//solution : "flash, html",
										 solution : "html, flash",
										swfPath : PATH_TO_JPLAYER_SWF,

										ended : function() { // The
											// $.jPlayer.event.ended
											// event
											// console.log("Jplayer ended");
										},
										playing : function(event) { // The
											// $.jPlayer.event.ended
											// event
											var timeNow = event['jPlayer'].status.currentTime;
											console.log("Jplayer playing "
													+ timeNow);
										},
										timeupdate : function(event) { // The
											// $.jPlayer.event.ended
											// event
											var timeNow = event['jPlayer'].status.currentTime;
											// console.log("Jplayer timeupdate "
											// + timeNow);
										}
									});
						});
	}

	function addAudioSprite(id, filename, timeStart, timeLength) {
		sounds[id] = {
			start : timeStart,
			length : timeLength
		};
	}

	function playAudioSprite(id, repeat, volume) {
		var audioSprite = sounds[id];
		if (!audioSprite)
			return null;

		if (volume)
			jPlayerInstance['jPlayer']("volume", volume);

		jPlayerInstance['jPlayer']("pause", audioSprite.start + playOffset);
		jPlayerInstance['jPlayer']("play", audioSprite.start + playOffset);

		clearTimeout(audioSpriteTimeoutHandler);
		audioSpriteTimeoutHandler = setTimeout(stopAudioSprite,
				audioSprite.length * 1000);

		// sound instance
		return id;
	}

	function stopAudioSprite(dontStopJplayer) {
		clearTimeout(audioSpriteTimeoutHandler);
		audioSpriteTimeoutHandler = null;

		if (dontStopJplayer != true)
			jPlayerInstance['jPlayer']("pause");
	}

	return {
		// public interface

		// init sounds
		init : function(audioSpriteName, forceAudioSprite, pathToScripts) {

			useAudioSprite = forceAudioSprite
					|| (typeof (audioSpriteName) == "string")
					&& Device.isMobile();
			soundOn = Device.getStorageItem("soundOn", "true") == "true";

			if (useAudioSprite) {
				PATH_TO_JPLAYER_SWF = pathToScripts ? pathToScripts
						: PATH_TO_JPLAYER_SWF;
				initAudioSprite(audioSpriteName);
				addFunc = addAudioSprite;
				playFunc = playAudioSprite;
				stopFunc = stopAudioSprite;
			} else {
				var myAudio, audioObjSupport, basicAudioSupport;

				try {
					myAudio = new Audio("");

					audioObjSupport = !!(myAudio.canPlayType);
					basicAudioSupport = !!(!audioObjSupport ? myAudio.play
							: false);
				} catch (e) {
					audioObjSupport = false;
					basicAudioSupport = false;
				}

				if (myAudio && myAudio.canPlayType) {
					// Currently canPlayType(type) returns: "no", "maybe" or
					// "probably"
					canPlayOgg = ("no" != myAudio.canPlayType("audio/ogg"))
							&& ("" != myAudio.canPlayType("audio/ogg"));
					canPlayMp4 = ("no" != myAudio.canPlayType("audio/mp4"))
							&& ("" != myAudio.canPlayType("audio/mp4"));
					canPlayMp3 = ("no" != myAudio.canPlayType("audio/mpeg"))
							&& ("" != myAudio.canPlayType("audio/mpeg"));

					if (canPlayOgg) {
						audioExtention = '.ogg';
						playOffset = 0;
					} else if (canPlayMp4) {
						audioExtention = '.mp4';
						playOffset = 0;
					}else if (canPlayMp3) {
						audioExtention = '.mp3';
						playOffset = MP3_OFFSET;
					}

					if (audioExtention) {
						addFunc = addAudio;
						playFunc = playAudio;
						stopFunc = stopAudio;
					}
				}
			}
		},
		update : function(delta) {
		},

		turnOn : function(isOn) {

			soundOn = isOn;
			Device.setStorageItem("soundOn", soundOn);

			if (useAudioSprite) {
				if (soundOn)
					jPlayerInstance['jPlayer']("unmute");
				else
					jPlayerInstance['jPlayer']("mute");
			} else {
				Sound.stop();
			}
		},
		isOn : function() {
			var on = Device.getStorageItem("soundOn", "true") == "true";
			return on;
		},

		supportedExtention : function() {
			return audioExtention;
		},

		// 
		add : function(id, filename, startTimeInSprite, lengthInSprite,
				ignoreForAudioSprite) {
			if (useAudioSprite && ignoreForAudioSprite)
				return;
			addFunc.call(this, id, filename, startTimeInSprite, lengthInSprite);
		},

		play : function() {
			if (!soundOn)
				return;

			var channel, id, loop, volume;
			// args: soundId or params
			if (arguments.length == 1) {
				if (typeof (arguments[0]) == "object") {
					var params = arguments[0];
					channel = params.channel;
					id = params.id;
					loop = params.loop;
					volume = params.volume;
				} else {
					channel = null;
					id = arguments[0];
					loop = null;
				}
				// args: soundId, loop
			} else if (arguments.length == 2) {
				if (typeof (arguments[1]) == "boolean") {
					channel = null;
					id = arguments[0];
					loop = arguments[1];
				} else {
					channel = arguments[0];
					id = arguments[1];
					loop = null;
				}
				// args: channel, soundId, loop
			} else {
				channel = arguments[0];
				id = arguments[1];
				loop = arguments[2];
			}

			// stop the current sound for the specified channel
			// if channel = null - no channels used
			if (channel != null) {
				var curSnd = channels[channel];
				if (curSnd) {
					stopFunc.call(this, curSnd);
					channels[channel] = null;
				}
			}

			var newSnd = playFunc.call(this, id, loop, volume);
			if (newSnd && channel != null) {
				channels[channel] = newSnd;
			}
			return newSnd;
		},
		stop : function(channel) {

			if (channel != null) {
				var curSnd = channels[channel];
				if (curSnd) {
					stopFunc.call(this, curSnd);
				}
			} else {
				// stop all sounds
				for ( var i in channels) {
					var curSnd = channels[i];
					if (curSnd) {
						stopFunc.call(this, curSnd);
					}
				}
			}
		}
	};
})();var MAX_WIDTH = 1280;
var MAX_HEIGHT = 800;
//
// var MAX_WIDTH = 640;
// var MAX_HEIGHT = 480;

var BASE_WIDTH = 800;
var BASE_HEIGHT = 500;

var ENHANCED_BASE_WIDTH = 1138;
var ENHANCED_BASE_HEIGHT = 640;

var ENHANCED_BASE_MARGIN_WIDTH = 169;
var ENHANCED_BASE_MARGIN_HEIGHT = 70;

var Screen = (function() {
	var screenConsts = {};

	// private interface

	// reference to main application class
	var appInstance = null;

	var fieldWidth = BASE_WIDTH;
	var fieldHeight = BASE_HEIGHT;
	var currentFieldHeight, currentFieldWidth;
	var fullWidth, fullHeight, currentFullWidth, currentFullHeight;

	var rotateMsgHeightWidthRatio;

	var widthRatio = 1;
	var heightRatio = 1;

	var offsetX = 0;
	var offsetY = 0;

	var isLandscapeDefault = true;
	var isLandscapeFlag = true;
	var secondTimeInRowOrientationCall = null;
	var secondTimeInRowOrientationCallAttempt = 0;

	// coordinates of the whole screen relative to the root scene
	// Defining this object only once so we can use it as reference
	var fullRect = {
		left : 0,
		top : 0,
		right : 0,
		bottom : 0
	};

	function windowScrollDown() {
		setTimeout(function() {
			window['scrollTo'](0, 1);
		}, 10);
		// .hack for android devices
		setTimeout(function() {
			window['scrollTo'](0, 1);
		}, 500);
	}

	var resizeTimeoutHandle = null;

	function actualResize(w, h) {
		if (Screen.isCorrectOrientation()) {

			// recalculate all field parameters
			var sizeChanged = resizeField(w, h);
			if (sizeChanged) {
				appInstance.resize();
			}
		}
	}

	function resizeField(w, h) {
		var windowInnerWidth = selectValue(w, window.innerWidth);
		var windowInnerHeight = selectValue(h, window.innerHeight);
		fullWidth = windowInnerWidth;
		fullHeight = windowInnerHeight;

		fieldWidth = Math.min(MAX_WIDTH, windowInnerWidth);
		fieldHeight = Math.min(MAX_HEIGHT, windowInnerHeight);

		// proportionally scale the screen and center it
		var normalK = BASE_WIDTH / BASE_HEIGHT;
		if (fieldWidth / normalK >= fieldHeight) {
			fieldWidth = Math.ceil(fieldHeight * normalK);
		} else {
			fieldHeight = Math.ceil(fieldWidth / normalK);
		}

		// nothing to do if field size didn't change
		if (currentFieldHeight == fieldHeight
				&& currentFieldWidth == fieldWidth
				&& currentFullWidth == fullWidth
				&& currentFullHeight == fullHeight) {
			return false;
		}

		offsetX = Math.round((windowInnerWidth - fieldWidth) / 2);
		offsetY = Math.round((windowInnerHeight - fieldHeight) / 2);

		currentFullWidth = fullWidth;
		currentFullHeight = fullHeight;

		currentFieldHeight = fieldHeight;
		currentFieldWidth = fieldWidth;

		// alert("actualResize " + currentFullWidth + ", " + currentFullHeight);

		widthRatio = fieldWidth / BASE_WIDTH;
		heightRatio = fieldHeight / BASE_HEIGHT;

		var rootDiv = $('#root');
		if (rootDiv.length > 0) {
			rootDiv['css']("left", offsetX);
			rootDiv['css']("top", offsetY);
		}

		// Size for the rect of maximum size with root div
		// of base size in the center
		fullRect.left = -Screen.offsetX();
		fullRect.top = -Screen.offsetY();
		fullRect.right = -Screen.offsetX() + Screen.fullWidth();
		fullRect.bottom = -Screen.offsetY() + Screen.fullHeight();
		fullRect.width = fullRect.right - fullRect.left;
		fullRect.height = fullRect.bottom - fullRect.top;
		fullRect.offsetX = 0;
		fullRect.offsetY = 0;
		return true;
	}
	
	var resizeRotateMsg = function(w, h) {
		var obj = $("#rotateMsg");
		if (typeof rotateMsgHeightWidthRatio != "number") {
			rotateMsgHeightWidthRatio = obj.height() / obj.width();
		}
		
		var windowInnerWidth = selectValue(w, window.innerWidth);
		var rotateMsgW = Math.min(MAX_WIDTH, windowInnerWidth);
		var rotateMsgH = rotateMsgW * rotateMsgHeightWidthRatio;
		obj.width(rotateMsgW);
		obj.height(rotateMsgH);
	};
	
	function windowOnResize(event, w, h) {
		// alert("resize " + Screen.isCorrectOrientation());
		if (!Screen.isCorrectOrientation()) {
			resizeRotateMsg(w, h);
			if (!Loader.loadingMessageShowed()) {
				$("#rotateMsg")['css']("display", "block");
				$("#rotateMsg")['css']("z-index", 99999999);
			}
		} else {

			// absorb nearly simultaneous calls to resize
			clearTimeout(resizeTimeoutHandle);
			resizeTimeoutHandle = setTimeout(function() {actualResize(w, h); }, 100);
			windowScrollDown();

			$("#rotateMsg")['css']("z-index", 0);
			$("#rotateMsg")['css']("display", "none");
		}
		return;
	}

	return { // public interface
		init : function(application, isLandscape, params) {
			appInstance = application;

			params = selectValue(params, {});

			// inverse default values
			if (isLandscape === false) {
				var buffer = BASE_HEIGHT;
				BASE_HEIGHT = BASE_WIDTH;
				BASE_WIDTH = buffer;

				buffer = ENHANCED_BASE_HEIGHT;
				ENHANCED_BASE_HEIGHT = ENHANCED_BASE_WIDTH;
				ENHANCED_BASE_WIDTH = buffer;

				buffer = ENHANCED_BASE_MARGIN_HEIGHT;
				ENHANCED_BASE_MARGIN_HEIGHT = ENHANCED_BASE_MARGIN_WIDTH;
				ENHANCED_BASE_MARGIN_WIDTH = buffer;

				buffer = MAX_WIDTH;
				MAX_HEIGHT = MAX_WIDTH;
				MAX_WIDTH = buffer;
			}
			// read user provided values if any
			BASE_WIDTH = selectValue(params['BASE_WIDTH'], BASE_WIDTH);
			BASE_HEIGHT = selectValue(params['BASE_HEIGHT'], BASE_HEIGHT);
			MAX_WIDTH = selectValue(params['MAX_WIDTH'], MAX_WIDTH);
			MAX_HEIGHT = selectValue(params['MAX_HEIGHT'], MAX_HEIGHT);
			ENHANCED_BASE_WIDTH = selectValue(params['ENHANCED_BASE_WIDTH'],
					ENHANCED_BASE_WIDTH);
			ENHANCED_BASE_HEIGHT = selectValue(params['ENHANCED_BASE_HEIGHT'],
					ENHANCED_BASE_HEIGHT);
			ENHANCED_BASE_MARGIN_WIDTH = selectValue(
					params['ENHANCED_BASE_MARGIN_WIDTH'],
					ENHANCED_BASE_MARGIN_WIDTH);
			ENHANCED_BASE_MARGIN_HEIGHT = selectValue(
					params['ENHANCED_BASE_MARGIN_HEIGHT'],
					ENHANCED_BASE_MARGIN_HEIGHT);

			screenConsts = {
				"BASE_WIDTH" : BASE_WIDTH,
				"BASE_HEIGHT" : BASE_HEIGHT,
				"ENHANCED_BASE_WIDTH" : ENHANCED_BASE_WIDTH,
				"ENHANCED_BASE_HEIGHT" : ENHANCED_BASE_HEIGHT,
				"ENHANCED_BASE_MARGIN_WIDTH" : ENHANCED_BASE_MARGIN_WIDTH,
				"ENHANCED_BASE_MARGIN_HEIGHT" : ENHANCED_BASE_MARGIN_HEIGHT,
				"-ENHANCED_BASE_MARGIN_WIDTH" : -ENHANCED_BASE_MARGIN_WIDTH,
				"-ENHANCED_BASE_MARGIN_HEIGHT" : -ENHANCED_BASE_MARGIN_HEIGHT
			};

			if ("onorientationchange" in window
					&& !params['disableOrientation']) {
				if (isLandscape == false) {
					isLandscapeDefault = false;
					$('head')['append']
							('<link rel="stylesheet" href="css/orientationPortrait.css" type="text/css" />');
				} else {
					isLandscapeDefault = true;
					$('head')['append']
							('<link rel="stylesheet" href="css/orientationLandscape.css" type="text/css" />');
				}
			} else {
				isLandscapeDefault = null;
				$('#rotateMsg').remove();
			}

			disableTouchEvents();

			$(window)['resize'](windowOnResize);

			$(window)['bind']("scrollstart", function(e) {
				windowScrollDown();
			});
			$(window)['bind']("scrollstop", function(e) {
				windowScrollDown();
			});

			$(window)['trigger']("orientationchange");

			// For iPhones we will force hiding address bar
			// cause there's no scroll event executes when user shows bar
			// by pressing on status bar panel
			if (Device.is("iphone") || Device.is("ipod")) {
				setInterval(windowScrollDown, 5000);
			}

			// Zynga's viewport single reference in code
			// orientation locking
			$(window)['bind']('viewportready viewportchange', function() {
				$(window)['trigger']("resize");
				return;
			});

		},

		// some portals (like Spil Games) will require manual resize function
		windowOnResize : function(w, h) {
			windowOnResize(null, w, h);
		},
		
		setLandscapeDefault : function(landscapeDefault) {
			isLandscapeDefault = landscapeDefault;
		},

		isCorrectOrientation : function() {
			var isPortrait = window.innerWidth / window.innerHeight < 1.1;
			// alert("correct orient " + window.innerWidth + ", "
			// + window.innerHeight + ", " + window.orientation);
			return (isLandscapeDefault == null)
					|| (isLandscapeDefault === !isPortrait);
		},
		isLandscape : function() {
			return viewporter.isLandscape();
		},
		widthRatio : function() {
			return widthRatio;
		},
		heightRatio : function() {
			return heightRatio;
		},
		// Size of the working screen field
		fieldWidth : function() {
			return currentFieldWidth;
		},
		fieldHeight : function() {
			return currentFieldHeight;
		},
		// Offset for the 'Root' object
		offsetX : function() {
			return offsetX / widthRatio;
		},
		offsetY : function() {
			return offsetY / heightRatio;
		},
		// Size of the whole window
		fullWidth : function() {
			return currentFullWidth / widthRatio;
		},
		fullHeight : function() {
			return currentFullHeight / heightRatio;
		},
		fullRect : function() {
			return fullRect;
		},
		// Screen size by setup by design
		baseWidth : function() {
			return BASE_WIDTH;
		},
		baseHeight : function() {
			return BASE_HEIGHT;
		},
		// for reading numeric constants from JSON
		macro : function(val) {
			if (typeof val == "string") {
				var preprocessedVal = screenConsts[val];
				return preprocessedVal ? preprocessedVal : val;
			}
			return val;
		},
		// Calculating size real in pixels
		// from logic base pixel size
		calcRealSize : function(width, height) {
			if (typeof (width) == "number") {
				width = Math.round(Screen.widthRatio() * width);
			} else if (width == "FULL_WIDTH") {
				width = currentFullWidth;
			}

			if (typeof (height) == "number") {
				height = Math.round(Screen.heightRatio() * height);
			} else if (height == "FULL_HEIGHT") {
				height = currentFullHeight;
			}

			return {
				x : width,
				y : height
			};
		},
		// Calculating size in logic pixels
		// from real pixel's size
		calcLogicSize : function(width, height) {
			return {
				x : (width / Screen.widthRatio()),
				y : (height / Screen.heightRatio())
			};
		}
	};
})();// Global vars for touch event handling
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
// Last updated September 2011 by Simon Sarris
// www.simonsarris.com
// sarris@acm.org
//
// Free to use and distribute at will
// So long as you are nice to people, etc

// Simple class for keeping track of the current transformation matrix

// For instance:
//    var t = new Transform();
//    t.rotate(5);
//    var m = t.m;
//    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);

// Is equivalent to:
//    ctx.rotate(5);

// But now you can retrieve it :)

// Remember that this does not account for any CSS transforms applied to the canvas

/**
 * @constructor
 */
function Transform() {
  this.m = [1,0,0,1,0,0];
}

Transform.prototype.reset = function() {
  this.m = [1,0,0,1,0,0];
};

Transform.prototype.multiply = function(matrix) {
  var m11 = this.m[0] * matrix.m[0] + this.m[2] * matrix.m[1];
  var m12 = this.m[1] * matrix.m[0] + this.m[3] * matrix.m[1];

  var m21 = this.m[0] * matrix.m[2] + this.m[2] * matrix.m[3];
  var m22 = this.m[1] * matrix.m[2] + this.m[3] * matrix.m[3];

  var dx = this.m[0] * matrix.m[4] + this.m[2] * matrix.m[5] + this.m[4];
  var dy = this.m[1] * matrix.m[4] + this.m[3] * matrix.m[5] + this.m[5];

  this.m[0] = m11;
  this.m[1] = m12;
  this.m[2] = m21;
  this.m[3] = m22;
  this.m[4] = dx;
  this.m[5] = dy;
};

Transform.prototype.invert = function() {
  var d = 1 / (this.m[0] * this.m[3] - this.m[1] * this.m[2]);
  var m0 = this.m[3] * d;
  var m1 = -this.m[1] * d;
  var m2 = -this.m[2] * d;
  var m3 = this.m[0] * d;
  var m4 = d * (this.m[2] * this.m[5] - this.m[3] * this.m[4]);
  var m5 = d * (this.m[1] * this.m[4] - this.m[0] * this.m[5]);
  this.m[0] = m0;
  this.m[1] = m1;
  this.m[2] = m2;
  this.m[3] = m3;
  this.m[4] = m4;
  this.m[5] = m5;
};

Transform.prototype.rotate = function(rad) {
  var c = Math.cos(rad);
  var s = Math.sin(rad);
  var m11 = this.m[0] * c + this.m[2] * s;
  var m12 = this.m[1] * c + this.m[3] * s;
  var m21 = this.m[0] * -s + this.m[2] * c;
  var m22 = this.m[1] * -s + this.m[3] * c;
  this.m[0] = m11;
  this.m[1] = m12;
  this.m[2] = m21;
  this.m[3] = m22;
};

Transform.prototype.rotateDegrees = function(angle) {
  var rad = angle * Math.PI / 180;
  var c = Math.cos(rad);
  var s = Math.sin(rad);
  var m11 = this.m[0] * c + this.m[2] * s;
  var m12 = this.m[1] * c + this.m[3] * s;
  var m21 = this.m[0] * -s + this.m[2] * c;
  var m22 = this.m[1] * -s + this.m[3] * c;
  this.m[0] = m11;
  this.m[1] = m12;
  this.m[2] = m21;
  this.m[3] = m22;
};

Transform.prototype.translate = function(x, y) {
  this.m[4] += this.m[0] * x + this.m[2] * y;
  this.m[5] += this.m[1] * x + this.m[3] * y;
};

Transform.prototype.scale = function(sx, sy) {
  this.m[0] *= sx;
  this.m[1] *= sx;
  this.m[2] *= sy;
  this.m[3] *= sy;
};

Transform.prototype.transformPoint = function(px, py) {
  var x = px;
  var y = py;
  px = x * this.m[0] + y * this.m[2] + this.m[4];
  py = x * this.m[1] + y * this.m[3] + this.m[5];
  return [px, py];
};/**
 * Device Properties
 */
var USE_NATIVE_RENDER = true;
var Device = (function() {
	// private interface

	var storageSupported = null;

	var userAgentParsed = null;
	var androidOsVersion = null;
	var isAppleMobileOs = null;
	var isIeBrowser = null;
	var isWebkitBrowser = null;

	var userAgent = null;

	// result of a benchmark test
	// currently set as percentage of IPhone 4
	var benchmarkTest = 9999;

	var touchStartX, touchStartY, touchEndX, touchEndY;

	var nativeRender = (USE_NATIVE_RENDER && window.NativeRender) ? window.NativeRender
			: null;

	function parseUserAgent() {
		if (userAgentParsed)
			return;
		userAgent = navigator.userAgent.toLowerCase();

		// check apple iOs
		isAppleMobileOs = (/iphone|ipod|ipad/gi).test(navigator.platform);

		isWebkitBrowser = userAgent.indexOf("webkit") > -1;

		// check android version
		var androidStr = "android";
		var idx1 = userAgent.indexOf(androidStr);
		if (idx1 > -1) {
			var idx2 = idx1 + androidStr.length;
			var idx3 = userAgent.indexOf(";", idx2);
			var ver = userAgent.substring(idx2, idx3);
			// TODO make correct version parsing
			androidOsVersion = parseFloat(ver);
		}
		userAgentParsed = true;
	}

	function defaultTouchEvents() {
		if (!Device.isTouch())
			return;

		document.ontouchstart = function(e) {
			e.preventDefault();
			touchStartX = touchEndX = e.touches[0].pageX;
			touchStartY = touchEndY = e.touches[0].pageY;
			return false;
		};

		document.ontouchmove = function(e) {
			e.preventDefault();
			touchEndX = e.touches[0].pageX;
			touchEndY = e.touches[0].pageY;
			return false;
		};

		document.ontouchend = function(e) {
			e.preventDefault();
			if (touchEndX && touchEndY) {
				var e1 = {};
				e1.pageX = touchEndX;
				e1.pageY = touchEndY;
			}
			return false;
		};
	}

	// test to find out relative speed of device
	// and switch graphics resolution accordingly
	function runBenchmark() {
		var IPHONE_4_TIME = 12;
		var time;
		var startTime = new Date(), iterations = 20000;
		while (iterations--) {
			Math.sqrt(iterations * Math.random());
		}
		// adding 1ms to avoid division by zero
		time = (new Date - startTime) + 1;
		benchmarkTest = 100 * IPHONE_4_TIME / time;
		// alert("test " + benchmarkTest + " time " + time);
	}

	function supportsHtml5Storage() {
		if (storageSupported == null) {
			try {
				storageSupported = 'localStorage' in window
						&& window['localStorage'] !== null;
				// making full test, because while in "private" browsing
				// mode on safari setItem is forbidden
				var storage = window['localStorage'];
				storage.setItem("test", "test");
				storage.getItem("test");
			} catch (e) {
				console.error("Local storage not supported!");
				storageSupported = false;
			}
		}
		return storageSupported;
	}

	return { // public interface
		init : function(params) {
			parseUserAgent();

			/*
			 * Add web icons icon114x114.png - with opaque background for iOS
			 * devices icon114x114alpha.png - with alpha background for Androids
			 * 
			 */
			params = selectValue(params, {});
			var icon114x114 = selectValue(params.icon, "images/icon114x114.png");
			var icon114x114alpha = selectValue(params.iconAlpha,
					"images/icon114x114alpha.png");

			$('head')['append']('<link rel="apple-touch-icon"  href="'
					+ icon114x114 + '" />');
			if (Device.isAndroid()) {
				// add web app icon with alpha, otherwise it will
				// overwrite iPad icon
				$('head')['append']
						('<link rel="apple-touch-icon-precomposed" href="'
								+ icon114x114alpha + '" />');
			}

			defaultTouchEvents();
			runBenchmark();
		},
		setStorageItem : function(key, val) {
			if (supportsHtml5Storage()) {
				var storage = window['localStorage'];
				storage.setItem(key, val);
			}
		},
		getStorageItem : function(key, defaultVal) {
			if (supportsHtml5Storage()) {
				var storage = window['localStorage'];
				var val = storage.getItem(key);
				return (val != null) ? val : defaultVal;
			} else {
				return defaultVal;
			}
		},

		removeStorageItem : function(key) {
			if (supportsHtml5Storage()) {
				var storage = window['localStorage'];
				storage.removeItem(key);
			}
		},

		is : function(deviceName) {
			return (userAgent.indexOf(deviceName) > -1);
		},
		isAndroid : function() {
			return androidOsVersion != null;
		},

		androidVersion : function() {
			return androidOsVersion;
		},

		isWebkit : function() {
			return isWebkitBrowser;
		},

		isAppleMobile : function() {
			return isAppleMobileOs;
		},

		isMobile : function() {
			return Device.isTouch();
		},

		supports3dTransfrom : function() {
			return Modernizr.csstransforms3d;
		},
		nativeRender : function() {
			return nativeRender;
		},

		/*
		 * Touch events
		 * 
		 */

		isTouch : function() {
			return 'ontouchstart' in document.documentElement;
		},
		getPositionFromEvent : function(e) {
			if (e['originalEvent'] && e['originalEvent'].touches) {
				// alert(" touch " + e.touches[0].pageX);
				return {
					x : e['originalEvent']['touches'][0].pageX,
					y : e['originalEvent']['touches'][0].pageY
				};
			}
			if (e['touches']) {
				return {
					x : e['touches'][0].pageX,
					y : e['touches'][0].pageY
				};
			}

			return {
				x : e.pageX,
				y : e.pageY
			};
		},
		getLogicPositionFromEvent : function(e) {
			var pos = Device.getPositionFromEvent(e);
			return {
				x : pos.x / Screen.widthRatio() - Screen.offsetX(),
				y : pos.y / Screen.heightRatio() - Screen.offsetY()
			};
		},
		event : function(eventName) {
			var result;
			switch (eventName) {
			case 'click':
				result = Device.isTouch() ? 'touchstart' : 'click';
				break;
			case 'cursorDown':
				result = Device.isTouch() ? 'touchstart' : 'mousedown';
				break;
			case 'cursorUp':
				result = Device.isTouch() ? 'touchend' : 'mouseup';
				break;
			case 'cursorMove':
				result = Device.isTouch() ? 'touchmove' : 'mousemove';
				break;
			case 'cursorOut':
				result = Device.isTouch() ? 'touchstart' : 'mouseout';
				break;
			default:
				assert(false, "Unrecognizible event " + eventName);
				result = eventName;
				break;
			}
			return result;
		},

		touchStartX : function() {
			return touchStartX;
		},
		touchStartY : function() {
			return touchStartY;
		},
		touchEndX : function() {
			return touchEndX;
		},
		touchEndY : function() {
			return touchEndY;
		},

		// becnmark test for slow devices
		isSlow : function() {
			if ((Device.isAndroid() && Device.androidVersion() < 2.3)
					|| benchmarkTest < 80) {
				// alert("Yes, we are slow");
				return true;
			} else {
				return false;
			}
		},

		/*
		 * Miscellaneous functions
		 */

		// shows apple 'Add to home' pop-up
		addToHomeOpenPopup : function() {
			window['addToHomeOpen']();
		}
	};
})();/**
 * Drag'n'Drop utilities
 */

var DragManager = (function() {
	// private interface
	var dragItem = null;

	var dragListeners = new Array();

	function cursorMove(e) {
		// console.log("cursorMove");
		if (dragItem) {
			// console.log("cursorMove dragItem");
			dragItem.dragMove(e);
			// notify listeners
			$['each'](dragListeners, function(id, obj) {
				if (obj.isEventIn(e)) {
					if (!obj.dragItemEntered) {
						// item enters listener zone
						// for the first time
						if (obj.onDragItemEnter) {
							obj.onDragItemEnter(dragItem);
						}
						obj.dragItemEntered = true;
					}
				} else if (obj.dragItemEntered) {
					// item moves out from listener zone
					if (obj.onDragItemOut) {
						obj.onDragItemOut(dragItem);
					}
					obj.dragItemEntered = false;
				}
			});
		}
	}

	function cursorUp() {
		if (dragItem) {

			// notify listeners
			var dragListenerAccepted = null;
			$['each'](dragListeners, function(id, obj) {
				if (obj.dragItemEntered) {
					if (!dragListenerAccepted && obj.onDragItemDrop) {
						if (obj.onDragItemDrop(dragItem)) {
							dragListenerAccepted = obj;
						}
					} else if (obj.onDragItemOut) {
						obj.onDragItemOut(dragItem);
					}
					obj.dragItemEntered = false;
				}
			});
			// console.log("dragCursorUp");
			dragItem.dragEnd(dragListenerAccepted);
			dragItem = null;
		}
	}

	var isInit = false;
	function init() {
		$(document)['bind'](Device.event("cursorUp"), cursorUp);
		$(document)['bind'](Device.event("cursorMove"), cursorMove);
		isInit = true;
	}

	return { // public interface
		//
		addListener : function(listener) {
			assert(listener instanceof GuiDiv,
					"Trying to add illegal drag'n'drop listener. Should be GuiDiv");
			listener.dragItemEntered = false;
			dragListeners.push(listener);
			// sort listeners by priority
			dragListeners.sort(function(l1, l2) {
				var z1 = l1.dragListenerPriority ? l1.dragListenerPriority : 0;
				var z2 = l2.dragListenerPriority ? l2.dragListenerPriority : 0;
				return z2 - z1;
			});
		},
		removeListener : function(listener) {
			popElementFromArray(listener, dragListeners);
		},
		setItem : function(item, e) {
			if (!isInit) {
				init();
			}

			if (dragItem && dragItem.dragEnd) {
				dragItem.dragEnd();
			}
			dragItem = item;

			// immediately update dragListeners
			cursorMove(e);
		},
		getItem : function() {
			return dragItem;
		}
	};
})();
/*
 *  Abstract Factory 
 */
/**
 * @constructor
 */
function AbstractFactory() {
	var objectLibrary = new Object();

	this.addClass = function(clazz, createFunction) {
		var classId;
		if(typeof(clazz) == "function") {
			classId = clazz.prototype.className;
			createFunction = clazz.prototype.createInstance;
		} else {
			classId = clazz;
		}
		
		assert(typeof (classId) == "string", "Invalid classId: " + classId);
		assert(typeof (createFunction) == "function", "Invalid createInstance function for" + " classId " + classId);
		objectLibrary[classId] = createFunction;
	};

	this.createObject = function(classId, args) {
		var createFunc = objectLibrary[classId];
		assert(typeof (createFunc) == "function", "classId: " + classId + " was not properly registered.");
		var obj = null;
		if (typeof (args) == "array") {
			obj = createFunc.apply(null, args);
		} else {
			obj = createFunc.call(null, args);
		}
		return obj;
	};

	this.createObjectsFromJson = function(jsonData, preprocessParamsCallback, onCreateCallback) {
		var objects = new Object();
		var that = this;
		$['each'](jsonData, function(name, value) {
			var params = value["params"];
			assert(params, "Params field not specified in '" + name + "'");
			params['name'] = name;
			if (preprocessParamsCallback) {
				preprocessParamsCallback(name, params);
			}
			obj = that.createObject(value["class"], params);
			objects[name] = obj;
			if (onCreateCallback) {
				onCreateCallback(name, obj, params);
			}
		});

		return objects;
	};
};
//////////////////
/**
 * Resource Manager
 */

var Resources = (function() {
	// private interface
	var assets = new Array();

	var images = new Array();
	var resolutions = new Object();
	
	var currentResolution = null;
	var defaultResolution = null;
	
	var loadImage = function(src, callback) {
		var image = new Image();
		image.src = src;
		image.onload = callback;
		return image;
	};
	
	return { // public interface
		
		init : function() {
		},
		
		setResolution : function(resolutionName) {
			assert(resolutions[resolutionName], "Resolution " + resolutionName + " not exists!");
			currentResolution = resolutionName;
		},
		// if there's no picture in current resolution
		// it will be looking in default
		setDefaultResolution : function(resolutionName) {
			assert(resolutions[resolutionName], "Resolution " + resolutionName + " not exists!");
			defaultResolution = resolutionName;
		},
		
		addResolution : function(resolutionName, imagesFolder, isDefault) {
			assert(!resolutions[resolutionName], "Resolution " + resolutionName + " already exists!");
			resolutions[resolutionName] = {
					folder : imagesFolder,
					images : new Object()
			};
			
			if(isDefault) {
				Resources.setResolution(resolutionName);
				Resources.setDefaultResolution(resolutionName);
			}
		},
		
		addImage : function(name, resolution) {
			var resArray;
			if(typeof(resolution) == "string") {
				resArray = new Array();
				resArray(resolution);
			} else if(typeof(resolution) == "array") {
				resArray = resolution;
			} else {
				// adding on available resolutions
				resArray = new Array();
				for(var i in resolutions) {
					resArray.push(i);
				}
			}
			
			for(var i = 0; i < resArray.length; i++) {
				var resolutionName = resArray[i];
				assert(resolutions[resolutionName], "Resolution " + resolutionName + " not exists!");
				resolutions[resolutionName].images[name] = name;
			}
		},
		
		// returns filename of an image for current resolution 
		getImage : function(name, preload, preloadCallback) {
			var imageFilename = null;
			
			// we are not using resolutions
			if(!currentResolution) {
				if(preload) {
					loadImage(name, preloadCallback);
				}
				return name;
			}
			
			if(resolutions[currentResolution].images[name]) {
				imageFilename = resolutions[currentResolution].folder +
			 	 	resolutions[currentResolution].images[name];
			}
			
			if(!imageFilename && defaultResolution && 
				defaultResolution != currentResolution &&
				resolutions[defaultResolution].images[name]) {
				imageFilename = resolutions[defaultResolution].folder + 
					resolutions[defaultResolution].images[name];
			}
			
			// when we are lazy to add all images by the Resource.addImage function
			// we simply add current resolution folder to the requesting name
			// supposing that we have all images for this resolution available 
			if(!imageFilename) {
				imageFilename = resolutions[currentResolution].folder + name;
			}
			
			if(preload) {
				loadImage(name, preloadCallback);
			}
			
			return imageFilename;
		},

		// return an array of registered images filenames, 
		// used for preloading
		getUsedImages : function() {
			var images = new Array();
			
			// walking through default resolution for all images
			// looking for images in current resolution
			for(var i in resolutions[defaultResolution].images[i]) {
				if(resolutions[currentResolution].images[i]) {
					images.push(Resources.getImage(i))
				}
			}
			return images;
		},
		
		// "preloading" font by creating and destroying item with all fonts classes 
		preloadFonts : function(fontClasses) {
			for (var i = 0; i < fontClasses.length; ++i) {
				$("#root")['append']("<div id='fontsPreload" + i + 
						"' + style='opacity:0.1;font-size:1px'>.</div>");
				var testDiv = $("#fontsPreload" + i);
				testDiv['addClass'](fontClasses[i]);
				setTimeout(function() {testDiv.remove();}, 1000); 
			}
		},
		
		//temporary borrowed from Crafty game engine
		//TODO rewrite
		loadMedia : function(data, oncomplete, onprogress, onerror) {
			var i = 0, l = data.length, current, obj, total = l, j = 0, ext;
			for (; i < l; ++i) {
				current = data[i];
				ext = current.substr(current.lastIndexOf('.') + 1)
						.toLowerCase();

				if ((ext === "mp3" || ext === "wav" || ext === "ogg" || ext === "mp4")) {
					obj = new Audio(current);
					// Chrome doesn't trigger onload on audio, see
					// http://code.google.com/p/chromium/issues/detail?id=77794
					if (navigator.userAgent.indexOf('Chrome') != -1)
						j++;
				} else if (ext === "jpg" || ext === "jpeg" || ext === "gif"
						|| ext === "png") {
					obj = new Image();
					obj.src = Resources.getImage(current);
				} else {
					total--;
					continue; // skip if not applicable
				}

				// add to global asset collection
				assets[current] = obj;

				obj.onload = function() {
					++j;

					// if progress callback, give information of assets loaded,
					// total and percent
					if (onprogress) {
						onprogress.call(this, {
							loaded : j,
							total : total,
							percent : (j / total * 100)
						});
					}
					if (j === total) {
						if (oncomplete)
							oncomplete();
					}
				};

				// if there is an error, pass it in the callback (this will be
				// the object that didn't load)
				obj.onerror = function() {
					if (onerror) {
						onerror.call(this, {
							loaded : j,
							total : total,
							percent : (j / total * 100)
						});
					} else {
						j++;
						if (j === total) {
							if (oncomplete)
								oncomplete();
						}
					}
				};
			}
		}
	};
})();
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
/*
 *  Entity is a main logic item of simulation. 
 *  Entities is a mirroring of server object on client. 
 */

/**
 * @constructor
 */
function Entity() {
};

Entity.prototype.init = function(params) {
	this.params = params;
	this.id = params['id'];

	// Variables values for synchronizing with server
	this.properties = {};

	if (typeof params['parent'] == "string") {
		// find parent among entities in account
		var parent = Account.instance.getEntity(params['parent']);
		this.assert(parent, " No parent found with id='" + params['parent']
				+ "' ");
		parent.addChild(this);

	} else {
		console.log(" No parent provided for entity with id='" + this.id + "'");
	}

	// this.readUpdate(params);
	this.timeouts = null;
	this.intervals = null;
};

Entity.prototype.assert = function(cond, msg) {
	assert(cond, msg + " for entity id='" + this.id + "'");
};

Entity.prototype.log = function(msg) {
	console.log("Entity id='" + this.id + "', " + msg);
};

Entity.prototype.destroy = function() {
	this.clearTimeouts();
	var child;
	if (this.parent) {
		this.parent.removeChild(this);
	}
	if (this.children) {
		for ( var i = 0; i < this.children.length; i++) {
			child = this.children[i];
			// child.destroy();//may be not necessary
			this.removeChild(child);
			Account.instance.removeEntity(child.id);
			i--;
		}
	}
};

Entity.prototype.addChild = function(child) {
	this.children = this.children ? this.children : new Array();
	this.assert(child != this, "Can't be parent for itself");
	this.assert(child.parent == null, "Can't assign as child id='" + child.id
			+ "' since there's parent id='"
			+ (child.parent ? child.parent.id : "") + "' ");
	child.parent = this;
	this.log("Entity.addChild " + child.id);
	this.children.push(child);
};

Entity.prototype.removeChild = function(child) {
	assert(this.children, "no children been assigned");
	popElementFromArray(child, this.children);
};

Entity.prototype.initChildren = function(params) {
	if (params && params['children']) {
		Account.instance.readGlobalUpdate(params['children']);
	}
};

// Synchronization with server

Entity.prototype.setDirty = function() {
	var that = this;
	$['each'](arguments, function(id, val) {
		that.dirtyFlags[val] = true;
	});
};

Entity.prototype.clearDirty = function() {
	var that = this;
	$['each'](arguments, function(id, val) {
		that.dirtyFlags[val] = null;
	});
};

Entity.prototype.isDirty = function(name) {
	return this.dirtyFlags[name] == true;
};

Entity.prototype.clearAllDirty = function() {
	this.dirtyFlags = {};
};

Entity.prototype.readUpdate = function(data) {
	var parentId = this.parent ? this.parent['id'] : null;
	// if (data['parent']) {
	if (data['parent'] != parentId) {
		this.parent.removeChild(this);
		this.parent = null;
		if (data['parent']) {
			Account.instance.getEntity(data['parent']).addChild(this);
		}
	}
	// }
};

Entity.prototype.readUpdateProperty = function(data, name) {
	this.properties[name] = data[name];
	return data[name];
};

Entity.prototype.writeUpdateProperty = function(data, name, value) {
	if (this.properties[name] != value) {
		data[name] = value;
		this.properties[name] = value;
	}
};

Entity.prototype.writeUpdate = function(globalData, entityData) {
	globalData[this.id] = entityData;
	entityData['class'] = this.params['class'];
	entityData['parent'] = this.params['parent'];
	if (this.children) {
		$['each'](this.children, function(idx, entity) {
			entity.writeUpdate(globalData, new Object());
		});
	}
};

// Timing of entity
Entity.prototype.setInterval = function(func, time) {
	var handle = setInterval(func, time);
	this.intervals = this.intervals ? this.intervals : new Array();
	this.intervals.push(handle);
	return handle;
};

Entity.prototype.setTimeout = function(func, time) {
	var handle = setTimeout(func, time);
	this.timeouts = this.timeouts ? this.timeouts : new Array();
	this.timeouts.push(handle);
	return handle;
};

Entity.prototype.clearTimeout = function(handle) {
	clearTimeout(handle);
	// TODO add removing from array
};

Entity.prototype.clearInterval = function(handle) {
	clearInterval(handle);
	// TODO add removing from array
};

Entity.prototype.clearTimeouts = function() {
	// TODO deal with infinite timeout and interval array increasing
	for ( var i in this.intervals) {
		clearInterval(this.intervals[i]);
	}
	this.intervals = new Array();

	for ( var i in this.timeouts) {
		clearTimeout(this.timeouts[i]);
	}
	this.timeouts = new Array();
};
/*
 * BaseState - abstract class - current state of the game.
 * Loads GUI preset and operate with GUI elements.
 * Preloads any required resources
 */

BaseState.prototype = new Entity();
BaseState.prototype.constructor = BaseState;

/**
 * @constructor
 */
function BaseState() {
	BaseState.parent.constructor.call(this);
};

BaseState.inheritsFrom(Entity);

BaseState.prototype.init = function(params) {
	BaseState.parent.init.call(this, params);
	this.guiContainer = new GuiContainer();
	this.guiContainer.init();
	this.guiContainer.resize();
};

BaseState.prototype.destroy = function() {
	BaseState.parent.destroy.call(this);
	this.guiContainer.clear();
};

BaseState.prototype.addGui = function(entity, name) {
	this.guiContainer.addGui(entity, name);
};
BaseState.prototype.removeGui = function(entity) {
	this.guiContainer.removeGui(entity);
};
BaseState.prototype.getGui = function(name) {
	return this.guiContainer.getGui(name);
};

BaseState.prototype.resize = function() {
	this.guiContainer.resize();
};

// Activate will either init object immediately or
// preload required resources and then call init
BaseState.prototype.activate = function(params) {
	this.id = params ? params['id'] : null;
	this.params = params;
	if (this.resources) {
		this.preload();
	} else {
		this.init(this.params);
	}
};

// Preloading of static resources - resources that
// should be upload before the use of the state
BaseState.prototype.preload = function() {
	// Loading JSONs first
	var totalToLoad = 0;
	var that = this;
	if (!this.resources)
		this.preloadComplete();

	
	if (this.resources.json) {
		$['each'](this.resources.json, function(key, val) {
			totalToLoad++;
			$['getJSON'](key, function(data) {
				that.resources.json[key] = data;
			}).error(function() {
				assert(false, "error reading JSON " + key);
			}).complete(function() {
				totalToLoad--;
				if (totalToLoad <= 0)
					that.jsonPreloadComplete();
				
			});
		});
	} else {
		this.jsonPreloadComplete();
	}
};

BaseState.prototype.jsonPreloadComplete = function() {
	console.log("OPPOPOPOPO",this);
	var that = this;
	if (this.resources.media) {
		var startTime = new Date();
		Resources.loadMedia(this.resources.media, function() {
			//console.log("Media loaded for %d ms", (new Date() - startTime));
			that.preloadComplete();
		}, this.preloadingCallback);
	} else {
		this.preloadComplete();
	}
};

BaseState.prototype.preloadComplete = function() {
	// loading complete, make initializing
	this.init(this.params);
};

BaseState.prototype.preloadJson = function(jsonToPreload) {
	if (!this.resources)
		this.resources = new Object();
	if (!this.resources.json)
		this.resources.json = new Object();
	if (typeof jsonToPreload === "string") {
		this.resources.json[jsonToPreload] = null;
	} else if (typeof jsonToPreload === "array") {
		$['each'](this.resources.json, function(key, val) {
			this.resources.json[val] = null;
		});
	} else {
		console.error("Invalid argument for preloadJson: should be array of json urls or single url.");
	}
	//this.jsonPreloadComplete();
};

BaseState.prototype.preloadMedia = function(mediaToPreload, callback) {
	if (!this.resources)
		this.resources = new Object();
	if (!this.resources.media)
		this.resources.media = new Array();
	
	this.preloadingCallback = callback;

	// if (typeof mediaToPreload === "array") {
	if (mediaToPreload instanceof Array) {
		// this.resources.media.concat(mediaToPreload);
		this.resources.media = mediaToPreload;
	} else {
		console.error("Invalid argument for preloadMedia: array of media urls.");
	}
};
/*
 * Account - root entity that is parent to all active entities
 */

Account.prototype = new BaseState();
Account.prototype.constructor = Account;

var UPDATE_TIME = 20;

/**
 * @constructor
 */
function Account(parent) {
	Account.parent.constructor.call(this);
};

Account.inheritsFrom(BaseState);

Account.prototype.init = function(params) {
	params = params ? params : {};
	Account.parent.init.call(this, params);
	// associative array of all active entities
	this.allEntities = new Object();

	// time interval for scheduled synchronization with server
	this.syncWithServerInterval = params['syncWithServerInterval'];
	// adding itself to allEntities for reading updates
	// in automatic mode
	this.id = selectValue(params['id'], "Account01");
	this.addEntity(this);
	// permanent GUI element
	this.backgroundState = new BackgroundState();
	params['backgroundState'] = selectValue(params['backgroundState'], {});
	params['backgroundState']['id'] = selectValue(params['backgroundState']['id'], "backgroundState01");
	this.backgroundState.activate(params['backgroundState']);

	// a singleton object
	assert(Account.instance == null,
			"Only one account object at time are allowed");
	Account.instance = this;

	var that = this;
	// TODO change to scheduled update, when
	// every entity that needs update add itself to update function
	var update = function() {
		// console.log("update");
		$['each'](that.allEntities, function(id, entity) {
			if (entity && entity.update) {
				entity.update(UPDATE_TIME);
			}
		});
		setTimeout(update, UPDATE_TIME);
	};
	update();
};

Account.prototype.addEntity = function(newEntity) {
	assert(typeof (newEntity.id) == "string", "Entity ID must be string");
	assert(this.allEntities[newEntity.id] == null, "Entity with ID '"
			+ newEntity.id + "' already exists");
	this.allEntities[newEntity.id] = newEntity;
};

Account.prototype.getEntity = function(id) {
	return this.allEntities[id];
};

Account.prototype.removeEntity = function(id, dontDestroy) {
	var entity = this.allEntities[id];
	if (entity) {
		if (!dontDestroy) {
			this.removeChild(entity);
			entity.destroy();
		}
		//entity.children = null;
		//delete this.allEntities[id];
		this.allEntities[id] = null;
	}
};

Account.prototype.removeAllEntities = function(id, dontDestroy) {
	$['each'](this.allEntities, function(id, entity) {
		if (entity !== Account.instance) {
			Account.instance.removeEntity(id, false);
		}
	});
};

Account.prototype.readUpdate = function(params) {
	this.money = params['money'];
	this.premiumMoney = params['premiumMoney'];
	this.energy = params['energy'];
	if(this.energy <= 0){
		this.energy = 0;
	}
	this.happyness = params['happyness'];
	this.experience = params['experience'];
};

Account.prototype.writeUpdate = function(globalData, entityData) {
	// entityData['money'] = this.money;
	this.writeUpdateProperty(entityData, "money", this.money);
	// entityData['premiumMoney'] = this.premiumMoney;
	this.writeUpdateProperty(entityData, "premiuMoney", this.premiumMoney);
	// entityData['energy'] = this.energy;
	this.writeUpdateProperty(entityData, "energy", this.energy);
	// entityData['happyness'] = this.happyness;
	this.writeUpdateProperty(entityData, "happyness", this.happyness);
	// entityData['experience'] = this.experience;
	this.writeUpdateProperty(entityData, "experience", this.experience);
	this.serverCommands = null;
	Account.parent.writeUpdate.call(this, globalData, entityData);
};
// called from outside, to notify entities about
// screen resize
Account.prototype.resize = function() {
	if (this.children == null)
		return;
	$['each'](this.children, function(idx, entity) {
		if (entity && entity.resize) {
			entity.resize();
		}
	});
	// console.log(this);
	if (this.backgroundState) {
		this.backgroundState.resize();
	}
};
Account.prototype.getMoney = function() {
	return this.money;
};
Account.prototype.setMoney = function(money) {
	this.money = money;
};
Account.prototype.getPremiumMoney = function() {
	return this.premiumMoney;
};
Account.prototype.setPremiumMoney = function(money) {
	this.premiumMoney = money;
};

Account.prototype.showDialog = function(dialog) {
	var count = 1;
	this.backgroundState.dialogs["buy"].labels[1].change(count);
	var returnValue = null;
	var that = this;
	if (dialog.type == "settings") {
		if (Sound.isOn()) {
			that.backgroundState.dialogs[dialog.type].buttons["unsound"].hide();
			that.backgroundState.dialogs[dialog.type].buttons["sound"].show();
		} else {
			that.backgroundState.dialogs[dialog.type].buttons["sound"].hide();
			that.backgroundState.dialogs[dialog.type].buttons["unsound"].show();
		}
	}
	if (dialog.price) {
		this.backgroundState.dialogs[dialog.type].labels[2].change(""
				+ (dialog.price));
	}
	if (dialog.text) {
		this.backgroundState.dialogs[dialog.type].labels[0].change(dialog.text);
	}
	if (dialog.icons) {
		$['each']
				(
						dialog.icons,
						function(index, value) {
							if ((value.width) && (value.height)) {
								that.backgroundState.dialogs[dialog.type].icons[index]
										.setSize(value['width'],
												value['height']);
								that.backgroundState.dialogs[dialog.type].icons[index]
										.setPosition(that.backgroundState.dialogs[dialog.type].width
												/ 2 - value['width'] / 2);
								that.backgroundState.dialogs[dialog.type].icons[index]
										.resize();
							}
							that.backgroundState.dialogs[dialog.type].icons[index]
									.setBackground(value['background']['image']);
						});
	}
	if (dialog.callbacks) {
		$['each']
				(
						dialog.callbacks,
						function(index, value) {
							if (index == "plus") {
								that.backgroundState.dialogs[dialog.type].buttons[index]
										.bind(function() {
											if (count < dialog.max) {
												count++;
												that.backgroundState.dialogs[dialog.type].labels[1]
														.change("" + (count));
												that.backgroundState.dialogs[dialog.type].labels[2]
														.change(""
																+ (count * dialog.price));
												dialog.result = count;
												value(dialog);
											}
										});
							} else {
								if (index == "unsound") {
									that.backgroundState.dialogs[dialog.type].buttons[index]
											.bind(function() {
												this.hide();
												that.backgroundState.dialogs[dialog.type].buttons["sound"]
														.show();
												value(dialog);
											});
								} else {
									if (index == "sound") {
										that.backgroundState.dialogs[dialog.type].buttons[index]
												.bind(function() {
													this.hide();
													that.backgroundState.dialogs[dialog.type].buttons["unsound"]
															.show();
													value(dialog);
												});
									} else {
										if (index == "minus") {
											that.backgroundState.dialogs[dialog.type].buttons[index]
													.bind(function() {
														count--;
														if (count <= 1) {
															count = 1;
														}
														that.backgroundState.dialogs[dialog.type].labels[1]
																.change(""
																		+ (count));
														that.backgroundState.dialogs[dialog.type].labels[2]
																.change(""
																		+ (count * dialog.price));
														dialog.result = count;
														value(dialog);
													});
										} else {
											that.backgroundState.dialogs[dialog.type].buttons[index]
													.bind(function() {
														dialog.result = count;
														value(dialog);
														that.backgroundState.dialogs[dialog.type]
																.hide();
													});
										}
									}
								}
							}
						});
	}
	this.backgroundState.dialogs[dialog.type].show();
	dialog.result = returnValue;
};

// NETWORKING FUNCTIONS
// Creates/Updates/Destroy all active entities
Account.prototype.readGlobalUpdate = function(data) {
	var that = this;
	$['each'](data, function(id, element) {
//		console.log("readGlobalUpdate key is ", id);
		var entity = Account.instance.getEntity(id);
		// entity already exists
		if (entity) {
			// entity should be destroyed with all of its children
			if (element["destroy"]) {
//				console.log("!!!!!Destroy entity '" + entity.id + "'");
				that.removeEntity(id);
				// remove entity from data
				delete data[id];
			} else {
				// updating the entity
				entity.readUpdate(element);
			}
			return;
		} else {
			var parentEntity = Account.instance.getEntity(element['parent']);
			if(parentEntity){
			// create new entity
			element["id"] = id;
			entity = entityFactory.createObject(element["class"], element);
			// viking test
			// entity.parent = element.parent;
			that.addEntity(entity);
//			console.log("New entity '" + entity.id + "' of class "
//					+ element["class"] + " with parent '"
//					+ (entity.parent ? entity.parent.id : "no parent") + "'");
			}
		}
	});
};

// Serialize all entities to JSON
Account.prototype.writeGlobalUpdate = function() {
	var that = this;
	var data = {};
	this.writeUpdate(data, new Object());
	return data;
};

// read update data from server
Account.prototype.getUpdateFromServer = function(callback) {
	this.server.receiveData(callback);
};

// send data to server
Account.prototype.saveUpdateToServer = function(data, callback) {
	this.server.sendData(data, callback);
};

// perform specific command on server
Account.prototype.commandToServer = function(name, args, callback) {
	var that = this;
	this.server.command(name, args, function(result, data) {
		that.readGlobalUpdate(data);
		callback(result);
	});
};

// make sure client and server are synchronized at the moment
Account.prototype.syncWithServer = function(callback, data, syncInterval) {
	var writeData = this.writeGlobalUpdate();
	if (data) {
		$['extend'](true, writeData, data);
	}
	var that = this;
	this.server.sendData(writeData, function(data) {
		that.readGlobalUpdate(data);
		if (callback) {
			callback();
		}
	});
	syncInterval = selectValue(syncInterval, this.syncWithServerInterval);
	if (syncInterval != null) {
		this.clearTimeout(this.syncWithServerTimeoutId);
		var that = this;
		console.log("SHEDULE");
		this.syncWithServerTimeoutId = this.setTimeout(function() {
			that.syncWithServer();
		}, 5000);
	}
};
/*
 *  Pseudo server API to emulate connection with Server on local storage.
 *  Can also be useful for saving app state in localStorage. 
 */

/**
 * @constructor
 */
function LocalStorageServer() {
};

LocalStorageServer.prototype.init = function(params) {

	this.params = params;
	this.food = 10;
	//this.purity = 10;
	this.attention = 10;
	if (params['newAccount']) {
		Device.removeStorageItem("entities");
	}
	this.userAccount = params['account'];
	assert(this.userAccount,
			" User account must be specified to work with server");
	this.pseudoPing = selectValue(params['ping'], 0);

	if (Device.getStorageItem('entities')) {
		this.entities = JSON.parse(Device.getStorageItem('entities'));
	}

	if (!this.entities) {
		var json_file = params['data'];

		var that = this;

		// getting item descriptions
		$['getJSON']("resources/descriptions.json", function(data) {
			that.descriptions = data;
		}).error(function() {
			assert(false, "error reading JSON " + json_file);
		});

		$['getJSON'](json_file, function(data) {
			$['each'](data, function(index, value) {
				if (value['children']) {
					$['each'](value['children'], function(idx, val) {
						data[idx] = val;
					});
					value['children'] = null;
				}
				// $['extend'](true, data, value);
			});
			that.entities = data;
			Device.setStorageItem("entities", JSON.stringify(data));
			that.ready();
		}).error(function() {
			assert(false, "error reading JSON " + json_file);
		});

	} else {
		this.ready();
	}

	this.commands = {};
	var that = this;
	this.addCommand("petCat", function() {
		entities = that.entities;
		entities['Account01']['energy'] -= 3;
		that.attention += 3;
		return true;
	});
	this.addCommand("feedCat", function(args) {
		var entities = that.entities;
		var id = args[0];
		entities['Account01']['energy'] -= 3;
		that.food += args[1];
		entities[id]['id'] = id;
		entities[id]['class'] = "Item";
		entities[id].parent = null;
		return true;
	});
	this.addCommand("changeParent", function(args) {
		var entities = that.entities;
		var id = args[0];
		var newParent = args[1];
		entities[id]['id'] = id;
		entities[id]['class'] = "Item";
		entities[id].parent = newParent;
		return true;
	});

	this
			.addCommand(
					"buyItem",
					function(args) {
						var entities = that.entities;
						var id = args[0] + uniqueId();
						if (that.descriptions[args[0]]['money'] == "game") {
							if (entities['Account01']['money'] >= that.descriptions[args[0]]['price']) {
								entities['Account01']['money'] -= that.descriptions[args[0]]['price'];
							}
						} else {
							if (entities['Account01']['premiumMoney'] >= that.descriptions[args[0]]['price']) {
								entities['Account01']['premiumMoney'] -= that.descriptions[args[0]]['price'];
							}
						}
						entities[id] = {};
						entities[id]['id'] = id;
						entities[id].newEntity = true;
						entities[id]['class'] = "Item";
						entities[id].parent = "Inventory01";
						entities[id].description = args[0];
						return true;
					});

	this
			.addCommand(
					"sellItem",
					function(args) {
						var entities = that.entities;
						// entities[args[0]]['newEntity'] = false;
						if (that.descriptions[entities[args[0]]['description']]['money'] == "game") {
							entities['Account01']['money'] += that.descriptions[entities[args[0]]['description']]['price'];
						} else {
							entities['Account01']['premiumMoney'] += that.descriptions[entities[args[0]]['description']]['price'];
						}
						entities[args[0]]['parent'] = null;
						return true;
					});
	var that = this;
	this.statsRefill = setInterval(
			function() {
				if (that.entities['Account01']['energy'] >= 100) {
					that.entities['Account01']['energy'] = 100;
				} else {
					if(that.entities['Account01']['energy'] <= 0){
							that.entities['Account01']['energy'] = 0;
						}
					that.entities['Account01']['energy'] += 1;
				}
				if (that.entities['Account01']['happyness'] > 100) {
					that.entities['Account01']['happyness'] = 100;
				} else {
					that.entities['Account01']['happyness'] = (selectValue(
							that.food, that.purity, that.attention, 0)
							+ selectValue(that.purity, that.food,
									that.attention, 0) + selectValue(
							that.attention, that.purity, that.food, 0)) / 3;
					if (that.food) {
						that.food -= 1;
						if (that.food <= 0) {
							that.food = 0;
						}
						//that.food = Math.floor(that.food);
					}
					if (that.purity) {
						that.purity -= 0.5;
						if (that.purity <= 0) {
							that.purity = 0;
						}
						//that.purity = Math.floor(that.purity)
					}
					if (that.attention) {
						that.attention -= 0.7;
						if (that.attention <= 0) {
							that.attention = 0;
						}
						that.attention = Math.floor(that.attention);
					}
				}
			}, 2000);
};

LocalStorageServer.prototype.ready = function() {
	this.entities = JSON.parse(Device.getStorageItem('entities'));
	if (this.params['ready']) {
		this.sendData(this.entities, this.params['ready']);
	}
};

LocalStorageServer.prototype.selectSubject = function() {
	var curriculum = [ "Biology", "Art" ];
	var subject = curriculum[Math.floor(Math.random() * curriculum.length)];
	this.entities["cardPool"]["itemDescription"] = "cardItem" + subject;
	this.entities["MemoryGameWellDoneState01"]["subject"] = subject;
}

LocalStorageServer.prototype.addCommand = function(name, func) {
	this.commands[name] = func;
};

LocalStorageServer.prototype.sendData = function(data, callback) {
	var entities = this.entities;
	$['each'](data, function(index, value) {
		if (index) {
			assert((entities[index] || value.newEntity),
					"Server has no entity with id=" + index);
			delete value.newEntity;
			if (value['parent'] != entities[index]['parent']) {
				if (value['parent'] == null) {
					entities[index].destroy = true;
				}
			}
		}
	});
	$['extend'](true, entities, data);

	Device.setStorageItem("entities", JSON.stringify(entities));

	this.selectSubject();
	if (this.entities['Account01']['experience'] >= 5000) {
		entities[id] = {};
		entities[id]['id'] = id;
		entities[id].newEntity = true;
		entities[id]['class'] = "Item";
		entities[id].parent = "Inventory01";
		entities[id].description = args[0];
	}
	// return updated data back to client
	this.receiveData(callback);
};

LocalStorageServer.prototype.receiveData = function(callback) {
	var entities = this.entities;
	var data = {};
	var addByParent = function(parentId) {
		$['each'](entities, function(id, entity) {
			if (entity.parent == parentId) {
				data[id] = entity;
				addByParent(id);
			}
		});
	};
	data[this.userAccount] = entities[this.userAccount];
	addByParent(this.userAccount);
	$['each'](entities, function(id, entity) {
		if ((entity['parent'] === null) && (entity['destroy'])) {
			data[id] = entity;
		}
	});

	var sendToClient = function() {
		if (callback) {
			callback(data);
		}
		// after 'destroy' flag was sent to client don't need it anymore
		$['each'](entities, function(id, entity) {
			if ((entity['parent'] === null) && (entity['destroy'])) {
				delete entity['destroy'];
			}
		});
		Device.setStorageItem("entities", JSON.stringify(entities));
	};

	if (this.pseudoPing) {
		setTimeout(function() {
			sendToClient();
		}, this.pseudoPing);
	} else {
		sendToClient();
	}
};

LocalStorageServer.prototype.command = function(name, args, callback) {
	var command = this.commands[name];
	if (command) {
		var result = command(args);
		this.sendData(this.entities, function(data) {
			if (callback) {
				callback(result, data);
			}
		});
	} else {
		console.log("Unknow command: " + command);
	}
};
/**
 * VisualEntity - Entity with visual representation
 */

VisualEntity.prototype = new Entity();
VisualEntity.prototype.constructor = VisualEntity;

/**
 * @constructor
 */
function VisualEntity() {
	VisualEntity.parent.constructor.call(this);
};

VisualEntity.inheritsFrom(Entity);

VisualEntity.prototype.init = function(params) {
	VisualEntity.parent.init.call(this, params);
	this.x = params['x'];
	this.y = params['y'];
	this.z = params['z'];
	this.width = params['width'];
	this.height = params['height'];
	this.visible = params['visible'];
	this.visuals = {}; // associative array of all attached visuals
};

VisualEntity.prototype.createVisual = function() {
	this.description = Account.instance.descriptionsData[this.params['description']];
	this.assert(this.description, "There is no correct description");
};

VisualEntity.prototype.addVisual = function(visualId, visualInfo) {
	var id = (visualId == null) ? 0 : visualId;
	this.assert(this.visuals[id] == null, "Visual id = '" + id
			+ "' is already created.");
	this.visuals[id] = visualInfo;

};

VisualEntity.prototype.getVisual = function(visualId) {
	var id = (visualId == null) ? 0 : visualId;
	return this.visuals[id] ? this.visuals[id].visual : null;
};

VisualEntity.prototype.getVisualInfo = function(visualId) {
	var id = (visualId == null) ? 0 : visualId;
	return this.visuals[id];
};

VisualEntity.prototype.attachToGui = function(guiParent, clampByParentViewport) {
	if (!this.visual) {
		this.guiParent = guiParent ? guiParent : this.params['guiParent'];
		this.assert(this.guiParent, "No guiParent provided");
		this.createVisual();

		var that = this;
		$['each'](that.visuals, function(id, visualInfo) {
			visualInfo.visual.visualEntity = that;
			that.guiParent.addGui(visualInfo.visual);
			if (visualInfo.visual.clampByParentViewport)
				visualInfo.visual.clampByParentViewport(clampByParentViewport);
		});
	}
	
};

VisualEntity.prototype.destroy = function() {
	VisualEntity.parent.destroy.call(this);
	if (this.guiParent) {
		var that = this;
		$['each'](this.visuals, function(id, visualInfo) {
			that.guiParent.removeGui(visualInfo.visual);
		});
	}
};

VisualEntity.prototype.setZ = function(z) {
	if (typeof z == "number") {
		this.z = z;
	}
	var that = this;
	$['each'](that.visuals, function(id, visualInfo) {
		if (typeof that.z == "number") {
			visualInfo.visual.setZ(that.z + visualInfo.z);
		}
	});
};

VisualEntity.prototype.setPosition = function(x, y) {

	this.x = x;
	this.y = y;
	
	var that = this;
	$['each'](that.visuals, function(id, visualInfo) {
		var x = that.x, y = that.y;
		if (typeof visualInfo.offsetX == "number") {
			x -= visualInfo.offsetX;
		}
		if (typeof visualInfo.offsetY == "number") {
			y -= visualInfo.offsetY;
		}
		
		visualInfo.visual.setPosition(x, y);
	});
};

VisualEntity.prototype.move = function(dx, dy) {
	this.setPosition(this.x + dx, this.y + dy);
	
};

// Aligns logic position of visualEntity to the one
// of actual visual
VisualEntity.prototype.setPositionToVisual = function(visualId) {
	var visualInfo = this.getVisualInfo(visualId);
	this.x = visualInfo.visual.x + visualInfo.offsetX;
	this.y = visualInfo.visual.y + visualInfo.offsetY;
	this.setPosition(this.x, this.y);
};

VisualEntity.prototype.show = function() {
	this.visible = true;
	$['each'](this.visuals, function(id, visualInfo) {
		visualInfo.visual.show();
	});
};

VisualEntity.prototype.hide = function() {
	this.visible = false;
	$['each'](this.visuals, function(id, visualInfo) {
		visualInfo.visual.hide();
	});
};

VisualEntity.prototype.resize = function() {
	var that = this;
	$['each'](this.visuals, function(id, visualInfo) {
		visualInfo.visual.resize();
	});
};

VisualEntity.prototype.writeUpdate = function(globalData, entityData) {
	// if(this.id == "Door01"){
	// console.log("FALSE",this.x,this.y);
	// }
	this.writeUpdateProperty(entityData, 'x', this.x);
	this.writeUpdateProperty(entityData, 'y', this.y);
	VisualEntity.parent.writeUpdate.call(this, globalData, entityData);
};

VisualEntity.prototype.readUpdate = function(data) {
	//this.x = this.readUpdateProperty(data, 'x');
	//this.y = this.readUpdateProperty(data, 'y');
	VisualEntity.parent.readUpdate.call(this, data);

};
/**
 * Scene - Container for VisualEntities
 */

Scene.prototype = new VisualEntity();
Scene.prototype.constructor = Scene;

function Scene() {
	Scene.parent.constructor.call(this);
};

Scene.inheritsFrom(VisualEntity);
Scene.prototype.className = "Scene";

Scene.prototype.createInstance = function(params) {
	var entity = new Scene();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Scene);

Scene.prototype.init = function(params) {
	Scene.parent.init.call(this, params);
};

Scene.prototype.createVisual = function() {
	var params = this.params;
	var visual = guiFactory.createObject("GuiScene", {
		parent : this.guiParent,
		style : "scene",
		x : params['x'],
		y : params['y'],
		width : params['width'],
		height : params['height'],
		background : params['background']
	});

	var visualInfo = {};
	visualInfo.visual = visual;
	this.addVisual(null, visualInfo);

	var that = this;
	this.children = this.children ? this.children : new Array();
	$['each'](this.children, function(id, val) {
		that.attachChildVisual(val);
	});
};

Scene.prototype.attachChildVisual = function(child) {
	if (child.attachToGui) {
		child.attachToGui(this.getVisual(), true);
	}
};

Scene.prototype.move = function(dx, dy, parallaxDepth) {
	var visual = this.getVisual();
	if (parallaxDepth) {
		$['each'](visual.backgrounds, function(i, back) {
			if (!back)
				return;
			if (i != visual.backgrounds.length - 1) {
				visual.setBackgroundPosition(visual.backgrounds[i].left
						- (dx * (i / parallaxDepth)), visual.backgrounds[i].top
						- (dy * (i / parallaxDepth)), i);
			}
		});
	}

	visual.move(dx, dy);
	visual.resize();
};
/**
 * Item - VisualEntity that can be stored in inventory or placed inside scene.
 */
var ITEM_NAME = "Item";

Item.prototype = new VisualEntity();
Item.prototype.constructor = Item;

/**
 * @constructor
 */
function Item() {
	Item.parent.constructor.call(this);
};

Item.inheritsFrom(VisualEntity);
Item.prototype.className = ITEM_NAME;

Item.prototype.createInstance = function(params) {
	var entity = new Item();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Item);

Item.prototype.init = function(params) {
	Item.parent.init.call(this, params);
	this.stashed = params['stashed'];
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

Item.prototype.getIcon = function() {
	return this.description['totalImage'];
};

Item.prototype.createVisual = function() {
	this.assert(this.guiParent, "No gui parent provided for creating visuals");
	this.description = Account.instance.descriptionsData[this.params['description']];
	this.assert(this.description, "There is no correct description");

	var totalImage = Resources.getImage(this.description['totalImage']);

	visual = guiFactory.createObject("GuiSprite", {
		parent : this.guiParent,
		style : "sprite",
		x : this.params['x'],
		y : this.params['y'],
		width : this.description['totalImageWidth'],
		height : this.description['totalImageHeight'],
		totalImage : totalImage,
		totalImageWidth : this.description['totalImageWidth'],
		totalImageHeight : this.description['totalImageHeight'],
		totalTile : this.description['totalTile']
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
	this.setZ(null);
};

Item.prototype.writeUpdate = function(globalData, entityData) {
	Item.parent.writeUpdate.call(this, globalData, entityData);
};
Item.prototype.readUpdate = function(data) {
	// this.params['count'] = data['count'];
	Item.parent.readUpdate.call(this, data);
};
/**
 * RoomItem - VisualEntity that can be stored in inventory or placed inside
 * scene.
 */

RoomItem.prototype = new Item();
RoomItem.prototype.constructor = RoomItem;

/**
 * @constructor
 */
function RoomItem() {
	RoomItem.parent.constructor.call(this);
};

RoomItem.inheritsFrom(Item);
RoomItem.prototype.className = "RoomItem";

RoomItem.prototype.createInstance = function(params) {
	var entity = new RoomItem();
	entity.init(params);
	return entity;
};

entityFactory.addClass(RoomItem);

RoomItem.prototype.init = function(params) {
	RoomItem.parent.init.call(this, params);
	this.params = params;
	this.description = Account.instance.descriptionsData[this.params['description']];
	this.forSale = selectValue(params['forSale'], false);
	this.price = selectValue(params['price'], this.description['price'], 1);
};

RoomItem.prototype.createVisual = function() {
	RoomItem.parent.createVisual.call(this);
	var that = this;
	var moneySmallImage;
	this.moneyBigImage;
	if (this.description['money'] == "premium") {
		moneySmallImage = "shop/PremiumMoneyDiamond.png";
		this.moneyBigImage = "images/IconPremiumMoney.png";
	} else {
		moneySmallImage = "shop/GameMoneyCoin.png";
		this.moneyBigImage = "images/IconGameMoney.png";
	}

	if (this.forSale == true) {
		visual = guiFactory.createObject("GuiButton", {
			parent : that.guiParent,
			style : "sprite",
			width : 79,
			height : 24,
			normal : {
				background : [ {
					"image" : "shop/MarketFieldPrice.png",
					"width" : 79,
					"height" : 24
				}, {
					"image" : moneySmallImage,
					"width" : 15,
					"height" : 16,
					"x" : 5,
					"y" : 5
				} ]

//				"label" : {
//					"style" : "gameButton pusab-blue",
//					"text" : that.description['price'],
//					"fontSize" : 15,
//					"scale" : 100,
//					"color" : "#01B5FF",
//					"x" : 28,
//					"y" : 12
//				}
			},
			x : that.params['x']  - 39,
			y : that.params['y'] + that.description['height']
		});
		visualInfo = {};
		visual.clampByParentViewport();
		visualInfo.visual = visual;
		visualInfo.z = this.description['z-index'];
		this.addVisual(1, visualInfo);
	}
};

RoomItem.prototype.addSaleCallback = function() {
	var that = this;
	this
			.getVisual()
			.bind(
					function() {
						var subMoney = (that.description['money'] == "game") ? "money"
								: "premiumMoney";
						var dialog = {
							type : "buy",
							text : "Would you like to buy this?",
							price : that.price,
							max : Math.floor(Account.instance[subMoney]
									/ that.price),
							icons : {
								"iconFront" : {
									"background" : {
										"image" : "images/"
												+ that.description['totalImage'],
									},
									"width" : that.description['totalImageWidth']
											* (100 / that.description['totalImageHeight']),
									"height" : 100
								},
								"iconMoney" : {
									"background" : {
										"image" : that.moneyBigImage
									}
								}
							},
							callbacks : {
								v : function(dialog1) {
									// TODO: add item to inventory and subtract

									/*
									 * for ( var i = 1; i <= dialog1.result;
									 * i++) { Account.instance.inventory
									 * .addItem(that); }
									 */
									Account.instance[subMoney] -= dialog1.price
											* dialog1.result;
									Account.instance.children[Account.instance.children.length - 1]
											.getGui(
													that.description['money']
															+ "MoneySign")
											.change(Account.instance[subMoney]);

									// var item =
									// entityFactory.createObject("Item",
									// that.params);
									Account.instance.commandToServer("buyItem",
											[ that.params['description'],
													dialog1.result ], function(
													success) {
												if (success) {
													console.log("SUCCESS");
												} else {
													console.log("FAIL");
												}
											});
									// money
								},
								x : function(dialog1) {
									console.log("callback added and executed");
									// TODO: just close buyDialog
								},
								plus : function(dialog1) {
									console.log("plused");
									// TODO: check max count of items could be
									// bought
								},
								minus : function(dialog1) {
									console.log("minused");
								}
							}
						};
						Account.instance.showDialog(dialog);
					});
};
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
/**
 * Countdown - VisualEntity with countdown label inside it.
 */
Countdown.prototype = new VisualEntity();
Countdown.prototype.constructor = Countdown;

/**
 * @constructor
 */
function Countdown() {
	Countdown.parent.constructor.call(this);
};

Countdown.inheritsFrom(VisualEntity);
Countdown.prototype.className = "Countdown";

Countdown.prototype.createInstance = function(params) {
	var entity = new Countdown();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Countdown);

Countdown.prototype.init = function(params) {
	Countdown.parent.init.call(this, params);
};

/**
 * Will be called after a cycle of animation finished
 * 
 * @param animationCycleEndCallback
 */
Countdown.prototype.setCycleEndCallback = function(cycleEndCallback) {
	this.cycleEndCallback = cycleEndCallback;
};

/**
 * Will be called after the countdown completely finished
 * 
 * @param animationEndCallback
 */
Countdown.prototype.setEndCallback = function(EndCallback) {
	this.EndCallback = EndCallback;
};

Countdown.prototype.createVisual = function() {
	Countdown.parent.createVisual.call(this);
	if (this.description['sprite']) {
		this.sprite = guiFactory
				.createObject(
						"GuiSprite",
						{
							'parent' : this.guiParent,
							'style' : "dialogButton",
							'x' : this.params['x'],
							'y' : this.params['y'],
							'width' : this.description['sprite']['width'],
							'height' : this.description['sprite']['height'],
							'totalImage' : Resources
									.getImage(this.description['sprite']['totalImage']),
							'totalImageWidth' : this.description['sprite']['totalImageWidth'],
							'totalImageHeight' : this.description['sprite']['totalImageHeight'],
							'totalTile' : this.description['sprite']['totalTile'],
							'spriteAnimations' : this.description['sprite']['spriteAnimations']

						});
		var visualInfo = {};
		visualInfo.visual = this.sprite;
		this.addVisual("sprite", visualInfo);
	}
	this.tickSound = this.description['tickSound'] ? this.description['tickSound']
			: "beepShort";
	this.lastSound = this.description['lastSound'] ? this.description['lastSound']
			: "beepShort";
	this.tickDuration = this.description['tickDuration'] ? this.description['tickDuration']
			: 1000;
	this.count = this.params['count'];
	this.duration = this.count * this.tickDuration;
	this.alarmColor = this.description['alarmColor'];
	this.alarmCount = this.params['alarmCount'];
	this.paused = this.description['paused'] ? this.description['paused']
			: false;
	// this.go = this.description['go'];
	if (this.description['label']) {
		this.label = guiFactory
				.createObject(
						"GuiLabel",
						{
							"parent" : this.guiParent,
							"style" : this.description['label']['params']['style'] ? this.description['label']['params']['style']
									: "dialogButtonLabel lcdmono-ultra",
							"width" : this.description['label']['params']['width'],
							"height" : this.description['label']['params']['height'],
							"x" : this.description['label']['params']['x'] ? this.description['label']['params']['x']
									: this.params['x'],
							"y" : this.description['label']['params']['y'] ? this.description['label']['params']['y']
									: this.params['y'],
							"align" : "center",
							"verticalAlign" : "middle",
							"text" : this.count,
							"fontSize" : this.description['label']['params']['fontSize'],
							"color" : this.description['label']['params']['color']
						});
		var labelVisualInfo = {};
		labelVisualInfo.visual = this.label;
		this.addVisual("label", labelVisualInfo);
	}

	var that = this;
	var animationEnd = function() {
		if (!that.paused) {
			if (that.count > 1) {
				that.count--;
//				if (that.cycleEndCallback) {
//					that.cycleEndCallback();
//				}
				if (that.label)
					that.label.change(that.count);
				if (that.sprite)
					that.sprite.playAnimation("countdown", that.tickDuration,
							false);
				that.sprite.setAnimationEndCallback(animationEnd);
			} else {
				if (that.sprite)
					that.sprite.playAnimation("empty", that.tickDuration, true);
				if (that.label)
					that.label.change(that.description["go"]);
				if (that.EndCallback) {
					that.EndCallback();
				}
				return;
			}
		}
	};
	// Sound.play("beepShort");
	if (this.sprite) {
		this.sprite.playAnimation("countdown", 1000, false);
		this.sprite.setAnimationEndCallback(animationEnd);
	}
};

Countdown.prototype.update = function(updateTime) {
	var text = Math.floor(this.duration / 1000) + 1;
	if (!this.paused) {
		if (this.sprite) {
			this.sprite.update(updateTime);
		}
		if (this.label) {
			this.duration -= updateTime;
			if (this.duration > 0) {
				if (this.cycleEndCallback
						&& (text != Math.floor(this.duration / 1000) + 1)) {
					this.cycleEndCallback();
					text = this.label.text;
				}
				if (this.alarmCount
						&& ((this.duration / 1000) < this.alarmCount)) {
					this.label.setColor(this.description['alarmColor']);
					this.alarmCount = null;
				} else {
					if (!this.sprite) {
						this.label.change(Math.floor(this.duration / 1000) + 1);
					}
				}
			} else {
				if (!this.sprite) {
					this.label.change(this.description['go']);
					if (this.EndCallback) {
						this.EndCallback();
						this.update = null;
					}
				}
			}
		}
		if (!this.label && !this.sprite) {
			if (this.duration > 0) {
				this.duration -= updateTime;
				if (this.cycleEndCallback
						&& (text != Math.floor(this.duration / 1000) + 1)) {
					this.cycleEndCallback();
					text = Math.floor(this.duration / 1000) + 1;
				}
			} else {
				if (this.EndCallback) {
					this.EndCallback();
					this.update = null;
				}
			}
		}
	}
};
Countdown.prototype.pause = function() {
	this.paused = true;
};

Countdown.prototype.resume = function() {
	this.paused = false;
};
Countdown.prototype.getTimeRemains = function() {
	return this.count;
};
/**
 * Inventory
 */

Inventory.prototype = new Entity();
Inventory.prototype.constructor = Inventory;

/**
 * @constructor
 */
function Inventory() {
	Inventory.parent.constructor.call(this);
};

Inventory.inheritsFrom(Entity);

Inventory.prototype.className = "Inventory";
Inventory.prototype.createInstance = function(params) {
	var entity = new Inventory();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Inventory);

Inventory.prototype.init = function(params) {
	this.children = new Array();
	Inventory.parent.init.call(this, params);
	// this.add();
};
Inventory.prototype.clear = function() {
	this.params.itemList = null;
};
Inventory.prototype.addItem = function(item) {
	if (item instanceof Item) {
		Account.instance.commandToServer("changeParent", [ item['id'],this.id ],
				function(success) {
					if (success) {
						console.log("SUCCESS");
						console.log("ItemADDED");
					} else {
						console.log("FAIL");
					}
				});
	} 
};

Inventory.prototype.readUpdate = function(params) {
	Inventory.parent.readUpdate.call(this, params);
};
Inventory.prototype.writeUpdate = function(globalData, entityData) {
	Inventory.parent.writeUpdate.call(this, globalData, entityData);
};
/**
 * Actor - is VisualEntity that can act on its own.
 * Actor can be described by:
 * - current state 
 * - set of actuators (effectors)
 * 
 * Actions can be assigned on one or several actuators. Actor manages that more prioritized
 * actions get access to actuators while terminating current actions if they executing.  
 */


Actor.prototype = new VisualEntity();
Actor.prototype.constructor = Actor;

/**
 * @constructor
 */
function Actor() {
	Actor.parent.constructor.call(this);
};

Actor.inheritsFrom(VisualEntity);
Actor.prototype.className = "Actor";

Actor.prototype.createInstance = function(params) {
	var entity = new Actor();
	entity.init(params);
	return entity;
};

entityFactory.addClass(Actor);

Actor.prototype.init = function(params) {
	Actor.parent.init.call(this, params);
};

Actor.prototype.createVisual = function() {
	var params = this.params;
	var visual = guiFactory.createObject("GuiSkeleton", {
		parent : this.guiParent,
		style : "sprite",
		x : params['x'],
		y : params['y'],
		width : params['width'],
		height : params['height']
	});

	var visualInfo = {};
	visualInfo.visual = visual;
	this.addVisual(null, visualInfo);
};

Actor.prototype.update = function() {

	if(this.rootAction) {
		this.rootAction.update.call(this);
	}
};


Actor.prototype.setAction = function(action) {
	this.rootAction = action;
};
////////////////////////////////////////////////////
/**
 * BackgroundState set of useful functions, operating div that permanently exist
 * in game
 */

var LEVEL_FADE_TIME = 500;

BackgroundState.prototype = new BaseState();
BackgroundState.prototype.constructor = BaseState;

/**
 * @constructor
 */
function BackgroundState() {
	BackgroundState.parent.constructor.call(this);
};

BackgroundState.inheritsFrom(BaseState);

BackgroundState.prototype.init = function(params) {
	params = params ? params : {};
	var image = selectValue(
			params['image'],
			"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2NkAAIAAAoAAggA9GkAAAAASUVORK5CYII=");
	var background;
	if (params['background']) {
		background = params['background'];
		image = null;
	}

	// foreach(params['dialogs'])
	// ['Ok']
	this.dialogs = new Object();
	var that = this;
	if (params['dialogs'])
		$['each'](params['dialogs'], function(index, value) {
			that.dialogs[index] = guiFactory.createObject("GuiMessageBox",
					value['params']);
		});
	BackgroundState.parent.init.call(this, params);
	// an transparent PNG image 1x1 pixel size
	// to prevent clicks
	this.mask = guiFactory.createObject("GuiDiv", {
		parent : "body",
		image : image,
		background : background,
		style : "mask",
		width : "FULL_WIDTH",
		height : "FULL_HEIGHT",
		x : 0,
		y : 0
	});
	this.addGui(this.mask);
	this.mask.$()['css']("opacity", 0);
	this.mask.setZ(10000);
	this.mask.hide();
};

BackgroundState.prototype.fadeIn = function(fadeTime, color, callback) {
	this.mask.$()['css']("opacity", 0);
	this.mask.$()['css']("background-color", color);
	this.mask.fadeTo(1, fadeTime, callback);
};

BackgroundState.prototype.fadeOut = function(fadeTime, callback) {
	var that = this;
	this.mask.fadeTo(0, fadeTime, function(s) {
		that.mask.hide();
		if (callback)
			callback();
	});
};

BackgroundState.prototype.resize = function() {
	BackgroundState.parent.resize.call(this);
	$['each'](this.dialogs, function(index, value) {
		value.resize();
	});
};//
var guiFactory = new AbstractFactory();

/**
 * @constructor
 */
guiFactory.createGuiFromJson = function(json, state) {
	guiFactory.createObjectsFromJson(json, function(name, params) {
		if (params['parent'] && typeof params['parent'] == "string") {
			// find parent among local objects or
			// assume that it is ID of existing DOM object
			var localParent = state.getGui(params['parent']);
			if (!localParent) {
				localParent = $(params['parent']);
				if (localParent.length == 0) {
					localParent = null;
				}
			}
			if (localParent) {
				params['parent'] = localParent;
				return;
			}
		}
		console.warn("For object '" + name + "' wrong parent '" + params['parent'] + "' is provided.");
	}, function(name, obj) {
		state.addGui(obj, name);
		obj.name = name;
	});
};
/**
 * @constructor
 */
function GuiContainer() {
	this.guiEntities = null;
}

GuiContainer.prototype.init = function() {
	this.guiEntities = new Array();
	this.guiEntitiesMap = new Object();
};
GuiContainer.prototype.resize = function() {
	for ( var i = 0; i < this.guiEntities.length; i++) {
		if (this.guiEntities[i].resize) {
			this.guiEntities[i].resize();
		}
	}
};

GuiContainer.prototype.update = function(time) {
	for ( var i = 0; i < this.guiEntities.length; i++) {
		if (this.guiEntities[i].update) {
			this.guiEntities[i].update(time);
		}
	}
};

GuiContainer.prototype.setUpdateInterval = function(time) {
	var that = this;
	this.updateIntervalTime = time;
	this.updateIntervalHandler = setInterval(function() {
		that.update(that.updateIntervalTime);
	}, this.updateIntervalTime);
};

GuiContainer.prototype.resetUpdateInterval = function() {
	if (this.updateIntervalHandler) {
		clearInterval(this.updateIntervalHandler);
		this.updateIntervalHandler = null;
		this.updateIntervalTime = null;
	}
};

GuiContainer.prototype.clear = function() {
	// console.log("Clear GuiContainer, there is %d entities",
	// this.guiEntities.length);
	for ( var i = 0; i < this.guiEntities.length; i++) {
		if (this.guiEntities[i].remove) {
			// console.log("Remove entity %s", this.guiEntities[i].src);
			this.guiEntities[i].remove();
		}
	}
	popAllElementsFromArray(this.guiEntities);
	delete this.guiEntitiesMap;
};

GuiContainer.prototype.remove = function() {
	this.clear();
	this.resetUpdateInterval();
};

GuiContainer.prototype.addGui = function(entity, name) {
	assert(entity, "Trying to add null pointer!");
	this.guiEntities.push(entity);

	if (typeof (name) == "string") {
		entity.name = name;
		this.guiEntitiesMap[name] = entity;
	}
};

GuiContainer.prototype.removeGui = function(entity) {
	popElementFromArray(entity, this.guiEntities);
	if (this.guiEntitiesMap[entity.name]) {
		delete this.guiEntitiesMap[entity.name];
	}
	entity.remove();
};

GuiContainer.prototype.getGui = function(name) {
	return this.guiEntitiesMap[name];
};
/**
 * @constructor
 */
function GuiElement() {
}

GuiElement.prototype.className = "GuiElement";

GuiElement.prototype.createInstance = function(params) {
	var entity = new GuiElement();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiElement);

GuiElement.prototype.generateId = function() {
	return this.className + uniqueId();
};

GuiElement.prototype.generate = function(src) {
	assert(this.id, "Id not defined");
	assert(this.style, "Class for object with id = '" + this.id
			+ "' is not defined");
	return "<div id=\"" + this.id + "\" class=\"" + this.style
			+ " unselectable\">" + src + "</div>";
};

GuiElement.prototype.create = function(src) {
	// initial parent set

	// console.log("Creating item with id %s, src = %s and classname = %s",
	// this.id, src, this.className);

	if (!this.setParent(this.parent)) {
		// if no parent provided assigning to the body object
		this.setParent($("body"));
		console.warn("No parent was provided for object id = " + this.id);
	}

	src = (src == null) ? "" : src;
	this.parent.jObject.append(this.generate(src));

	// remember jQuery object
	this.jObject = $("#" + this.id);
	assert(this.jObject.length > 0, "Object id ='" + this.id
			+ "' was not properly created");
};

GuiElement.prototype.$ = function() {
	return this.jObject;
};

GuiElement.prototype.setEnable = function(isEnable) {
	this.enable = isEnable;
};

GuiElement.prototype.isEnabled = function() {
	return this.enable == true;
};

GuiElement.prototype.callBindedFunction = function(event, bindType) {
	if (this.isEnabled()) {
		this[bindType](event);
	} else {
		console.log("Button is not enabled " + this.id);
	}
};

GuiElement.prototype.bind = function(bindFunction, bindType) {
	bindType = (typeof (bindType) == "string") ? bindType : "click";
	if (bindFunction) {
		this[bindType] = bindFunction;
	}
	if (!this[bindType]) {
		return;
	}

	this.unbind(bindType);

	var that = this;
	var callbackCaller = function(event) {
		that.callBindedFunction(event, bindType);
	};

	this.jObject['bind'](Device.event(bindType) + ".guiElementEvents",
			callbackCaller);

	// if (Device.isTouch()) {
	// this.jObject['bind']("touchstart.guiElementEvents",
	// (bindOnMouseUp != true) ? callbackCaller
	// : preventDefaultEventFunction);
	// this.jObject['bind']("touchsmove.guiElementEvents",
	// preventDefaultEventFunction);
	// this.jObject['bind']("touchend.guiElementEvents",
	// (bindOnMouseUp == true) ? callbackCaller
	// : preventDefaultEventFunction);
	// } else {
	// this.jObject['bind']("click.guiElementEvents", callbackCaller);
	// this.jObject['bind']("mousedown.guiElementEvents",
	// preventDefaultEventFunction);
	// }
};

GuiElement.prototype.unbind = function(callbackType) {
	callbackType = (typeof (callbackType) == "string") ? callbackType : "";
	this.jObject['unbind'](callbackType + ".guiElementEvents");
};

GuiElement.prototype.init = function() {
	this.children.init();

	this.create(this.src);
	if (this.pushFunction) {
		this.bind(this.pushFunction);
	}

	this.resize();
};

GuiElement.prototype.initialize = function(params) {
	this.params = params;

	this.parent = params['parent'];

	// generate ID
	this.id = this.generateId();
	// Check whether element with such id is already in scene
	if ($("#" + this.id).length > 0) {
		console.error(" GuiElement with  id = '" + this.id
				+ "' is already exists.");
	}

	this.style = params['style'];
	this.width = params['width'];
	this.height = params['height'];
	// preventing clicking on the item to appear
	this.enable = true;
	this.children = new GuiContainer();
	this.children.init();

	this.src = params['html'] ? params['html'] : this.src;
	if (params['jObject']) {
		this.jObject = params['jObject'];

		// if (this.jObject[0] !== $('body')[0]) {
		// this.parent = guiFactory.createObject("GuiElement", {
		// "jObject" : this.jObject.parent()
		// });
		// }

	} else {
		this.create(this.src);
	}

	// attach 'this' as data to the element, so we can reference to it by
	// element id
	this.jObject['data']("guiElement", this);

	if (this.pushFunction) {
		this.bind(this.pushFunction);
	}

	var that = this;
	if (params['animations']) {
		$['each'](params['animations'], function(name, value) {
			that.addJqueryAnimation(name, value);
		});
	}

	this.setOffset(Screen.macro(params['offsetX']), Screen
			.macro(params['offsetY']));
	this.setPosition(Screen.macro(params['x']), Screen.macro(params['y']));
	this.setSize(Screen.macro(params['width']), Screen.macro(params['height']));
	if (typeof params['z'] == "number") {
		this.setZ(params['z']);
	}

	if (params['hide']) {
		this.hide();
	} else {
		this.show();
	}

	if (typeof params['opacity'] == "number") {
		this.setOpacity(params['opacity']);
	}

	this.resize();
};

GuiElement.prototype.setOffset = function(offsetX, offsetY) {
	this.offsetX = offsetX;
	this.offsetY = offsetY;
};

GuiElement.prototype.calcPercentageWidth = function(val) {
	if (typeof (val) == "string" && val.indexOf("%") > -1) {
		var parentWidth = this.parent.jObject.width() / Screen.widthRatio();
		assert(typeof (parentWidth) == "number",
				"Wrong parent or value for % param name='" + this.name + "'");
		val = (parseFloat(val.replace("%", "")) * parentWidth / 100.0);
	}
	return val;
};

GuiElement.prototype.calcPercentageHeight = function(val) {
	if (typeof (val) == "string" && val.indexOf("%") > -1) {
		var parentHeight = this.parent.jObject.height() / Screen.heightRatio();
		assert(typeof (parentHeight) == "number",
				"Wrong parent or value for % param name='" + this.name + "'");
		val = (parseFloat(val.replace("%", "")) * parentHeight / 100.0);
	}
	return val;
};

GuiElement.prototype.setPosition = function(x, y) {
	this.x = x;
	this.y = y;

	var offsetX = 0, offsetY = 0;
	if (typeof (this.offsetX) == "number") {
		offsetX = this.offsetX;
	}

	if (this.offsetY != null) {
		offsetY = this.offsetY;
	}

	x = this.calcPercentageWidth(x);
	y = this.calcPercentageHeight(y);

	this.setRealPosition(x + offsetX, y + offsetY);
};

GuiElement.prototype.move = function(dx, dy) {
	this.x += dx;
	this.y += dy;
	this.setPosition(this.x, this.y);
};

GuiElement.prototype.getRealPosition = function() {
	return {
		x : this.jObject['css']("left").replace("px", ""),
		y : this.jObject['css']("top").replace("px", "")
	};
};

GuiElement.prototype.getPosition = function() {
	return {
		x : this.x,
		y : this.y
	};
};

GuiElement.prototype.setZ = function(z) {
	this.jObject['css']("z-index", z);
	this.z = z;
};

GuiElement.prototype.show = function() {
	this.jObject['show']();
	this.visible = true;
};

GuiElement.prototype.hide = function() {
	this.jObject['hide']();
	this.visible = false;
};

GuiElement.prototype.setOpacity = function(opacity) {
	this.jObject['css']("opacity", opacity);
};

GuiElement.prototype.isEventIn = function(e) {
	var pos = Device.getPositionFromEvent(e);

	var left = this.$()['offset']()['left'];
	var right = left + this.$()['width']();
	var top = this.$()['offset']()['top'];
	var bottom = top + this.$()['height']();
	var isIn = (pos.x > left) && (pos.x < right) && (pos.y > top)
			&& (pos.y < bottom);

	return isIn;
};

GuiElement.prototype.addJqueryAnimation = function(name, description) {
	this.jqueryAnimations = this.jqueryAnimations ? this.jqueryAnimations
			: new Object();
	this.jqueryAnimations[name] = description;
};

GuiElement.prototype.playJqueryAnimation = function(name, callback) {
	var desc = this.jqueryAnimations[name];
	assert(desc, "No animation found with name '" + name + "'");

	this.stopJqueryAnimation();
	var finalAnimationState = null;

	var that = this;

	var updateDisplay = function(that, action) {
		that.setPosition(action["x"] || that.x, action["y"] || that.y);
		if (action["display"]) {
			if (action["display"] === "hide") {
				that.hide();
			} else if (action["display"] === "show") {
				that.show();
			}
		}
		// that.setSize(action["width"] || that.width, action["height"]
		// || that.height);
	};

	for ( var i = 0; i < desc.length; i++) {
		var actionDesc = desc[i];
		var action;
		if (action = actionDesc["animate"]) {
			var anim = new Object();
			$['each'](action["actions"], function(idx, params) {
				var param01 = params[0];
				var param02 = params[1];
				var param03 = params[2];

				if (param01 == "left" || param01 == "width") {
					param03 = (typeof (param03) == "number") ? Math
							.round(param03 * Screen.widthRatio()) : param03;
				} else if (param01 == "top" || param01 == "height") {
					param03 = (typeof (param03) == "number") ? Math
							.round(param03 * Screen.heightRatio()) : param03;
				}
				anim[param01] = param02 + param03.toString();
			});

			that.$()['animate'](anim, action["time"]);

		} else if (action = actionDesc["start"]) {
			var x = action["x"] != null ? action["x"] : that.x;
			var y = action["y"] != null ? action["y"] : that.y;
			that.setPosition(x, y);
			updateDisplay(that, action);
		} else if (action = actionDesc["final"]) {
			// force final params after all animations since
			// resize will call reset animation sequence or there's
			// can be option with animations disabled
			finalAnimationState = function() {
				var x = action["x"] != null ? action["x"] : that.x;
				var y = action["y"] != null ? action["y"] : that.y;
				that.setPosition(x, y);
				updateDisplay(that, action);
			};
		}
	}

	this.jqueryAnimationCallback = function() {
		if (finalAnimationState)
			finalAnimationState();
		if (callback)
			callback();
	};

	this.$()['queue']("fx", function() {
		that.jqueryAnimationCallback();
		that.jqueryAnimationCallback = null;
		that.jObject['stop'](true);
	});
};

GuiElement.prototype.stopJqueryAnimation = function() {
	if (!this.$()['is'](':animated')) {
		return;
	}
	this.$()['stop'](true);
	if (this.jqueryAnimationCallback) {
		this.jqueryAnimationCallback();
		this.jqueryAnimationCallback = null;
	}
};

GuiElement.prototype.isVisible = function() {
	return this.visible;
};

GuiElement.prototype.setSize = function(width, height) {
	this.width = width;
	this.height = height;

	this.resize();
};

GuiElement.prototype.setRealSize = function(width, height) {
	var size = Screen.calcRealSize(width, height);
	this.jObject['css']("width", size.x);
	this.jObject['css']("height", size.y);
};

GuiElement.prototype.setRealPosition = function(x, y) {
	var pos = Screen.calcRealSize(x, y);
	this.jObject['css']("left", pos.x);
	this.jObject['css']("top", pos.y);
};

GuiElement.prototype.resize = function() {
	w = this.calcPercentageWidth(this.width);
	h = this.calcPercentageHeight(this.height);
	this.setRealSize(w, h);
	this.setPosition(this.x, this.y);

	this.children.resize();
};

// prevents resizing of element
GuiElement.prototype.disableResize = function(isTrue) {
	if (this.originalResize == null) {
		this.originalResize = this.resize;
	}
	if (isTrue == false) {
		this.resize = this.originalResize;
	} else {
		this.resize = function() {
		};
	}
};

GuiElement.prototype.change = function(src) {
	this.src = src;
	this.detach();
	this.create(src);
	if (this.pushFunction) {
		this['bind'](this.pushFunction);
	}
	this.resize();
	this.show();
};

GuiElement.prototype.globalOffset = function() {
	var pos = this.jObject.offset();
	pos = Screen.calcLogicSize(pos.left, pos.top);

	return {
		x : pos.x,
		y : pos.y
	};
};

GuiElement.prototype.setParent = function(newParent, saveGlobalPosition) {
	// 'newParent' can be either string ID, JQuery object,
	// or object inherited of GuiElement
	var parent = null;
	var jParent = null;
	if (typeof newParent == "string") {
		jParent = $(newParent);
	} else if (newParent && typeof newParent == "object") {
		if (newParent['jquery']) {
			jParent = newParent;
		} else if (newParent.jObject && newParent.jObject.length > 0) {
			parent = newParent;
		}
	}
	// parent been represented as JQuery object
	if (jParent) {
		assert(jParent.length > 0, "Object id ='" + this.id
				+ "' has wrong parent: '" + newParent + "'");

		// check whether our parent already has GuiElement representation
		parent = jParent['data']("guiElement");
		if (!parent) {
			parent = guiFactory.createObject("GuiElement", {
				"jObject" : jParent
			});
		}
	}

	if (parent) {
		var oldParent = this.parent;
		this.parent = parent;
		if (this.jObject) {
			this.jObject['appendTo'](parent.jObject);
		}

		// recalculate entity x,y so it will
		// stay at the same place on the screen after the parent change
		if (oldParent && saveGlobalPosition) {
			var oldParentPos, newParentPos;

			oldParentPos = oldParent.globalOffset();
			newParentPos = parent.globalOffset();

			var left = oldParentPos.x - newParentPos.x;
			var top = oldParentPos.y - newParentPos.y;
			this.move(left, top);
		}
		return true;
	} else {
		console.error("Can't attach object '" + this.id
				+ "' to parent that doesn't exists '" + newParent + "'");
		return false;
	}
};

GuiElement.prototype.remove = function() {

	// console.log("Removing item with id %s, classname = %s", this.id,
	// this.className);

	this.children.remove();
	this.jObject['remove']();
};

GuiElement.prototype.detach = function() {
	this.jObject['detach']();
};

GuiElement.prototype.addGui = function(entity, name) {
	this.children.addGui(entity, name);
};
GuiElement.prototype.removeGui = function(entity) {
	this.children.removeGui(entity);
};
GuiElement.prototype.getGui = function(name) {
	return this.children.getGui(name);
};

GuiElement.prototype.center = function() {
	this.jObject['css']("text-align", "center");
	// obj.wrap("<div class='middle'/>");
	// obj.wrap("<div class='inner'/>");
};

GuiElement.prototype.fadeTo = function(fadeValue, time, callback,
		dontChangeVisibility) {
	var that = this;
	if (this.fadeToTimeout) {
		clearTimeout(this.fadeToTimeout);
		this.fadeToTimeout = null;
	}

	if (!this.visible && !dontChangeVisibility) {
		// .hack for iOs devices we need a tiny delay
		// to avoid blinking

		// TODO setTimeout move to GuiElement class or create a GuiBase class
		this.fadeToTimeout = setTimeout(function() {
			that.show();
		}, 1);
	}
	this.jObject['animate']({
		opacity : fadeValue
	}, time, callback);
};

GuiElement.prototype.blinking = function(isOn, blinkTime, blinkMin, blinkMax) {

	if (isOn) {
		var fadeTime = blinkTime ? blinkTime : 1000;

		var fadeIn, fadeOut;
		var that = this;
		fadeIn = function() {
			that.jObject['animate']({
				opacity : (blinkMin ? blinkMin : 0)
			}, fadeTime, fadeOut);
		};
		fadeOut = function() {
			that.jObject['animate']({
				opacity : (blinkMax ? blinkMax : 1)
			}, fadeTime, fadeIn);
		};
		fadeIn();
	} else {
		this.jObject['stop']();
	}
};

GuiElement.prototype.right = function() {
	this.jObject['css']("text-align", "right");
};

GuiElement.prototype.left = function() {
	this.jObject['css']("text-align", "left");
};

GuiElement.prototype.setClickTransparent = function(isTrue) {
	// TODO add IE and Opera support
	if (isTrue) {
		this.jObject['css']("pointer-events", "none");
	} else {
		this.jObject['css']("pointer-events", "auto");
	}
};

GuiElement.prototype.enableTouchEvents = function(push) {
	if (Device.isTouch()) {
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
			return false;
		};

		document.body.ontouchend = function(e) {
			e.preventDefault();
			if (touchEndX && touchEndY) {
				var e1 = {};
				e1.pageX = touchEndX;
				e1.pageY = touchEndY;
				push(e1);
			}
			return false;
		};
	} else {
		this.jObject['bind']("mousedown", push);
	}
};

// checks whether (x, y) in real global coords is inside element's bounds
GuiElement.prototype.isPointInsideReal = function(x, y) {
	var pos = this.jObject.offset();
	var width = this.jObject.width();
	var height = this.jObject.height();
	if ((x > pos.left && x < (pos.left + width))
			&& (y > pos.top && y < (pos.top + height))) {
		return true;
	} else {
		return false;
	}
};
/*
 * GuiDiv - main GuiElement with background manipulations,
 * viewport and dragn drop functions 
 */
GuiDiv.prototype = new GuiElement();
GuiDiv.prototype.constructor = GuiDiv;

/**
 * @constructor
 */
function GuiDiv() {
	GuiDiv.parent.constructor.call(this);
}

GuiDiv.inheritsFrom(GuiElement);
GuiDiv.prototype.className = "GuiDiv";

GuiDiv.prototype.createInstance = function(params) {
	var entity = new GuiDiv();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiDiv);

GuiDiv.prototype.initialize = function(params) {

	this.backgrounds = new Array();
	// short alias for background
	if (params['image']) {
		params['background'] = {
			image : params['image']
		};
	}
	/*
	 * if(params['background']instanceof Array){ for(var i = 0;i <
	 * params['background'].length;i++) {
	 * this.backgrounds.push(params['background'][i]); } }
	 */
	// ref to rect clamped by viewport
	this.viewRect = {};

	// DIV will be used as enhanced background to cover as much available
	// space on the screen as possible
	if (params['enhancedScene']) {
		params['width'] = params['width'] ? params['width']
				: ENHANCED_BASE_WIDTH;
		params['height'] = params['height'] ? params['height']
				: ENHANCED_BASE_HEIGHT;
		params['x'] = params['x'] ? params['x'] : -ENHANCED_BASE_MARGIN_WIDTH;
		params['y'] = params['y'] ? params['y'] : -ENHANCED_BASE_MARGIN_HEIGHT;
		this.enhancedScene = true;
		// enhancedScene is clamped by the maximum allowed screen size
		this.setViewport(Screen.fullRect());
	} else if (params['innerScene']) {
		// main scene is located on normal position inside enhanced scene
		params['width'] = params['width'] ? params['width'] : BASE_WIDTH;
		params['height'] = params['height'] ? params['height'] : BASE_HEIGHT;
		params['x'] = params['x'] ? params['x'] : ENHANCED_BASE_MARGIN_WIDTH;
		params['y'] = params['y'] ? params['y'] : ENHANCED_BASE_MARGIN_HEIGHT;
		this.innerScene = true;
	}
	GuiDiv.parent.initialize.call(this, params);
	this.applyBackground(params['background']);

	if (params['enhancedScene']) {
		this.resize();
	}

	assert(!this.innerScene || this.parent.enhancedScene,
			"inner scene should always be child to enhanced scene");

	if (this.innerScene) {
		this.clampByParentViewport();
	}
};

GuiDiv.prototype.generate = function(src) {
	return "<div id=\"" + this.id + "\" class=\"" + this.style
			+ " unselectable\"></div>";
};

GuiDiv.prototype.empty = function() {
	this.jObject['empty']();
};

GuiDiv.prototype.applyBackground = function(params) {
	if (params instanceof Array) {
		var j = params.length - 1;
		for ( var i = 0; i < params.length; i++) {
			params[i]['image'] = Resources.getImage(params[i]['image']);
			this.setBackgroundFromParams(params[i], j--);
		}
	} else if (params) {
		params['image'] = Resources.getImage(params['image']);
		this.setBackgroundFromParams(params, null);
	}
};

GuiDiv.prototype.setBackground = function(src, backWidth, backHeight, backX,
		backY, repeat, idx) {

	if (idx == "begin") {
		this.backgrounds.unshift({});
		idx = 0;
	} else if (idx == "end") {
		idx = this.backgrounds.length;
	}

	idx = idx ? idx : 0;

	this.backgrounds[idx] = {
		url : src,
		width : backWidth ? backWidth : this.width,
		height : backHeight ? backHeight : this.height,
		left : backX ? backX : 0,
		top : backY ? backY : 0,
		repeat : (repeat ? repeat : "no-repeat")
	};

	this.showBackground();
	this.resizeBackground();
};
GuiDiv.prototype.setBackgroundFromParams = function(param, j) {
	var x = param['x'] ? Screen.macro(param['x']) : 0;
	var y = param['y'] ? Screen.macro(param['y']) : 0;
	var w = param['width'] ? Screen.macro(param['width']) : this.width;
	var h = param['height'] ? Screen.macro(param['height']) : this.height;
	var r = param['repeat'] ? param['repeat'] : null;
	this.setBackground(param['image'], w, h, x, y, r, j);
};
GuiDiv.prototype.setBackgroundPosition = function(backX, backY, idx) {
	idx = idx ? idx : 0;

	var backgroundX = backX ? backX : 0;
	var backgroundY = backY ? backY : 0;
	this.backgrounds[idx].left = backgroundX;
	this.backgrounds[idx].top = backgroundY;

	this.setRealBackgroundPosition(0, 0);
};

GuiDiv.prototype.setRealBackgroundPosition = function(offsetX, offsetY) {
	var positions = " ";
	$['each'](this.backgrounds, function(i, back) {
		if (!back)
			return;
		var pos = Screen.calcRealSize(back.left + offsetX, back.top + offsetY);
		positions += pos.x + "px " + pos.y + "px,";
	});
	positions = positions.substr(0, positions.length - 1);
	this.jObject['css']("background-position", positions);
};

GuiDiv.prototype.resizeBackground = function() {
	var positions = " ";
	var sizes = " ";
	var that = this;
	$['each'](this.backgrounds, function(i, back) {
		if (!back)
			return;

		var pos = Screen.calcRealSize(back.left, back.top);
		positions += pos.x + "px " + pos.y + "px,";

		w = that.calcPercentageWidth(back.width);
		h = that.calcPercentageHeight(back.height);
		var size = Screen.calcRealSize(w, h);
		sizes += size.x + "px " + size.y + "px,";
	});
	sizes = sizes.substr(0, sizes.length - 1);
	positions = positions.substr(0, positions.length - 1);
	this.jObject['css']("background-size", sizes);
	this.jObject['css']("background-position", positions);
};

GuiDiv.prototype.setPosition = function(x, y) {
	GuiDiv.parent.setPosition.call(this, x, y);
	if (this.viewport) {
		this.clampByViewport();
	}
};

GuiDiv.prototype.resize = function() {
	// if this DIV is inner scene than adjust our position
	// by parent - enhancedScene
	// if (this.innerScene) {
	// var parent = this.parent;
	// this.setPosition(parent.viewRect.left, parent.viewRect.top);
	//
	// // innerScene by default is always visible, so it's
	// // clamped only by enhanced scene
	// this.viewRect.left = -parent.viewRect.left;
	// this.viewRect.top = -parent.viewRect.top;
	// this.viewRect.right = this.viewRect.left + parent.viewRect.width;
	// this.viewRect.bottom = this.viewRect.top + parent.viewRect.height;
	// this.viewRect.width = parent.viewRect.width;
	// this.viewRect.height = parent.viewRect.height;
	// }

	GuiDiv.parent.resize.call(this);

	this.resizeBackground();
	// TODO make optimization, currently setting size and pos twice
	// Consider removing this from GuiDiv
	if (this.viewport) {
		this.clampByViewport();
	}
};

GuiDiv.prototype.dragBegin = function(e) {
	if (this.dragStarted)
		return;

	DragManager.setItem(this, e);

	this.dragStarted = true;
	var pos = Device.getPositionFromEvent(e);
	this.dragX = pos.x;
	this.dragY = pos.y;
	if (this.onDragBegin)
		this.onDragBegin();
	this.$()['addClass']("dragged");

	// console.log("dragBegin");
};

GuiDiv.prototype.dragMove = function(e) {
	if (this.dragStarted) {
		var pos = Device.getPositionFromEvent(e);
		var dX = pos.x - this.dragX;
		var dY = pos.y - this.dragY;
		this.move(dX / Screen.widthRatio(), dY / Screen.heightRatio());
		this.dragX = pos.x;
		this.dragY = pos.y;
		// console.log("dragMove real " + this.id + ", " + this.x + ", " +
		// this.y);
	} else {
		// console.log("dragMove not real");
	}

};

GuiDiv.prototype.dragEnd = function(dragListener) {
	if (!this.dragStarted)
		return;

	// .hack seem like webkit bug, touchmove event will be halted
	// once we remove item form scene. So we remove button
	// only after drag n drop complete, thus onBeforeDragEnd callback
	if (this.onBeforeDragEnd)
		this.onBeforeDragEnd(dragListener);

	if (this.onDragEnd)
		this.onDragEnd(dragListener);
	this.$()['removeClass']("dragged");
	this.dragStarted = false;

	// console.log("dragEnd");
};

GuiDiv.prototype.setDragable = function(isTrue) {
	this.dragable = isTrue;
	if (isTrue) {
		var that = this;
		this.$().bind(Device.event("cursorDown") + ".dragEvents", function(e) {
			that.dragBegin(e);
		});
	} else {
		this.$()['unbind'](".dragEvents");
	}
};

// Setups Div as reciver for drag items
// callbacks to override: onDragItemEnter, onDragItemOut, onDragItemDrop
GuiDiv.prototype.setDragListener = function(isTrue, priority) {
	this.dragSlot = isTrue;
	if (isTrue) {
		if (priority) {
			this.dragListenerPriority = priority;
		}
		DragManager.addListener(this);
	} else {
		DragManager.removeListener(this);
		this.$()['unbind'](".dragEvents");
	}
};

GuiDiv.prototype.hideBackground = function() {
	this.jObject['css']("background-image", "none");
};

GuiDiv.prototype.showBackground = function() {
	var urls = " ";
	var repeats = " ";

	$['each'](this.backgrounds, function(i, back) {
		if (!back)
			return;
		urls += "url('" + back.url + "'),";
		repeats += back.repeat + ",";
	});
	urls = urls.substr(0, urls.length - 1);
	repeats = repeats.substr(0, repeats.length - 1);
	this.jObject['css']("background-image", urls);
	this.jObject['css']("background-repeat", repeats);
};

GuiDiv.prototype.clampByParentViewport = function(isTrue) {
	if (isTrue == false) {
		this.setViewport(null, null);
		this.resize();
	} else {
		this.setViewport(this.parent.viewRect, true);
	}
};

GuiDiv.prototype.setViewport = function(rect, isParent) {
	this.viewport = rect;
	this.isParentsViewport = isParent;

	if (this.jObject && this.viewport) {
		this.clampByViewport();
	}
};

GuiDiv.prototype.globalOffset = function() {
	var pos = this.jObject.offset();
	pos = Screen.calcLogicSize(pos.left, pos.top);

	var viewLeft = (this.viewRect && this.viewRect.left) ? this.viewRect.left
			: 0;
	var viewTop = (this.viewRect && this.viewRect.top) ? this.viewRect.top : 0;

	return {
		x : pos.x - viewLeft,
		y : pos.y - viewTop
	};
};

GuiDiv.prototype.clampByViewport = function() {
	if (!this.isVisible()) {
		return;
	}

	// 1) write down our rect
	var offsetX = this.offsetX ? this.offsetX : 0;
	var offsetY = this.offsetY ? this.offsetY : 0;
	var x = this.calcPercentageWidth(this.x) + offsetX;
	var y = this.calcPercentageHeight(this.y) + offsetY;
	var originalRect = {
		left : x,
		top : y,
		right : x + this.width,
		bottom : y + this.height
	};

	// 2) find out intersection rect between our rect and
	// parent rect - it will be new visibile rect for our div.
	// Rect will be in parent's coordinates
	var rect = this.viewport;
	var left = Math.max(originalRect.left, rect.left);
	var top = Math.max(originalRect.top, rect.top);
	var right = Math.min(originalRect.right, rect.right);
	var bottom = Math.min(originalRect.bottom, rect.bottom);

	var w = right - left;
	var h = bottom - top;

	// item is completely outside viewport, hide it
	if (w < 0 || h < 0) {
		if (!this.viewRect.isOutside) {
			this.jObject['hide']();
			this.viewRect.isOutside = true;
		}
	} else {
		if (this.viewRect.isOutside) {
			this.viewRect.isOutside = false;
			if (this.isVisible()) {
				this.jObject['show']();
			}
		}
	}

	var screenLeft = left;
	var screenTop = top;

	if (this.isParentsViewport) {
		screenLeft -= Math.max(rect.left, 0);
		screenTop -= Math.max(rect.top, 0);
	}
	this.setRealPosition(screenLeft, screenTop);
	this.setRealSize(w, h);

	// 3) calculate offset
	var offsetX = originalRect.left - left;
	var offsetY = originalRect.top - top;
	this.setRealBackgroundPosition(offsetX, offsetY);

	// calculate viewport for this Div for childrens to use
	if (this.innerScene) {
		// ignore boundaries of innerScene
		this.viewRect.left = rect.left - x;
		this.viewRect.top = rect.top - y;
		this.viewRect.right = rect.right - x;
		this.viewRect.bottom = rect.bottom - y;
		this.viewRect.width = rect.width;
		this.viewRect.height = rect.height;
		return;
	} else {
		this.viewRect.left = left - x;
		this.viewRect.top = top - y;
	}
	this.viewRect.right = this.viewRect.left + w;
	this.viewRect.bottom = this.viewRect.top + h;
	this.viewRect.width = w;
	this.viewRect.height = h;
	this.viewRect.offsetX = screenLeft;
	this.viewRect.offsetY = screenTop;

	var name = this.id;
	if (this.enhancedScene) {
		name += " Enhanced";
	} else if (this.innerScene) {
		name += " Inner";
	}

	// console.log(name + " " + "screen " + Math.round(screenLeft) + ", "
	// + Math.round(screenTop) + " originalRect "
	// + Math.round(originalRect.left) + ", "
	// + Math.round(originalRect.top) + " rect " + Math.round(rect.left)
	// + ", " + Math.round(rect.top) + " offset "
	// + Math.round(this.viewRect.left) + ", "
	// + Math.round(this.viewRect.top));

};


// Only perform show/hide check
GuiDiv.prototype.clampByViewportSimple = function() {

	// console.log("clamped");
	if (!this.isVisible()) {
		return;
	}
	var rect = this.viewport;

	// 1) write down our rect
	var offsetX = this.offsetX ? this.offsetX : 0;
	var offsetY = this.offsetY ? this.offsetY : 0;
	var x = this.calcPercentageWidth(this.x) + offsetX;
	var y = this.calcPercentageHeight(this.y) + offsetY;
	var originalRect = {
		left : x,
		top : y,
		right : x + this.width,
		bottom : y + this.height
	};

	var rect = this.viewport;

	var screenLeft, screenTop;
	if (this.isParentsViewport) {
		screenLeft = originalRect.left - rect.left;
		screenTop = originalRect.top - rect.top;
	}
	if (screenLeft + this.width < 0 || screenLeft > rect.width
			|| screenTop + this.height < 0 || screenTop > rect.height) {

		if (!this.viewRect.isOutside) {
			this.jObject['hide']();
			this.viewRect.isOutside = true;
		}
	} else {
		if (this.viewRect.isOutside) {
			this.jObject['show']();
			this.viewRect.isOutside = false;
		}
	}
	this.setRealPosition(screenLeft, screenTop);
};


GuiDiv.prototype.remove = function() {
	if(this.id == "GuiDiv169"){
		var a;
		a++;
	}
	GuiDiv.parent.remove.call(this);
	this.setDragListener(false);
};
/**
 * GuiDialog - modal dialog Has a mask full screen mask over the screen and
 * background image
 */

GuiDialog.prototype = new GuiDiv();
GuiDialog.prototype.constructor = GuiDialog;
/**
 * @constructor
 */
function GuiDialog() {
	GuiDialog.parent.constructor.call(this);
};

GuiDialog.inheritsFrom(GuiDiv);
GuiDialog.prototype.className = "GuiDialog";

GuiDialog.prototype.createInstance = function(params) {
	var entity = new GuiDialog(params['parent'], params['style'], params['width'], params['height'], null);
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiDialog);

GuiDialog.prototype.resize = function() {
	GuiDialog.parent.resize.call(this);
	this.children.resize();
};

GuiDialog.prototype.initialize = function(params) {
	GuiDialog.parent.initialize.call(this, params);
	
	this.maskDiv = null;
	this.visible = false;
	

	var that = this;

	// "x" : ((Screen.baseWidth() - this.width) / 2),
	// "y" : ((Screen.baseHeight() - this.height) / 2)

	// an transparent PNG image 1x1 pixel size
	// to prevent clicks
	this.maskDiv = guiFactory.createObject("GuiDiv", {
		"parent" : "body",
		// "image" :
		// "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2NkAAIAAAoAAggA9GkAAAAASUVORK5CYII=",
		"style" : "mask",
		"width" : "FULL_WIDTH",
		"height" : "FULL_HEIGHT",
		"x" : 0,
		"y" : 0
	});
	this.maskDiv.setBackground("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVQIW2NkAAIAAAoAAggA9GkAAAAASUVORK5CYII=");
	this.maskDiv.bind(function(e) {
		e.preventDefault();
		return false;
	});
	this.children.addGui(this.maskDiv);

	this.maskDiv.setZ(130);
	this.setZ(131);
	this.maskDiv.hide();

	// if (this.backSrc) {
	// this.children.addGui(this.backImage =
	// factory.createGuiImage(this.dialogContainer, , "dialogButton",
	// this.width, this.height, 0, 0));
	// }
	this.resize();
};

GuiDialog.prototype.init = function() {
	GuiDialog.parent.init.call(this);
};

GuiDialog.prototype.show = function() {
	GuiDialog.parent.show.call(this);
	if (this.maskDiv) {
		this.maskDiv.show();
	}
	this.visible = true;
};

GuiDialog.prototype.hide = function() {
	GuiDialog.parent.hide.call(this);
	if (this.maskDiv) {
		this.maskDiv.hide();
	}
	this.visible = false;
};

GuiDialog.prototype.isVisible = function() {
	return this.visible;
};
/*
 * GuiGroup - grouping buttons
 */


GuiGroup.prototype = new GuiDiv();
GuiGroup.prototype.constructor = GuiGroup;

/**
 * @constructor
 */
function GuiGroup() {
	GuiGroup.parent.constructor.call(this);
}

GuiGroup.inheritsFrom(GuiDiv);
GuiGroup.prototype.className = "GuiGroup";

GuiGroup.prototype.createInstance = function(params) {
	var entity = new GuiGroup(params['parent'], params['style'], params['width'], params['height'], null);
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiGroup);

GuiGroup.prototype.initialize = function(params) {
	GuiGroup.parent.initialize.call(this, params);
	this.allowMultiSelect = false;
	if (params['allowMultiSelect']) {
		this.allowMultiSelect = true;
	}
};

GuiGroup.prototype.addGui = function(entity, name, isSelected, onSelected, onSelect, onUnselect) {
	this.children.addGui(entity, name);
	if (isSelected) {
		//console.log("isSelected");
		onSelected();
		onSelect();
	} else {
		onUnselect();
	}
	entity.onSelect = onSelect;
	entity.onUnselect = onUnselect;
};

GuiGroup.prototype.removeGui = function(entity) {
	this.children.removeGui(entity);
};

GuiGroup.prototype.clear = function() {
	popAllElementsFromArray(this.children.guiEntities);
	delete this.children.guiEntitiesMap;

	this.children.guiEntities = new Array();
	this.children.guiEntitiesMap = new Object();
};

GuiGroup.prototype.getGui = function(name) {
	for ( var i = 0; i < this.children.length; i++) {
		if (this.children[i].name === name) {
			return this.children[i];
		}
	}
};

GuiGroup.prototype.disselectAll = function() {
	for ( var i = 0; i < this.children.guiEntities.length; i++) {
		// console.log("onUnselect %s", this.children.guiEntities[i].id);
		this.children.guiEntities[i].onUnselect();
	}
};

GuiGroup.prototype.selectGui = function(selected) {
	// console.log("selectGui %s, children size is %d", selected.id,
	// this.children.guiEntities.length);
	if (!this.allowMultiSelect) {
		this.disselectAll();
	}
	for ( var i = 0; i < this.children.guiEntities.length; i++) {
		if (this.children.guiEntities[i].id === selected.id) {
			// console.log("onSelect %s", this.children.guiEntities[i].id);
			this.children.guiEntities[i].onSelect();
		}
	}
};
GuiButton.prototype = new GuiDiv();
GuiButton.prototype.constructor = GuiButton;

/**
 * @constructor
 */
function GuiButton() {
	GuiButton.parent.constructor.call(this);
}

GuiButton.inheritsFrom(GuiDiv);
GuiButton.prototype.className = "GuiButton";

GuiButton.prototype.createInstance = function(params) {
	var entity = new GuiButton();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiButton);

GuiButton.prototype.generate = function(src) {
	var htmlText = "<div id='" + this.id + "' class='" + this.style
			+ " unselectable'>";
	htmlText += "</div>";

	return htmlText;
};

GuiButton.prototype.initialize = function(params) {
	GuiButton.parent.initialize.call(this, params);
	
	// buttons is supposed to be small, so clamping it simple
	this.clampByViewport = GuiDiv.prototype.clampByViewportSimple;

	this.jObject['css']("cursor", "pointer");
	this.params = params;
	var that = this;
	var labelParams;
	var normalParams = {};
	// this.$()['css']("border", "solid");
	// this.$()['css']("border-color", "red");

	var prepareButtonState = function(params) {

		params['image'] = Resources.getImage(params['image']);
		var image = GuiDiv.prototype
				.createInstance({
					parent : that,
					style : params['imageStyle'] ? params['imageStyle']
							: "buttonImage",
					width : that.width,
					height : that.height,
					x : params['x'] ? params['x'] : "50%",
					y : params['y'] ? params['y'] : "50%"
				});

		// image.$()['css']("border", "solid");
		// image.$()['css']("border-color", "black");

		that.children.addGui(image);

		var w = selectValue(params['width'], normalParams['width'], that.width);
		var h = selectValue(params['height'], normalParams['height'],
				that.height);
		// if scale parameter exists scale size, scale specifies in percents
		if (params['scale']) {
			w = Math.round(w * params['scale'] / 100);
			h = Math.round(h * params['scale'] / 100);
		}

		var offsetX = -Math.round(w / 2);
		var offsetY = -Math.round(h / 2);

		image.setOffset(offsetX, offsetY);
		if (params['background']) {
			image.applyBackground(params['background']);
		} else {
			image.setBackground(params['image'], w, h, 0, 0);
		}
		image.setSize(w, h);
		image.hide();

		var label;
		if (params['label']) {
			labelParams = labelParams ? labelParams : params['label'];
			// if scale parameter exists then scale size, scale specifies in
			// percents
			var scale = 1;
			if (typeof params['scale'] == "number") {
				scale = params['scale'] / 100;
			}

			w = selectValue(params['label']['width'], labelParams['width'],
					that.width)
					* scale;
			h = selectValue(params['label']['height'], labelParams['height'],
					that.height)
					* scale;

			fontSize = selectValue(params['label']['fontSize'],
					labelParams['fontSize'])
					* scale;

			offsetX = selectValue(params['label']['offsetX'],
					labelParams['offsetX'], -Math.round(w / 2));
			offsetY = selectValue(params['label']['offsetY'],
					labelParams['offsetY'], -Math.round(h / 2));

			w = Math.round(w);
			h = Math.round(h);

			label = guiFactory.createObject("GuiLabel",
					{
						parent : image,
						style : selectValue(params['label']['style'],
								labelParams['style']),
						width : w,
						height : h,
						text : selectValue(params['label']['text'],
								labelParams['text']),
						fontSize : fontSize,
						align : selectValue(params['label']['align'],
								labelParams['align'], "center"),
						verticalAlign : selectValue(params['label']['align'],
								labelParams['align'], "middle"),
						x : selectValue(params['label']['x'], labelParams['x'],
								"50%"),
						y : selectValue(params['label']['y'], labelParams['y'],
								"50%"),
						offsetX : params['label']['offsetX'] ? offsetX
								+ params['label']['offsetX'] : offsetX,
						offsetY : params['label']['offsetY'] ? offsetY
								+ params['label']['offsetY'] : offsetY
					});
			that.children.addGui(label);
			label.hide();
		}

		var callback = function() {
			// a bit hacky, but works
			// identify current state buy reference to its params object
			if (that.currentStateParams === params) {
				return;
			} else {
				that.currentStateParams = params;
			}

			var oldCurrentImage = that.currentImage;
			var oldCurrentLabel = that.currentLabel;

			that.currentImage = image;
			if (that.currentImage) {
				that.currentImage.show();
			}

			that.currentLabel = label;
			if (that.currentLabel) {
				that.currentLabel.show();
			}
			if (oldCurrentLabel) {
				oldCurrentLabel.hide();
			}
			if (oldCurrentImage) {
				oldCurrentImage.hide();
			}
		};
		return {
			image : image,
			label : label,
			callback : callback
		};
	};

	// normal state (unpressed button)
	if (params['normal']) {
		normalParams = params['normal'];
		var resultNormal = prepareButtonState(params['normal']);
		that.imageNormal = resultNormal.image;
		that.normalState = function() {
			resultNormal.callback.call(that);
			that.clickAllowed = false;
		};
		that.normalState.call(that);
	}

	// mouse over the button
	if (!Device.isTouch()) {
		if (params['hover']) {
			var result = prepareButtonState(params['hover']);
			that.imageHover = result.image;
			that.hoverState = result.callback;
		}
		// button pressed
		if (params['active']) {
			var result = prepareButtonState(params['active']);
			that.imageActive = result.image;
			that.activeState = result.callback;
		} else {
			if (params['hover']) {
				that.activeState = that.normalState;
			}
		}
	} else {
		if (params['hover']) {
			var result = prepareButtonState(params['hover']);
			that.imageActive = result.image;
			that.activeState = result.callback;
		}
	}
};

GuiButton.prototype.bind = function(pushFunction) {
	// simple onclick event without any effects for button
	if (!this.activeState) {
		GuiButton.parent.bind.call(this, pushFunction);
		return;
	}
	var that = this;

	this.backedToNormal = false;
	this.clickAllowed = false;
	this.unbind();
	if (this.hoverState && !Device.isTouch()) {
		this.jObject.bind("mouseenter.guiElementEvents", this.hoverState);
		this.jObject.bind("mouseleave.guiElementEvents", this.normalState);
	}

	if (pushFunction) {
		this.pushFunction = pushFunction;
	}
	var backToNormalCallback = this.hoverState ? this.hoverState
			: this.normalState;

	var callbackCaller = function(event) {
		if (that.isEnabled()) {
			if (that.clickAllowed) {
				if (that.pushFunction) {
					that.pushFunction(event);
				}
				that.clickAllowed = false;
			}
			backToNormalCallback.call(that);
		}
	};

	if (this.activeState) {
		if (!Device.isTouch()) {
			this.jObject.bind("mousedown", function() {
				that.activeState.call(that);
				that.clickAllowed = true;
			});
			this.jObject.bind("mouseup", callbackCaller);
		} else {
			this.jObject.bind("touchstart", function() {
				that.activeState.call(that);
				that.clickAllowed = true;
				that.backedToNormal = false;
			});
			this.jObject.bind("touchend", callbackCaller);
			this.jObject.bind("touchmove",
					function(e) {
						if (that.backedToNormal) {
							return;
						}

						e.preventDefault();
						var touch = e.originalEvent.touches[0]
								|| e.originalEvent.changedTouches[0];
						var obj = $(document.elementFromPoint(touch.pageX,
								touch.pageY));

						if (!that.isPointInsideReal(touch.pageX, touch.pageY)) {
							backToNormalCallback.call(that);
							that.backedToNormal = true;
						}
					});
		}

	}
};

// change background in all of button states
GuiButton.prototype.changeButtonBackgrounds = function(params, idx) {
	if (this.imageNormal) {
		this.imageNormal.setBackgroundFromParams(params, idx);
	}
	if (this.imageHover) {
		this.imageHover.setBackgroundFromParams(params, idx);
	}
	if (this.imageActive) {
		this.imageActive.setBackgroundFromParams(params, idx);
	}
};

// show or hides background
//changes background for highlighted
GuiButton.prototype.highlight = function(isOn) {
		if (this.params['highlight']) {
			if (isOn) {
			this.img = this.params['background']['image'];
			this.setBackground(this.params['highlight']['image']);
			this.backgroundShown = isOn;
			this.showBackground();
		} else {
			this.setBackground(this.img);
			this.showBackground();
		}
	}else{
		this.backgroundShown = isOn;
		if (this.backgroundShown) {
			this.showBackground();
		} else {
			this.hideBackground();
		}
	}
	
	
};

GuiButton.prototype.resize = function() {
	GuiButton.parent.resize.call(this);
};
var GUI_BAR_NAME = "GuiProgressBar";

GuiProgressBar.prototype = new GuiDiv();
GuiProgressBar.prototype.constructor = GuiProgressBar;

/**
 * @constructor
 */
function GuiProgressBar() {
	GuiProgressBar.parent.constructor.call(this);
}

GuiProgressBar.inheritsFrom(GuiDiv);
GuiProgressBar.prototype.className = GUI_BAR_NAME;

GuiProgressBar.prototype.createInstance = function(params) {
	var entity = new GuiProgressBar();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiProgressBar);

GuiProgressBar.prototype.init = function() {
	GuiProgressBar.parent.init.call(this);

};
GuiProgressBar.prototype.initialize = function(params) {
	GuiProgressBar.parent.initialize.call(this, params);
	this.min = params['min'] ? params['min'] : 0;
	this.max = params['max'] ? params['max'] : 0;
	this.current = params['current'] ? params['current'] : 0;
	this.style = params['style'];
	this.width = params['width'];
	this.stableWidth = params['bar']['width'];// (this.current -
	// this.min)*params['width']/(this.max-this.min)
	this.height = (params['height']) ? params['height'] : that.height;
	var that = this;
	this.bar = guiFactory.createObject("GuiDiv", {
		parent : that,
		background : params['bar']['background'],
		style : params['bar']['style'],
		width : (this.current - this.min) * params['bar']['width']
				/ (this.max - this.min),
		height : params['bar']['height'],
		x : params['bar']['x'],
		y : params['bar']['y']
	});

	this.children.addGui(this.bar);
	var that = this;
	var labelText;
	if (params['label']) {
		labelText = (params['label']['text']) ? params['label']['text']
				: labelText;
		this.label = guiFactory.createObject("GuiLabel", {
			parent : that,
			style : params['label']['style'],
			width : (params['label']['width']) ? params['label']['width']
					: that.width,
			height : (params['label']['height']) ? params['label']['height']
					: that.height,
			text : "" + this.current,
			align : params['label']['align'],
			verticalAlign : "middle",
			x : (params['label']['x']) ? params['label']['x'] : "50%",
			y : (params['label']['y']) ? params['label']['y'] : "50%"
		});
		that.children.addGui(this.label);
	}

};

GuiProgressBar.prototype.setNewValue = function(what, newValue) {
//	var width = Math.round(this.bar.width * (this.max - this.min)
//			/ (this.current - this.min));
	this[what] = Math.floor(newValue);
	if (this.current >= this.max) {
		this.current = this.max;
	}
	this.label.change(this.current);
	this.bar.width = Math.round((this.current - this.min) * this.stableWidth
			/ (this.max - this.min));
	this.bar.setSize(this.bar.width, this.bar.height);
	// this.resize();
};

GuiProgressBar.prototype.update = function(){
//	this.setNewValue("current", Account.instance.energy);
	console.log(Account.instance.energy);
	GuiProgressBar.parent.readUpdate.call(this,data);
};

GuiProgressBar.prototype.resize = function() {
	GuiProgressBar.parent.resize.call(this);
};var GUI_MB_NAME = "GuiMessageBox";

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
};/*
 * Label with text that can be aligned vertically and horizontally
 */

GuiLabel.prototype = new GuiElement();
GuiLabel.prototype.constructor = GuiLabel;

/**
 * @constructor
 */
function GuiLabel() {
	GuiLabel.parent.constructor.call(this);
}

GuiLabel.inheritsFrom(GuiElement);
GuiLabel.prototype.className = "GuiLabel";

GuiLabel.prototype.createInstance = function(params) {
	var entity = new GuiLabel();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiLabel);

GuiLabel.prototype.initialize = function(params) {
	GuiLabel.parent.initialize.call(this, params);

	this.fontSize = params['fontSize'] ? params['fontSize'] : 20;
	this.change(params['text']);
	if (params['align']) {
		this.align(params['align'], params['verticalAlign']);
	}
	if (params['color']) {
		this.setColor(params['color']);
	}
};

GuiLabel.prototype.generate = function(src) {
	var id = this.id;
	this.rowId = this.id + "_row";
	this.cellId = this.id + "_cell";
	return "<div id='" + this.id + "' class='" + this.style + " unselectable'>"
			+ "<div id='" + this.rowId + "' style='display:table-row;'>"
			+ "<div id='" + this.cellId + "' style='display:table-cell;'>"
			+ src + "</div></div></div>";
};

GuiLabel.prototype.create = function(src) {
	GuiDiv.parent.create.call(this, src);
	$("#" + this.cellId)['css']("font-size", Math.floor(this.fontSize
			* Math.min(Screen.widthRatio(), Screen.heightRatio()))
			+ "px");

};

GuiLabel.prototype.change = function(src) {
	$("#" + this.cellId).text(src);
	$("#" + this.cellId)['css']("font-size", Math.floor(this.fontSize
			* Math.min(Screen.widthRatio(), Screen.heightRatio()))
			+ "px");
};

GuiLabel.prototype.append = function(src) {
	$("#" + this.cellId).append(src);
	this.resize();
};

GuiLabel.prototype.empty = function() {
	$("#" + this.cellId).empty();
	this.resize();
};

GuiLabel.prototype.setPosition = function(x, y) {
	GuiLabel.parent.setPosition.call(this, x, y);

};

GuiLabel.prototype.setRealSize = function(width, height) {
	GuiLabel.parent.setRealSize.call(this, width, height);

	var size = Screen.calcRealSize(width, height);
	$("#" + this.rowId)['css']("width", size.x);
	$("#" + this.rowId)['css']("height", size.y);
	$("#" + this.cellId)['css']("width", size.x);
	$("#" + this.cellId)['css']("height", size.y);

	$("#" + this.cellId)['css']("font-size", Math.floor(this.fontSize
			* Math.min(Screen.widthRatio(), Screen.heightRatio()))
			+ "px");
	// cssTransform($("#" + this.cellId), null, null, Screen.widthRatio(),
	// Screen.heightRatio());

};

GuiLabel.prototype.resize = function() {
	GuiLabel.parent.resize.call(this);
};

GuiLabel.prototype.setColor = function(color) {
	this.jObject['css']("color", color);
};

GuiLabel.prototype.align = function(alignH, alignV) {
	if (alignH) {
		$("#" + this.cellId)['css']("text-align", alignH);
	}
	if (alignV) {
		$("#" + this.cellId)['css']("vertical-align", alignV);
	}
};
/*
 * Scrolling group of elements
 */

GuiScroll.prototype = new GuiElement();
GuiScroll.prototype.constructor = GuiScroll;

/**
 * @constructor
 */
function GuiScroll() {
	GuiScroll.parent.constructor.call(this);
}

GuiScroll.inheritsFrom(GuiElement);
GuiScroll.prototype.className = "GuiScroll";

GuiScroll.prototype.generate = function(src) {
	this.listId = this.id + "_list";
	this.scrollId = this.id + "_scroll";
	this.listId = this.scrollId;

	return "<div id='" + this.id + "' class='" + this.style
			+ " scrollerWrapper " + "unselectable'>" + "<div id='"
			+ this.scrollId + "' class='scrollerBackground'>"
			// + "<ul id=\"" + this.listId + "\"></ul>"
			+ "</div></div>";
};

GuiScroll.prototype.createInstance = function(params) {
	var entity = new GuiScroll(params['parent'], params['style'],
			params['width'], params['height']);
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiScroll);

GuiScroll.prototype.initialize = function(params) {
	GuiScroll.parent.initialize.call(this, params);
	this.createScroll();
};

GuiScroll.prototype.createScroll = function() {
	var thisGuiScroll = this;
	this.hScroll = (this.params['hScroll'] != null) ? this.params['hScroll']
			: true;
	this.vScroll = (this.params['vScroll'] != null) ? this.params['vScroll']
			: true;
	this.scroll = new iScroll(this.id, {
		'hScroll' : this.hScroll,
		'vScroll' : this.vScroll,
		'useTransform' : true,
		'onBeforeScrollStart' : function(e) {
			var target = e.target;
			while (target.nodeType != 1) {
				target = target.parentNode;
			}

			// if (target.tagName != 'SELECT' && target.tagName != 'INPUT' &&
			// target.tagName != 'TEXTAREA')
			e.preventDefault();

			// console.log("candidate " + target.id);
		},
		'onScrollStart' : function(e) {
			var target = e.target;
			thisGuiScroll.candidateToClick = null;

			while (true) {
				// a text element or element without id - skip it
				if (target.nodeType != 1 || target.id == '') {
					target = target.parentNode;
					continue;
				}

				// console.log("try to click " + target.id);
				var item = $("#" + target.id);
				if (item.length > 0) {
					var element = item['data']("guiElement");
					// console.log("element is " + element);

					// TODO listItemClickCallback and listItemMouseDownCallback
					// hacks
					// should be moved to GuiButton
					if (element) {
						if (element.listItemClickCallback) {
							thisGuiScroll.candidateToClick = element;
							break;
						} else if (element.listItemMouseDownCallback) {
							element.listItemMouseDownCallback(e);
							break;
						}
						// console.log("candidate " +
						// thisGuiScroll.candidateToClick.id);
					}
				}
				target = target.parentNode;

				// we have no parent or reached scroll element itself
				if (!target || target.id == thisGuiScroll.listId
						|| target.id == thisGuiScroll.scrollId
						|| target.id == thisGuiScroll.id)
					break;
			}
		},
		'onScrollMove' : function(e) {
			thisGuiScroll.candidateToClick = null;
		},
		'onBeforeScrollEnd' : function() {
			if (thisGuiScroll.candidateToClick) {
				thisGuiScroll.candidateToClick.listItemClickCallback();
				thisGuiScroll.candidateToClick = null;
			}
		}
	});
};

GuiScroll.prototype.refresh = function() {
	this.scroll['scrollTo'](0, 0, 0, false);
	this.scroll['refresh']();
};

GuiScroll.prototype.addListItem = function(item) {
	// var listItemId = this.listId + "_item" + uniqueId();
	// $("#" + this.listId).append("<li id='" + listItemId + "'></li>");
	// if (typeof item === "string") {
	// $("#" + listItemId).html(item);
	// } else {
	// item.setParent(listItemId);
	// }

	item.setParent("#" + this.listId);
	// allow events to propagate to reach the scroll
	item.unbind();
	this.children.addGui(item);

	this.resize();
};

GuiScroll.prototype.removeListItem = function(item) {
	this.children.removeGui(item);
	this.resize();
};

GuiScroll.prototype.clearList = function() {
	$("#" + this.listId).empty();
	this.children.clear();
};

GuiScroll.prototype.remove = function() {
	this.scroll['destroy']();
	delete this.scroll;
	GuiScroll.parent.remove.call(this);
};

GuiScroll.prototype.resizeScroll = function() {
	// a bit hacky. To enable horizontal scrolling
	// make sure that we will have enough width.
	if (this.hScroll && !this.vScroll) {
		var totalWidth = 0;
		for ( var i = 0; i < this.children.guiEntities.length; i++) {
			totalWidth += this.children.guiEntities[i].$()['outerWidth'](true);
		}
		$("#" + this.listId)['width'](totalWidth);
	}
};

GuiScroll.prototype.resize = function() {
	GuiScroll.parent.resize.call(this);
	this.resizeScroll();
	if (this.scroll) {
		this.scroll.refresh();
	}
};/*
 * GuiSprite - sprite of GuiScene
 */

GuiSprite.prototype = new GuiDiv();
GuiSprite.prototype.constructor = GuiSprite;

/**
 * @constructor
 */
function GuiSprite() {
	GuiSprite.parent.constructor.call(this);
}

GuiSprite.inheritsFrom(GuiDiv);
GuiSprite.prototype.className = "GuiSprite";

GuiSprite.prototype.createInstance = function(params) {
	var entity = new GuiSprite();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiSprite);

GuiSprite.prototype.initialize = function(params) {
	GuiSprite.parent.initialize.call(this, params);
	
	this.clampByViewport = this.clampByViewportSimple;

	this.totalWidth = params['totalImageWidth'];
	this.totalHeight = params['totalImageHeight'];

	this.totalSrc = params['totalImage'];
	// // .hack temporary for older games
	// if (GUI_SPRITE_IMAGES_FROM_RESOURCES) {
	// this.totalSrc = Resources.getImage(params['totalImage']);
	// }

	if (params['totalTile'] == null) {
		this.totalTile = {
			x : 0,
			y : 0
		};
	} else {
		this.totalTile = params['totalTile'];
	}
	this.flipped = false;

	this.setBackground(this.totalSrc);

	this.currentAnimation = null;
	this.animations = new Object();

	var that = this;
	if (params['spriteAnimations']) {
		$['each'](params['spriteAnimations'], function(name, value) {
			// console.log("Adding sprite animation " + name);
			that.addSpriteAnimation(name, value);
		});
	}

	this.jObject['css']("background-position", Math.floor(Screen.widthRatio()
			* this.totalTile.x * this.width)
			+ "px "
			+ Math.floor(Screen.heightRatio() * this.height * this.totalTile.y)
			+ "px");
};

GuiSprite.prototype.addSpriteAnimation = function(name, description) {
	this.animations[name] = {
		frames : description['frames'],
		row : description['row'],
		frameDuration : description['frameDuration']
	};
};

GuiSprite.prototype.addAnimation = function(animationName, frames, row,
		frameDuration) {
	this.animations[animationName] = {
		frames : frames,
		row : row,
		frameDuration : frameDuration
	};
};

GuiSprite.prototype.update = function(dt) {
	if (this.currentAnimation == null)
		return;

	var curTime = (new Date()).getTime();
	var dt = curTime - this.lastUpdateTime;
	this.lastUpdateTime = curTime;

	this.currentFrameTime += dt;

	while (this.currentFrameTime >= this.currentFrameLength) {
		this.updateAnimation();
		this.currentFrameTime -= this.currentFrameLength;
	}
};

GuiSprite.prototype.updateAnimation = function() {
	if (this.currentAnimation == null)
		return;
	if (this.currentFrame >= this.animations[this.currentAnimation].frames.length) {
		this.currentFrame = 0;
		if (!this.looped) {
			this.stopAnimation();
			return;
		}
	}

	// console.log("Frames " + this.currentFrame);
	var rowFramesLength = Math.round(this.totalWidth / this.width);
	var frame = this.animations[this.currentAnimation].frames[this.currentFrame];
	var remainder = frame % rowFramesLength;
	var q = (frame - remainder) / rowFramesLength;
	var row = this.animations[this.currentAnimation].row + q;
	frame = remainder;

	this.jObject['css']("background-position", Math.round(-Screen.widthRatio()
			* frame * this.width)
			+ "px "
			+ Math.round(-Screen.heightRatio() * row * this.height)
			+ "px ");

	this.frame = frame;
	this.row = row;
	this.setRealBackgroundPosition();

	this.currentFrame++;

};

GuiSprite.prototype.stopAnimation = function(dontCallCallback) {
	this.jObject['stop']();
	clearInterval(this.updateAnimationCallback);
	this.updateAnimationCallback = null;
	this.currentAnimation = null;

	if (!dontCallCallback && this.animationEndCallback) {
		// trick with oldCallback is to allow to call setCallback
		// iside callback itself
		var oldCallback = this.animationEndCallback;
		this.animationEndCallback = null;
		oldCallback.call(this);
	}
};

GuiSprite.prototype.remove = function() {
	GuiSprite.parent.remove.call(this);
	clearInterval(this.updateAnimationCallback);
	this.updateAnimationCallback = null;
};

GuiSprite.prototype.setAnimationEndCallback = function(animationEndCallback) {
	this.animationEndCallback = animationEndCallback;
};

GuiSprite.prototype.playAnimation = function(animationName, duration, isLooped,
		independentUpdate) {
	var animation = this.animations[animationName];
	assert(animation, "No such animation: " + animationName);

	this.stopAnimation(true);

	this.currentAnimation = animationName;

	this.lastAnimation = animationName;

	var that = this;
	this.currentFrame = 0;
	this.currentFrameTime = 0;
	this.lastUpdateTime = (new Date()).getTime();

	if (duration) {
		this.currentFrameLength = duration / animation.frames.length;
		// console.log("frame lenght " + this.currentFrameLength + ", " +
		// animation.frames.length);
	} else {
		this.currentFrameLength = this.animations[this.currentAnimation].frameDuration;
	}
	this.looped = isLooped;

	if (independentUpdate) {
		this.updateAnimationCallback = setInterval(function() {
			that.updateAnimation();
		}, this.currentFrameLength);
	}
	this.updateAnimation();
};

GuiSprite.prototype.isPlayingAnimation = function(animationName) {
	return this.currentAnimation == animationName;
};

GuiSprite.prototype.animate = function(moveVector, duration) {
	var that = this;
	this.jObject['animate']({
		left : moveVector.x * Screen.widthRatio() + 'px',
		top : moveVector.y * Screen.heightRatio() + 'px'
	}, {
		duration : duration,
		easing : "linear",
		complete : function() {
			that.stopAnimation();
			// that.x = $("#" + that.id)['css']("left");
		}
	// ,
	// step : function(now, fx) {
	// console.log($("#" + that.id)['css']("left"));
	// }
	});
};

GuiSprite.prototype.flip = function(needToBeFlipped) {
	this.flipped = needToBeFlipped;
	this.scale = this.flipped ? -1 : 1;
	this.transform();
};

GuiSprite.prototype.transform = function(transfromations) {
	if (transfromations) {
		if (transfromations.matrix != null)
			this.matrix = transfromations.matrix;
		if (transfromations.angle != null)
			this.angle = transfromations.angle;
		if (transfromations.scale != null)
			this.scale = transfromations.scale;
		if (transfromations.translate != null)
			this.translate = transfromations.translate;
	}

	if (Device.nativeRender()) {
		var scale = this.scale == undefined ? 1 : this.scale;
		var scaleX = scale * Screen.widthRatio();
		var scaleY = scale * Screen.heightRatio();
		var translateX = (this.x + this.width / 2) * Screen.widthRatio();
		var translateY = (this.y + this.height / 2) * Screen.heightRatio();
		assert(this.nativeRenderImageId !== undefined,
				"nativeRenderImageId not set");
		Device.nativeRender().updateImage(this.nativeRenderImageId, translateX,
				translateY, scaleX, scaleY, this.angle);
	} else
		cssTransform(this.jObject, this.matrix, this.angle, this.scale,
				this.scale, this.translate);
};

GuiSprite.prototype.rotate = function(angle) {
	this.angle = angle;
	this.transform();
};

GuiSprite.prototype.setTransformOrigin = function(transformOrigin) {
	this.transformOrigin = transformOrigin;
	// console.log("Set transform origin to %s", transformOrigin);
	var obj = this.jObject;
	obj['css']("-webkit-transform-origin", transformOrigin);
	obj['css']("transform-origin", transformOrigin);
	obj['css']("-moz-transform-origin", transformOrigin);
	obj['css']("-o-transform-origin", transformOrigin);
	obj['css']("transform-origin", transformOrigin);
	obj['css']("msTransform-origin", transformOrigin);
};

GuiSprite.prototype.setPosition = function(x, y) {
	this.x = x;
	this.y = y;

	if (this.viewport) {
		this.clampByViewport();
	} else {
		this.setRealPosition(x, y);
	}
};

GuiSprite.prototype.setRealPosition = function(x, y) {
	this.transform({
		translate : {
			x : Math.round(x * Screen.widthRatio()),
			y : Math.round(y * Screen.heightRatio())
		}
	});
};

GuiSprite.prototype.setTransform = function(matrix, angle) {
	this.angle = angle;
	this.matrix = matrix;
	this.transform();
};

GuiSprite.prototype.resize = function() {
	GuiSprite.parent.resize.call(this);
	this.setRealBackgroundPosition();
};

GuiSprite.prototype.setRealBackgroundPosition = function(offsetX, offsetY) {
	var frame = selectValue(this.frame, 0);
	var row = selectValue(this.row, 0);
	this.jObject['css']("background-position", Math.round(Screen.widthRatio()
			* (-frame * this.width + offsetX))
			+ "px "
			+ Math.round(Screen.heightRatio() * (row * this.height + offsetY))
			+ "px ");
};

GuiSprite.prototype.resizeBackground = function() {
	var size = Screen.calcRealSize(this.totalWidth, this.totalHeight);
	this.jObject['css']("background-size", size.x + "px " + size.y + "px");
};/*
 * GuiSkeleton - container for animated objects, consists of:
 * - array of bones or bodyparts 
 * - keyframes
 * - animations
 */

GuiSkeleton.prototype = new GuiElement();
GuiSkeleton.prototype.constructor = GuiSkeleton;

/**
 * @constructor
 */
function GuiSkeleton() {
	GuiSkeleton.parent.constructor.call(this);
}

GuiSkeleton.inheritsFrom(GuiElement);
GuiSkeleton.prototype.className = "GuiSkeleton";

GuiSkeleton.prototype.createInstance = function(params) {
	var entity = new GuiSkeleton();
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiSkeleton);

GuiSkeleton.prototype.initialize = function(params) {
	this.bones = {};

	this.viewRect = {};
	this.clampByViewport = GuiDiv.prototype.clampByViewportSimple;

	GuiSkeleton.parent.initialize.call(this, params);

	var keyframesData = params['keyframes'];
	var bones = params['bones'];
	var avatarData = params['bones'];
	this.framesNum = selectValue(params['framesNum'], 120);
};

GuiSkeleton.prototype.addBone = function(params) {
	// name - unique id, specifies bone in keyfraymes
	// parent - parent bone, currently not implemented
	// image - bone's image filename
	// priority - drawing priority
	// transformOrigin
	// initialPartTransform
	// initialBoneTransform

	var name = params.name;
	var bone = {};
	this.bones[name] = bone;
	bone.keyframes = params.keyframes;

	// TODO frames for the bone should be shared between all GuiSkeletons
	// frames for the bone
	bone.frames = new Array();
	// not scaled frames
	bone.originalFrames = new Array();

	var transformOriginArray = params.transformOrigin;
	var initialBoneTransformArray = params.initialBoneTransform;
	var initialPartTransformArray = params.initialPartTransform;

	var transformBone = new Transform();
	var transformBoneNegative = new Transform();

	transformBone.translate(initialBoneTransformArray[0],
			initialBoneTransformArray[1]);
	transformBoneNegative.translate(-initialBoneTransformArray[0],
			-initialBoneTransformArray[1]);

	var transformRotate = new Transform();
	var boneRotate = params.initialBoneTransform.rotate;
	if (boneRotate) {
		transformRotate.rotateDegrees(boneRotate);
	}

	var transformOriginNegative = new Transform();
	transformOriginNegative.translate(-transformOriginArray[0],
			-transformOriginArray[1]);

	var transformPart = new Transform();
	var transformPartNegative = new Transform();

	transformPart.translate(initialPartTransformArray[0],
			initialPartTransformArray[1]);
	transformPartNegative.translate(-initialPartTransformArray[0],
			-initialPartTransformArray[1]);

	var transformOriginPositive = new Transform();
	transformOriginPositive.translate(transformOriginArray[0],
			transformOriginArray[1]);

	var resultMatrix = new Transform();
	resultMatrix.multiply(transformBone);
	resultMatrix.multiply(transformPart);
	resultMatrix.multiply(transformOriginPositive);
	resultMatrix.multiply(transformRotate);
	resultMatrix.multiply(transformOriginNegative);

	var image = params.image;

	var sprite = guiFactory.createObject("GuiSprite", {
		parent : this,
		style : "sprite",
		width : params.width,
		height : params.height,
		x : 0,
		y : 0,
		totalImage : image,
		totalImageWidth : params.width,
		totalImageHeight : params.height,
		totalImageTile : false
	});

	this.addGui(sprite);
	sprite.show();
	bone.sprite = sprite;

	if ($['browser']['mozilla']) {
		resultMatrix.m[4] += "px";
		resultMatrix.m[5] += "px";
	}
	sprite.setTransform(resultMatrix.m.join(","), null);

	// add animation
	var step = 0;
	if (bone.keyframes['frames']) {
		while (step < this.framesNum) {
			if (bone.keyframes['frames'][step]) {

				var framesTransformArray = bone.keyframes['frames'][step]['matrix']
						.split(",");
				var transformFrameBone = new Transform();
				transformFrameBone.translate(framesTransformArray[4],
						framesTransformArray[5]);

				var transformOffset = new Transform();
				transformOffset.translate(0, 0);

				var transformFrameRotate = new Transform();
				var framesRotate = bone.keyframes['frames'][step]['rotate'];
				if (framesRotate) {
					// console.log("bone rotation is %s", framesRotate);
					// ctx.rotate(boneRotate * Math.PI / 180);
					transformFrameRotate.rotateDegrees(framesRotate);
				}

				var resultFrameMatrix = new Transform();
				resultFrameMatrix.multiply(transformFrameBone);
				resultFrameMatrix.multiply(transformPart);
				resultFrameMatrix.multiply(transformOriginPositive);
				resultFrameMatrix.multiply(transformFrameRotate);
				resultFrameMatrix.multiply(transformOriginNegative);

				if ($['browser']['mozilla']) {
					resultFrameMatrix.m[4] += "px";
					resultFrameMatrix.m[5] += "px";
				}
				bone.frames[step] = bone.originalFrames[step] = resultFrameMatrix.m
						.join(",");
			}
			step++;
		}
	}
};

GuiSkeleton.prototype.prepareAnimations = function(params) {
	var that = this;
	if (this.bones == null)
		return;
	// console.log("GuiSkeleton no resize");
	$['each'](this.bones, function(name, bone) {
		// console.log("GuiSkeleton bone " + name);
		//bone.sprite.resize();
		if (bone.originalFrames) {
			for ( var frame = 0; frame < that.framesNum; frame++) {
				var animationFrame = bone.originalFrames[frame];
				if (animationFrame) {
					var animationFrameArray = animationFrame.split(",");
					animationFrameArray[4] = animationFrameArray[4].replace(
							"px", "")
							* Screen.widthRatio();
					animationFrameArray[5] = animationFrameArray[5].replace(
							"px", "")
							* Screen.heightRatio();
					if ($['browser']['mozilla']) {
						animationFrameArray[4] += "px";
						animationFrameArray[5] += "px";
					}
					animationFrame = animationFrameArray.join(",");
					bone.frames[frame] = animationFrame;
				}
			}
			var animationFrame = bone.frames[0];
			bone.sprite.setTransform(animationFrame, null);
		}
	});
};


GuiSkeleton.prototype.resize = function() {

	GuiSkeleton.parent.resize.call(this);

	// to prevent from redundant resizing
	if (this.resizeWidthRatio == Screen.widthRatio()
			|| this.resizeHeightRatio == Screen.heightRatio()) {
		return;
	}
	this.resizeWidthRatio = Screen.widthRatio();
	this.resizeHeightRatio = Screen.heightRatio();


	// if (this.viewport) {
	// console.log("CLAMPING",);
	// this.clampByViewport();
	// }
	this.prepareAnimations();

};

GuiSkeleton.prototype.setAnimations = function(animations) {
	this.animations = animations;
};

GuiSkeleton.prototype.setCurrentAnimation = function(animationName) {
	this.currentAnimation = animationName;
	if (this.animations[animationName]) {
		this.frame = this.animations[animationName]['begin'];
		var steps = this.animations[animationName]['end']
				- this.animations[animationName]['begin'];
		return steps;
	}
	return 0;
};

GuiSkeleton.prototype.advanceFrame = function() {
	var that = this;
	$['each'](this.bones, function(name, bone) {
		if (bone.frames) {
			var animationFrame = bone.frames[that.frame];
			if (animationFrame) {
				bone.sprite.setTransform(animationFrame, null);
			}
		}
	});
	this.frame++;
	if (this.frame >= this.animations[this.currentAnimation]['end']) {
		this.frame = this.animations[this.currentAnimation]['begin'];
	}
};

GuiSkeleton.prototype.stopAnimation = function() {

};

GuiSkeleton.prototype.playAnimation = function(animationName, animationTime,
		animationCycles) {
	// console.log("update frames");

	console.log("Play animation %s with time %f and cycles %d", animationName,
			animationTime, animationCycles);

	this.currentAnimation = animationName;
	this.currentAnimationCycles = animationCycles;

	if (this.animations[animationName]) {

		var steps = this.animations[animationName]['end']
				- this.animations[animationName]['begin'];
		var animationStepTime = animationTime / steps;

		this.frame = this.animations[animationName]['begin'];
		var that = this;
		var updateFrame = function() {
			if (that.frame >= that.animations[animationName]['end']) {
				that.frame = 0;
				that.currentAnimationCycles--;
				if (that.currentAnimationCycles > 0) {
					setTimeout(updateFrame, animationStepTime);
				}
			} else {
				setTimeout(updateFrame, animationStepTime);
			}
		};
		setTimeout(updateFrame, animationStepTime);
	} else {
		console.log("There is no animation with name %s in the %s",
				animationName, this.animations);
	}
};

GuiSkeleton.prototype.animate = function(moveVector, duration) {
	var that = this;
	this.jObject['animate']({
		left : moveVector.x * Screen.widthRatio() + 'px',
		top : moveVector.y * Screen.heightRatio() + 'px'
	}, {
		duration : duration,
		easing : "linear",
		complete : function() {
			that.stopAnimation();
			// that.x = $("#" + that.id)['css']("left");
		}
	// ,
	// step : function(now, fx) {
	// console.log($("#" + that.id)['css']("left"));
	// }
	});
};

GuiSkeleton.prototype.flip = function(needToBeFlipped) {
	this.flipped = needToBeFlipped;
	this.scale = this.flipped ? -1 : 1;
	cssTransform(this.jObject, null, null, this.scale, null, null);
};

GuiSkeleton.prototype.clampByParentViewport = function(isTrue) {
	if (isTrue == false) {
		this.setViewport(null, null);
		this.resize();
	} else {
		this.setViewport(this.parent.viewRect, true);
	}
};

GuiSkeleton.prototype.setViewport = function(rect, isParent) {
	this.viewport = rect;
	this.isParentsViewport = isParent;
	if (this.jObject && this.viewport) {
		this.clampByViewport();
	}
};
GuiSkeleton.prototype.setPosition = function(x, y) {
	GuiSkeleton.parent.setPosition.call(this, x, y);
	if (this.viewport) {
		this.clampByViewport();
	}
};/**
 * Scene to operate Sprites
 */

GuiScene.prototype = new GuiDiv();
GuiScene.prototype.constructor = GuiScene;

/**
 * @constructor
 */
function GuiScene() {
	GuiScene.parent.constructor.call(this);
}

GuiScene.inheritsFrom(GuiDiv);
GuiScene.prototype.className = "GuiScene";

GuiScene.prototype.createInstance = function(params) {
	var entity = new GuiScene(params['parent'], params['style'], params['width'],
			params['height'], null);
	entity.initialize(params);
	return entity;
};

guiFactory.addClass(GuiScene);
///
///

var HOME_URL = "http://kittyworldon.appspot.com/";

var GAME_STATE_UI_FILE = 'resources/ui/gameState.json';
var MENU_GUI_JSON = "resources/ui/menuState.json";

var DESCRIPTIONS_FILE = 'resources/descriptions.json';

var TOTAL_SPRITE_FILE = "images/home/jsonImage.png";

var ART_ENTITY_WIDTH = 176;
var ART_ENTITY_HEIGHT = 261;

// var ART_ENTITY_WIDTH = 250;
// var ART_ENTITY_HEIGHT = 370;

// var ROOM_WIDTH = 1024;
var ROOM_WIDTH = 800;
var ROOM_HEIGHT = 500;



MenuState.prototype = new BaseState();
MenuState.prototype.constructor = MenuState;
//Sound.add("click", "sounds/memoryGame/click", 1, 1.2);
/**
 * @constructor
 */
function MenuState() {
	this.preloadJson(MENU_GUI_JSON);
	this.preloadJson(DESCRIPTIONS_FILE);
	MenuState.parent.constructor.call(this);
};

MenuState.inheritsFrom(BaseState);

MenuState.prototype.className = "MenuState";
MenuState.prototype.createInstance = function(params) {
	var entity = new MenuState();
	entity.activate(params);
	return entity;
};

entityFactory.addClass(MenuState);

MenuState.prototype.jsonPreloadComplete = function() {
	MenuState.parent.jsonPreloadComplete.call(this);
};

MenuState.prototype.init = function(params) {
	MenuState.parent.init.call(this, params);

	
	guiFactory.createGuiFromJson(this.resources.json[MENU_GUI_JSON], this);
	var that = this;

	var playButton = this.getGui("play");
	playButton.bind(function(e) {
		Account.instance.switchState("GameState01", that.id, that.parent.id);
	});

	if (Loader['loadingMessageShowed']()) {
		Account.instance.backgroundState.fadeIn(LEVEL_FADE_TIME, "white",
				function() {
					Account.instance.backgroundState.fadeOut(LEVEL_FADE_TIME);
					Loader['hideLoadingMessage']();
					$(window)['trigger']("resize");
				});
	} else {
		Account.instance.backgroundState.fadeOut(LEVEL_FADE_TIME, function() {
			$(window)['trigger']("resize");
		});
	}
	// loadGame();
	
	//this.resize();
	console.log(this.getGui("enhancedScene"));
};
MenuState.prototype.resize = function() {
	MenuState.parent.resize.call(this);
};


GameState.prototype = new BaseState();
GameState.prototype.constructor = GameState;
//Sound.add("click", "sounds/memoryGame/click", 1, 1.2);
/**
 * @constructor
 */
function GameState() {
	this.preloadJson(GAME_STATE_UI_FILE);
	//this.preloadJson(DESCRIPTIONS_FILE);
	GameState.parent.constructor.call(this);
};

GameState.inheritsFrom(BaseState);

GameState.prototype.className = "GameState";
GameState.prototype.createInstance = function(params) {
	var entity = new GameState();
	entity.activate(params);
	return entity;
};

entityFactory.addClass(GameState);

GameState.prototype.jsonPreloadComplete = function() {
	GameState.parent.jsonPreloadComplete.call(this);
};

GameState.prototype.init = function(params) {
	GameState.parent.init.call(this, params);
	Account.instance.backgroundState.fadeOut(LEVEL_FADE_TIME, function() {
		
	});
	guiFactory.createGuiFromJson(this.resources.json[GAME_STATE_UI_FILE], this);
	var that = this;

	var playButton = this.getGui("backToMenu");
	playButton.bind(function(e) {
		Account.instance.switchState("MenuState01", that.id, that.parent.id);
	});

	Loader['hideLoadingMessage']();
	$(window)['trigger']("resize");
	// loadGame();
	
	//this.resize();
	console.log("game scene",this.getGui("enhancedScene"));
};
GameState.prototype.resize = function() {
	GameState.parent.resize.call(this);
};/**
 * Main.js
 */

// Entry point of the game
$(document).ready(function() {
	// Creating account a singleton
	(new BasicAccount()).init();

	var DESCRIPTIONS_FILE = 'resources/descriptions.json';
	Account.instance.preloadJson(DESCRIPTIONS_FILE);
	Account.instance.preload.call(Account.instance);
	Device.init();
	Resources.init();

	//disable console
	//console.log = function(){};
	// IMAGES
	Resources.addResolution("low", "images/low/");
	Resources.addResolution("normal", "images/", true);

	Screen.init(Account.instance);

	$(document)['bind']('keydown', function(e) {
		// Ctrl-Shift-Space
		if ((e.which == 32) && e.shiftKey && e.ctrlKey) {
			console.log("OUR ACCOUNT", Account.instance);
			e.stopPropagation();
			e.preventDefault();
			return false;
		}
	});

	var data = {
			"Account01" : {
				"class" : "Account",
				"state" : "MenuState01"
			},
			"MenuState01" : {
				"class" : "MenuState",
				"parent" : "Account01",
				"children" : {}
			}
			
	};
	Account.instance.readGlobalUpdate(data);

});
/**
 * 
 */

BasicAccount.prototype = new Account();
BasicAccount.prototype.constructor = BasicAccount;

/**
 * @constructor
 */
function BasicAccount(parent) {
	BasicAccount.parent.constructor.call(this);
};

BasicAccount.inheritsFrom(Account);
BasicAccount.prototype.className = "BasicAccount";

BasicAccount.prototype.jsonPreloadComplete = function() {
	Account.instance.descriptionsData = this.resources.json[DESCRIPTIONS_FILE];
};

BasicAccount.prototype.init = function() {
	BasicAccount.parent.init.call(this);
	this.states = new Object();
	//
	this.states["MenuState01"] = {
	"MenuState01" : {
		"class" : "MenuState",
		"parent" : "Account01",
		"children" : {}
	}
};

this.states["GameState01"] = {
	"GameState01" : {
		"class" : "GameState",
		"parent" : "Account01"
	}
};
	
	Account.instance = this;
};

BasicAccount.prototype.switchState = function(stateName, id,
		parentId) {
	var that = this;
	this.backgroundState.fadeIn(LEVEL_FADE_TIME, "white", function() {
		var data = new Object();
		$['each'](Account.instance.states, function(key, value) {
			if (key === stateName) {
				data = Account.instance.states[key];
				data[key]["parent"] = parentId;
				data[id] = {
					"destroy" : true
				};
				console.log(stateName,data);
				that.readGlobalUpdate(data);
			}
		});
	});
};
