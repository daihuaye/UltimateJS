/*!
 * Add to Homescreen v1.0.8 ~ Copyright (c) 2011 Matteo Spinelli, http://cubiq.org
 * Released under MIT license, http://cubiq.org/license
 */
(function(){
var nav = navigator,
	isIDevice = (/iphone|ipod|ipad/gi).test(nav.platform);
//.logicking
if(!isIDevice) {
	window.addToHomeClose = function() {};
	window.addToHomeOpen = function() {};
	return;
}
var isIPad = (/ipad/gi).test(nav.platform),
	isRetina = 'devicePixelRatio' in window && window.devicePixelRatio > 1,
	isSafari = nav.appVersion.match(/Safari/gi),
	hasHomescreen = 'standalone' in nav && isIDevice,
	isStandalone = hasHomescreen && nav.standalone,
	OSVersion = nav.appVersion.match(/OS \d+_\d+/g),
	platform = nav.platform.split(' ')[0],
	language = nav.language.replace('-', '_'),
	startY = startX = 0,
	expired = localStorage.getItem('_addToHome'),
	theInterval, closeTimeout, el, i, l,
	//.logicking
	openAlreadyCalledInThisSession,
	options = {
		animationIn: 'drop',		// drop || bubble || fade
		animationOut: 'fade',		// drop || bubble || fade
		startDelay: 2000,			// 2 seconds from page load before the balloon appears
		lifespan: 10000,			// 20 seconds before it is automatically destroyed
		bottomOffset: 14,			// Distance of the balloon from bottom
		expire: 60,					// Minutes to wait before showing the popup again (0 = always displayed)
		message: '',				// Customize your message or force a language ('' = automatic)
		touchIcon: true,			// Display the touch icon
		arrow: true,				// Display the balloon arrow
		iterations:100				// Internal/debug use
	},
	/* Message in various languages, en_us is the default if a language does not exist */
	intl = {
		ca_es: 'Per instalВ·lar aquesta aplicaciГі al vostre %device premeu %icon i llavors <strong>Afegir a pantalla d\'inici</strong>.',
		da_dk: 'TilfГёj denne side til din %device: tryk pГҐ %icon og derefter <strong>TilfГёj til hjemmeskГ¦rm</strong>.',
		de_de: 'Installieren Sie diese App auf Ihrem %device: %icon antippen und dann <strong>Zum Home-Bildschirm</strong>.',
		el_gr: 'О•ОіОєО±П„О±ПѓП„О®ПѓОµП„Оµ О±П…П„О®ОЅ П„О·ОЅ О•П†О±ПЃОјОїОіО® ПѓП„О®ОЅ ПѓП…ПѓОєОµП…О® ПѓО±П‚ %device: %icon ОјОµП„О¬ ПЂО±П„О¬П„Оµ <strong>О ПЃОїПѓОёО®ОєО· ПѓОµ О‘П†ОµП„О·ПЃОЇО±</strong>.',
		en_us: 'Install this web app on your %device: tap %icon and then <strong>Add to Home Screen</strong>.',
		es_es: 'Para instalar esta app en su %device, pulse %icon y seleccione <strong>AГ±adir a pantalla de inicio</strong>.',
		fi_fi: 'Asenna tГ¤mГ¤ web-sovellus laitteeseesi %device: paina %icon ja sen jГ¤lkeen valitse <strong>LisГ¤Г¤ Koti-valikkoon</strong>.',
		fr_fr: 'Ajoutez cette application sur votre %device en cliquant sur %icon, puis <strong>Ajouter Г  l\'Г©cran d\'accueil</strong>.',
		he_il: '<span dir="rtl">Ч”ЧЄЧ§Чџ ЧђЧ¤ЧњЧ™Ч§Ч¦Ч™Ч” Ч–Ч• ЧўЧњ Ч”-%device Ч©ЧњЧљ: Ч”Ч§Ч© %icon Ч•ЧђЧ– <strong>Ч”Ч•ЧЎЧЈ ЧњЧћЧЎЧљ Ч”Ч‘Ч™ЧЄ</strong>.</span>',
		hu_hu: 'TelepГ­tse ezt a web-alkalmazГЎst az Г–n %device-jГЎra: nyomjon a %icon-ra majd a <strong>FЕ‘kГ©pernyЕ‘hГ¶z adГЎs</strong> gombra.',
		it_it: 'Installa questa applicazione sul tuo %device: premi su %icon e poi <strong>Aggiungi a Home</strong>.',
		ja_jp: 'гЃ“гЃ®г‚¦г‚§гѓ–г‚ўгѓ—гѓЄг‚’гЃ‚гЃЄгЃџгЃ®%deviceгЃ«г‚¤гѓіг‚№гѓ€гѓјгѓ«гЃ™г‚‹гЃ«гЃЇ%iconг‚’г‚їгѓѓгѓ—гЃ—гЃ¦<strong>гѓ›гѓјгѓ з”»йќўгЃ«иїЅеЉ </strong>г‚’йЃёг‚“гЃ§гЃЏгЃ гЃ•гЃ„гЂ‚',
		ko_kr: '%deviceм—ђ м›№м•±мќ„ м„¤м№�н•�л ¤л©ґ %iconмќ„ н„°м№� н›„ "н™€н™”л©ґм—ђ м¶”к°Ђ"лҐј м„ нѓќн•�м„ёмљ”',
		nb_no: 'Installer denne appen pГҐ din %device: trykk pГҐ %icon og deretter <strong>Legg til pГҐ Hjem-skjerm</strong>',
		nl_nl: 'Installeer deze webapp op uw %device: tik %icon en dan <strong>Zet in beginscherm</strong>.',
		pt_br: 'Instale este web app em seu %device: aperte %icon e selecione <strong>Adicionar Г  Tela Inicio</strong>.',
		pt_pt: 'Para instalar esta aplicaГ§ГЈo no seu %device, prima o %icon e depois o <strong>Adicionar ao ecrГЈ principal</strong>.',
		ru_ru: 'РЈСЃС‚Р°РЅРѕРІРёС‚Рµ СЌС‚Рѕ РІРµР±-РїСЂРёР»РѕР¶РµРЅРёРµ РЅР° РІР°С€ %device: РЅР°Р¶РјРёС‚Рµ %icon, Р·Р°С‚РµРј <strong>Р”РѕР±Р°РІРёС‚СЊ РІ В«Р”РѕРјРѕР№В»</strong>.',
		sv_se: 'LГ¤gg till denna webbapplikation pГҐ din %device: tryck pГҐ %icon och dГ¤refter <strong>LГ¤gg till pГҐ hemskГ¤rmen</strong>.',
		th_th: 'аё•аёґаё”аё•аё±а№‰аё‡а№Ђаё§а№‡аёља№Ѓаё­аёћаёЇ аё™аёµа№‰аёљаё™ %device аё‚аё­аё‡аё„аёёаё“: а№Ѓаё•аё° %icon а№ЃаёҐаё° <strong>а№Ђаёћаёґа№€аёЎаё—аёµа№€аё«аё™а№‰аёІаё€аё­а№‚аё®аёЎ</strong>',
		tr_tr: '%device iГ§in bu uygulamayД± kurduktan sonra %icon simgesine dokunarak <strong>Ev EkranД±na Ekle</strong>yin.',
		zh_cn: 'ж‚ЁеЏЇд»Ґе°†ж­¤еє”з”ЁзЁ‹ејЏе®‰иЈ…е€°ж‚Ёзљ„ %device дёЉгЂ‚иЇ·жЊ‰ %icon з„¶еђЋз‚№йЂ‰<strong>ж·»еЉ и‡ідё»е±Џе№•</strong>гЂ‚',
		zh_tw: 'ж‚ЁеЏЇд»Ґе°‡ж­¤ж‡‰з”ЁзЁ‹ејЏе®‰иЈќе€°ж‚Ёзљ„ %device дёЉгЂ‚и«‹жЊ‰ %icon з„¶еѕЊй»ћйЃё<strong>еЉ е…Ґдё»з•«йќўићўе№•</strong>гЂ‚'
	};

OSVersion = OSVersion ? OSVersion[0].replace(/[^\d_]/g,'').replace('_','.')*1 : 0;
expired = expired == 'null' ? 0 : expired*1;

// Merge options
if (window.addToHomeConfig) {
	for (i in window.addToHomeConfig) {
		options[i] = window.addToHomeConfig[i];
	}
}

// Is it expired?
if (!options.expire || expired < new Date().getTime()) {
	expired = 0;
}

/* Bootstrap */
//.logicking
function open() {
	if (hasHomescreen && !expired && !isStandalone && isSafari && !closeTimeout &&
			!openAlreadyCalledInThisSession) {
		ready();
		loaded();
	}
}
//if (hasHomescreen && !expired && !isStandalone && isSafari) {
//	document.addEventListener('DOMContentLoaded', ready, false);
//	window.addEventListener('load', loaded, false);
//}


/* on DOM ready */
function ready () {
	document.removeEventListener('DOMContentLoaded', ready, false);

	var div = document.createElement('div'),
		close,
		link = options.touchIcon ? document.querySelectorAll('head link[rel=apple-touch-icon],head link[rel=apple-touch-icon-precomposed]') : [],
		sizes, touchIcon = '';

	div.id = 'addToHomeScreen';
	div.style.cssText += 'position:absolute;-webkit-transition-property:-webkit-transform,opacity;-webkit-transition-duration:0;-webkit-transform:translate3d(0,0,0);';
	div.style.left = '-9999px';		// Hide from view at startup
	
	// Localize message
	if (options.message in intl) {		// You may force a language despite the user's locale
		language = options.message;
		options.message = '';
	}
	if (options.message == '') {		// We look for a suitable language (defaulted to en_us)
		options.message = language in intl ? intl[language] : intl['en_us'];
	}

	// Search for the apple-touch-icon
	if (link.length) {
		for (i=0, l=link.length; i<l; i++) {
			sizes = link[i].getAttribute('sizes');

			if (sizes) {
				if (isRetina && sizes == '114x114') { 
					touchIcon = link[i].href;
					break;
				}
			} else {
				touchIcon = link[i].href;
			}
		}

		touchIcon = '<span style="background-image:url(' + touchIcon + ')" class="touchIcon"></span>';
	}

	div.className = (isIPad ? 'ipad' : 'iphone') + (touchIcon ? ' wide' : '');
	div.innerHTML = touchIcon + options.message.replace('%device', platform).replace('%icon', OSVersion >= 4.2 ? '<span class="share"></span>' : '<span class="plus">+</span>') + (options.arrow ? '<span class="arrow"></span>' : '') + '<span class="close">\u00D7</span>';
	//.logicking close to the whole popup to make it more easier to user to close it
	div.innerHTML = '<span class="closeZone">' + div.innerHTML + '</span>';
	
	document.body.appendChild(div);
	el = div;

	// Add the close action
	//.logicking close to closeZone
	close = el.querySelector('.closeZone');
	//.logicking 'click' changed to 'touchend'
	if (close) close.addEventListener('touchend', addToHomeClose, false);

	// Add expire date to the popup
	try {
		if (options.expire) localStorage.setItem('_addToHome', new Date().getTime() + options.expire*60*1000);	
	} catch(e) {
		
	}
}


/* on window load */
function loaded () {
	window.removeEventListener('load', loaded, false);

	setTimeout(function () {
		var duration;
		
		startY = isIPad ? window.scrollY : window.innerHeight + window.scrollY;
		startX = isIPad ? window.scrollX : Math.round((window.innerWidth - el.offsetWidth)/2) + window.scrollX;

		el.style.top = isIPad ? startY + options.bottomOffset + 'px' : startY - el.offsetHeight - options.bottomOffset + 'px';
		el.style.left = isIPad ? startX + (OSVersion >=5 ? 160 : 208) - Math.round(el.offsetWidth/2) + 'px' : startX + 'px';

		switch (options.animationIn) {
			case 'drop':
				if (isIPad) {
					duration = '0.6s';
					el.style.webkitTransform = 'translate3d(0,' + -(window.scrollY + options.bottomOffset + el.offsetHeight) + 'px,0)';
				} else {
					duration = '0.9s';
					el.style.webkitTransform = 'translate3d(0,' + -(startY + options.bottomOffset) + 'px,0)';
				}
				break;
			case 'bubble':
				if (isIPad) {
					duration = '0.6s';
					el.style.opacity = '0'
					el.style.webkitTransform = 'translate3d(0,' + (startY + 50) + 'px,0)';
				} else {
					duration = '0.6s';
					el.style.webkitTransform = 'translate3d(0,' + (el.offsetHeight + options.bottomOffset + 50) + 'px,0)';
				}
				break;
			default:
				duration = '1s';
				el.style.opacity = '0';
		}

		setTimeout(function () {
			el.style.webkitTransitionDuration = duration;
			el.style.opacity = '1';
			el.style.webkitTransform = 'translate3d(0,0,0)';
			el.addEventListener('webkitTransitionEnd', transitionEnd, false);
		}, 0);

		closeTimeout = setTimeout(addToHomeClose, options.lifespan);
		openAlreadyCalledInThisSession = true;
	}, options.startDelay);
}

function transitionEnd () {
	el.removeEventListener('webkitTransitionEnd', transitionEnd, false);
	el.style.webkitTransitionProperty = '-webkit-transform';
	el.style.webkitTransitionDuration = '0.2s';

	if (closeTimeout) {		// Standard loop
		clearInterval(theInterval);
		theInterval = setInterval(setPosition, options.iterations);
	} else {				// We are closing
		el.parentNode.removeChild(el);
	}
}

function setPosition () {
	var matrix = new WebKitCSSMatrix(window.getComputedStyle(el, null).webkitTransform),
		posY = isIPad ? window.scrollY - startY : window.scrollY + window.innerHeight - startY,
		posX = isIPad ? window.scrollX - startX : window.scrollX + Math.round((window.innerWidth - el.offsetWidth)/2) - startX;

	if (posY == matrix.m42 && posX == matrix.m41) return;

	clearInterval(theInterval);
	el.removeEventListener('webkitTransitionEnd', transitionEnd, false);

	setTimeout(function () {
		el.addEventListener('webkitTransitionEnd', transitionEnd, false);
		el.style.webkitTransform = 'translate3d(' + posX + 'px,' + posY + 'px,0)';
	}, 0);
}

function addToHomeClose () {
	clearInterval(theInterval);
	clearTimeout(closeTimeout);
	closeTimeout = null;
	el.removeEventListener('webkitTransitionEnd', transitionEnd, false);
	
	var posY = isIPad ? window.scrollY - startY : window.scrollY + window.innerHeight - startY,
		posX = isIPad ? window.scrollX - startX : window.scrollX + Math.round((window.innerWidth - el.offsetWidth)/2) - startX,
		opacity = '1',
		duration = '0',
		close = el.querySelector('.closeZone');

	//.logicking 'click' changed to 'touchend'
	if (close) close.removeEventListener('touchend', addToHomeClose, false);

	el.style.webkitTransitionProperty = '-webkit-transform,opacity';

	switch (options.animationOut) {
		case 'drop':
			if (isIPad) {
				duration = '0.4s';
				opacity = '0';
				posY = posY + 50;
			} else {
				duration = '0.6s';
				posY = posY + el.offsetHeight + options.bottomOffset + 50;
			}
			break;
		case 'bubble':
			if (isIPad) {
				duration = '0.8s';
				posY = posY - el.offsetHeight - options.bottomOffset - 50;
			} else {
				duration = '0.4s';
				opacity = '0';
				posY = posY - 50;
			}
			break;
		default:
			duration = '0.8s';
			opacity = '0';
	}

	el.addEventListener('webkitTransitionEnd', transitionEnd, false);
	el.style.opacity = opacity;
	el.style.webkitTransitionDuration = duration;
	el.style.webkitTransform = 'translate3d(' + posX + 'px,' + posY + 'px,0)';
}

/* Public functions */
window.addToHomeClose = addToHomeClose;
//.logicking
window.addToHomeOpen = open;
})();