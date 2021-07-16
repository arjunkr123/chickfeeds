
/*################ ddsmoothmenu.js starts ###################*/
var ddsmoothmenu = {

///////////////////////// Global Configuration Options: /////////////////////////

mobilemediaquery: "screen and (max-width:992px)", // CSS media query string that when matched activates mobile menu (while hiding default)
//Specify full URL to down and right arrow images (23 is padding-right for top level LIs with drop downs, 6 is for vertical top level items with fly outs):
arrowimages: {down:['downarrowclass', 'spacer.png', 23], right:['rightarrowclass', 'spacer.png', 6], left:['leftarrowclass', 'spacer.png']},
transition: {overtime:300, outtime:300}, //duration of slide in/ out animation, in milliseconds
mobiletransition: 200, // duration of slide animation in mobile menu, in milliseconds
shadow: false, //enable shadow? (offsets now set in ddsmoothmenu.css stylesheet)
showhidedelay: {showdelay: 100, hidedelay: 200}, //set delay in milliseconds before sub menus appear and disappear, respectively
zindexvalue: 1000, //set z-index value for menus
closeonnonmenuclick: true, //when clicking outside of any "toggle" method menu, should all "toggle" menus close? 
closeonmouseout: false, //when leaving a "toggle" menu, should all "toggle" menus close? Will not work on touchscreen

/////////////////////// End Global Configuration Options ////////////////////////

overarrowre: /(?=\.(gif|jpg|jpeg|png|bmp))/i,
overarrowaddtofilename: '_over',
detecttouch: !!('ontouchstart' in window) || !!('ontouchstart' in document.documentElement) || !!window.ontouchstart || (!!window.Touch && !!window.Touch.length) || !!window.onmsgesturechange || (window.DocumentTouch && window.document instanceof window.DocumentTouch),
detectwebkit: navigator.userAgent.toLowerCase().indexOf("applewebkit") > -1, //detect WebKit browsers (Safari, Chrome etc)
detectchrome: navigator.userAgent.toLowerCase().indexOf("chrome") > -1, //detect chrome
ismobile: navigator.userAgent.match(/(iPad)|(iPhone)|(iPod)|(android)|(webOS)/i) != null, //boolean check for popular mobile browsers
idevice: /ipad|iphone/i.test(navigator.userAgent),
detectie6: (function(){var ie; return (ie = /MSIE (\d+)/.exec(navigator.userAgent)) && ie[1] < 7;})(),
detectie9: (function(){var ie; return (ie = /MSIE (\d+)/.exec(navigator.userAgent)) && ie[1] > 8;})(),
ie9shadow: function(){},
css3support: typeof document.documentElement.style.boxShadow === 'string' || (!document.all && document.querySelector), //detect browsers that support CSS3 box shadows (ie9+ or FF3.5+, Safari3+, Chrome etc)
prevobjs: [], menus: null,
mobilecontainer: {$main: null, $topulsdiv: null, $toggler: null, hidetimer: null},
mobilezindexvalue: 2000, // mobile menus starting zIndex

executelink: function($, prevobjs, e){
	var prevscount = prevobjs.length, link = e.target;
	while(--prevscount > -1){
		if(prevobjs[prevscount] === this){
			prevobjs.splice(prevscount, 1);
			if(link.href !== ddsmoothmenu.emptyhash && link.href && $(link).is('a') && !$(link).children('span.' + ddsmoothmenu.arrowimages.down[0] +', span.' + ddsmoothmenu.arrowimages.right[0]).length){
				if(link.target && link.target !== '_self'){
					window.open(link.href, link.target);
				} else {
					window.location.href = link.href;
				}
				e.stopPropagation();
			}
		}
	}
},

repositionv: function($subul, $link, newtop, winheight, doctop, method, menutop){
	menutop = menutop || 0;
	var topinc = 0, doclimit = winheight + doctop;
	$subul.css({top: newtop, display: 'block'});
	while($subul.offset().top < doctop) {
		$subul.css({top: ++newtop});
		++topinc;
	}
	if(!topinc && $link.offset().top + $link.outerHeight() < doclimit && $subul.data('height') + $subul.offset().top > doclimit){
		$subul.css({top: doctop - $link.parents('ul').last().offset().top - $link.position().top});
	}
	method === 'toggle' && $subul.css({display: 'none !important'});
	if(newtop !== menutop){$subul.addClass('repositionedv');}
	return [topinc, newtop];
},

updateprev: function($, prevobjs, $curobj){
	var prevscount = prevobjs.length, prevobj, $indexobj = $curobj.parents().add(this);
	while(--prevscount > -1){
		if($indexobj.index((prevobj = prevobjs[prevscount])) < 0){
			$(prevobj).trigger('click', [1]);
			prevobjs.splice(prevscount, 1);
		}
	}
	prevobjs.push(this);
},

subulpreventemptyclose: function(e){
	var link = e.target;
	if(link.href === ddsmoothmenu.emptyhash && $(link).parent('li').find('ul').length < 1){
		e.preventDefault();
		e.stopPropagation();
	}
},

getajaxmenu: function($, setting, nobuild){ //function to fetch external page containing the panel DIVs
	var $menucontainer=$('#'+setting.contentsource[0]); //reference empty div on page that will hold menu
	$menucontainer.html("Loading Menu...");
	$.ajax({
		url: setting.contentsource[1], //path to external menu file
		async: true,
		dataType: 'html',
		error: function(ajaxrequest){
			setting.menustate = "error"
			$menucontainer.html('Error fetching content. Server Response: '+ajaxrequest.responseText);
		},
		success: function(content){
			setting.menustate = "fetched"
			$menucontainer.html(content).find('#' + setting.mainmenuid).css('display', 'block');
			!!!nobuild && ddsmoothmenu.buildmenu($, setting);
		}
	});
},

getajaxmenuMobile: function($, setting){ //function to fetch external page containing the primary menu UL
	setting.mobilemenustate = 'fetching'
	$.ajax({
		url: setting.contentsource[1], //path to external menu file
		async: true,
		dataType: 'html',
		error: function(ajaxrequest){
			setting.mobilemenustate = 'error'
			alert("Error fetching Ajax content " + ajaxrequest.responseText)
		},
		success: function(content){
			var $ul = $(content).find('>ul')
			setting.mobilemenustate = 'fetched'
			ddsmoothmenu.buildmobilemenu($, setting, $ul);
		}
	});
},

closeall: function(e){
	var smoothmenu = ddsmoothmenu, prevscount;
	if(!smoothmenu.globaltrackopen){return;}
	if(e.type === 'mouseleave' || ((e.type === 'click' || e.type === 'touchstart') && smoothmenu.menus.index(e.target) < 0)){
		prevscount = smoothmenu.prevobjs.length;
		while(--prevscount > -1){
			$(smoothmenu.prevobjs[prevscount]).trigger('click');
			smoothmenu.prevobjs.splice(prevscount, 1);
		}
	}
},

emptyhash: $('<a href="#"></a>').get(0).href,

togglemobile: function(action, duration){
	if (!this.mobilecontainer.$main)
		return
	clearTimeout(this.mobilecontainer.hidetimer)
	var $mobilemenu = this.mobilecontainer.$main
	var duration = duration || this.mobiletransition
	if ($mobilemenu.css('visibility') == 'hidden' && (!action || action == 'open')){
		$mobilemenu.css({left: '-100%', visibility: 'visible'}).animate({left: 0}, duration)
		this.mobilecontainer.$toggler.addClass('open')
	}
	else if ($mobilemenu.css('visibility') == 'visible' && (!action || action != 'open')){
		$mobilemenu.animate({left: '-100%'}, duration, function(){this.style.visibility = 'hidden'})
		this.mobilecontainer.$toggler.removeClass('open')
	}
	return false
	
},

buildmobilemenu: function($, setting, $ul){

	function flattenuls($mainul, cloneulBol, callback, finalcall){
		var callback = callback || function(){}
		var finalcall = finalcall || function(){}
		var $headers = $mainul.find('ul').parent()
		var $mainulcopy = cloneulBol? $mainul.clone() : $mainul
		var $flattened = jQuery(document.createDocumentFragment())
		var $headers = $mainulcopy.find('ul').parent()
		for (var i=$headers.length-1; i>=0; i--){ // loop through headers backwards, so we end up with topmost UL last
			var $header = $headers.eq(i)
			var $subul = $header.find('>ul').prependTo($flattened)
			callback(i, $header, $subul)
		}
		$mainulcopy.prependTo($flattened) // Add top most UL to collection
		finalcall($mainulcopy)
		return $flattened
	}

	var $mainmenu = $('#' + setting.mainmenuid)
	var $mainul = $ul
	var $topulref = null

	var flattened = flattenuls($mainul, false,
		function(i, $header, $subul){ // loop through header LIs and sub ULs
			$subul.addClass("submenu")
			var $breadcrumb = $('<li class="breadcrumb" />')
				.html('<img src="' + ddsmoothmenu.arrowimages.left[1] +'" class="' + ddsmoothmenu.arrowimages.left[0] +'" />' + $header.text())
				.prependTo($subul)
			$header.find('a:eq(0)').append('<img src="' + ddsmoothmenu.arrowimages.right[1] +'" class="' + ddsmoothmenu.arrowimages.right[0] +'" />')
			$header.on('click', function(e){
				var $headermenu = $(this).parent('ul')
				$headermenu = $headermenu.hasClass('submenu')? $headermenu : $headermenu.parent()
				$headermenu.css({zIndex: ddsmoothmenu.mobilezindexvalue++, left: 0}).animate({left: '-100%'}, ddsmoothmenu.mobiletransition)
				$subul.css({zIndex: ddsmoothmenu.mobilezindexvalue++, left: '100%'}).animate({left: 0}, ddsmoothmenu.mobiletransition)
				e.stopPropagation()
				e.preventDefault()
			})
			$breadcrumb.on('click', function(e){
				var $headermenu = $header.parent('ul')
				$headermenu = $headermenu.hasClass('submenu')? $headermenu : $headermenu.parent()
				$headermenu.css({zIndex: ddsmoothmenu.mobilezindexvalue++, left: '-100%'}).animate({left: 0}, ddsmoothmenu.mobiletransition)
				$subul.css({zIndex: ddsmoothmenu.mobilezindexvalue++, left: 0}).animate({left: '100%'}, ddsmoothmenu.mobiletransition)
				e.stopPropagation()
				e.preventDefault()
			})
		},
		function($topul){
			$topulref = $topul
		}
	)


	if (!this.mobilecontainer.$main){ // if primary mobile menu container not defined yet
		var $maincontainer = $('<div class="ddsmoothmobile"><div class="topulsdiv"></div></div>').appendTo(document.body)
		$maincontainer
			.css({zIndex: this.mobilezindexvalue++, left: '-100%', visibility: 'hidden'})
			.on('click', function(e){ // assign click behavior to mobile container
				ddsmoothmenu.mobilecontainer.hidetimer = setTimeout(function(){
					ddsmoothmenu.togglemobile('close', 0)
				}, 50)
				e.stopPropagation()
			})
			.on('touchstart', function(e){
				e.stopPropagation()
			})
		var $topulsdiv = $maincontainer.find('div.topulsdiv')
		var $mobiletoggler = $('#ddsmoothmenu-mobiletoggle').css({display: 'block'})
		$mobiletoggler
			.on('click', function(e){ // assign click behavior to main mobile menu toggler
				ddsmoothmenu.togglemobile()
				e.stopPropagation()
			})
			.on('touchstart', function(e){
				e.stopPropagation()
			})		
		var hidemobilemenuevent = /(iPad|iPhone|iPod)/g.test( navigator.userAgent )? 'touchstart' : 'click' // ios doesnt seem to respond to clicks on BODY
		$(document.body).on(hidemobilemenuevent, function(e){
			if (!$maincontainer.is(':animated'))
				ddsmoothmenu.togglemobile('close', 0)
		})

		this.mobilecontainer.$main = $maincontainer
		this.mobilecontainer.$topulsdiv = $topulsdiv
		this.mobilecontainer.$toggler = $mobiletoggler
	}
	else{ // else, just reference mobile container on page
		var $maincontainer = this.mobilecontainer.$main
		var $topulsdiv = this.mobilecontainer.$topulsdiv
	}
	$topulsdiv.append($topulref).css({zIndex: this.mobilezindexvalue++})
	$maincontainer.append(flattened)

	setting.mobilemenustate = 'done'
	

},

buildmenu: function($, setting){
	// additional step to detect true touch support. Chrome desktop mistakenly returns true for this.detecttouch
	var detecttruetouch = (this.detecttouch && !this.detectchrome) || (this.detectchrome && this.ismobile)
	var smoothmenu = ddsmoothmenu;
	smoothmenu.globaltrackopen = smoothmenu.closeonnonmenuclick || smoothmenu.closeonmouseout;
	var zsub = 0; //subtractor to be incremented so that each top level menu can be covered by previous one's drop downs
	var prevobjs = smoothmenu.globaltrackopen? smoothmenu.prevobjs : [];
	var $mainparent = $("#"+setting.mainmenuid).removeClass("ddsmoothmenu ddsmoothmenu-v").addClass(setting.classname || "ddsmoothmenu");
	setting.repositionv = setting.repositionv !== false;
	var $mainmenu = $mainparent.find('>ul'); //reference main menu UL
	var method = (detecttruetouch)? 'toggle' : setting.method === 'toggle'? 'toggle' : 'hover';
	var $topheaders = $mainmenu.find('>li>ul').parent();//has('ul');
	var orient = setting.orientation!='v'? 'down' : 'right', $parentshadow = $(document.body);
	$mainmenu.click(function(e){e.target.href === smoothmenu.emptyhash && e.preventDefault();});
	if(method === 'toggle') {
		if(smoothmenu.globaltrackopen){
			smoothmenu.menus = smoothmenu.menus? smoothmenu.menus.add($mainmenu.add($mainmenu.find('*'))) : $mainmenu.add($mainmenu.find('*'));
		}
		if(smoothmenu.closeonnonmenuclick){
			if(orient === 'down'){$mainparent.click(function(e){e.stopPropagation();});}
			$(document).unbind('click.smoothmenu').bind('click.smoothmenu', smoothmenu.closeall);
			if(smoothmenu.idevice){
				document.removeEventListener('touchstart', smoothmenu.closeall, false);
				document.addEventListener('touchstart', smoothmenu.closeall, false);
			}
		} else if (setting.closeonnonmenuclick){
			if(orient === 'down'){$mainparent.click(function(e){e.stopPropagation();});}
			$(document).bind('click.' + setting.mainmenuid, function(e){$mainmenu.find('li>a.selected').parent().trigger('click');});
			if(smoothmenu.idevice){
				document.addEventListener('touchstart', function(e){$mainmenu.find('li>a.selected').parent().trigger('click');}, false);
			}
		}
		if(smoothmenu.closeonmouseout){
			var $leaveobj = orient === 'down'? $mainparent : $mainmenu;
			$leaveobj.bind('mouseleave.smoothmenu', smoothmenu.closeall);
		} else if (setting.closeonmouseout){
			var $leaveobj = orient === 'down'? $mainparent : $mainmenu;
			$leaveobj.bind('mouseleave.smoothmenu', function(){$mainmenu.find('li>a.selected').parent().trigger('click');});
		}
		if(!$('style[title="ddsmoothmenushadowsnone"]').length){
			$('head').append('<style title="ddsmoothmenushadowsnone" type="text/css">.ddsmoothmenushadowsnone{display:none!important;}</style>');
		}
		var shadowstimer;
		$(window).bind('resize scroll', function(){
			clearTimeout(shadowstimer);
			var $selected = $mainmenu.find('li>a.selected').parent(),
			$shadows = $('.ddshadow').addClass('ddsmoothmenushadowsnone');
			$selected.eq(0).trigger('click');
			$selected.trigger('click');
			if ( !window.matchMedia || (window.matchMedia && !setting.mobilemql.matches))
				shadowstimer = setTimeout(function(){$shadows.removeClass('ddsmoothmenushadowsnone');}, 100);
		});
	}

	$topheaders.each(function(){
		var $curobj=$(this).css({zIndex: (setting.zindexvalue || smoothmenu.zindexvalue) + zsub--}); //reference current LI header
		var $subul=$curobj.children('ul:eq(0)').css({display:'block'}).data('timers', {});
		var $link = $curobj.children("a:eq(0)").css({paddingRight: smoothmenu.arrowimages[orient][2]}).append( //add arrow images
			'<span style="display: block;" class="' + smoothmenu.arrowimages[orient][0] + '"></span>'
		);
		var dimensions = {
			w	: $link.outerWidth(),
			h	: $curobj.innerHeight(),
			subulw	: $subul.outerWidth(),
			subulh	: $subul.outerHeight()
		};
		var menutop = orient === 'down'? dimensions.h : 0;
		$subul.css({top: menutop});
		function restore(){$link.removeClass('selected');}
		method === 'toggle' && $subul.click(smoothmenu.subulpreventemptyclose);
		$curobj[method](
			function(e){
				if(!$curobj.data('headers')){
					smoothmenu.buildsubheaders($, $subul, $subul.find('>li>ul').parent(), setting, method, prevobjs);
					$curobj.data('headers', true).find('>ul').each(function(i, ul){
						var $ul = $(ul);
						$ul.data('height', $ul.outerHeight());
					}).css({display:'none !important', visibility:'visible'});
				}
				method === 'toggle' && smoothmenu.updateprev.call(this, $, prevobjs, $curobj);
				clearTimeout($subul.data('timers').hidetimer);
				$link.addClass('selected');
				$subul.data('timers').showtimer=setTimeout(function(){
					var menuleft = orient === 'down'? 0 : dimensions.w;
					var menumoved = menuleft, newtop, doctop, winheight, topinc = 0;
					var offsetLeft = $curobj.offset().left
					menuleft=(offsetLeft+menuleft+dimensions.subulw>$(window).width())? (orient === 'down'? -dimensions.subulw+dimensions.w : -dimensions.w) : menuleft; 
//calculate this sub menu's offsets from its parent
					if (orient === 'right' && menuleft < 0){ // for vertical menu, if top level sub menu drops left, test to see if it'll be obscured by left window edge
						var scrollX = window.pageXOffset || (document.documentElement || document.body.parentNode || document.body).scrollLeft
						if (offsetLeft - dimensions.subulw < 0) // if menu will be obscured by left window edge
							menuleft = 0
					}
					menumoved = menumoved !== menuleft;
					$subul.css({top: menutop}).removeClass('repositionedv');
					if(setting.repositionv && $link.offset().top + menutop + $subul.data('height') > (winheight = $(window).height()) + (doctop = $(document).scrollTop())){
						newtop = (orient === 'down'? 0 : $link.outerHeight()) - $subul.data('height');
						topinc = smoothmenu.repositionv($subul, $link, newtop, winheight, doctop, method, menutop)[0];
					}
					$subul.css({left:menuleft, width:dimensions.subulw}).stop(true, true).animate({height:'show',opacity:'show'}, smoothmenu.transition.overtime, function(){this.style.removeAttribute && this.style.removeAttribute('filter');});
					if(menumoved){$subul.addClass('repositioned');} else {$subul.removeClass('repositioned');}
					if (setting.shadow){
						if(!$curobj.data('$shadow')){
							$curobj.data('$shadow', $('<div></div>').addClass('ddshadow toplevelshadow').prependTo($parentshadow).css({zIndex: $curobj.css('zIndex')}));  //insert shadow DIV and set it to parent node for the next shadow div
						}
						smoothmenu.ie9shadow($curobj.data('$shadow'));
						var offsets = $subul.offset();
						var shadowleft = offsets.left;
						var shadowtop = offsets.top;
						$curobj.data('$shadow').css({overflow: 'visible', width:dimensions.subulw, left:shadowleft, top:shadowtop}).stop(true, true).animate({height:dimensions.subulh}, smoothmenu.transition.overtime);
					}
				}, smoothmenu.showhidedelay.showdelay);
			},
			function(e, speed){
				var $shadow = $curobj.data('$shadow');
				if(method === 'hover'){restore();}
				else{smoothmenu.executelink.call(this, $, prevobjs, e);}
				clearTimeout($subul.data('timers').showtimer);
				$subul.data('timers').hidetimer=setTimeout(function(){
					$subul.stop(true, true).animate({height:'hide', opacity:'hide'}, speed || smoothmenu.transition.outtime, function(){method === 'toggle' && restore();});
					if ($shadow){
						if (!smoothmenu.css3support && smoothmenu.detectwebkit){ //in WebKit browsers, set first child shadow's opacity to 0, as "overflow:hidden" doesn't work in them
							$shadow.children('div:eq(0)').css({opacity:0});
						}
						$shadow.stop(true, true).animate({height:0}, speed || smoothmenu.transition.outtime, function(){if(method === 'toggle'){this.style.overflow = 'hidden';}});
					}
				}, smoothmenu.showhidedelay.hidedelay);
			}
		); //end hover/toggle
		$subul.css({display: 'none !important'}); // collapse sub UL 
	}); //end $topheaders.each()
},

buildsubheaders: function($, $subul, $headers, setting, method, prevobjs){
	//setting.$mainparent.data('$headers').add($headers);
	$subul.css('display', 'block');
	$headers.each(function(){ //loop through each LI header
		var smoothmenu = ddsmoothmenu;
		var $curobj=$(this).css({zIndex: $(this).parent('ul').css('z-index')}); //reference current LI header
		var $subul=$curobj.children('ul:eq(0)').css({display:'block'}).data('timers', {}), $parentshadow;
		method === 'toggle' && $subul.click(smoothmenu.subulpreventemptyclose);
		var $link = $curobj.children("a:eq(0)").append( //add arrow images
			'<span style="display: block;" class="' + smoothmenu.arrowimages['right'][0] + '"></span>'
		);
		var dimensions = {
			w	: $link.outerWidth(),
			subulw	: $subul.outerWidth(),
			subulh	: $subul.outerHeight()
		};
		$subul.css({top: 0});
		function restore(){$link.removeClass('selected');}
		$curobj[method](
			function(e){
				if(!$curobj.data('headers')){
					smoothmenu.buildsubheaders($, $subul, $subul.find('>li>ul').parent(), setting, method, prevobjs);
					$curobj.data('headers', true).find('>ul').each(function(i, ul){
						var $ul = $(ul);
						$ul.data('height', $ul.height());
					}).css({display:'none !important', visibility:'visible'});
				}
				method === 'toggle' && smoothmenu.updateprev.call(this, $, prevobjs, $curobj);
				clearTimeout($subul.data('timers').hidetimer);
				$link.addClass('selected');
				$subul.data('timers').showtimer=setTimeout(function(){
					var menuleft= dimensions.w;
					var menumoved = menuleft, newtop, doctop, winheight, topinc = 0;
					var offsetLeft = $curobj.offset().left
					menuleft=(offsetLeft+menuleft+dimensions.subulw>$(window).width())? -dimensions.w : menuleft; //calculate this sub menu's offsets from its parent
					if (menuleft < 0){ // if drop left, test to see if it'll be obscured by left window edge
						var scrollX = window.pageXOffset || (document.documentElement || document.body.parentNode || document.body).scrollLeft
						if (offsetLeft - dimensions.subulw < scrollX) // if menu will be obscured by left window edge
							menuleft = 0
					}
					menumoved = menumoved !== menuleft;

					$subul.css({top: 0}).removeClass('repositionedv');
					if(setting.repositionv && $link.offset().top + $subul.data('height') > (winheight = $(window).height()) + (doctop = $(document).scrollTop())){
						newtop = $link.outerHeight() - $subul.data('height');
						topinc = smoothmenu.repositionv($subul, $link, newtop, winheight, doctop, method);
						newtop = topinc[1];
						topinc = topinc[0];
					}
					$subul.css({left:menuleft, width:dimensions.subulw}).stop(true, true).animate({height:'show',opacity:'show'}, smoothmenu.transition.overtime, function(){this.style.removeAttribute && this.style.removeAttribute('filter');});
					if(menumoved){$subul.addClass('repositioned');} else {$subul.removeClass('repositioned');}
					if (setting.shadow){
						if(!$curobj.data('$shadow')){
							$parentshadow = $curobj.parents("li:eq(0)").data('$shadow');
							$curobj.data('$shadow', $('<div></div>').addClass('ddshadow').prependTo($parentshadow).css({zIndex: $parentshadow.css('z-index')}));  //insert shadow DIV and set it to parent node for the next shadow div
						}
						var offsets = $subul.offset();
						var shadowleft = menuleft;
						var shadowtop = $curobj.position().top - (newtop? $subul.data('height') - $link.outerHeight() - topinc : 0);
						if (smoothmenu.detectwebkit && !smoothmenu.css3support){ //in WebKit browsers, restore shadow's opacity to full
							$curobj.data('$shadow').css({opacity:1});
						}
						$curobj.data('$shadow').css({overflow: 'visible', width:dimensions.subulw, left:shadowleft, top:shadowtop}).stop(true, true).animate({height:dimensions.subulh}, smoothmenu.transition.overtime);
					}
				}, smoothmenu.showhidedelay.showdelay);
			},
			function(e, speed){
				var $shadow = $curobj.data('$shadow');
				if(method === 'hover'){restore();}
				else{smoothmenu.executelink.call(this, $, prevobjs, e);}
				clearTimeout($subul.data('timers').showtimer);
				$subul.data('timers').hidetimer=setTimeout(function(){
					$subul.stop(true, true).animate({height:'hide', opacity:'hide'}, speed || smoothmenu.transition.outtime, function(){
						method === 'toggle' && restore();
					});
					if ($shadow){
						if (!smoothmenu.css3support && smoothmenu.detectwebkit){ //in WebKit browsers, set first child shadow's opacity to 0, as "overflow:hidden" doesn't work in them
							$shadow.children('div:eq(0)').css({opacity:0});
						}
						$shadow.stop(true, true).animate({height:0}, speed || smoothmenu.transition.outtime, function(){if(method === 'toggle'){this.style.overflow = 'hidden';}});
					}
				}, smoothmenu.showhidedelay.hidedelay);
			}
		); //end hover/toggle for subheaders
	}); //end $headers.each() for subheaders
},


initmenu: function(setting){
	if (setting.mobilemql.matches){ // if mobile mode
		jQuery(function($){
			var $mainmenu = $('#' + setting.mainmenuid)
			$mainmenu.css({display: 'none !important; '}) // hide regular menu
			//setTimeout(function(){$('.ddshadow').addClass('ddsmoothmenushadowsnone')}, 150)
			if (!setting.$mainulclone){ // store a copy of the main menu's UL menu before it gets manipulated
				setting.$mainulclone = $mainmenu.find('>ul').clone()
			}
			var mobilemenustate = setting.mobilemenustate
			if (setting.contentsource == "markup" && !mobilemenustate){ // if mobile menu not built yet
				ddsmoothmenu.buildmobilemenu($, setting, setting.$mainulclone)
			}
			else if (setting.contentsource != "markup" && (!mobilemenustate || mobilemenustate == "error")){ // if Ajax content and mobile menu not built yet
				ddsmoothmenu.getajaxmenuMobile($, setting)
			}
			else{ // if mobile menu built already, just show mobile togger
				$('#ddsmoothmenu-mobiletoggle').css({display: 'block'})				
			}
		})
		return
	}
	else{ // if desktop mode
		var menustate = setting.menustate
		if (menustate && menustate != "error"){ // if menustate is anything other than "error" (meaning error fetching ajax content), it means menu's built already, so exit init()
			var $mainmenu = $('#' + setting.mainmenuid)
			$mainmenu.css({display: 'block'}) // show regular menu
			if (this.mobilecontainer.$main){ // if mobile menu defined, hide it
				this.togglemobile('close', 0)
			}
			$('#ddsmoothmenu-mobiletoggle').css({display: 'none !important'}) // hide mobile menu toggler
			return
		}
	}

	if(this.detectie6 && parseFloat(jQuery.fn.jquery) > 1.3){
		this.initmenu = function(setting){
			if (typeof setting.contentsource=="object"){ //if external ajax menu
				jQuery(function($){ddsmoothmenu.getajaxmenu($, setting, 'nobuild');});
			}
			return false;
		};
		jQuery('link[href*="ddsmoothmenu"]').attr('disabled', true);
		jQuery(function($){
			alert('You Seriously Need to Update Your Browser!\n\nDynamic Drive Smooth Navigational Menu Showing Text Only Menu(s)\n\nDEVELOPER\'s NOTE: This script will run in IE 6 when using jQuery 1.3.2 or less,\nbut not real well.');
				$('link[href*="ddsmoothmenu"]').attr('disabled', true);
		});
		return this.initmenu(setting);
	}
	var mainmenuid = '#' + setting.mainmenuid, right, down, stylestring = ['</style>\n'], stylesleft = setting.arrowswap? 4 : 2;
	function addstyles(){
		if(stylesleft){return;}
		if (typeof setting.customtheme=="object" && setting.customtheme.length==2){ //override default menu colors (default/hover) with custom set?
			var mainselector=(setting.orientation=="v")? mainmenuid : mainmenuid+', '+mainmenuid;
			stylestring.push([mainselector,' ul li a {background:',setting.customtheme[0],';}\n',
				mainmenuid,' ul li a:hover {background:',setting.customtheme[1],';}'].join(''));
		}
		stylestring.push('\n<style type="text/css">');
		stylestring.reverse();
		jQuery('head').append(stylestring.join('\n'));
	}
	if(setting.arrowswap){
		right = ddsmoothmenu.arrowimages.right[1].replace(ddsmoothmenu.overarrowre, ddsmoothmenu.overarrowaddtofilename);
		down = ddsmoothmenu.arrowimages.down[1].replace(ddsmoothmenu.overarrowre, ddsmoothmenu.overarrowaddtofilename);
		jQuery(new Image()).bind('load error', function(e){
			setting.rightswap = e.type === 'load';
			if(setting.rightswap){
				stylestring.push([mainmenuid, ' ul li a:hover .', ddsmoothmenu.arrowimages.right[0], ', ',
				mainmenuid, ' ul li a.selected .', ddsmoothmenu.arrowimages.right[0],
				' { background-image: url(', this.src, ');}'].join(''));
			}
			--stylesleft;
			addstyles();
		}).attr('src', right);
		jQuery(new Image()).bind('load error', function(e){
			setting.downswap = e.type === 'load';
			if(setting.downswap){
				stylestring.push([mainmenuid, ' ul li a:hover .', ddsmoothmenu.arrowimages.down[0], ', ',
				mainmenuid, ' ul li a.selected .', ddsmoothmenu.arrowimages.down[0],
				' { background-image: url(', this.src, ');}'].join(''));
			}
			--stylesleft;
			addstyles();
		}).attr('src', down);
	}
	jQuery(new Image()).bind('load error', function(e){
		if(e.type === 'load'){
			stylestring.push([mainmenuid+' ul li a .', ddsmoothmenu.arrowimages.right[0],' { background: url(', this.src, ') no-repeat;width:', this.width,'px;height:', this.height, 'px;}'].join(''));
		}

		--stylesleft;
		addstyles();
	}).attr('src', ddsmoothmenu.arrowimages.right[1]);
	jQuery(new Image()).bind('load error', function(e){
		if(e.type === 'load'){
			stylestring.push([mainmenuid+' ul li a .', ddsmoothmenu.arrowimages.down[0],' { background: url(', this.src, ') no-repeat;width:', this.width,'px;height:', this.height, 'px;}'].join(''));
		}
		--stylesleft;
		addstyles();
	}).attr('src', ddsmoothmenu.arrowimages.down[1]);
	setting.shadow = this.detectie6 && (setting.method === 'hover' || setting.orientation === 'v')? false : setting.shadow || this.shadow; //in IE6, always disable shadow except for horizontal toggle menus
	jQuery(document).ready(function($){
		var $mainmenu = $('#' + setting.mainmenuid)
		$mainmenu.css({display: 'block'}) // show regular menu (in case previously hidden by mobile menu activation)
		if (ddsmoothmenu.mobilecontainer.$main){ // if mobile menu defined, hide it
				ddsmoothmenu.togglemobile('close', 0)
		}
		$('#ddsmoothmenu-mobiletoggle').css({display: 'none !important'}) // hide mobile menu toggler
		if (!setting.$mainulclone){ // store a copy of the main menu's UL menu before it gets manipulated
			setting.$mainulclone = $mainmenu.find('>ul').clone()
		}
		if (setting.shadow && ddsmoothmenu.css3support){$('body').addClass('ddcss3support');}
		if (typeof setting.contentsource=="object"){ //if external ajax menu
			ddsmoothmenu.getajaxmenu($, setting);
		}
		else{ //else if markup menu
			ddsmoothmenu.buildmenu($, setting);
		}

		setting.menustate = "initialized" // set menu state to initialized
	});
},

init: function(setting){
	setting.mobilemql = (window.matchMedia)? window.matchMedia(this.mobilemediaquery) : {matches: false, addListener: function(){}}
	this.initmenu(setting)
	setting.mobilemql.addListener(function(){
		ddsmoothmenu.initmenu(setting)
	})
}
}; //end ddsmoothmenu variable


// Patch for jQuery 1.9+ which lack click toggle (deprecated in 1.8, removed in 1.9)
// Will not run if using another patch like jQuery Migrate, which also takes care of this
if(
	(function($){
		var clicktogglable = false;
		try {
			$('<a href="#"></a>').toggle(function(){}, function(){clicktogglable = true;}).trigger('click').trigger('click');
		} catch(e){}
		return !clicktogglable;
	})(jQuery)
){
	(function(){
		var toggleDisp = jQuery.fn.toggle; // There's an animation/css method named .toggle() that toggles display. Save a reference to it.
		jQuery.extend(jQuery.fn, {
			toggle: function( fn, fn2 ) {
				// The method fired depends on the arguments passed.
				if ( !jQuery.isFunction( fn ) || !jQuery.isFunction( fn2 ) ) {
					return toggleDisp.apply(this, arguments);
				}
				// Save reference to arguments for access in closure
				var args = arguments, guid = fn.guid || jQuery.guid++,
					i = 0,
					toggler = function( event ) {
						// Figure out which function to execute
						var lastToggle = ( jQuery._data( this, "lastToggle" + fn.guid ) || 0 ) % i;
						jQuery._data( this, "lastToggle" + fn.guid, lastToggle + 1 );
	
						// Make sure that clicks stop
						event.preventDefault();
	
						// and execute the function
						return args[ lastToggle ].apply( this, arguments ) || false;
					};

				// link all the functions, so any of them can unbind this click handler
				toggler.guid = guid;
				while ( i < args.length ) {
					args[ i++ ].guid = guid;
				}

				return this.click( toggler );
			}
		});
	})();
}

/* TECHNICAL NOTE: To overcome an intermittent layout bug in IE 9+, the script will change margin top and left for the shadows to 
   1px less than their computed values, and the first two values for the box-shadow property will be changed to 1px larger than 
   computed, ex: -1px top and left margins and 6px 6px 5px #aaa box-shadow results in what appears to be a 5px box-shadow. 
   Other browsers skip this step and it shouldn't affect you in most cases. In some rare cases it will result in 
   slightly narrower (by 1px) box shadows for IE 9+ on one or more of the drop downs. Without this, sometimes 
   the shadows could be 1px beyond their drop down resulting in a gap. This is the first of the two patches below. 
   and also relates to the MS CSSOM which uses decimal fractions of pixels for layout while only reporting rounded values. 
   There appears to be no computedStyle workaround for this one. */

//Scripted CSS Patch for IE 9+ intermittent mis-rendering of box-shadow elements (see above TECHNICAL NOTE for more info)
//And jQuery Patch for IE 9+ CSSOM re: offset Width and Height and re: getBoundingClientRect(). Both run only in IE 9 and later.
//IE 9 + uses decimal fractions of pixels internally for layout but only reports rounded values using the offset and getBounding methods.
//These are sometimes rounded inconsistently. This second patch gets the decimal values directly from computedStyle.
if(ddsmoothmenu.detectie9){
	(function($){ //begin Scripted CSS Patch
		function incdec(v, how){return parseInt(v) + how + 'px';}
		ddsmoothmenu.ie9shadow = function($elem){ //runs once
			var getter = document.defaultView.getComputedStyle($elem.get(0), null),
			curshadow = getter.getPropertyValue('box-shadow').split(' '),
			curmargin = {top: getter.getPropertyValue('margin-top'), left: getter.getPropertyValue('margin-left')};
			$('head').append(['\n<style title="ie9shadow" type="text/css">',
			'.ddcss3support .ddshadow {',
			'\tbox-shadow: ' + incdec(curshadow[0], 1) + ' ' + incdec(curshadow[1], 1) + ' ' + curshadow[2] + ' ' + curshadow[3] + ';',
			'}', '.ddcss3support .ddshadow.toplevelshadow {',
			'\topacity: ' + ($('.ddcss3support .ddshadow').css('opacity') - 0.1) + ';',
			'\tmargin-top: ' + incdec(curmargin.top, -1) + ';',
			'\tmargin-left: ' + incdec(curmargin.left, -1) + ';', '}',
			'</style>\n'].join('\n'));
			ddsmoothmenu.ie9shadow = function(){}; //becomes empty function after running once
		}; //end Scripted CSS Patch
		var jqheight = $.fn.height, jqwidth = $.fn.width; //begin jQuery Patch for IE 9+ .height() and .width()
		$.extend($.fn, {
			height: function(){
				var obj = this.get(0);
				if(this.length < 1 || arguments.length || obj === window || obj === document){
					return jqheight.apply(this, arguments);
				}
				return parseFloat(document.defaultView.getComputedStyle(obj, null).getPropertyValue('height'));
			},
			innerHeight: function(){
				if(this.length < 1){return null;}
				var val = this.height(), obj = this.get(0), getter = document.defaultView.getComputedStyle(obj, null);
				val += parseInt(getter.getPropertyValue('padding-top'));
				val += parseInt(getter.getPropertyValue('padding-bottom'));
				return val;
			},
			outerHeight: function(bool){
				if(this.length < 1){return null;}
				var val = this.innerHeight(), obj = this.get(0), getter = document.defaultView.getComputedStyle(obj, null);
				val += parseInt(getter.getPropertyValue('border-top-width'));
				val += parseInt(getter.getPropertyValue('border-bottom-width'));
				if(bool){
					val += parseInt(getter.getPropertyValue('margin-top'));
					val += parseInt(getter.getPropertyValue('margin-bottom'));
				}
				return val;
			},
			width: function(){
				var obj = this.get(0);
				if(this.length < 1 || arguments.length || obj === window || obj === document){
					return jqwidth.apply(this, arguments);
				}
				return parseFloat(document.defaultView.getComputedStyle(obj, null).getPropertyValue('width'));
			},
			innerWidth: function(){
				if(this.length < 1){return null;}
				var val = this.width(), obj = this.get(0), getter = document.defaultView.getComputedStyle(obj, null);
				val += parseInt(getter.getPropertyValue('padding-right'));
				val += parseInt(getter.getPropertyValue('padding-left'));
				return val;
			},
			outerWidth: function(bool){
				if(this.length < 1){return null;}
				var val = this.innerWidth(), obj = this.get(0), getter = document.defaultView.getComputedStyle(obj, null);
				val += parseInt(getter.getPropertyValue('border-right-width'));
				val += parseInt(getter.getPropertyValue('border-left-width'));
				if(bool){
					val += parseInt(getter.getPropertyValue('margin-right'));
					val += parseInt(getter.getPropertyValue('margin-left'));
				}
				return val;
			}
		}); //end jQuery Patch for IE 9+ .height() and .width()
	})(jQuery);
}
/*################ ddsmoothmenu.js ends ###################*/

/*################ fluid_dg.min.js starts ###################*/
// Fluid_DG_Slider v2.1 - a jQuery slideshow with mobile support, based on jQuery 1.4+
// Copyright (c) 2013 by Dhiraj Kumar - www.css-jquery-design.com
// Licensed under the MIT license: http://www.opensource.org/licenses/mit-license.php
!function(t){t.fn.fluid_dg=function(i,a){function e(){return!!(navigator.userAgent.match(/Android/i)||navigator.userAgent.match(/webOS/i)||navigator.userAgent.match(/iPad/i)||navigator.userAgent.match(/iPhone/i)||navigator.userAgent.match(/iPod/i))||void 0}function o(){var i=t(T).width();t("li",T).removeClass("fluid_dg_visThumb"),t("li",T).each(function(){var a=t(this).position(),e=t("ul",T).outerWidth(),o=t("ul",T).offset().left,d=t("> div",T).offset().left-o;d>0?t(".fluid_dg_prevThumbs",X).removeClass("hideNav"):t(".fluid_dg_prevThumbs",X).addClass("hideNav"),e-d>i?t(".fluid_dg_nextThumbs",X).removeClass("hideNav"):t(".fluid_dg_nextThumbs",X).addClass("hideNav");var r=a.left,s=a.left+t(this).width();i>=s-d&&r-d>=0&&t(this).addClass("fluid_dg_visThumb")})}function d(){function a(){if(K=h.width(),-1!=i.height.indexOf("%")){var a=Math.round(K/(100/parseFloat(i.height)));J=""!=i.minHeight&&a<parseFloat(i.minHeight)?parseFloat(i.minHeight):a,h.css({height:J})}else"auto"==i.height?J=h.height():(J=parseFloat(i.height),h.css({height:J}));t(".fluid_dgrelative",_).css({width:K,height:J}),t(".imgLoaded",_).each(function(){var a,e,o=t(this),d=o.attr("width"),r=o.attr("height"),s=(o.index(),o.attr("data-alignment")),n=o.attr("data-portrait");if((void 0===s||!1===s||""===s)&&(s=i.alignment),(void 0===n||!1===n||""===n)&&(n=i.portrait),0==n||"false"==n)if(K/J>d/r){var l=K/d,c=.5*Math.abs(J-r*l);switch(s){case"topLeft":case"topCenter":case"topRight":a=0;break;case"centerLeft":case"center":case"centerRight":a="-"+c+"px";break;case"bottomLeft":case"bottomCenter":a="-"+2*c+"px";break;case"bottomRight":a="-"+2*c+"px"}o.css({height:r*l,"margin-left":0,"margin-right":0,"margin-top":a,position:"absolute",visibility:"visible",width:K})}else{l=J/r,c=.5*Math.abs(K-d*l);switch(s){case"topLeft":e=0;break;case"topCenter":e="-"+c+"px";break;case"topRight":e="-"+2*c+"px";break;case"centerLeft":e=0;break;case"center":e="-"+c+"px";break;case"centerRight":e="-"+2*c+"px";break;case"bottomLeft":e=0;break;case"bottomCenter":e="-"+c+"px";break;case"bottomRight":e="-"+2*c+"px"}o.css({height:J,"margin-left":e,"margin-right":e,"margin-top":0,position:"absolute",visibility:"visible",width:d*l})}else if(K/J>d/r){l=J/r,c=.5*Math.abs(K-d*l);switch(s){case"topLeft":e=0;break;case"topCenter":e=c+"px";break;case"topRight":e=2*c+"px";break;case"centerLeft":e=0;break;case"center":e=c+"px";break;case"centerRight":e=2*c+"px";break;case"bottomLeft":e=0;break;case"bottomCenter":e=c+"px";break;case"bottomRight":e=2*c+"px"}o.css({height:J,"margin-left":e,"margin-right":e,"margin-top":0,position:"absolute",visibility:"visible",width:d*l})}else{l=K/d,c=.5*Math.abs(J-r*l);switch(s){case"topLeft":case"topCenter":case"topRight":a=0;break;case"centerLeft":case"center":case"centerRight":a=c+"px";break;case"bottomLeft":case"bottomCenter":a=2*c+"px";break;case"bottomRight":a=2*c+"px"}o.css({height:r*l,"margin-left":0,"margin-right":0,"margin-top":a,position:"absolute",visibility:"visible",width:K})}})}var e;1==A?(clearTimeout(e),e=setTimeout(a,200)):a(),A=!0}function r(){t("iframe",u).each(function(){t(".fluid_dg_caption",u).show();var a=t(this),e=a.attr("data-src");a.attr("src",e);var o=i.imagePath+"blank.gif",d=new Image;if(d.src=o,-1!=i.height.indexOf("%")){var r=Math.round(K/(100/parseFloat(i.height)));J=""!=i.minHeight&&r<parseFloat(i.minHeight)?parseFloat(i.minHeight):r}else J="auto"==i.height?h.height():parseFloat(i.height);a.after(t(d).attr({class:"imgFake",width:K,height:J}));var s=a.clone();a.remove(),t(d).bind("click",function(){"absolute"==t(this).css("position")?(t(this).remove(),-1!=e.indexOf("vimeo")||-1!=e.indexOf("youtube")?-1!=e.indexOf("?")?autoplay="&autoplay=1":autoplay="?autoplay=1":-1!=e.indexOf("dailymotion")&&(-1!=e.indexOf("?")?autoplay="&autoPlay=1":autoplay="?autoPlay=1"),s.attr("src",e+autoplay),Q=!0):(t(this).css({position:"absolute",top:0,left:0,zIndex:10}).after(s),s.css({position:"absolute",top:0,left:0,zIndex:9}))})})}function s(t){for(var i,a,e=t.length;e;i=parseInt(Math.random()*e),a=t[--e],t[e]=t[i],t[i]=a);return t}function n(){if(t(T).length&&!t(k).length){var i,a=t(T).outerWidth(),e=(t("ul > li",T).outerWidth(),t("li.fluid_dgcurrent",T).length?t("li.fluid_dgcurrent",T).position():""),d=t("ul > li",T).length*t("ul > li",T).outerWidth(),r=t("ul",T).offset().left,s=t("> div",T).offset().left;i=0>r?"-"+(s-r):s-r,1==et&&(t("ul",T).width(t("ul > li",T).length*t("ul > li",T).outerWidth()),t(T).length&&!t(k).lenght&&h.css({marginBottom:t(T).outerHeight()}),o(),t("ul",T).width(t("ul > li",T).length*t("ul > li",T).outerWidth()),t(T).length&&!t(k).lenght&&h.css({marginBottom:t(T).outerHeight()})),et=!1;var n=t("li.fluid_dgcurrent",T).length?e.left:"",l=t("li.fluid_dgcurrent",T).length?e.left+t("li.fluid_dgcurrent",T).outerWidth():"";n<t("li.fluid_dgcurrent",T).outerWidth()&&(n=0),l-i>a?d>n+a?t("ul",T).animate({"margin-left":"-"+n+"px"},500,o):t("ul",T).animate({"margin-left":"-"+(t("ul",T).outerWidth()-a)+"px"},500,o):0>n-i?t("ul",T).animate({"margin-left":"-"+n+"px"},500,o):(t("ul",T).css({"margin-left":"auto","margin-right":"auto"}),setTimeout(o,100))}}function l(){$=0;var a=t(".fluid_dg_bar_cont",X).width(),e=t(".fluid_dg_bar_cont",X).height();if("pie"!=f)switch(V){case"leftToRight":t("#"+p).css({right:a});break;case"rightToLeft":t("#"+p).css({left:a});break;case"topToBottom":t("#"+p).css({bottom:e});break;case"bottomToTop":t("#"+p).css({top:e})}else it.clearRect(0,0,i.pieDiameter,i.pieDiameter)}function c(a){m.addClass("fluid_dgsliding"),Q=!1;var o=parseFloat(t("div.fluid_dgSlide.fluid_dgcurrent",_).index());if(a>0)var g=a-1;else if(o==q-1)g=0;else g=o+1;var v=t(".fluid_dgSlide:eq("+g+")",_),b=t(".fluid_dgSlide:eq("+(g+1)+")",_).addClass("fluid_dgnext");if(o!=g+1&&b.hide(),t(".fluid_dgContent",u).fadeOut(600),t(".fluid_dg_caption",u).show(),t(".fluid_dgrelative",v).append(t("> div ",m).eq(g).find("> div.fluid_dg_effected")),t(".fluid_dg_target_content .fluid_dgContent:eq("+g+")",h).append(t("> div ",m).eq(g).find("> div")),t(".imgLoaded",v).length){if(L.length>g+1&&!t(".imgLoaded",b).length){var y=L[g+1],C=new Image;C.src=y,b.prepend(t(C).attr("class","imgLoaded").css("visibility","hidden")),C.onload=function(){_t=C.naturalWidth,vt=C.naturalHeight,t(C).attr("data-alignment",B[g+1]).attr("data-portrait",S[g+1]),t(C).attr("width",_t),t(C).attr("height",vt),d()}}i.onLoaded.call(this),t(".fluid_dg_loader",h).is(":visible")?t(".fluid_dg_loader",h).fadeOut(400):(t(".fluid_dg_loader",h).css({visibility:"hidden"}),t(".fluid_dg_loader",h).fadeOut(400,function(){t(".fluid_dg_loader",h).css({visibility:"visible"})}));var w,x,R,F,M,O=i.rows,I=i.cols,H=1,A=0,W=new Array("simpleFade","curtainTopLeft","curtainTopRight","curtainBottomLeft","curtainBottomRight","curtainSliceLeft","curtainSliceRight","blindCurtainTopLeft","blindCurtainTopRight","blindCurtainBottomLeft","blindCurtainBottomRight","blindCurtainSliceBottom","blindCurtainSliceTop","stampede","mosaic","mosaicReverse","mosaicRandom","mosaicSpiral","mosaicSpiralReverse","topLeftBottomRight","bottomRightTopLeft","bottomLeftTopRight","topRightBottomLeft","scrollLeft","scrollRight","scrollTop","scrollBottom","scrollHorz");marginLeft=0,marginTop=0,opacityOnGrid=0,1==i.opacityOnGrid?opacityOnGrid=0:opacityOnGrid=1;var D=t(" > div",m).eq(g).attr("data-fx");if("random"==(F=e()&&""!=i.mobileFx&&"default"!=i.mobileFx?i.mobileFx:void 0!==D&&!1!==D&&"default"!==D?D:i.fx)?F=(F=s(W))[0]:(F=F).indexOf(",")>0&&(F=(F=s(F=(F=F.replace(/ /g,"")).split(",")))[0]),dataEasing=t(" > div",m).eq(g).attr("data-easing"),mobileEasing=t(" > div",m).eq(g).attr("data-mobileEasing"),M=e()&&""!=i.mobileEasing&&"default"!=i.mobileEasing?"undefined"!=typeof mobileEasing&&!1!==mobileEasing&&"default"!==mobileEasing?mobileEasing:i.mobileEasing:"undefined"!=typeof dataEasing&&!1!==dataEasing&&"default"!==dataEasing?dataEasing:i.easing,void 0!==(w=t(" > div",m).eq(g).attr("data-slideOn"))&&!1!==w)N=w;else if("random"==i.slideOn){var N=new Array("next","prev");N=(N=s(N))[0]}else N=i.slideOn;var G=t(" > div",m).eq(g).attr("data-time");x=void 0!==G&&!1!==G&&""!==G?parseFloat(G):i.time;var j=t(" > div",m).eq(g).attr("data-transPeriod");switch(R=void 0!==j&&!1!==j&&""!==j?parseFloat(j):i.transPeriod,t(m).hasClass("fluid_dgstarted")||(F="simpleFade",N="next",M="",R=400,t(m).addClass("fluid_dgstarted")),F){case"simpleFade":I=1,O=1;break;case"curtainTopLeft":case"curtainTopRight":case"curtainBottomLeft":case"curtainBottomRight":case"curtainSliceLeft":case"curtainSliceRight":I=0==i.slicedCols?i.cols:i.slicedCols,O=1;break;case"blindCurtainTopLeft":case"blindCurtainTopRight":case"blindCurtainBottomLeft":case"blindCurtainBottomRight":case"blindCurtainSliceTop":case"blindCurtainSliceBottom":O=0==i.slicedRows?i.rows:i.slicedRows,I=1;break;case"stampede":A="-"+R;break;case"mosaic":case"mosaicReverse":A=i.gridDifference;break;case"mosaicRandom":break;case"mosaicSpiral":case"mosaicSpiralReverse":A=i.gridDifference,H=1.7;break;case"topLeftBottomRight":case"bottomRightTopLeft":case"bottomLeftTopRight":case"topRightBottomLeft":A=i.gridDifference,H=6;break;case"scrollLeft":case"scrollRight":case"scrollTop":case"scrollBottom":I=1,O=1;break;case"scrollHorz":I=1,O=1}for(var Y,Z,at=0,et=O*I,ot=K-Math.floor(K/I)*I,dt=J-Math.floor(J/O)*O,rt=0,st=0,nt=new Array,lt=new Array,ct=new Array;et>at;){nt.push(at),lt.push(at),P.append('<div class="fluid_dgappended" style="display:none; overflow:hidden; position:absolute; z-index:1000" />');var ht=t(".fluid_dgappended:eq("+at+")",_);"scrollLeft"==F||"scrollRight"==F||"scrollTop"==F||"scrollBottom"==F||"scrollHorz"==F?U.eq(g).clone().show().appendTo(ht):"next"==N?U.eq(g).clone().show().appendTo(ht):U.eq(o).clone().show().appendTo(ht),Y=ot>at%I?1:0,at%I==0&&(rt=0),Z=Math.floor(at/I)<dt?1:0,ht.css({height:Math.floor(J/O+Z+1),left:rt,top:st,width:Math.floor(K/I+Y+1)}),t("> .fluid_dgSlide",ht).css({height:J,"margin-left":"-"+rt+"px","margin-top":"-"+st+"px",width:K}),rt=rt+ht.width()-1,at%I==I-1&&(st=st+ht.height()-1),at++}switch(F){case"curtainTopLeft":case"curtainBottomLeft":case"curtainSliceLeft":break;case"curtainTopRight":case"curtainBottomRight":case"curtainSliceRight":nt=nt.reverse();break;case"blindCurtainTopLeft":break;case"blindCurtainBottomLeft":nt=nt.reverse();break;case"blindCurtainSliceTop":case"blindCurtainTopRight":break;case"blindCurtainBottomRight":case"blindCurtainSliceBottom":nt=nt.reverse();break;case"stampede":nt=s(nt);break;case"mosaic":break;case"mosaicReverse":nt=nt.reverse();break;case"mosaicRandom":nt=s(nt);break;case"mosaicSpiral":var ft=O/2,ut=0;for(gt=0;ft>gt;gt++){for(pt=gt,mt=gt;I-gt-1>mt;mt++)ct[ut++]=pt*I+mt;for(mt=I-gt-1,pt=gt;O-gt-1>pt;pt++)ct[ut++]=pt*I+mt;for(pt=O-gt-1,mt=I-gt-1;mt>gt;mt--)ct[ut++]=pt*I+mt;for(mt=gt,pt=O-gt-1;pt>gt;pt--)ct[ut++]=pt*I+mt}nt=ct;break;case"mosaicSpiralReverse":var gt;ft=O/2,ut=et-1;for(gt=0;ft>gt;gt++){for(pt=gt,mt=gt;I-gt-1>mt;mt++)ct[ut--]=pt*I+mt;for(mt=I-gt-1,pt=gt;O-gt-1>pt;pt++)ct[ut--]=pt*I+mt;for(pt=O-gt-1,mt=I-gt-1;mt>gt;mt--)ct[ut--]=pt*I+mt;for(mt=gt,pt=O-gt-1;pt>gt;pt--)ct[ut--]=pt*I+mt}nt=ct;break;case"topLeftBottomRight":for(var pt=0;O>pt;pt++)for(var mt=0;I>mt;mt++)ct.push(mt+pt);lt=ct;break;case"bottomRightTopLeft":for(pt=0;O>pt;pt++)for(mt=0;I>mt;mt++)ct.push(mt+pt);lt=ct.reverse();break;case"bottomLeftTopRight":for(pt=O;pt>0;pt--)for(mt=0;I>mt;mt++)ct.push(mt+pt);lt=ct;break;case"topRightBottomLeft":for(pt=0;O>pt;pt++)for(mt=I;mt>0;mt--)ct.push(mt+pt);lt=ct}t.each(nt,function(a,e){function d(){if(t(this).addClass("fluid_dgeased"),t(".fluid_dgeased",_).length>=0&&t(T).css({visibility:"visible"}),t(".fluid_dgeased",_).length==et){n(),t(".moveFromLeft, .moveFromRight, .moveFromTop, .moveFromBottom, .fadeIn, .fadeFromLeft, .fadeFromRight, .fadeFromTop, .fadeFromBottom",u).each(function(){t(this).css("visibility","hidden")}),U.eq(g).show().css("z-index","999").removeClass("fluid_dgnext").addClass("fluid_dgcurrent"),U.eq(o).css("z-index","1").removeClass("fluid_dgcurrent"),t(".fluid_dgContent",u).eq(g).addClass("fluid_dgcurrent"),o>=0&&t(".fluid_dgContent",u).eq(o).removeClass("fluid_dgcurrent"),i.onEndTransition.call(this),"hide"!=t("> div",m).eq(g).attr("data-video")&&t(".fluid_dgContent.fluid_dgcurrent .imgFake",u).length&&t(".fluid_dgContent.fluid_dgcurrent .imgFake",u).click();var a=U.eq(g).find(".fadeIn").length,e=t(".fluid_dgContent",u).eq(g).find(".moveFromLeft, .moveFromRight, .moveFromTop, .moveFromBottom, .fadeIn, .fadeFromLeft, .fadeFromRight, .fadeFromTop, .fadeFromBottom").length;0!=a&&t(".fluid_dgSlide.fluid_dgcurrent .fadeIn",u).each(function(){if(""!=t(this).attr("data-easing"))var i=t(this).attr("data-easing");else i=M;var e=t(this);if(void 0===e.attr("data-outerWidth")||!1===e.attr("data-outerWidth")||""===e.attr("data-outerWidth")){var o=e.outerWidth();e.attr("data-outerWidth",o)}else o=e.attr("data-outerWidth");if(void 0===e.attr("data-outerHeight")||!1===e.attr("data-outerHeight")||""===e.attr("data-outerHeight")){var d=e.outerHeight();e.attr("data-outerHeight",d)}else d=e.attr("data-outerHeight");var r=e.position(),s=(r.left,r.top,e.attr("class")),n=e.index();e.parents(".fluid_dgrelative").outerHeight(),e.parents(".fluid_dgrelative").outerWidth(),-1!=s.indexOf("fadeIn")?e.animate({opacity:0},0).css("visibility","visible").delay(x/a*(.1*(n-1))).animate({opacity:1},x/a*.15,i):e.css("visibility","visible")}),t(".fluid_dgContent.fluid_dgcurrent",u).show(),0!=e&&t(".fluid_dgContent.fluid_dgcurrent .moveFromLeft, .fluid_dgContent.fluid_dgcurrent .moveFromRight, .fluid_dgContent.fluid_dgcurrent .moveFromTop, .fluid_dgContent.fluid_dgcurrent .moveFromBottom, .fluid_dgContent.fluid_dgcurrent .fadeIn, .fluid_dgContent.fluid_dgcurrent .fadeFromLeft, .fluid_dgContent.fluid_dgcurrent .fadeFromRight, .fluid_dgContent.fluid_dgcurrent .fadeFromTop, .fluid_dgContent.fluid_dgcurrent .fadeFromBottom",u).each(function(){if(""!=t(this).attr("data-easing"))var i=t(this).attr("data-easing");else i=M;var a=t(this),o=a.position(),d=(o.left,o.top,a.attr("class")),r=a.index(),s=a.outerHeight();-1!=d.indexOf("moveFromLeft")?(a.css({left:"-"+K+"px",right:"auto"}),a.css("visibility","visible").delay(x/e*(.1*(r-1))).animate({left:o.left},x/e*.15,i)):-1!=d.indexOf("moveFromRight")?(a.css({left:K+"px",right:"auto"}),a.css("visibility","visible").delay(x/e*(.1*(r-1))).animate({left:o.left},x/e*.15,i)):-1!=d.indexOf("moveFromTop")?(a.css({top:"-"+J+"px",bottom:"auto"}),a.css("visibility","visible").delay(x/e*(.1*(r-1))).animate({top:o.top},x/e*.15,i,function(){a.css({})})):-1!=d.indexOf("moveFromBottom")?(a.css({top:K+"px",bottom:"auto"}),a.css("visibility","visible").delay(x/e*(.1*(r-1))).animate({top:o.top},x/e*.15,i)):-1!=d.indexOf("fadeFromLeft")?(a.animate({opacity:0},0).css({left:"-"+K+"px",right:"auto"}),a.css("visibility","visible").delay(x/e*(.1*(r-1))).animate({left:o.left,opacity:1},x/e*.15,i)):-1!=d.indexOf("fadeFromRight")?(a.animate({opacity:0},0).css({left:K+"px",right:"auto"}),a.css("visibility","visible").delay(x/e*(.1*(r-1))).animate({left:o.left,opacity:1},x/e*.15,i)):-1!=d.indexOf("fadeFromTop")?(a.animate({opacity:0},0).css({top:"-"+J+"px",bottom:"auto"}),a.css("visibility","visible").delay(x/e*(.1*(r-1))).animate({top:o.top,opacity:1},x/e*.15,i,function(){a.css({top:"auto",bottom:0})})):-1!=d.indexOf("fadeFromBottom")?(a.animate({opacity:0},0).css({bottom:"-"+s+"px"}),a.css("visibility","visible").delay(x/e*(.1*(r-1))).animate({bottom:"0",opacity:1},x/e*.15,i)):-1!=d.indexOf("fadeIn")?a.animate({opacity:0},0).css("visibility","visible").delay(x/e*(.1*(r-1))).animate({opacity:1},x/e*.15,i):a.css("visibility","visible")}),t(".fluid_dgappended",_).remove(),m.removeClass("fluid_dgsliding"),U.eq(o).hide();var d,s=t(".fluid_dg_bar_cont",X).width(),h=t(".fluid_dg_bar_cont",X).height();d="pie"!=f?.05:.005,t("#"+p).animate({opacity:i.loaderOpacity},200),E=setInterval(function(){if(m.hasClass("stopped")&&clearInterval(E),"pie"!=f)switch(1.002>=$&&!m.hasClass("stopped")&&!m.hasClass("paused")&&!m.hasClass("hovered")?$+=d:1>=$&&(m.hasClass("stopped")||m.hasClass("paused")||m.hasClass("stopped")||m.hasClass("hovered"))?$=$:m.hasClass("stopped")||m.hasClass("paused")||m.hasClass("hovered")||(clearInterval(E),r(),t("#"+p).animate({opacity:0},200,function(){clearTimeout(z),z=setTimeout(l,v),c(),i.onStartLoading.call(this)})),V){case"leftToRight":t("#"+p).animate({right:s-s*$},x*d,"linear");break;case"rightToLeft":t("#"+p).animate({left:s-s*$},x*d,"linear");break;case"topToBottom":t("#"+p).animate({bottom:h-h*$},x*d,"linear");break;case"bottomToTop":t("#"+p).animate({bottom:h-h*$},x*d,"linear")}else tt=$,it.clearRect(0,0,i.pieDiameter,i.pieDiameter),it.globalCompositeOperation="destination-over",it.beginPath(),it.arc(i.pieDiameter/2,i.pieDiameter/2,i.pieDiameter/2-i.loaderStroke,0,2*Math.PI,!1),it.lineWidth=i.loaderStroke,it.strokeStyle=i.loaderBgColor,it.stroke(),it.closePath(),it.globalCompositeOperation="source-over",it.beginPath(),it.arc(i.pieDiameter/2,i.pieDiameter/2,i.pieDiameter/2-i.loaderStroke,0,2*Math.PI*tt,!1),it.lineWidth=i.loaderStroke-2*i.loaderPadding,it.strokeStyle=i.loaderColor,it.stroke(),it.closePath(),1.002>=$&&!m.hasClass("stopped")&&!m.hasClass("paused")&&!m.hasClass("hovered")?$+=d:1>=$&&(m.hasClass("stopped")||m.hasClass("paused")||m.hasClass("hovered"))?$=$:m.hasClass("stopped")||m.hasClass("paused")||m.hasClass("hovered")||(clearInterval(E),r(),t("#"+p+", .fluid_dg_canvas_wrap",X).animate({opacity:0},200,function(){clearTimeout(z),z=setTimeout(l,v),c(),i.onStartLoading.call(this)}))},x*d)}}switch(Y=ot>e%I?1:0,e%I==0&&(rt=0),Z=Math.floor(e/I)<dt?1:0,F){case"simpleFade":height=J,width=K,opacityOnGrid=0;break;case"curtainTopLeft":case"curtainTopRight":height=0,width=Math.floor(K/I+Y+1),marginTop="-"+Math.floor(J/O+Z+1)+"px";break;case"curtainBottomLeft":case"curtainBottomRight":height=0,width=Math.floor(K/I+Y+1),marginTop=Math.floor(J/O+Z+1)+"px";break;case"curtainSliceLeft":case"curtainSliceRight":height=0,width=Math.floor(K/I+Y+1),marginTop=e%2==0?Math.floor(J/O+Z+1)+"px":"-"+Math.floor(J/O+Z+1)+"px";break;case"blindCurtainTopLeft":height=Math.floor(J/O+Z+1),width=0,marginLeft="-"+Math.floor(K/I+Y+1)+"px";break;case"blindCurtainTopRight":height=Math.floor(J/O+Z+1),width=0,marginLeft=Math.floor(K/I+Y+1)+"px";break;case"blindCurtainBottomLeft":height=Math.floor(J/O+Z+1),width=0,marginLeft="-"+Math.floor(K/I+Y+1)+"px";break;case"blindCurtainBottomRight":height=Math.floor(J/O+Z+1),width=0,marginLeft=Math.floor(K/I+Y+1)+"px";break;case"blindCurtainSliceBottom":case"blindCurtainSliceTop":height=Math.floor(J/O+Z+1),width=0,marginLeft=e%2==0?"-"+Math.floor(K/I+Y+1)+"px":Math.floor(K/I+Y+1)+"px";break;case"stampede":height=0,width=0,marginLeft=.2*K*(a%I-(I-Math.floor(I/2)))+"px",marginTop=.2*J*(Math.floor(a/I)+1-(O-Math.floor(O/2)))+"px";break;case"mosaic":height=0,width=0;break;case"mosaicReverse":height=0,width=0,marginLeft=Math.floor(K/I+Y+1)+"px",marginTop=Math.floor(J/O+Z+1)+"px";break;case"mosaicRandom":case"mosaicSpiral":case"mosaicSpiralReverse":height=0,width=0,marginLeft=.5*Math.floor(K/I+Y+1)+"px",marginTop=.5*Math.floor(J/O+Z+1)+"px";break;case"topLeftBottomRight":height=0,width=0;break;case"bottomRightTopLeft":height=0,width=0,marginLeft=Math.floor(K/I+Y+1)+"px",marginTop=Math.floor(J/O+Z+1)+"px";break;case"bottomLeftTopRight":height=0,width=0,marginLeft=0,marginTop=Math.floor(J/O+Z+1)+"px";break;case"topRightBottomLeft":height=0,width=0,marginLeft=Math.floor(K/I+Y+1)+"px",marginTop=0;break;case"scrollRight":height=J,width=K,marginLeft=-K;break;case"scrollLeft":height=J,width=K,marginLeft=K;break;case"scrollTop":height=J,width=K,marginTop=J;break;case"scrollBottom":height=J,width=K,marginTop=-J;break;case"scrollHorz":height=J,width=K,marginLeft=0==o&&g==q-1?-K:g>o||o==q-1&&0==g?K:-K}var s=t(".fluid_dgappended:eq("+e+")",_);void 0!==E&&(clearInterval(E),clearTimeout(z),z=setTimeout(l,R+A)),t(k).length&&(t(".fluid_dg_pag li",h).removeClass("fluid_dgcurrent"),t(".fluid_dg_pag li",h).eq(g).addClass("fluid_dgcurrent")),t(T).length&&(t("li",T).removeClass("fluid_dgcurrent"),t("li",T).eq(g).addClass("fluid_dgcurrent"),t("li",T).not(".fluid_dgcurrent").find("img").animate({opacity:.5},0),t("li.fluid_dgcurrent img",T).animate({opacity:1},0),t("li",T).hover(function(){t("img",this).stop(!0,!1).animate({opacity:1},150)},function(){t(this).hasClass("fluid_dgcurrent")||t("img",this).stop(!0,!1).animate({opacity:.5},150)}));var v=parseFloat(R)+parseFloat(A);"scrollLeft"==F||"scrollRight"==F||"scrollTop"==F||"scrollBottom"==F||"scrollHorz"==F?(i.onStartTransition.call(this),v=0,s.delay((R+A)/et*lt[a]*H*.5).css({display:"block",height:height,"margin-left":marginLeft,"margin-top":marginTop,width:width}).animate({height:Math.floor(J/O+Z+1),"margin-top":0,"margin-left":0,width:Math.floor(K/I+Y+1)},R-A,M,d),U.eq(o).delay((R+A)/et*lt[a]*H*.5).animate({"margin-left":-1*marginLeft,"margin-top":-1*marginTop},R-A,M,function(){t(this).css({"margin-top":0,"margin-left":0})})):(i.onStartTransition.call(this),v=parseFloat(R)+parseFloat(A),"next"==N?s.delay((R+A)/et*lt[a]*H*.5).css({display:"block",height:height,"margin-left":marginLeft,"margin-top":marginTop,width:width,opacity:opacityOnGrid}).animate({height:Math.floor(J/O+Z+1),"margin-top":0,"margin-left":0,opacity:1,width:Math.floor(K/I+Y+1)},R-A,M,d):(U.eq(g).show().css("z-index","999").addClass("fluid_dgcurrent"),U.eq(o).css("z-index","1").removeClass("fluid_dgcurrent"),t(".fluid_dgContent",u).eq(g).addClass("fluid_dgcurrent"),t(".fluid_dgContent",u).eq(o).removeClass("fluid_dgcurrent"),s.delay((R+A)/et*lt[a]*H*.5).css({display:"block",height:Math.floor(J/O+Z+1),"margin-top":0,"margin-left":0,opacity:1,width:Math.floor(K/I+Y+1)}).animate({height:height,"margin-left":marginLeft,"margin-top":marginTop,width:width,opacity:opacityOnGrid},R-A,M,d)))})}else{var _t,vt,bt=L[g],yt=new Image;yt.src=bt,v.css("visibility","hidden"),v.prepend(t(yt).attr("class","imgLoaded").css("visibility","hidden")),t(yt).get(0).complete&&"0"!=_t&&"0"!=vt&&void 0!==_t&&!1!==_t&&void 0!==vt&&!1!==vt||(t(".fluid_dg_loader",h).delay(500).fadeIn(400),yt.onload=function(){_t=yt.naturalWidth,vt=yt.naturalHeight,t(yt).attr("data-alignment",B[g]).attr("data-portrait",S[g]),t(yt).attr("width",_t),t(yt).attr("height",vt),_.find(".fluid_dgSlide_"+g).hide().css("visibility","visible"),d(),c(g+1)})}}t.support.borderRadius=!1,t.each(["borderRadius","BorderRadius","MozBorderRadius","WebkitBorderRadius","OBorderRadius","KhtmlBorderRadius"],function(){void 0!==document.body.style[this]&&(t.support.borderRadius=!0)});i=t.extend({},{alignment:"center",autoAdvance:!0,mobileAutoAdvance:!0,barDirection:"leftToRight",barPosition:"bottom",cols:6,easing:"easeInOutExpo",mobileEasing:"",fx:"random",mobileFx:"",gridDifference:250,height:"50%",imagePath:"images/",hover:!0,loader:"pie",loaderColor:"#eeeeee",loaderBgColor:"#222222",loaderOpacity:.8,loaderPadding:2,loaderStroke:7,minHeight:"200px",navigation:!0,navigationHover:!0,mobileNavHover:!0,opacityOnGrid:!1,overlayer:!0,pagination:!0,playPause:!0,pauseOnClick:!0,pieDiameter:38,piePosition:"rightTop",portrait:!1,rows:4,slicedCols:12,slicedRows:8,slideOn:"random",thumbnails:!1,time:7e3,transPeriod:1500,onEndTransition:function(){},onLoaded:function(){},onStartLoading:function(){},onStartTransition:function(){}},i);var h=t(this).addClass("fluid_dg_wrap");h.wrapInner('<div class="fluid_dg_src" />').wrapInner('<div class="fluid_dg_fakehover" />');var f,u=t(".fluid_dg_fakehover",h),g=h;u.append('<div class="fluid_dg_target"></div>'),1==i.overlayer&&u.append('<div class="fluid_dg_overlayer"></div>'),u.append('<div class="fluid_dg_target_content"></div>'),"pie"==(f="pie"!=i.loader||t.support.borderRadius?i.loader:"bar")?u.append('<div class="fluid_dg_pie"></div>'):"bar"==f?u.append('<div class="fluid_dg_bar"></div>'):u.append('<div class="fluid_dg_bar" style="display:none"></div>'),1==i.playPause&&u.append('<div class="fluid_dg_commands"></div>'),1==i.navigation&&u.append('<div class="fluid_dg_prev"><span></span></div>').append('<div class="fluid_dg_next"><span></span></div>'),1==i.thumbnails&&h.append('<div class="fluid_dg_thumbs_cont" />'),1==i.thumbnails&&1!=i.pagination&&t(".fluid_dg_thumbs_cont",h).wrap("<div />").wrap('<div class="fluid_dg_thumbs" />').wrap("<div />").wrap('<div class="fluid_dg_command_wrap" />'),1==i.pagination&&h.append('<div class="fluid_dg_pag"></div>'),t(".fluid_dg_caption",h).each(function(){t(this).wrapInner("<div />")});var p="pie_"+h.index(),m=t(".fluid_dg_src",h),_=t(".fluid_dg_target",h),v=t(".fluid_dg_target_content",h),b=t(".fluid_dg_pie",h),y=t(".fluid_dg_bar",h),C=t(".fluid_dg_prev",h),w=t(".fluid_dg_next",h),x=t(".fluid_dg_commands",h),k=t(".fluid_dg_pag",h),T=t(".fluid_dg_thumbs_cont",h),L=new Array;t("> div",m).each(function(){L.push(t(this).attr("data-src"))});var R=new Array;t("> div",m).each(function(){t(this).attr("data-link")?R.push(t(this).attr("data-link")):R.push("")});var F=new Array;t("> div",m).each(function(){t(this).attr("data-target")?F.push(t(this).attr("data-target")):F.push("")});var S=new Array;t("> div",m).each(function(){t(this).attr("data-portrait")?S.push(t(this).attr("data-portrait")):S.push("")});var B=new Array;t("> div",m).each(function(){t(this).attr("data-alignment")?B.push(t(this).attr("data-alignment")):B.push("")});var M=new Array;t("> div",m).each(function(){t(this).attr("data-thumb")?M.push(t(this).attr("data-thumb")):M.push("")});var O,q=L.length;for(1>=q&&(i.autoAdvance=!1,i.mobileAutoAdvance=!1,i.navigation=!1,i.navigationHover=!0,i.mobileNavHover=!0,i.pagination=!1,i.playPause=!1,i.thumbnails=!1),t(v).append('<div class="fluid_dgContents" />'),O=0;q>O;O++)if(t(".fluid_dgContents",v).append('<div class="fluid_dgContent" />'),""!=R[O]){var I=t("> div ",m).eq(O).attr("data-box");I=void 0!==I&&!1!==I&&""!=I?'data-box="'+t("> div ",m).eq(O).attr("data-box")+'"':"",t(".fluid_dg_target_content .fluid_dgContent:eq("+O+")",h).append('<a class="fluid_dg_link" href="'+R[O]+'" '+I+' target="'+F[O]+'"></a>')}t(".fluid_dg_caption",h).each(function(){var i=t(this).parent().index(),a=h.find(".fluid_dgContent").eq(i);t(this).appendTo(a)}),_.append('<div class="fluid_dgCont" />');var H,A,P=t(".fluid_dgCont",h);for(H=0;q>H;H++){P.append('<div class="fluid_dgSlide fluid_dgSlide_'+H+'" />');var W=t("> div:eq("+H+")",m);_.find(".fluid_dgSlide_"+H).clone(W)}t(window).bind("load resize pageshow",function(){n(),o()}),P.append('<div class="fluid_dgSlide fluid_dgSlide_'+H+'" />'),h.show();var D,E,z,N,G,j,Q,K=_.width(),J=_.height();if(t(window).bind("resize pageshow",function(){1==A&&d(),t("ul",T).animate({"margin-top":0},0,n),m.hasClass("paused")||(m.addClass("paused"),t(".fluid_dg_stop",X).length?(t(".fluid_dg_stop",X).hide(),t(".fluid_dg_play",X).show(),"none"!=f&&t("#"+p).hide()):"none"!=f&&t("#"+p).hide(),clearTimeout(D),D=setTimeout(function(){m.removeClass("paused"),t(".fluid_dg_play",X).length?(t(".fluid_dg_play",X).hide(),t(".fluid_dg_stop",X).show(),"none"!=f&&t("#"+p).fadeIn()):"none"!=f&&t("#"+p).fadeIn()},1500))}),0==(N=e()&&""!=i.mobileAutoAdvance?i.mobileAutoAdvance:i.autoAdvance)&&m.addClass("paused"),G=e()&&""!=i.mobileNavHover?i.mobileNavHover:i.navigationHover,0!=m.length){var U=t(".fluid_dgSlide",_);U.wrapInner('<div class="fluid_dgrelative" />');var V=i.barDirection,X=h;t("iframe",u).each(function(){var i=t(this),a=i.attr("src");i.attr("data-src",a);var e=i.parent().index(".fluid_dg_src > div");t(".fluid_dg_target_content .fluid_dgContent:eq("+e+")",h).append(i)}),r(),1==i.hover&&(e()||u.hover(function(){m.addClass("hovered")},function(){m.removeClass("hovered")})),1==G&&(t(C,h).animate({opacity:0},0),t(w,h).animate({opacity:0},0),t(x,h).animate({opacity:0},0),e()?(t(document).on("vmouseover",g,function(){t(C,h).animate({opacity:1},200),t(w,h).animate({opacity:1},200),t(x,h).animate({opacity:1},200)}),t(document).on("vmouseout",g,function(){t(C,h).delay(500).animate({opacity:0},200),t(w,h).delay(500).animate({opacity:0},200),t(x,h).delay(500).animate({opacity:0},200)})):u.hover(function(){t(C,h).animate({opacity:1},200),t(w,h).animate({opacity:1},200),t(x,h).animate({opacity:1},200)},function(){t(C,h).animate({opacity:0},200),t(w,h).animate({opacity:0},200),t(x,h).animate({opacity:0},200)})),X.on("click",".fluid_dg_stop",function(){N=!1,m.addClass("paused"),t(".fluid_dg_stop",X).length?(t(".fluid_dg_stop",X).hide(),t(".fluid_dg_play",X).show(),"none"!=f&&t("#"+p).hide()):"none"!=f&&t("#"+p).hide()}),X.on("click",".fluid_dg_play",function(){N=!0,m.removeClass("paused"),t(".fluid_dg_play",X).length?(t(".fluid_dg_play",X).hide(),t(".fluid_dg_stop",X).show(),"none"!=f&&t("#"+p).show()):"none"!=f&&t("#"+p).show()}),1==i.pauseOnClick&&t(".fluid_dg_target_content",u).mouseup(function(){N=!1,m.addClass("paused"),t(".fluid_dg_stop",X).hide(),t(".fluid_dg_play",X).show(),t("#"+p).hide()}),t(".fluid_dgContent, .imgFake",u).hover(function(){j=!0},function(){j=!1}),t(".fluid_dgContent, .imgFake",u).bind("click",function(){1==Q&&1==j&&(N=!1,t(".fluid_dg_caption",u).hide(),m.addClass("paused"),t(".fluid_dg_stop",X).hide(),t(".fluid_dg_play",X).show(),t("#"+p).hide())})}if("pie"!=f){switch(y.append('<span class="fluid_dg_bar_cont" />'),t(".fluid_dg_bar_cont",y).animate({opacity:i.loaderOpacity},0).css({position:"absolute",left:0,right:0,top:0,bottom:0,"background-color":i.loaderBgColor}).append('<span id="'+p+'" />'),t("#"+p).animate({opacity:0},0),(Y=t("#"+p)).css({position:"absolute","background-color":i.loaderColor}),i.barPosition){case"left":y.css({right:"auto",width:i.loaderStroke});break;case"right":y.css({left:"auto",width:i.loaderStroke});break;case"top":y.css({bottom:"auto",height:i.loaderStroke});break;case"bottom":y.css({top:"auto",height:i.loaderStroke})}switch(V){case"leftToRight":case"rightToLeft":Y.css({left:0,right:0,top:i.loaderPadding,bottom:i.loaderPadding});break;case"topToBottom":Y.css({left:i.loaderPadding,right:i.loaderPadding,top:0,bottom:0});break;case"bottomToTop":Y.css({left:i.loaderPadding,right:i.loaderPadding,top:0,bottom:0})}}else{var Y,Z,$,tt;switch(b.append('<canvas id="'+p+'"></canvas>'),(Y=document.getElementById(p)).setAttribute("width",i.pieDiameter),Y.setAttribute("height",i.pieDiameter),i.piePosition){case"leftTop":Z="left:0; top:0;";break;case"rightTop":Z="right:0; top:0;";break;case"leftBottom":Z="left:0; bottom:0;";break;case"rightBottom":Z="right:0; bottom:0;"}if(Y.setAttribute("style","position:absolute; z-index:1002; "+Z),Y&&Y.getContext){var it=Y.getContext("2d");it.rotate(1.5*Math.PI),it.translate(-i.pieDiameter,0)}}if(("none"==f||0==N)&&(t("#"+p).hide(),t(".fluid_dg_canvas_wrap",X).hide()),t(k).length){var at;for(t(k).append('<ul class="fluid_dg_pag_ul" />'),at=0;q>at;at++)t(".fluid_dg_pag_ul",h).append('<li class="pag_nav_'+at+'" style="position:relative; z-index:1002"><span><span>'+at+"</span></span></li>");t(".fluid_dg_pag_ul li",h).hover(function(){if(t(this).addClass("fluid_dg_hover"),t(".fluid_dg_thumb",this).length){var i=t(".fluid_dg_thumb",this).outerWidth(),a=t(".fluid_dg_thumb",this).outerHeight(),e=t(this).outerWidth();t(".fluid_dg_thumb",this).show().css({top:"-"+a+"px",left:"-"+(i-e)/2+"px"}).animate({opacity:1,"margin-top":"-3px"},200),t(".thumb_arrow",this).show().animate({opacity:1,"margin-top":"-3px"},200)}},function(){t(this).removeClass("fluid_dg_hover"),t(".fluid_dg_thumb",this).animate({"margin-top":"-20px",opacity:0},200,function(){t(this).css({marginTop:"5px"}).hide()}),t(".thumb_arrow",this).animate({"margin-top":"-20px",opacity:0},200,function(){t(this).css({marginTop:"5px"}).hide()})})}t(T).length?t(k).length?(t.each(M,function(i,a){if(""!=t("> div",m).eq(i).attr("data-thumb")){var e=t("> div",m).eq(i).attr("data-thumb"),o=new Image;o.src=e,t("li.pag_nav_"+i,k).append(t(o).attr("class","fluid_dg_thumb").css({position:"absolute"}).animate({opacity:0},0)),t("li.pag_nav_"+i+" > img",k).after('<div class="thumb_arrow" />'),t("li.pag_nav_"+i+" > .thumb_arrow",k).animate({opacity:0},0)}}),h.css({marginBottom:t(k).outerHeight()})):(t(T).append("<div />"),t(T).before('<div class="fluid_dg_prevThumbs hideNav"><div></div></div>').before('<div class="fluid_dg_nextThumbs hideNav"><div></div></div>'),t("> div",T).append("<ul />"),t.each(M,function(i,a){if(""!=t("> div",m).eq(i).attr("data-thumb")){var e=t("> div",m).eq(i).attr("data-thumb"),o=new Image;o.src=e,t("ul",T).append('<li class="pix_thumb pix_thumb_'+i+'" />'),t("li.pix_thumb_"+i,T).append(t(o).attr("class","fluid_dg_thumb"))}})):!t(T).length&&t(k).length&&h.css({marginBottom:t(k).outerHeight()});var et=!0;t(x).length&&(t(x).append('<div class="fluid_dg_play"></div>').append('<div class="fluid_dg_stop"></div>'),1==N?(t(".fluid_dg_play",X).hide(),t(".fluid_dg_stop",X).show()):(t(".fluid_dg_stop",X).hide(),t(".fluid_dg_play",X).show())),l(),t(".moveFromLeft, .moveFromRight, .moveFromTop, .moveFromBottom, .fadeIn, .fadeFromLeft, .fadeFromRight, .fadeFromTop, .fadeFromBottom",u).each(function(){t(this).css("visibility","hidden")}),i.onStartLoading.call(this),c(),t(C).length&&t(C).click(function(){if(!m.hasClass("fluid_dgsliding")){var a=parseFloat(t(".fluid_dgSlide.fluid_dgcurrent",_).index());clearInterval(E),r(),t("#"+p+", .fluid_dg_canvas_wrap",h).animate({opacity:0},0),l(),c(0!=a?a:q),i.onStartLoading.call(this)}}),t(w).length&&t(w).click(function(){if(!m.hasClass("fluid_dgsliding")){var a=parseFloat(t(".fluid_dgSlide.fluid_dgcurrent",_).index());clearInterval(E),r(),t("#"+p+", .fluid_dg_canvas_wrap",X).animate({opacity:0},0),l(),c(a==q-1?1:a+2),i.onStartLoading.call(this)}}),e()&&(u.bind("swipeleft",function(a){if(!m.hasClass("fluid_dgsliding")){var e=parseFloat(t(".fluid_dgSlide.fluid_dgcurrent",_).index());clearInterval(E),r(),t("#"+p+", .fluid_dg_canvas_wrap",X).animate({opacity:0},0),l(),c(e==q-1?1:e+2),i.onStartLoading.call(this)}}),u.bind("swiperight",function(a){if(!m.hasClass("fluid_dgsliding")){var e=parseFloat(t(".fluid_dgSlide.fluid_dgcurrent",_).index());clearInterval(E),r(),t("#"+p+", .fluid_dg_canvas_wrap",X).animate({opacity:0},0),l(),c(0!=e?e:q),i.onStartLoading.call(this)}})),t(k).length&&t(".fluid_dg_pag li",h).click(function(){if(!m.hasClass("fluid_dgsliding")){var a=parseFloat(t(this).index());a!=parseFloat(t(".fluid_dgSlide.fluid_dgcurrent",_).index())&&(clearInterval(E),r(),t("#"+p+", .fluid_dg_canvas_wrap",X).animate({opacity:0},0),l(),c(a+1),i.onStartLoading.call(this))}}),t(T).length&&(t(".pix_thumb img",T).click(function(){if(!m.hasClass("fluid_dgsliding")){var a=parseFloat(t(this).parents("li").index());a!=parseFloat(t(".fluid_dgcurrent",_).index())&&(clearInterval(E),r(),t("#"+p+", .fluid_dg_canvas_wrap",X).animate({opacity:0},0),t(".pix_thumb",T).removeClass("fluid_dgcurrent"),t(this).parents("li").addClass("fluid_dgcurrent"),l(),c(a+1),n(),i.onStartLoading.call(this))}}),t(".fluid_dg_thumbs_cont .fluid_dg_prevThumbs",X).hover(function(){t(this).stop(!0,!1).animate({opacity:1},250)},function(){t(this).stop(!0,!1).animate({opacity:.7},250)}),t(".fluid_dg_prevThumbs",X).click(function(){var i=0,a=(t(T).outerWidth(),t("ul",T).offset().left),e=t("> div",T).offset().left-a;t(".fluid_dg_visThumb",T).each(function(){var a=t(this).outerWidth();i+=a}),e-i>0?t("ul",T).animate({"margin-left":"-"+(e-i)+"px"},500,o):t("ul",T).animate({"margin-left":0},500,o)}),t(".fluid_dg_thumbs_cont .fluid_dg_nextThumbs",X).hover(function(){t(this).stop(!0,!1).animate({opacity:1},250)},function(){t(this).stop(!0,!1).animate({opacity:.7},250)}),t(".fluid_dg_nextThumbs",X).click(function(){var i=0,a=t(T).outerWidth(),e=t("ul",T).outerWidth(),d=t("ul",T).offset().left,r=t("> div",T).offset().left-d;t(".fluid_dg_visThumb",T).each(function(){var a=t(this).outerWidth();i+=a}),e>r+i+i?t("ul",T).animate({"margin-left":"-"+(r+i)+"px"},500,o):t("ul",T).animate({"margin-left":"-"+(e-a)+"px"},500,o)}))}}(jQuery),function(t){t.fn.fluid_dgStop=function(){var i=t(this),a=t(".fluid_dg_src",i);i.index(),a.addClass("stopped"),t(".fluid_dg_showcommands").length&&t(".fluid_dg_thumbs_wrap",i)}}(jQuery),function(t){t.fn.fluid_dgPause=function(){var i=t(this);t(".fluid_dg_src",i).addClass("paused")}}(jQuery),function(t){t.fn.fluid_dgResume=function(){var i=t(this),a=t(".fluid_dg_src",i);("undefined"==typeof autoAdv||!0!==autoAdv)&&a.removeClass("paused")}}(jQuery);
/*################ fluid_dg.min.js ends ###################*/

/*################ jquery.bxslider.min.js starts ###################*/
/**
 * BxSlider v4.1.2 - Fully loaded, responsive content slider
 * http://bxslider.com
 *
 * Copyright 2014, Steven Wanderski - http://stevenwanderski.com - http://bxcreative.com
 * Written while drinking Belgian ales and listening to jazz
 *
 * Released under the MIT license - http://opensource.org/licenses/MIT
 */

;(function($){

	var plugin = {};

	var defaults = {

		// GENERAL
		mode: 'horizontal',
		slideSelector: '',
		infiniteLoop: true,
		hideControlOnEnd: false,
		speed: 500,
		easing: null,
		slideMargin: 0,
		startSlide: 0,
		randomStart: false,
		captions: false,
		ticker: false,
		tickerHover: false,
		adaptiveHeight: false,
		adaptiveHeightSpeed: 500,
		video: false,
		useCSS: true,
		preloadImages: 'visible',
		responsive: true,
		slideZIndex: 50,
		wrapperClass: 'bx-wrapper',

		// TOUCH
		touchEnabled: true,
		swipeThreshold: 50,
		oneToOneTouch: true,
		preventDefaultSwipeX: true,
		preventDefaultSwipeY: false,

		// PAGER
		pager: true,
		pagerType: 'full',
		pagerShortSeparator: ' / ',
		pagerSelector: null,
		buildPager: null,
		pagerCustom: null,

		// CONTROLS
		controls: true,
		nextText: 'Next',
		prevText: 'Prev',
		nextSelector: null,
		prevSelector: null,
		autoControls: false,
		startText: 'Start',
		stopText: 'Stop',
		autoControlsCombine: false,
		autoControlsSelector: null,

		// AUTO
		auto: false,
		pause: 4000,
		autoStart: true,
		autoDirection: 'next',
		autoHover: false,
		autoDelay: 0,
		autoSlideForOnePage: false,

		// CAROUSEL
		minSlides: 1,
		maxSlides: 1,
		moveSlides: 0,
		slideWidth: 0,

		// CALLBACKS
		onSliderLoad: function() {},
		onSlideBefore: function() {},
		onSlideAfter: function() {},
		onSlideNext: function() {},
		onSlidePrev: function() {},
		onSliderResize: function() {}
	}

	$.fn.bxSlider = function(options){

		if(this.length == 0) return this;

		// support mutltiple elements
		if(this.length > 1){
			this.each(function(){$(this).bxSlider(options)});
			return this;
		}

		// create a namespace to be used throughout the plugin
		var slider = {};
		// set a reference to our slider element
		var el = this;
		plugin.el = this;

		/**
		 * Makes slideshow responsive
		 */
		// first get the original window dimens (thanks alot IE)
		var windowWidth = $(window).width();
		var windowHeight = $(window).height();



		/**
		 * ===================================================================================
		 * = PRIVATE FUNCTIONS
		 * ===================================================================================
		 */

		/**
		 * Initializes namespace settings to be used throughout plugin
		 */
		var init = function(){
			// merge user-supplied options with the defaults
			slider.settings = $.extend({}, defaults, options);
			// parse slideWidth setting
			slider.settings.slideWidth = parseInt(slider.settings.slideWidth);
			// store the original children
			slider.children = el.children(slider.settings.slideSelector);
			// check if actual number of slides is less than minSlides / maxSlides
			if(slider.children.length < slider.settings.minSlides) slider.settings.minSlides = slider.children.length;
			if(slider.children.length < slider.settings.maxSlides) slider.settings.maxSlides = slider.children.length;
			// if random start, set the startSlide setting to random number
			if(slider.settings.randomStart) slider.settings.startSlide = Math.floor(Math.random() * slider.children.length);
			// store active slide information
			slider.active = { index: slider.settings.startSlide }
			// store if the slider is in carousel mode (displaying / moving multiple slides)
			slider.carousel = slider.settings.minSlides > 1 || slider.settings.maxSlides > 1;
			// if carousel, force preloadImages = 'all'
			if(slider.carousel) slider.settings.preloadImages = 'all';
			// calculate the min / max width thresholds based on min / max number of slides
			// used to setup and update carousel slides dimensions
			slider.minThreshold = (slider.settings.minSlides * slider.settings.slideWidth) + ((slider.settings.minSlides - 1) * slider.settings.slideMargin);
			slider.maxThreshold = (slider.settings.maxSlides * slider.settings.slideWidth) + ((slider.settings.maxSlides - 1) * slider.settings.slideMargin);
			// store the current state of the slider (if currently animating, working is true)
			slider.working = false;
			// initialize the controls object
			slider.controls = {};
			// initialize an auto interval
			slider.interval = null;
			// determine which property to use for transitions
			slider.animProp = slider.settings.mode == 'vertical' ? 'top' : 'left';
			// determine if hardware acceleration can be used
			slider.usingCSS = slider.settings.useCSS && slider.settings.mode != 'fade' && (function(){
				// create our test div element
				var div = document.createElement('div');
				// css transition properties
				var props = ['WebkitPerspective', 'MozPerspective', 'OPerspective', 'msPerspective'];
				// test for each property
				for(var i in props){
					if(div.style[props[i]] !== undefined){
						slider.cssPrefix = props[i].replace('Perspective', '').toLowerCase();
						slider.animProp = '-' + slider.cssPrefix + '-transform';
						return true;
					}
				}
				return false;
			}());
			// if vertical mode always make maxSlides and minSlides equal
			if(slider.settings.mode == 'vertical') slider.settings.maxSlides = slider.settings.minSlides;
			// save original style data
			el.data("origStyle", el.attr("style"));
			el.children(slider.settings.slideSelector).each(function() {
			  $(this).data("origStyle", $(this).attr("style"));
			});
			// perform all DOM / CSS modifications
			setup();
		}

		/**
		 * Performs all DOM and CSS modifications
		 */
		var setup = function(){
			// wrap el in a wrapper
			el.wrap('<div class="' + slider.settings.wrapperClass + '"><div class="bx-viewport"></div></div>');
			// store a namspace reference to .bx-viewport
			slider.viewport = el.parent();
			// add a loading div to display while images are loading
			slider.loader = $('<div class="bx-loading" />');
			slider.viewport.prepend(slider.loader);
			// set el to a massive width, to hold any needed slides
			// also strip any margin and padding from el
			el.css({
				width: slider.settings.mode == 'horizontal' ? (slider.children.length * 100 + 215) + '%' : 'auto',
				position: 'relative'
			});
			// if using CSS, add the easing property
			if(slider.usingCSS && slider.settings.easing){
				el.css('-' + slider.cssPrefix + '-transition-timing-function', slider.settings.easing);
			// if not using CSS and no easing value was supplied, use the default JS animation easing (swing)
			}else if(!slider.settings.easing){
				slider.settings.easing = 'swing';
			}
			var slidesShowing = getNumberSlidesShowing();
			// make modifications to the viewport (.bx-viewport)
			slider.viewport.css({
				width: '100%',
				overflow: 'hidden',
				position: 'relative'
			});
			slider.viewport.parent().css({
				maxWidth: getViewportMaxWidth()
			});
			// make modification to the wrapper (.bx-wrapper)
			if(!slider.settings.pager) {
				slider.viewport.parent().css({
				margin: '0 auto 0px'
				});
			}
			// apply css to all slider children
			slider.children.css({
				'float': slider.settings.mode == 'horizontal' ? 'left' : 'none',
				listStyle: 'none',
				position: 'relative'
			});
			// apply the calculated width after the float is applied to prevent scrollbar interference
			slider.children.css('width', getSlideWidth());
			// if slideMargin is supplied, add the css
			if(slider.settings.mode == 'horizontal' && slider.settings.slideMargin > 0) slider.children.css('marginRight', slider.settings.slideMargin);
			if(slider.settings.mode == 'vertical' && slider.settings.slideMargin > 0) slider.children.css('marginBottom', slider.settings.slideMargin);
			// if "fade" mode, add positioning and z-index CSS
			if(slider.settings.mode == 'fade'){
				slider.children.css({
					position: 'absolute',
					zIndex: 0,
					display: 'none'
				});
				// prepare the z-index on the showing element
				slider.children.eq(slider.settings.startSlide).css({zIndex: slider.settings.slideZIndex, display: 'block'});
			}
			// create an element to contain all slider controls (pager, start / stop, etc)
			slider.controls.el = $('<div class="bx-controls" />');
			// if captions are requested, add them
			if(slider.settings.captions) appendCaptions();
			// check if startSlide is last slide
			slider.active.last = slider.settings.startSlide == getPagerQty() - 1;
			// if video is true, set up the fitVids plugin
			if(slider.settings.video) el.fitVids();
			// set the default preload selector (visible)
			var preloadSelector = slider.children.eq(slider.settings.startSlide);
			if (slider.settings.preloadImages == "all") preloadSelector = slider.children;
			// only check for control addition if not in "ticker" mode
			if(!slider.settings.ticker){
				// if pager is requested, add it
				if(slider.settings.pager) appendPager();
				// if controls are requested, add them
				if(slider.settings.controls) appendControls();
				// if auto is true, and auto controls are requested, add them
				if(slider.settings.auto && slider.settings.autoControls) appendControlsAuto();
				// if any control option is requested, add the controls wrapper
				if(slider.settings.controls || slider.settings.autoControls || slider.settings.pager) slider.viewport.after(slider.controls.el);
			// if ticker mode, do not allow a pager
			}else{
				slider.settings.pager = false;
			}
			// preload all images, then perform final DOM / CSS modifications that depend on images being loaded
			loadElements(preloadSelector, start);
		}

		var loadElements = function(selector, callback){
			var total = selector.find('img, iframe').length;
			if (total == 0){
				callback();
				return;
			}
			var count = 0;
			selector.find('img, iframe').each(function(){
				$(this).one('load', function() {
				  if(++count == total) callback();
				}).each(function() {
				  if(this.complete) $(this).load();
				});
			});
		}

		/**
		 * Start the slider
		 */
		var start = function(){
			// if infinite loop, prepare additional slides
			if(slider.settings.infiniteLoop && slider.settings.mode != 'fade' && !slider.settings.ticker){
				var slice = slider.settings.mode == 'vertical' ? slider.settings.minSlides : slider.settings.maxSlides;
				var sliceAppend = slider.children.slice(0, slice).clone().addClass('bx-clone');
				var slicePrepend = slider.children.slice(-slice).clone().addClass('bx-clone');
				el.append(sliceAppend).prepend(slicePrepend);
			}
			// remove the loading DOM element
			slider.loader.remove();
			// set the left / top position of "el"
			setSlidePosition();
			// if "vertical" mode, always use adaptiveHeight to prevent odd behavior
			if (slider.settings.mode == 'vertical') slider.settings.adaptiveHeight = true;
			// set the viewport height
			slider.viewport.height(getViewportHeight());
			// make sure everything is positioned just right (same as a window resize)
			el.redrawSlider();
			// onSliderLoad callback
			slider.settings.onSliderLoad(slider.active.index);
			// slider has been fully initialized
			slider.initialized = true;
			// bind the resize call to the window
			if (slider.settings.responsive) $(window).bind('resize', resizeWindow);
			// if auto is true and has more than 1 page, start the show
			if (slider.settings.auto && slider.settings.autoStart && (getPagerQty() > 1 || slider.settings.autoSlideForOnePage)) initAuto();
			// if ticker is true, start the ticker
			if (slider.settings.ticker) initTicker();
			// if pager is requested, make the appropriate pager link active
			if (slider.settings.pager) updatePagerActive(slider.settings.startSlide);
			// check for any updates to the controls (like hideControlOnEnd updates)
			if (slider.settings.controls) updateDirectionControls();
			// if touchEnabled is true, setup the touch events
			if (slider.settings.touchEnabled && !slider.settings.ticker) initTouch();
		}

		/**
		 * Returns the calculated height of the viewport, used to determine either adaptiveHeight or the maxHeight value
		 */
		var getViewportHeight = function(){
			var height = 0;
			// first determine which children (slides) should be used in our height calculation
			var children = $();
			// if mode is not "vertical" and adaptiveHeight is false, include all children
			if(slider.settings.mode != 'vertical' && !slider.settings.adaptiveHeight){
				children = slider.children;
			}else{
				// if not carousel, return the single active child
				if(!slider.carousel){
					children = slider.children.eq(slider.active.index);
				// if carousel, return a slice of children
				}else{
					// get the individual slide index
					var currentIndex = slider.settings.moveSlides == 1 ? slider.active.index : slider.active.index * getMoveBy();
					// add the current slide to the children
					children = slider.children.eq(currentIndex);
					// cycle through the remaining "showing" slides
					for (i = 1; i <= slider.settings.maxSlides - 1; i++){
						// if looped back to the start
						if(currentIndex + i >= slider.children.length){
							children = children.add(slider.children.eq(i - 1));
						}else{
							children = children.add(slider.children.eq(currentIndex + i));
						}
					}
				}
			}
			// if "vertical" mode, calculate the sum of the heights of the children
			if(slider.settings.mode == 'vertical'){
				children.each(function(index) {
				  height += $(this).outerHeight();
				});
				// add user-supplied margins
				if(slider.settings.slideMargin > 0){
					height += slider.settings.slideMargin * (slider.settings.minSlides - 1);
				}
			// if not "vertical" mode, calculate the max height of the children
			}else{
				height = Math.max.apply(Math, children.map(function(){
					return $(this).outerHeight(false);
				}).get());
			}

			if(slider.viewport.css('box-sizing') == 'border-box'){
				height +=	parseFloat(slider.viewport.css('padding-top')) + parseFloat(slider.viewport.css('padding-bottom')) +
							parseFloat(slider.viewport.css('border-top-width')) + parseFloat(slider.viewport.css('border-bottom-width'));
			}else if(slider.viewport.css('box-sizing') == 'padding-box'){
				height +=	parseFloat(slider.viewport.css('padding-top')) + parseFloat(slider.viewport.css('padding-bottom'));
			}

			return height;
		}

		/**
		 * Returns the calculated width to be used for the outer wrapper / viewport
		 */
		var getViewportMaxWidth = function(){
			var width = '100%';
			if(slider.settings.slideWidth > 0){
				if(slider.settings.mode == 'horizontal'){
					width = (slider.settings.maxSlides * slider.settings.slideWidth) + ((slider.settings.maxSlides - 1) * slider.settings.slideMargin);
				}else{
					width = slider.settings.slideWidth;
				}
			}
			return width;
		}

		/**
		 * Returns the calculated width to be applied to each slide
		 */
		var getSlideWidth = function(){
			// start with any user-supplied slide width
			var newElWidth = slider.settings.slideWidth;
			// get the current viewport width
			var wrapWidth = slider.viewport.width();
			// if slide width was not supplied, or is larger than the viewport use the viewport width
			if(slider.settings.slideWidth == 0 ||
				(slider.settings.slideWidth > wrapWidth && !slider.carousel) ||
				slider.settings.mode == 'vertical'){
				newElWidth = wrapWidth;
			// if carousel, use the thresholds to determine the width
			}else if(slider.settings.maxSlides > 1 && slider.settings.mode == 'horizontal'){
				if(wrapWidth > slider.maxThreshold){
					// newElWidth = (wrapWidth - (slider.settings.slideMargin * (slider.settings.maxSlides - 1))) / slider.settings.maxSlides;
				}else if(wrapWidth < slider.minThreshold){
					newElWidth = (wrapWidth - (slider.settings.slideMargin * (slider.settings.minSlides - 1))) / slider.settings.minSlides;
				}
			}
			return newElWidth;
		}

		/**
		 * Returns the number of slides currently visible in the viewport (includes partially visible slides)
		 */
		var getNumberSlidesShowing = function(){
			var slidesShowing = 1;
			if(slider.settings.mode == 'horizontal' && slider.settings.slideWidth > 0){
				// if viewport is smaller than minThreshold, return minSlides
				if(slider.viewport.width() < slider.minThreshold){
					slidesShowing = slider.settings.minSlides;
				// if viewport is larger than minThreshold, return maxSlides
				}else if(slider.viewport.width() > slider.maxThreshold){
					slidesShowing = slider.settings.maxSlides;
				// if viewport is between min / max thresholds, divide viewport width by first child width
				}else{
					var childWidth = slider.children.first().width() + slider.settings.slideMargin;
					slidesShowing = Math.floor((slider.viewport.width() +
						slider.settings.slideMargin) / childWidth);
				}
			// if "vertical" mode, slides showing will always be minSlides
			}else if(slider.settings.mode == 'vertical'){
				slidesShowing = slider.settings.minSlides;
			}
			return slidesShowing;
		}

		/**
		 * Returns the number of pages (one full viewport of slides is one "page")
		 */
		var getPagerQty = function(){
			var pagerQty = 0;
			// if moveSlides is specified by the user
			if(slider.settings.moveSlides > 0){
				if(slider.settings.infiniteLoop){
					pagerQty = Math.ceil(slider.children.length / getMoveBy());
				}else{
					// use a while loop to determine pages
					var breakPoint = 0;
					var counter = 0
					// when breakpoint goes above children length, counter is the number of pages
					while (breakPoint < slider.children.length){
						++pagerQty;
						breakPoint = counter + getNumberSlidesShowing();
						counter += slider.settings.moveSlides <= getNumberSlidesShowing() ? slider.settings.moveSlides : getNumberSlidesShowing();
					}
				}
			// if moveSlides is 0 (auto) divide children length by sides showing, then round up
			}else{
				pagerQty = Math.ceil(slider.children.length / getNumberSlidesShowing());
			}
			return pagerQty;
		}

		/**
		 * Returns the number of indivual slides by which to shift the slider
		 */
		var getMoveBy = function(){
			// if moveSlides was set by the user and moveSlides is less than number of slides showing
			if(slider.settings.moveSlides > 0 && slider.settings.moveSlides <= getNumberSlidesShowing()){
				return slider.settings.moveSlides;
			}
			// if moveSlides is 0 (auto)
			return getNumberSlidesShowing();
		}

		/**
		 * Sets the slider's (el) left or top position
		 */
		var setSlidePosition = function(){
			// if last slide, not infinite loop, and number of children is larger than specified maxSlides
			if(slider.children.length > slider.settings.maxSlides && slider.active.last && !slider.settings.infiniteLoop){
				if (slider.settings.mode == 'horizontal'){
					// get the last child's position
					var lastChild = slider.children.last();
					var position = lastChild.position();
					// set the left position
					setPositionProperty(-(position.left - (slider.viewport.width() - lastChild.outerWidth())), 'reset', 0);
				}else if(slider.settings.mode == 'vertical'){
					// get the last showing index's position
					var lastShowingIndex = slider.children.length - slider.settings.minSlides;
					var position = slider.children.eq(lastShowingIndex).position();
					// set the top position
					setPositionProperty(-position.top, 'reset', 0);
				}
			// if not last slide
			}else{
				// get the position of the first showing slide
				var position = slider.children.eq(slider.active.index * getMoveBy()).position();
				// check for last slide
				if (slider.active.index == getPagerQty() - 1) slider.active.last = true;
				// set the repective position
				if (position != undefined){
					if (slider.settings.mode == 'horizontal') setPositionProperty(-position.left, 'reset', 0);
					else if (slider.settings.mode == 'vertical') setPositionProperty(-position.top, 'reset', 0);
				}
			}
		}

		/**
		 * Sets the el's animating property position (which in turn will sometimes animate el).
		 * If using CSS, sets the transform property. If not using CSS, sets the top / left property.
		 *
		 * @param value (int)
		 *  - the animating property's value
		 *
		 * @param type (string) 'slider', 'reset', 'ticker'
		 *  - the type of instance for which the function is being
		 *
		 * @param duration (int)
		 *  - the amount of time (in ms) the transition should occupy
		 *
		 * @param params (array) optional
		 *  - an optional parameter containing any variables that need to be passed in
		 */
		var setPositionProperty = function(value, type, duration, params){
			// use CSS transform
			if(slider.usingCSS){
				// determine the translate3d value
				var propValue = slider.settings.mode == 'vertical' ? 'translate3d(0, ' + value + 'px, 0)' : 'translate3d(' + value + 'px, 0, 0)';
				// add the CSS transition-duration
				el.css('-' + slider.cssPrefix + '-transition-duration', duration / 1000 + 's');
				if(type == 'slide'){
					// set the property value
					el.css(slider.animProp, propValue);
					// bind a callback method - executes when CSS transition completes
					el.bind('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function(){
						// unbind the callback
						el.unbind('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd');
						updateAfterSlideTransition();
					});
				}else if(type == 'reset'){
					el.css(slider.animProp, propValue);
				}else if(type == 'ticker'){
					// make the transition use 'linear'
					el.css('-' + slider.cssPrefix + '-transition-timing-function', 'linear');
					el.css(slider.animProp, propValue);
					// bind a callback method - executes when CSS transition completes
					el.bind('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd', function(){
						// unbind the callback
						el.unbind('transitionend webkitTransitionEnd oTransitionEnd MSTransitionEnd');
						// reset the position
						setPositionProperty(params['resetValue'], 'reset', 0);
						// start the loop again
						tickerLoop();
					});
				}
			// use JS animate
			}else{
				var animateObj = {};
				animateObj[slider.animProp] = value;
				if(type == 'slide'){
					el.animate(animateObj, duration, slider.settings.easing, function(){
						updateAfterSlideTransition();
					});
				}else if(type == 'reset'){
					el.css(slider.animProp, value)
				}else if(type == 'ticker'){
					el.animate(animateObj, speed, 'linear', function(){
						setPositionProperty(params['resetValue'], 'reset', 0);
						// run the recursive loop after animation
						tickerLoop();
					});
				}
			}
		}

		/**
		 * Populates the pager with proper amount of pages
		 */
		var populatePager = function(){
			var pagerHtml = '';
			var pagerQty = getPagerQty();
			// loop through each pager item
			for(var i=0; i < pagerQty; i++){
				var linkContent = '';
				// if a buildPager function is supplied, use it to get pager link value, else use index + 1
				if(slider.settings.buildPager && $.isFunction(slider.settings.buildPager)){
					linkContent = slider.settings.buildPager(i);
					slider.pagerEl.addClass('bx-custom-pager');
				}else{
					linkContent = i + 1;
					slider.pagerEl.addClass('bx-default-pager');
				}
				// var linkContent = slider.settings.buildPager && $.isFunction(slider.settings.buildPager) ? slider.settings.buildPager(i) : i + 1;
				// add the markup to the string
				pagerHtml += '<div class="bx-pager-item"><a href="" data-slide-index="' + i + '" class="bx-pager-link">' + linkContent + '</a></div>';
			};
			// populate the pager element with pager links
			slider.pagerEl.html(pagerHtml);
		}

		/**
		 * Appends the pager to the controls element
		 */
		var appendPager = function(){
			if(!slider.settings.pagerCustom){
				// create the pager DOM element
				slider.pagerEl = $('<div class="bx-pager" />');
				// if a pager selector was supplied, populate it with the pager
				if(slider.settings.pagerSelector){
					$(slider.settings.pagerSelector).html(slider.pagerEl);
				// if no pager selector was supplied, add it after the wrapper
				}else{
					slider.controls.el.addClass('bx-has-pager').append(slider.pagerEl);
				}
				// populate the pager
				populatePager();
			}else{
				slider.pagerEl = $(slider.settings.pagerCustom);
			}
			// assign the pager click binding
			slider.pagerEl.on('click', 'a', clickPagerBind);
		}

		/**
		 * Appends prev / next controls to the controls element
		 */
		var appendControls = function(){
			slider.controls.next = $('<a class="bx-next" href="">' + slider.settings.nextText + '</a>');
			slider.controls.prev = $('<a class="bx-prev" href="">' + slider.settings.prevText + '</a>');
			// bind click actions to the controls
			slider.controls.next.bind('click', clickNextBind);
			slider.controls.prev.bind('click', clickPrevBind);
			// if nextSlector was supplied, populate it
			if(slider.settings.nextSelector){
				$(slider.settings.nextSelector).append(slider.controls.next);
			}
			// if prevSlector was supplied, populate it
			if(slider.settings.prevSelector){
				$(slider.settings.prevSelector).append(slider.controls.prev);
			}
			// if no custom selectors were supplied
			if(!slider.settings.nextSelector && !slider.settings.prevSelector){
				// add the controls to the DOM
				slider.controls.directionEl = $('<div class="bx-controls-direction" />');
				// add the control elements to the directionEl
				slider.controls.directionEl.append(slider.controls.prev).append(slider.controls.next);
				// slider.viewport.append(slider.controls.directionEl);
				slider.controls.el.addClass('bx-has-controls-direction').append(slider.controls.directionEl);
			}
		}

		/**
		 * Appends start / stop auto controls to the controls element
		 */
		var appendControlsAuto = function(){
			slider.controls.start = $('<div class="bx-controls-auto-item"><a class="bx-start" href="">' + slider.settings.startText + '</a></div>');
			slider.controls.stop = $('<div class="bx-controls-auto-item"><a class="bx-stop" href="">' + slider.settings.stopText + '</a></div>');
			// add the controls to the DOM
			slider.controls.autoEl = $('<div class="bx-controls-auto" />');
			// bind click actions to the controls
			slider.controls.autoEl.on('click', '.bx-start', clickStartBind);
			slider.controls.autoEl.on('click', '.bx-stop', clickStopBind);
			// if autoControlsCombine, insert only the "start" control
			if(slider.settings.autoControlsCombine){
				slider.controls.autoEl.append(slider.controls.start);
			// if autoControlsCombine is false, insert both controls
			}else{
				slider.controls.autoEl.append(slider.controls.start).append(slider.controls.stop);
			}
			// if auto controls selector was supplied, populate it with the controls
			if(slider.settings.autoControlsSelector){
				$(slider.settings.autoControlsSelector).html(slider.controls.autoEl);
			// if auto controls selector was not supplied, add it after the wrapper
			}else{
				slider.controls.el.addClass('bx-has-controls-auto').append(slider.controls.autoEl);
			}
			// update the auto controls
			updateAutoControls(slider.settings.autoStart ? 'stop' : 'start');
		}

		/**
		 * Appends image captions to the DOM
		 */
		var appendCaptions = function(){
			// cycle through each child
			slider.children.each(function(index){
				// get the image title attribute
				var title = $(this).find('img:first').attr('title');
				// append the caption
				if (title != undefined && ('' + title).length) {
                    $(this).append('<div class="bx-caption"><span>' + title + '</span></div>');
                }
			});
		}

		/**
		 * Click next binding
		 *
		 * @param e (event)
		 *  - DOM event object
		 */
		var clickNextBind = function(e){
			// if auto show is running, stop it
			if (slider.settings.auto) el.stopAuto();
			el.goToNextSlide();
			e.preventDefault();
		}

		/**
		 * Click prev binding
		 *
		 * @param e (event)
		 *  - DOM event object
		 */
		var clickPrevBind = function(e){
			// if auto show is running, stop it
			if (slider.settings.auto) el.stopAuto();
			el.goToPrevSlide();
			e.preventDefault();
		}

		/**
		 * Click start binding
		 *
		 * @param e (event)
		 *  - DOM event object
		 */
		var clickStartBind = function(e){
			el.startAuto();
			e.preventDefault();
		}

		/**
		 * Click stop binding
		 *
		 * @param e (event)
		 *  - DOM event object
		 */
		var clickStopBind = function(e){
			el.stopAuto();
			e.preventDefault();
		}

		/**
		 * Click pager binding
		 *
		 * @param e (event)
		 *  - DOM event object
		 */
		var clickPagerBind = function(e){
			// if auto show is running, stop it
			if (slider.settings.auto) el.stopAuto();
			var pagerLink = $(e.currentTarget);
			if(pagerLink.attr('data-slide-index') !== undefined){
				var pagerIndex = parseInt(pagerLink.attr('data-slide-index'));
				// if clicked pager link is not active, continue with the goToSlide call
				if(pagerIndex != slider.active.index) el.goToSlide(pagerIndex);
				e.preventDefault();
			}
		}

		/**
		 * Updates the pager links with an active class
		 *
		 * @param slideIndex (int)
		 *  - index of slide to make active
		 */
		var updatePagerActive = function(slideIndex){
			// if "short" pager type
			var len = slider.children.length; // nb of children
			if(slider.settings.pagerType == 'short'){
				if(slider.settings.maxSlides > 1) {
					len = Math.ceil(slider.children.length/slider.settings.maxSlides);
				}
				slider.pagerEl.html( (slideIndex + 1) + slider.settings.pagerShortSeparator + len);
				return;
			}
			// remove all pager active classes
			slider.pagerEl.find('a').removeClass('active');
			// apply the active class for all pagers
			slider.pagerEl.each(function(i, el) { $(el).find('a').eq(slideIndex).addClass('active'); });
		}

		/**
		 * Performs needed actions after a slide transition
		 */
		var updateAfterSlideTransition = function(){
			// if infinte loop is true
			if(slider.settings.infiniteLoop){
				var position = '';
				// first slide
				if(slider.active.index == 0){
					// set the new position
					position = slider.children.eq(0).position();
				// carousel, last slide
				}else if(slider.active.index == getPagerQty() - 1 && slider.carousel){
					position = slider.children.eq((getPagerQty() - 1) * getMoveBy()).position();
				// last slide
				}else if(slider.active.index == slider.children.length - 1){
					position = slider.children.eq(slider.children.length - 1).position();
				}
				if(position){
					if (slider.settings.mode == 'horizontal') { setPositionProperty(-position.left, 'reset', 0); }
					else if (slider.settings.mode == 'vertical') { setPositionProperty(-position.top, 'reset', 0); }
				}
			}
			// declare that the transition is complete
			slider.working = false;
			// onSlideAfter callback
			slider.settings.onSlideAfter(slider.children.eq(slider.active.index), slider.oldIndex, slider.active.index);
		}

		/**
		 * Updates the auto controls state (either active, or combined switch)
		 *
		 * @param state (string) "start", "stop"
		 *  - the new state of the auto show
		 */
		var updateAutoControls = function(state){
			// if autoControlsCombine is true, replace the current control with the new state
			if(slider.settings.autoControlsCombine){
				slider.controls.autoEl.html(slider.controls[state]);
			// if autoControlsCombine is false, apply the "active" class to the appropriate control
			}else{
				slider.controls.autoEl.find('a').removeClass('active');
				slider.controls.autoEl.find('a:not(.bx-' + state + ')').addClass('active');
			}
		}

		/**
		 * Updates the direction controls (checks if either should be hidden)
		 */
		var updateDirectionControls = function(){
			if(getPagerQty() == 1){
				slider.controls.prev.addClass('disabled');
				slider.controls.next.addClass('disabled');
			}else if(!slider.settings.infiniteLoop && slider.settings.hideControlOnEnd){
				// if first slide
				if (slider.active.index == 0){
					slider.controls.prev.addClass('disabled');
					slider.controls.next.removeClass('disabled');
				// if last slide
				}else if(slider.active.index == getPagerQty() - 1){
					slider.controls.next.addClass('disabled');
					slider.controls.prev.removeClass('disabled');
				// if any slide in the middle
				}else{
					slider.controls.prev.removeClass('disabled');
					slider.controls.next.removeClass('disabled');
				}
			}
		}

		/**
		 * Initialzes the auto process
		 */
		var initAuto = function(){
			// if autoDelay was supplied, launch the auto show using a setTimeout() call
			if(slider.settings.autoDelay > 0){
				var timeout = setTimeout(el.startAuto, slider.settings.autoDelay);
			// if autoDelay was not supplied, start the auto show normally
			}else{
				el.startAuto();
			}
			// if autoHover is requested
			if(slider.settings.autoHover){
				// on el hover
				el.hover(function(){
					// if the auto show is currently playing (has an active interval)
					if(slider.interval){
						// stop the auto show and pass true agument which will prevent control update
						el.stopAuto(true);
						// create a new autoPaused value which will be used by the relative "mouseout" event
						slider.autoPaused = true;
					}
				}, function(){
					// if the autoPaused value was created be the prior "mouseover" event
					if(slider.autoPaused){
						// start the auto show and pass true agument which will prevent control update
						el.startAuto(true);
						// reset the autoPaused value
						slider.autoPaused = null;
					}
				});
			}
		}

		/**
		 * Initialzes the ticker process
		 */
		var initTicker = function(){
			var startPosition = 0;
			// if autoDirection is "next", append a clone of the entire slider
			if(slider.settings.autoDirection == 'next'){
				el.append(slider.children.clone().addClass('bx-clone'));
			// if autoDirection is "prev", prepend a clone of the entire slider, and set the left position
			}else{
				el.prepend(slider.children.clone().addClass('bx-clone'));
				var position = slider.children.first().position();
				startPosition = slider.settings.mode == 'horizontal' ? -position.left : -position.top;
			}
			setPositionProperty(startPosition, 'reset', 0);
			// do not allow controls in ticker mode
			slider.settings.pager = false;
			slider.settings.controls = false;
			slider.settings.autoControls = false;
			// if autoHover is requested
			if(slider.settings.tickerHover && !slider.usingCSS){
				// on el hover
				slider.viewport.hover(function(){
					el.stop();
				}, function(){
					// calculate the total width of children (used to calculate the speed ratio)
					var totalDimens = 0;
					slider.children.each(function(index){
					  totalDimens += slider.settings.mode == 'horizontal' ? $(this).outerWidth(true) : $(this).outerHeight(true);
					});
					// calculate the speed ratio (used to determine the new speed to finish the paused animation)
					var ratio = slider.settings.speed / totalDimens;
					// determine which property to use
					var property = slider.settings.mode == 'horizontal' ? 'left' : 'top';
					// calculate the new speed
					var newSpeed = ratio * (totalDimens - (Math.abs(parseInt(el.css(property)))));
					tickerLoop(newSpeed);
				});
			}
			// start the ticker loop
			tickerLoop();
		}

		/**
		 * Runs a continuous loop, news ticker-style
		 */
		var tickerLoop = function(resumeSpeed){
			speed = resumeSpeed ? resumeSpeed : slider.settings.speed;
			var position = {left: 0, top: 0};
			var reset = {left: 0, top: 0};
			// if "next" animate left position to last child, then reset left to 0
			if(slider.settings.autoDirection == 'next'){
				position = el.find('.bx-clone').first().position();
			// if "prev" animate left position to 0, then reset left to first non-clone child
			}else{
				reset = slider.children.first().position();
			}
			var animateProperty = slider.settings.mode == 'horizontal' ? -position.left : -position.top;
			var resetValue = slider.settings.mode == 'horizontal' ? -reset.left : -reset.top;
			var params = {resetValue: resetValue};
			setPositionProperty(animateProperty, 'ticker', speed, params);
		}

		/**
		 * Initializes touch events
		 */
		var initTouch = function(){
			// initialize object to contain all touch values
			slider.touch = {
				start: {x: 0, y: 0},
				end: {x: 0, y: 0}
			}
			slider.viewport.bind('touchstart', onTouchStart);
		}

		/**
		 * Event handler for "touchstart"
		 *
		 * @param e (event)
		 *  - DOM event object
		 */
		var onTouchStart = function(e){
			if(slider.working){
				e.preventDefault();
			}else{
				// record the original position when touch starts
				slider.touch.originalPos = el.position();
				var orig = e.originalEvent;
				// record the starting touch x, y coordinates
				slider.touch.start.x = orig.changedTouches[0].pageX;
				slider.touch.start.y = orig.changedTouches[0].pageY;
				// bind a "touchmove" event to the viewport
				slider.viewport.bind('touchmove', onTouchMove);
				// bind a "touchend" event to the viewport
				slider.viewport.bind('touchend', onTouchEnd);
			}
		}

		/**
		 * Event handler for "touchmove"
		 *
		 * @param e (event)
		 *  - DOM event object
		 */
		var onTouchMove = function(e){
			var orig = e.originalEvent;
			// if scrolling on y axis, do not prevent default
			var xMovement = Math.abs(orig.changedTouches[0].pageX - slider.touch.start.x);
			var yMovement = Math.abs(orig.changedTouches[0].pageY - slider.touch.start.y);
			// x axis swipe
			if((xMovement * 3) > yMovement && slider.settings.preventDefaultSwipeX){
				e.preventDefault();
			// y axis swipe
			}else if((yMovement * 3) > xMovement && slider.settings.preventDefaultSwipeY){
				e.preventDefault();
			}
			if(slider.settings.mode != 'fade' && slider.settings.oneToOneTouch){
				var value = 0;
				// if horizontal, drag along x axis
				if(slider.settings.mode == 'horizontal'){
					var change = orig.changedTouches[0].pageX - slider.touch.start.x;
					value = slider.touch.originalPos.left + change;
				// if vertical, drag along y axis
				}else{
					var change = orig.changedTouches[0].pageY - slider.touch.start.y;
					value = slider.touch.originalPos.top + change;
				}
				setPositionProperty(value, 'reset', 0);
			}
		}

		/**
		 * Event handler for "touchend"
		 *
		 * @param e (event)
		 *  - DOM event object
		 */
		var onTouchEnd = function(e){
			slider.viewport.unbind('touchmove', onTouchMove);
			var orig = e.originalEvent;
			var value = 0;
			// record end x, y positions
			slider.touch.end.x = orig.changedTouches[0].pageX;
			slider.touch.end.y = orig.changedTouches[0].pageY;
			// if fade mode, check if absolute x distance clears the threshold
			if(slider.settings.mode == 'fade'){
				var distance = Math.abs(slider.touch.start.x - slider.touch.end.x);
				if(distance >= slider.settings.swipeThreshold){
					slider.touch.start.x > slider.touch.end.x ? el.goToNextSlide() : el.goToPrevSlide();
					el.stopAuto();
				}
			// not fade mode
			}else{
				var distance = 0;
				// calculate distance and el's animate property
				if(slider.settings.mode == 'horizontal'){
					distance = slider.touch.end.x - slider.touch.start.x;
					value = slider.touch.originalPos.left;
				}else{
					distance = slider.touch.end.y - slider.touch.start.y;
					value = slider.touch.originalPos.top;
				}
				// if not infinite loop and first / last slide, do not attempt a slide transition
				if(!slider.settings.infiniteLoop && ((slider.active.index == 0 && distance > 0) || (slider.active.last && distance < 0))){
					setPositionProperty(value, 'reset', 200);
				}else{
					// check if distance clears threshold
					if(Math.abs(distance) >= slider.settings.swipeThreshold){
						distance < 0 ? el.goToNextSlide() : el.goToPrevSlide();
						el.stopAuto();
					}else{
						// el.animate(property, 200);
						setPositionProperty(value, 'reset', 200);
					}
				}
			}
			slider.viewport.unbind('touchend', onTouchEnd);
		}

		/**
		 * Window resize event callback
		 */
		var resizeWindow = function(e){
			// don't do anything if slider isn't initialized.
			if(!slider.initialized) return;
			// get the new window dimens (again, thank you IE)
			var windowWidthNew = $(window).width();
			var windowHeightNew = $(window).height();
			// make sure that it is a true window resize
			// *we must check this because our dinosaur friend IE fires a window resize event when certain DOM elements
			// are resized. Can you just die already?*
			if(windowWidth != windowWidthNew || windowHeight != windowHeightNew){
				// set the new window dimens
				windowWidth = windowWidthNew;
				windowHeight = windowHeightNew;
				// update all dynamic elements
				el.redrawSlider();
				// Call user resize handler
				slider.settings.onSliderResize.call(el, slider.active.index);
			}
		}

		/**
		 * ===================================================================================
		 * = PUBLIC FUNCTIONS
		 * ===================================================================================
		 */

		/**
		 * Performs slide transition to the specified slide
		 *
		 * @param slideIndex (int)
		 *  - the destination slide's index (zero-based)
		 *
		 * @param direction (string)
		 *  - INTERNAL USE ONLY - the direction of travel ("prev" / "next")
		 */
		el.goToSlide = function(slideIndex, direction){
			// if plugin is currently in motion, ignore request
			if(slider.working || slider.active.index == slideIndex) return;
			// declare that plugin is in motion
			slider.working = true;
			// store the old index
			slider.oldIndex = slider.active.index;
			// if slideIndex is less than zero, set active index to last child (this happens during infinite loop)
			if(slideIndex < 0){
				slider.active.index = getPagerQty() - 1;
			// if slideIndex is greater than children length, set active index to 0 (this happens during infinite loop)
			}else if(slideIndex >= getPagerQty()){
				slider.active.index = 0;
			// set active index to requested slide
			}else{
				slider.active.index = slideIndex;
			}
			// onSlideBefore, onSlideNext, onSlidePrev callbacks
			slider.settings.onSlideBefore(slider.children.eq(slider.active.index), slider.oldIndex, slider.active.index);
			if(direction == 'next'){
				slider.settings.onSlideNext(slider.children.eq(slider.active.index), slider.oldIndex, slider.active.index);
			}else if(direction == 'prev'){
				slider.settings.onSlidePrev(slider.children.eq(slider.active.index), slider.oldIndex, slider.active.index);
			}
			// check if last slide
			slider.active.last = slider.active.index >= getPagerQty() - 1;
			// update the pager with active class
			if(slider.settings.pager) updatePagerActive(slider.active.index);
			// // check for direction control update
			if(slider.settings.controls) updateDirectionControls();
			// if slider is set to mode: "fade"
			if(slider.settings.mode == 'fade'){
				// if adaptiveHeight is true and next height is different from current height, animate to the new height
				if(slider.settings.adaptiveHeight && slider.viewport.height() != getViewportHeight()){
					slider.viewport.animate({height: getViewportHeight()}, slider.settings.adaptiveHeightSpeed);
				}
				// fade out the visible child and reset its z-index value
				slider.children.filter(':visible').fadeOut(slider.settings.speed).css({zIndex: 0});
				// fade in the newly requested slide
				slider.children.eq(slider.active.index).css('zIndex', slider.settings.slideZIndex+1).fadeIn(slider.settings.speed, function(){
					$(this).css('zIndex', slider.settings.slideZIndex);
					updateAfterSlideTransition();
				});
			// slider mode is not "fade"
			}else{
				// if adaptiveHeight is true and next height is different from current height, animate to the new height
				if(slider.settings.adaptiveHeight && slider.viewport.height() != getViewportHeight()){
					slider.viewport.animate({height: getViewportHeight()}, slider.settings.adaptiveHeightSpeed);
				}
				var moveBy = 0;
				var position = {left: 0, top: 0};
				// if carousel and not infinite loop
				if(!slider.settings.infiniteLoop && slider.carousel && slider.active.last){
					if(slider.settings.mode == 'horizontal'){
						// get the last child position
						var lastChild = slider.children.eq(slider.children.length - 1);
						position = lastChild.position();
						// calculate the position of the last slide
						moveBy = slider.viewport.width() - lastChild.outerWidth();
					}else{
						// get last showing index position
						var lastShowingIndex = slider.children.length - slider.settings.minSlides;
						position = slider.children.eq(lastShowingIndex).position();
					}
					// horizontal carousel, going previous while on first slide (infiniteLoop mode)
				}else if(slider.carousel && slider.active.last && direction == 'prev'){
					// get the last child position
					var eq = slider.settings.moveSlides == 1 ? slider.settings.maxSlides - getMoveBy() : ((getPagerQty() - 1) * getMoveBy()) - (slider.children.length - slider.settings.maxSlides);
					var lastChild = el.children('.bx-clone').eq(eq);
					position = lastChild.position();
				// if infinite loop and "Next" is clicked on the last slide
				}else if(direction == 'next' && slider.active.index == 0){
					// get the last clone position
					position = el.find('> .bx-clone').eq(slider.settings.maxSlides).position();
					slider.active.last = false;
				// normal non-zero requests
				}else if(slideIndex >= 0){
					var requestEl = slideIndex * getMoveBy();
					position = slider.children.eq(requestEl).position();
				}

				/* If the position doesn't exist
				 * (e.g. if you destroy the slider on a next click),
				 * it doesn't throw an error.
				 */
				if ("undefined" !== typeof(position)) {
					var value = slider.settings.mode == 'horizontal' ? -(position.left - moveBy) : -position.top;
					// plugin values to be animated
					setPositionProperty(value, 'slide', slider.settings.speed);
				}
			}
		}

		/**
		 * Transitions to the next slide in the show
		 */
		el.goToNextSlide = function(){
			// if infiniteLoop is false and last page is showing, disregard call
			if (!slider.settings.infiniteLoop && slider.active.last) return;
			var pagerIndex = parseInt(slider.active.index) + 1;
			el.goToSlide(pagerIndex, 'next');
		}

		/**
		 * Transitions to the prev slide in the show
		 */
		el.goToPrevSlide = function(){
			// if infiniteLoop is false and last page is showing, disregard call
			if (!slider.settings.infiniteLoop && slider.active.index == 0) return;
			var pagerIndex = parseInt(slider.active.index) - 1;
			el.goToSlide(pagerIndex, 'prev');
		}

		/**
		 * Starts the auto show
		 *
		 * @param preventControlUpdate (boolean)
		 *  - if true, auto controls state will not be updated
		 */
		el.startAuto = function(preventControlUpdate){
			// if an interval already exists, disregard call
			if(slider.interval) return;
			// create an interval
			slider.interval = setInterval(function(){
				slider.settings.autoDirection == 'next' ? el.goToNextSlide() : el.goToPrevSlide();
			}, slider.settings.pause);
			// if auto controls are displayed and preventControlUpdate is not true
			if (slider.settings.autoControls && preventControlUpdate != true) updateAutoControls('stop');
		}

		/**
		 * Stops the auto show
		 *
		 * @param preventControlUpdate (boolean)
		 *  - if true, auto controls state will not be updated
		 */
		el.stopAuto = function(preventControlUpdate){
			// if no interval exists, disregard call
			if(!slider.interval) return;
			// clear the interval
			clearInterval(slider.interval);
			slider.interval = null;
			// if auto controls are displayed and preventControlUpdate is not true
			if (slider.settings.autoControls && preventControlUpdate != true) updateAutoControls('start');
		}

		/**
		 * Returns current slide index (zero-based)
		 */
		el.getCurrentSlide = function(){
			return slider.active.index;
		}

		/**
		 * Returns current slide element
		 */
		el.getCurrentSlideElement = function(){
			return slider.children.eq(slider.active.index);
		}

		/**
		 * Returns number of slides in show
		 */
		el.getSlideCount = function(){
			return slider.children.length;
		}

		/**
		 * Update all dynamic slider elements
		 */
		el.redrawSlider = function(){
			// resize all children in ratio to new screen size
			slider.children.add(el.find('.bx-clone')).width(getSlideWidth());
			// adjust the height
			slider.viewport.css('height', getViewportHeight());
			// update the slide position
			if(!slider.settings.ticker) setSlidePosition();
			// if active.last was true before the screen resize, we want
			// to keep it last no matter what screen size we end on
			if (slider.active.last) slider.active.index = getPagerQty() - 1;
			// if the active index (page) no longer exists due to the resize, simply set the index as last
			if (slider.active.index >= getPagerQty()) slider.active.last = true;
			// if a pager is being displayed and a custom pager is not being used, update it
			if(slider.settings.pager && !slider.settings.pagerCustom){
				populatePager();
				updatePagerActive(slider.active.index);
			}
		}

		/**
		 * Destroy the current instance of the slider (revert everything back to original state)
		 */
		el.destroySlider = function(){
			// don't do anything if slider has already been destroyed
			if(!slider.initialized) return;
			slider.initialized = false;
			$('.bx-clone', this).remove();
			slider.children.each(function() {
				$(this).data("origStyle") != undefined ? $(this).attr("style", $(this).data("origStyle")) : $(this).removeAttr('style');
			});
			$(this).data("origStyle") != undefined ? this.attr("style", $(this).data("origStyle")) : $(this).removeAttr('style');
			$(this).unwrap().unwrap();
			if(slider.controls.el) slider.controls.el.remove();
			if(slider.controls.next) slider.controls.next.remove();
			if(slider.controls.prev) slider.controls.prev.remove();
			if(slider.pagerEl && slider.settings.controls) slider.pagerEl.remove();
			$('.bx-caption', this).remove();
			if(slider.controls.autoEl) slider.controls.autoEl.remove();
			clearInterval(slider.interval);
			if(slider.settings.responsive) $(window).unbind('resize', resizeWindow);
		}

		/**
		 * Reload the slider (revert all DOM changes, and re-initialize)
		 */
		el.reloadSlider = function(settings){
			if (settings != undefined) options = settings;
			el.destroySlider();
			init();
		}

		init();

		// returns the current jQuery object
		return this;
	}

})(jQuery);
/*################ jquery.bxslider.min.js ends ###################*/

/*################ 12577.js starts ###################*/
function fddcw(){var e=jQuery(".dynamic-data-container");if(e.css("width","auto"),e&&e.length){e.children().hide();var i=e.css("width");e.children().show(),e.css({width:i,"overflow-x":"auto"})}}function imgDisplay(e,t){for(document.getElementById("imgZoomThumb").src=e,document.getElementById("imgZoom").href=e,as=document.getElementById("imgCounter").getElementsByTagName("a"),i=0;i<as.length;i++)i==t?as[i].className="on":as[i].className=""}!function(e){e(document).ready(function(){function n(){e("#projectMoreLinksDiv").slideUp("slow")}var o=e('[data-plugin~="childrenscroller"]');for(i=0,j=o.length;i<j;i++)e(o[i]).childrenscroller();if(fddcw(),e(".formatView").length){var s=e(".formatView"),r=s.children("a");if($classifieds=e("#classifieds"),$bxslider=$classifieds.find(".bxslider"),$li=$bxslider.children("li"),liHeight=0,!r.length)return;$li.length&&$li.each(function(){liHeight=Math.max(e(this).height(),liHeight)}),s.children("a").each(function(){e(this).click(function(){e(this).hasClass("on")||(e(this).addClass("on").siblings("a").removeClass("on"),$classifieds.length&&($classifieds.toggleClass("classified3Images classified_detailview"),$classifieds.hasClass("classified_detailview")?$li.css({height:"auto"}):$li.css({height:liHeight})))})})}e("#projectMoreLinksA").mouseover(function(){e("#projectMoreLinksDiv").slideDown("slow",function(){})}),e("#projectMoreLinksA, #projectMoreLinksDiv").mouseleave(function(){t=setTimeout(n,1e3)}),e("#projectMoreLinksA, #projectMoreLinksDiv").mouseover(function(){clearTimeout(t)})}),jQuery(window).load(function(i){var t=e('[class *= "bxslider"]');t.length&&t.each(function(){e(this).children("li").css({height:"auto"}),e(this).children("li").EqualHeight()})}),jQuery(window).resize(function(){var i=e('[class *= "bxslider"]');i.length&&i.each(function(){e(this).children("li").css({height:"auto"}),e(this).children("li").EqualHeight()}),fddcw()}),jQuery(window).load(function(i){var t=e('[class *= "idv_eqheight"]');t.length&&t.each(function(){e(this).find("li>div").css({height:"auto"}),e(this).find("li>div").EqualHeight()})}),jQuery(window).resize(function(){var i=e('[class *= "idv_eqheight"]');i.length&&i.each(function(){e(this).children("li>div").css({height:"auto"}),e(this).children("li>div").EqualHeight()}),fddcw()}),e.fn.childrenscroller=function(){if(this.length){var i=e(this),t={delay:1e3,pause:1e3,speed:500},n=e.extend({},t,e(this).data("childrenscroller-settings")),o=null,s=!1;return height=e(this).height(),tags=e(this).children(),this.each(function(){var e=function(){var e=i.children().eq(0).outerHeight(!0);i.height()-i.scrollTop()>=e&&(o=setInterval(t,n.pause))},t=function(){if(!s){clearInterval(o);var t=i.children().eq(0).outerHeight(!0);i.animate({scrollTop:t},n.speed,function(){i.append(i.children().eq(0)),i.scrollTop(0),setTimeout(e,n.pause)})}};i.on("mouseover",function(){s=!0}),i.on("mouseout",function(){s=!1}),setTimeout(e,n.delay)})}},e.fn.EqualHeight=function(){var i=e(this),t=0;this.each(function(){t=Math.max(t,e(this).height())}),i.css("height",t)}}(jQuery),jQuery(window).load(function(){jQuery(document).innerHeight();var e=jQuery("header").height(),i=jQuery("#middle").height(),t=jQuery("footer").outerHeight(),n=jQuery(window).height(),o=e+i+t,s=n-o;o<=n&&jQuery("footer").css("margin-top",s)}),function(e,i,t){"use strict";e.HoverDir=function(i,t){this.$el=e(t),this._init(i)},e.HoverDir.defaults={speed:300,easing:"ease",hoverDelay:0,inverse:!1},e.HoverDir.prototype={_init:function(i){this.options=e.extend(!0,{},e.HoverDir.defaults,i),this.transitionProp="all "+this.options.speed+"ms "+this.options.easing,this._loadEvents()},_loadEvents:function(){var i=this;this.$el.on("mouseenter.hoverdir, mouseleave.hoverdir",function(t){var n=e(this),o=n.find(".gallery-overlay"),s=i._getDir(n,{x:t.pageX,y:t.pageY}),r=i._getStyle(s);"mouseenter"===t.type?(o.hide().css(r.from),clearTimeout(i.tmhover),i.tmhover=setTimeout(function(){o.show(0,function(){var t=e(this);i.support&&t.css("transition",i.transitionProp),i._applyAnimation(t,r.to,i.options.speed)})},i.options.hoverDelay)):(i.support&&o.css("transition",i.transitionProp),clearTimeout(i.tmhover),i._applyAnimation(o,r.from,i.options.speed))})},_getDir:function(e,i){var t=e.width(),n=e.height(),o=(i.x-e.offset().left-t/2)*(t>n?n/t:1),s=(i.y-e.offset().top-n/2)*(n>t?t/n:1);return Math.round((Math.atan2(s,o)*(180/Math.PI)+180)/90+3)%4},_getStyle:function(e){var i,t,n={left:"0px",top:"-100%"},o={left:"0px",top:"100%"},s={left:"-100%",top:"0px"},r={left:"100%",top:"0px"},a={top:"0px"},h={left:"0px"};switch(e){case 0:i=this.options.inverse?o:n,t=a;break;case 1:i=this.options.inverse?s:r,t=h;break;case 2:i=this.options.inverse?n:o,t=a;break;case 3:i=this.options.inverse?r:s,t=h}return{from:i,to:t}},_applyAnimation:function(i,t,n){e.fn.applyStyle=this.support?e.fn.css:e.fn.animate,i.stop().applyStyle(t,e.extend(!0,[],{duration:n+"ms"}))}};var n=function(e){i.console&&i.console.error(e)};e.fn.hoverdir=function(i){var t=e.data(this,"hoverdir");if("string"==typeof i){var o=Array.prototype.slice.call(arguments,1);this.each(function(){t?e.isFunction(t[i])&&"_"!==i.charAt(0)?t[i].apply(t,o):n("no such method '"+i+"' for hoverdir instance"):n("cannot call methods on hoverdir prior to initialization; attempted to call method '"+i+"'")})}else this.each(function(){t?t._init():t=e.data(this,"hoverdir",new e.HoverDir(i,this))});return t}}(jQuery,window);
/*################ 12577.js ends ###################*/

/*################ lazysizes.js starts ###################*/
/*! lazysizes - v5.3.0 */
!function(e){var t=function(u,D,f){"use strict";var k,H;if(function(){var e;var t={lazyClass:"lazyload",loadedClass:"lazyloaded",loadingClass:"lazyloading",preloadClass:"lazypreload",errorClass:"lazyerror",autosizesClass:"lazyautosizes",fastLoadedClass:"ls-is-cached",iframeLoadMode:0,srcAttr:"data-src",srcsetAttr:"data-srcset",sizesAttr:"data-sizes",minSize:40,customMedia:{},init:true,expFactor:1.5,hFac:.8,loadMode:2,loadHidden:true,ricTimeout:0,throttleDelay:125};H=u.lazySizesConfig||u.lazysizesConfig||{};for(e in t){if(!(e in H)){H[e]=t[e]}}}(),!D||!D.getElementsByClassName){return{init:function(){},cfg:H,noSupport:true}}var O=D.documentElement,i=u.HTMLPictureElement,P="addEventListener",$="getAttribute",q=u[P].bind(u),I=u.setTimeout,U=u.requestAnimationFrame||I,o=u.requestIdleCallback,j=/^picture$/i,r=["load","error","lazyincluded","_lazyloaded"],a={},G=Array.prototype.forEach,J=function(e,t){if(!a[t]){a[t]=new RegExp("(\\s|^)"+t+"(\\s|$)")}return a[t].test(e[$]("class")||"")&&a[t]},K=function(e,t){if(!J(e,t)){e.setAttribute("class",(e[$]("class")||"").trim()+" "+t)}},Q=function(e,t){var a;if(a=J(e,t)){e.setAttribute("class",(e[$]("class")||"").replace(a," "))}},V=function(t,a,e){var i=e?P:"removeEventListener";if(e){V(t,a)}r.forEach(function(e){t[i](e,a)})},X=function(e,t,a,i,r){var n=D.createEvent("Event");if(!a){a={}}a.instance=k;n.initEvent(t,!i,!r);n.detail=a;e.dispatchEvent(n);return n},Y=function(e,t){var a;if(!i&&(a=u.picturefill||H.pf)){if(t&&t.src&&!e[$]("srcset")){e.setAttribute("srcset",t.src)}a({reevaluate:true,elements:[e]})}else if(t&&t.src){e.src=t.src}},Z=function(e,t){return(getComputedStyle(e,null)||{})[t]},s=function(e,t,a){a=a||e.offsetWidth;while(a<H.minSize&&t&&!e._lazysizesWidth){a=t.offsetWidth;t=t.parentNode}return a},ee=function(){var a,i;var t=[];var r=[];var n=t;var s=function(){var e=n;n=t.length?r:t;a=true;i=false;while(e.length){e.shift()()}a=false};var e=function(e,t){if(a&&!t){e.apply(this,arguments)}else{n.push(e);if(!i){i=true;(D.hidden?I:U)(s)}}};e._lsFlush=s;return e}(),te=function(a,e){return e?function(){ee(a)}:function(){var e=this;var t=arguments;ee(function(){a.apply(e,t)})}},ae=function(e){var a;var i=0;var r=H.throttleDelay;var n=H.ricTimeout;var t=function(){a=false;i=f.now();e()};var s=o&&n>49?function(){o(t,{timeout:n});if(n!==H.ricTimeout){n=H.ricTimeout}}:te(function(){I(t)},true);return function(e){var t;if(e=e===true){n=33}if(a){return}a=true;t=r-(f.now()-i);if(t<0){t=0}if(e||t<9){s()}else{I(s,t)}}},ie=function(e){var t,a;var i=99;var r=function(){t=null;e()};var n=function(){var e=f.now()-a;if(e<i){I(n,i-e)}else{(o||r)(r)}};return function(){a=f.now();if(!t){t=I(n,i)}}},e=function(){var v,m,c,h,e;var y,z,g,p,C,b,A;var n=/^img$/i;var d=/^iframe$/i;var E="onscroll"in u&&!/(gle|ing)bot/.test(navigator.userAgent);var _=0;var w=0;var M=0;var N=-1;var L=function(e){M--;if(!e||M<0||!e.target){M=0}};var x=function(e){if(A==null){A=Z(D.body,"visibility")=="hidden"}return A||!(Z(e.parentNode,"visibility")=="hidden"&&Z(e,"visibility")=="hidden")};var W=function(e,t){var a;var i=e;var r=x(e);g-=t;b+=t;p-=t;C+=t;while(r&&(i=i.offsetParent)&&i!=D.body&&i!=O){r=(Z(i,"opacity")||1)>0;if(r&&Z(i,"overflow")!="visible"){a=i.getBoundingClientRect();r=C>a.left&&p<a.right&&b>a.top-1&&g<a.bottom+1}}return r};var t=function(){var e,t,a,i,r,n,s,o,l,u,f,c;var d=k.elements;if((h=H.loadMode)&&M<8&&(e=d.length)){t=0;N++;for(;t<e;t++){if(!d[t]||d[t]._lazyRace){continue}if(!E||k.prematureUnveil&&k.prematureUnveil(d[t])){R(d[t]);continue}if(!(o=d[t][$]("data-expand"))||!(n=o*1)){n=w}if(!u){u=!H.expand||H.expand<1?O.clientHeight>500&&O.clientWidth>500?500:370:H.expand;k._defEx=u;f=u*H.expFactor;c=H.hFac;A=null;if(w<f&&M<1&&N>2&&h>2&&!D.hidden){w=f;N=0}else if(h>1&&N>1&&M<6){w=u}else{w=_}}if(l!==n){y=innerWidth+n*c;z=innerHeight+n;s=n*-1;l=n}a=d[t].getBoundingClientRect();if((b=a.bottom)>=s&&(g=a.top)<=z&&(C=a.right)>=s*c&&(p=a.left)<=y&&(b||C||p||g)&&(H.loadHidden||x(d[t]))&&(m&&M<3&&!o&&(h<3||N<4)||W(d[t],n))){R(d[t]);r=true;if(M>9){break}}else if(!r&&m&&!i&&M<4&&N<4&&h>2&&(v[0]||H.preloadAfterLoad)&&(v[0]||!o&&(b||C||p||g||d[t][$](H.sizesAttr)!="auto"))){i=v[0]||d[t]}}if(i&&!r){R(i)}}};var a=ae(t);var S=function(e){var t=e.target;if(t._lazyCache){delete t._lazyCache;return}L(e);K(t,H.loadedClass);Q(t,H.loadingClass);V(t,B);X(t,"lazyloaded")};var i=te(S);var B=function(e){i({target:e.target})};var T=function(e,t){var a=e.getAttribute("data-load-mode")||H.iframeLoadMode;if(a==0){e.contentWindow.location.replace(t)}else if(a==1){e.src=t}};var F=function(e){var t;var a=e[$](H.srcsetAttr);if(t=H.customMedia[e[$]("data-media")||e[$]("media")]){e.setAttribute("media",t)}if(a){e.setAttribute("srcset",a)}};var s=te(function(t,e,a,i,r){var n,s,o,l,u,f;if(!(u=X(t,"lazybeforeunveil",e)).defaultPrevented){if(i){if(a){K(t,H.autosizesClass)}else{t.setAttribute("sizes",i)}}s=t[$](H.srcsetAttr);n=t[$](H.srcAttr);if(r){o=t.parentNode;l=o&&j.test(o.nodeName||"")}f=e.firesLoad||"src"in t&&(s||n||l);u={target:t};K(t,H.loadingClass);if(f){clearTimeout(c);c=I(L,2500);V(t,B,true)}if(l){G.call(o.getElementsByTagName("source"),F)}if(s){t.setAttribute("srcset",s)}else if(n&&!l){if(d.test(t.nodeName)){T(t,n)}else{t.src=n}}if(r&&(s||l)){Y(t,{src:n})}}if(t._lazyRace){delete t._lazyRace}Q(t,H.lazyClass);ee(function(){var e=t.complete&&t.naturalWidth>1;if(!f||e){if(e){K(t,H.fastLoadedClass)}S(u);t._lazyCache=true;I(function(){if("_lazyCache"in t){delete t._lazyCache}},9)}if(t.loading=="lazy"){M--}},true)});var R=function(e){if(e._lazyRace){return}var t;var a=n.test(e.nodeName);var i=a&&(e[$](H.sizesAttr)||e[$]("sizes"));var r=i=="auto";if((r||!m)&&a&&(e[$]("src")||e.srcset)&&!e.complete&&!J(e,H.errorClass)&&J(e,H.lazyClass)){return}t=X(e,"lazyunveilread").detail;if(r){re.updateElem(e,true,e.offsetWidth)}e._lazyRace=true;M++;s(e,t,r,i,a)};var r=ie(function(){H.loadMode=3;a()});var o=function(){if(H.loadMode==3){H.loadMode=2}r()};var l=function(){if(m){return}if(f.now()-e<999){I(l,999);return}m=true;H.loadMode=3;a();q("scroll",o,true)};return{_:function(){e=f.now();k.elements=D.getElementsByClassName(H.lazyClass);v=D.getElementsByClassName(H.lazyClass+" "+H.preloadClass);q("scroll",a,true);q("resize",a,true);q("pageshow",function(e){if(e.persisted){var t=D.querySelectorAll("."+H.loadingClass);if(t.length&&t.forEach){U(function(){t.forEach(function(e){if(e.complete){R(e)}})})}}});if(u.MutationObserver){new MutationObserver(a).observe(O,{childList:true,subtree:true,attributes:true})}else{O[P]("DOMNodeInserted",a,true);O[P]("DOMAttrModified",a,true);setInterval(a,999)}q("hashchange",a,true);["focus","mouseover","click","load","transitionend","animationend"].forEach(function(e){D[P](e,a,true)});if(/d$|^c/.test(D.readyState)){l()}else{q("load",l);D[P]("DOMContentLoaded",a);I(l,2e4)}if(k.elements.length){t();ee._lsFlush()}else{a()}},checkElems:a,unveil:R,_aLSL:o}}(),re=function(){var a;var n=te(function(e,t,a,i){var r,n,s;e._lazysizesWidth=i;i+="px";e.setAttribute("sizes",i);if(j.test(t.nodeName||"")){r=t.getElementsByTagName("source");for(n=0,s=r.length;n<s;n++){r[n].setAttribute("sizes",i)}}if(!a.detail.dataAttr){Y(e,a.detail)}});var i=function(e,t,a){var i;var r=e.parentNode;if(r){a=s(e,r,a);i=X(e,"lazybeforesizes",{width:a,dataAttr:!!t});if(!i.defaultPrevented){a=i.detail.width;if(a&&a!==e._lazysizesWidth){n(e,r,i,a)}}}};var e=function(){var e;var t=a.length;if(t){e=0;for(;e<t;e++){i(a[e])}}};var t=ie(e);return{_:function(){a=D.getElementsByClassName(H.autosizesClass);q("resize",t)},checkElems:t,updateElem:i}}(),t=function(){if(!t.i&&D.getElementsByClassName){t.i=true;re._();e._()}};return I(function(){H.init&&t()}),k={cfg:H,autoSizer:re,loader:e,init:t,uP:Y,aC:K,rC:Q,hC:J,fire:X,gW:s,rAF:ee}}(e,e.document,Date);e.lazySizes=t,"object"==typeof module&&module.exports&&(module.exports=t)}("undefined"!=typeof window?window:{});
/*################ lazysizes.js ends ###################*/
