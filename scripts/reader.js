/**
 *	modified from github project 'philgyford / daily-paper'
 *	https://github.com/philgyford/daily-paper 
 *	Thanks to philgyford for the awesome job.
 */


// So we can do things like if ($('.classname').exists()) {}
jQuery.fn.exists = function(){return jQuery(this).length>0;}


/**
 * The custom code for the main functionality of the site.
 */
var reader = {
	
	// Will be data from the Contents File.
	issueContents: {},
	
	// This will be a list of the path about each bucket file, in order.
	bookBuckets: [],
	
	// Will be the 1-based index of the currently-viewed file in reader.issueArticles.
	// Begins on 0 until we view a page.
	currentPos: 0,
	
	// The width (in pixels) of each bucket of books.
	// Also set in CSS, so change there too, if you change it.
	bucketWidth: 1060,
	
	// How many pages do we want to load ahead of the one we're viewing now?
	// Currently only pre-loads stuff in the 'Next' direction.
	pagesToPreload: 0,
	
	// Will be true while the page is moving from one article to another.
	currentlyMoving: false,

	// Keep track of nav that's in the process glowing on/off.
	navGlowing: {'next':false, 'prev':false},
	
	initialize: function(options) {	
		reader.loadContentsFile();
		reader.processContents();
		reader.initializePage();
	},
	
	
	/**
	 * Clicked the 'next' link, so on to the next story.
	 */
	articleNext: function() {
		reader.moveToArticle(reader.currentPos+1);
	},

	
	/**
	 * Clicked the 'prev' link, so go back to the previous story.
	 */
	articlePrev: function() {
		reader.moveToArticle(reader.currentPos-1);
	},


	/**
	 * Sets a cookie containing this issue's date and the Guardian ID of the article we're currently looking at.
	 */
	cookieSet: function() {
		// The 'position' is the ID of the article, like 'law/2010/jul/07/torture-inquiry-witnesses-peter-gibson'.
		var cookieText = 'position:' + reader.currentPos;
		
		$.cookie('youlingman book', cookieText, { expires: 2 });
	},

	
	error: function(msg) {
		$('#error').html(msg).show().delay(3000).fadeOut(1000);
	},
	
	
	/**
	 * Make one of the direction arrows glow on and off.
	 * direction is 'next' or 'prev'.
	 * speed is 'normal' or 'fast'.
	 */
	glowNav: function(direction, speed) {
		// Keep track of what's in the process of glowing, so we don't store up
		// multiple glows.
		var in_speed = 300;
		var delay_speed = 1000;
		var out_speed = 1500;
		if (speed == 'fast') {
			delay_speed = 0;
			out_speed = 500;
		} else if (speed == 'slow') {
			delay_speed = 2500;
		};
		if ( ! reader.navGlowing[direction]) {
			reader.navGlowing[direction] = true;
			$('#'+direction+' span').fadeIn(in_speed).delay(delay_speed).fadeOut(out_speed, function(){
				reader.navGlowing[direction] = false;
			});
		};
	},

	
	/**
	 * Set up all the initial stories, the events, positions, etc.
	 */
	initializePage: function() {
	
		// Gets either 1, or the ID of the article in the user's cookie.
		//var initialArticleIdx = reader.getInitialArticleIdx();
		var initialArticleIdx = 1;

		// After this reader.currentPos will be set.
		// But probably too late to be of use here, but we can keep using
		// articleIdx. 
		reader.moveToArticle(initialArticleIdx);

		// Make the nav appear briefly where available.
		if (initialArticleIdx == 1) {
			// First article.
			reader.glowNav('next', 'slow');
		} else if (initialArticleIdx == reader.bookBuckets.length) {
			// Last article.
			reader.glowNav('prev', 'slow');
		} else { 
			reader.glowNav('next', 'slow');
			reader.glowNav('prev', 'slow');
		};

		$(window).resize(function(){
			reader.resizeNav();
		});
		// Set up the next/prev buttons to go to the next/prev story, but only if
		// they're 'on'.
		// They're not 'on' when at the beginning or end of the articles as
		// appropriate.
		$('.off#next').live('click', function(){return false;});
		$('.on#next').live('click', function(){
			reader.articleNext();
			return false;
		});
		$('.off#prev').live('click', function(){return false;});
		$('.on#prev').live('click', function(){
			reader.articlePrev();
			return false;
		});
			
		reader.enableKeyboardShortcuts();
	},


	/**
	 * When page is initialized, and whenever we open a modal dialog.
	 */
	enableKeyboardShortcuts: function() {
		$(document).bind('keydown', 'd', function(){ reader.articleNext(); });
		$(document).bind('keydown', 'l', function(){ reader.articleNext(); });
		$(document).bind('keydown', 'right', function(){ reader.articleNext(); });
		
		$(document).bind('keydown', 'a', function(){ reader.articlePrev(); });
		$(document).bind('keydown', 'j', function(){ reader.articlePrev(); });
		$(document).bind('keydown', 'left', function(){ reader.articlePrev(); });
		
		$(document).bind('keydown', 'v', function(){ reader.openOriginal(); });

		$(document).bind('keydown', 'space', function(){ reader.articleNext(); });
		$(document).bind('keydown', 'shift+space', function(){ reader.articlePrev(); });
	},


	/**
	 * When we open a modal dialog.
	 */
	disableKeyboardShortcuts: function() {
			$(document).unbind('keydown');
	},
	
	
	/**
	 * Load the HTML from the article file for this article.
	 * idx is the numerical, 1-based index of the filename from reader.issueArticles.
	 * position is either 'onscreen' (this is the article we're about to view) or
	 * 'offscreen' (for cached articles).
	 */
	loadArticleFile: function(idx, position) {
		if ( $('#bucket-'+idx).exists() && ! $('#bucket-'+idx).hasClass('loaded') ) {
			// Only load the contents if the #page-idx exists and has no contents.
			$.ajax({
				url: reader.bookBuckets[idx-1],
				dataType: 'html',
				data: {},
				async: false,
				success: function(returnedData) {
					$('#bucket-'+idx).html(returnedData).addClass('loaded');
					//fire the fade_img function when imgs in current bucket had loaded
			                $('#error').html("loading...").show();
					$('#bucket-'+idx+' .item img').onImgsLoaded(function() {
					//$('#bucket-'+idx+' .item img').load(function() {
		        	              fadeImg(this, '#bucket-'+idx);
        			        });
					$('#error').fadeOut(1000);
				},
				error: function(XMLHttpRequest, textStatus, errorThrown) {
					reader.error("Can't load bucket file: "+textStatus + ', '+errorThrown);
				}
			});
		}
	},

	
	/**
	 * Load the prev/next article(s) off-screen.
	 * Used when we move to a new article (including the first one).
	 */
	loadCachedArticles: function() {
		for (n=1; n<=reader.pagesToPreload; n++) {
			// loadArticleFile() will only load if the pages asked for exist and aren't already loaded.
			reader.loadArticleFile(reader.currentPos+n, 'offscreen');
			reader.loadArticleFile(reader.currentPos-n, 'offscreen');
		}
	},
	
	
	/**
	 * Load the contents file for today.
	 * Or, if that doesn't exist, load the one for yesterday.
	 */
	loadContentsFile: function() {
		$.ajax({
			url: 'archive/contents.json',
			dataType: 'json',
			data: {},
			async: false,
			success: function(returnedData) {
				// Yes, we have today's contents.
				reader.issueContents = returnedData;
			},
			error: function(XMLHttpRequest, textStatus, errorThrown) {
					reader.error("Can't load contents file: "+textStatus + ', '+errorThrown);
			}
		});
	},
	
	
	/**
	 * Move to a new article.
	 * idx is the 1-based index of the article in reader.issueArticles.
	 */
	moveToArticle: function(idx) {
		var fromIdx = reader.currentPos;
		var toIdx = idx;
		
		// Are we going onward (next) or backward (prev)?
		var direction = 'next';
		if (toIdx < reader.currentPos) {
			direction = 'prev';
		}
		
		if (direction == 'next' && fromIdx == reader.bookBuckets.length) {
			// We're on the last page and can't go forward, so forget it.
			return;
		} else if (direction == 'prev' && fromIdx <= 1) {
			// We're on the first page and can't go backwards, so forget it.
			return;
		} else if (reader.currentlyMoving) {
			// The page is currently moving to a different article, so don't start another movement.
			return;
		}
		
		// OK, we're going to move...

		reader.currentlyMoving = true;
		
		// We might be jumping to a page that we haven't already loaded, so load it.
		// (If it's already present, this will do nothing.)
		reader.loadArticleFile(toIdx, 'onscreen');
		
		// Standard website. Slide using javascript.
		$('#books').animate({left: -$('#bucket-'+toIdx).position().left}, 200, function() {
			if (fromIdx == 0 && toIdx > 1) {
				// First article viewed this visit, but it's not the first one in the list.
				$('#bucket-1').removeClass('current');
			} else {
				$('#bucket-'+fromIdx).removeClass('current');
			}
			$('#bucket-'+toIdx).addClass('current');
			
			reader.moveToArticleAfter(toIdx);
		});
	},
	
	
	/**
	 * Called after moveToArticle has finished moving the divs into position.
	 * Loads any new (currently hidden) content, sets navigation, etc.
	 */
	moveToArticleAfter: function(idx) {

		reader.currentPos = idx;

		reader.resizeNav();

		// Pre-load more pages.
		reader.loadCachedArticles();

		if (reader.currentPos == reader.bookBuckets.length) {
			// On the last page.
			reader.switchNav('next', 'off');
			reader.switchNav('prev', 'on');
		} else if (reader.currentPos == 1) {
			reader.switchNav('next', 'on');
			reader.switchNav('prev', 'off');
		} else {
			reader.switchNav('next', 'on');
			reader.switchNav('prev', 'on');
		}
		
		reader.currentlyMoving = false;
	},
	
	
	/**
	 * Creates the progress stuff - the markers across the top of the page.
	 * ALSO: Creates all the empty <div class="page">'s which will contain the article text.
	 */
	processContents: function() {
		$.each(reader.issueContents.buckets, function(n, bucket) {
			
			reader.bookBuckets.push(bucket.path);

			var className = 'bucket';
			if (n == 0) {
			// First bucket, which will be visible.
				className += ' current';
			}
			$('#books').append(
				// No idea why we need to add some HTML to it.
				// If we don't, then when we jump to a new section we seem to
				// get the wrong page.
				$('<div/>').addClass(className).attr({id:'bucket-'+(n+1)}).html('&nbsp;')
			);
		});
		
		// Set the width of div#pages to the width of all its contents.
		$('#books').width( $('.bucket').size() * reader.bucketWidth );
	},


	/**
	 * Resize the next/prev nav when the siez of window change.
	 */
	resizeNav: function() {
		var prevWidth = ( $(window).width() - $('#window').width() ) / 2;
		var nextWidth = prevWidth;

		$('#pagewrap').css({'margin-right': nextWidth});
			
		$('#next').width(
			nextWidth
		).height(
			$(window).height()
		).css({
			'line-height': ($('#next').innerHeight() * 0.96) +'px'
		});
	
		$('#prev').width(
			prevWidth
		).height(
			$(window).height()
		).css({
			'line-height': ($('#prev').innerHeight() * 0.96) +'px'
		});
	},


	/**
	 * Set the next/prev nav to either their on or off state.
	 * direction is either 'next' or 'prev'.
	 * state is either 'on' or 'off'.
	 */
	switchNav: function(direction, state) {
		if ($('#'+direction).hasClass(state)) {
			// No need to do anything.
			return;
		};
		var titleText = 'Next (d, l)';
		if (direction == 'prev') {
			titleText = 'Previous (a, h)';
		};
		if (state == 'on') {
			$('#'+direction).addClass('on').removeClass('off').attr({title:titleText});
			$('#'+direction).hover(
				function() {
					reader.glowNav(direction, 'normal');
				},
				function(){}
			);
		} else {
			$('#'+direction).addClass('off').removeClass('on').attr({title:''});
			$('#'+direction).unbind('click mouseenter mouseleave');
		};
	}
};

/*
 * jQuery Hotkeys Plugin
 * Copyright 2010, John Resig
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * From http://github.com/jeresig/jquery.hotkeys
 *
 * Based upon the plugin by Tzury Bar Yochay:
 * http://github.com/tzuryby/hotkeys
 *
 * Original idea by:
 * Binny V A, http://www.openjs.com/scripts/events/keyboard_shortcuts/
*/
(function(jQuery){

	jQuery.hotkeys = {
		version: "0.8",

		specialKeys: {
			8: "backspace", 9: "tab", 13: "return", 16: "shift", 17: "ctrl", 18: "alt", 19: "pause",
			20: "capslock", 27: "esc", 32: "space", 33: "pageup", 34: "pagedown", 35: "end", 36: "home",
			37: "left", 38: "up", 39: "right", 40: "down", 45: "insert", 46: "del", 
			96: "0", 97: "1", 98: "2", 99: "3", 100: "4", 101: "5", 102: "6", 103: "7",
			104: "8", 105: "9", 106: "*", 107: "+", 109: "-", 110: ".", 111 : "/", 
			112: "f1", 113: "f2", 114: "f3", 115: "f4", 116: "f5", 117: "f6", 118: "f7", 119: "f8", 
			120: "f9", 121: "f10", 122: "f11", 123: "f12", 144: "numlock", 145: "scroll", 191: "/", 224: "meta"
		},

		shiftNums: {
			"`": "~", "1": "!", "2": "@", "3": "#", "4": "$", "5": "%", "6": "^", "7": "&", 
			"8": "*", "9": "(", "0": ")", "-": "_", "=": "+", ";": ": ", "'": "\"", ",": "<", 
			".": ">",  "/": "?",  "\\": "|"
		}
	};

	function keyHandler( handleObj ) {
		// Only care when a possible input has been specified
		if ( typeof handleObj.data !== "string" ) {
			return;
		}

		var origHandler = handleObj.handler,
			keys = handleObj.data.toLowerCase().split(" ");

		handleObj.handler = function( event ) {
			// Don't fire in text-accepting inputs that we didn't directly bind to
			if ( this !== event.target && (/textarea|select/i.test( event.target.nodeName ) ||
				 event.target.type === "text") ) {
				return;
			}

			// Keypress represents characters, not special keys
			var special = event.type !== "keypress" && jQuery.hotkeys.specialKeys[ event.which ],
				character = String.fromCharCode( event.which ).toLowerCase(),
				key, modif = "", possible = {};

			// check combinations (alt|ctrl|shift+anything)
			if ( event.altKey && special !== "alt" ) {
				modif += "alt+";
			}

			if ( event.ctrlKey && special !== "ctrl" ) {
				modif += "ctrl+";
			}

			// TODO: Need to make sure this works consistently across platforms
			if ( event.metaKey && !event.ctrlKey && special !== "meta" ) {
				modif += "meta+";
			}

			if ( event.shiftKey && special !== "shift" ) {
				modif += "shift+";
			}

			if ( special ) {
				possible[ modif + special ] = true;

			} else {
				possible[ modif + character ] = true;
				possible[ modif + jQuery.hotkeys.shiftNums[ character ] ] = true;

				// "$" can be triggered as "Shift+4" or "Shift+$" or just "$"
				if ( modif === "shift+" ) {
					possible[ jQuery.hotkeys.shiftNums[ character ] ] = true;
				}
			}

			for ( var i = 0, l = keys.length; i < l; i++ ) {
				if ( possible[ keys[i] ] ) {
					return origHandler.apply( this, arguments );
				}
			}
		};
	}

	jQuery.each([ "keydown", "keyup", "keypress" ], function() {
		jQuery.event.special[ this ] = { add: keyHandler };
	});

})( jQuery );

//on imgs loaded plugin
(function( $ ){

  $.fn.onImgsLoaded = function(cb) {

                var images_len = this.length,
                                images_loaded = 0,
                                images = this,
                                cb_args = Array.prototype.slice.call(arguments, 1);

                // If cb is no function, then return
                if(!$.isFunction(cb))
                        return this;

                return this.each(function() {
                        image = new Image();
                        $(image)
                                .load(function() {
                                        if(++images_loaded == images_len)
                                                cb.call(images, cb_args);
                                });
                        image.src = this.src;
                });
  };
})( jQuery );
