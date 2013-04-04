/**
 *	@author Andrew Dodson
 *	@since 25th may 2007
 *  @since Oct 2011 (that's refreshing!)
 */
(function($){
 
	"use strict";

	// test for support
	$.support.datalist = test('input[list]');
	$.support.placeholder = test('input[placeholder]');
	$.support.range = test('input[type=range]');
	$.support.number = test('input[type=number]');
	$.support.date = test('input[type=date]');
	$.support.color = test('input[type=color]');

	// inputSupport
	function test(s){

		var m = s.match(/^([a-z]+)(\[([a-z]+)(\=([a-z]+))?\])?$/i);

		try{
			var el = document.createElement(m[1]);

			if(m[3]&&m[5]){
				el[m[3]] = m[5];
				//console.log(test[m[3]] +':'+ m[5]);
				return el[m[3]] === m[5];
			}
			else if(m[3]){
				return m[3] in el;
			}
		}
		catch(e){
			return false;
		}
		return true;
	}


	// the interval would be better if it was per input
	var interval;	


	/**
	 * Basic Custom events for user interactions
	 */
	$.fn.inputCustomEvents = function(){

		$($(this).is(":input")?this:$(":input",this)).on('keydown', function(e){
			if(e.which===40){
				$(this).trigger('down');
			}
			if(e.which===38){
				$(this).trigger('up');
			}
		}).filter('input,textarea').on('input blur', function(e){
			$(this)
				.removeClass('error')
				.next('div.error')
				.remove(); // clear away error markup because `it ugly`!

			if(interval){
				clearTimeout(interval);
			}
			
			if(e.type==='blur'||e.type==='focusout'){
				// check validity and provide information to user.
				$(this).checkValidity();
			} else {
				var el = this;
				interval = setTimeout(function(){$(el).checkValidity();},3000);
			}
		});

		return $(this);
	};




	/**
	 * log
	 */
	function log(){
		if (typeof(console) === 'undefined'||typeof(console.log) === 'undefined') return;
		if (typeof console.log === 'function') {
			console.log.apply(console, arguments); // FF, CHROME, Webkit
		}
		else{
			console.log(Array.prototype.slice.call(arguments)); // IE
		}
	}


	/**
	 * Touch
	 * @param callback function - Every touch event fired
	 * @param complete function- Once all touch event ends
	 */
	$.fn.touch = function(callback, complete){


		// Store pointer action
		var mousedown = {};

		$("body").bind('mousedown MSPointerDown', function(e){
			mousedown[e.originalEvent.pointerId||0] = e.originalEvent;
		});
		
		$("body").bind('mouseup MSPointerUp', function(e){
			mousedown[e.originalEvent.pointerId||0] = null;
		});

		// loop through and add events
		return $(this).each(function(){
		
			// bind events
			$(this)
				.bind("selectstart",function(e){return false;})
				.bind("touchstart touchmove",function(e){
					var touches = e.originalEvent.touches || e.originalEvent.changedTouches || [e];
					for(var i=0; i<touches.length; i++){
						touches[i].pointerId = touches[i].identifier;
						touches[i].offsetX = touches[i].clientX - $(this).offset().left;
						touches[i].offsetY = touches[i].clientY - $(this).offset().top;
						
						// do not paint on the touchstart
						if(e.type==='touchmove'){
							callback.call(this, touches[i],mousedown[touches[i].identifier]);
						}
						// save last event in a object literal
						// to overcome event overwriting which means we can't just store the last event.
						mousedown[touches[i].identifier] = {
							offsetX : touches[i].offsetX,
							offsetY : touches[i].offsetY,
							pointerId : touches[i].pointerId
						};
					}
					e.stopPropagation();
					e.preventDefault();
					return false;
				})
				.bind("mousemove MSPointerMove",function(e){
				
					if(e.type==='mousemove'&&"msPointerEnabled" in window.navigator){
						return;
					}
			
					// default pointer ID
					e.originalEvent.pointerId = e.originalEvent.pointerId || 0;
			
					// only trigger if we have mousedown/pointerdown
					if(( e.originalEvent.pointerId in mousedown ) && ( mousedown[e.originalEvent.pointerId] !== null )){
						callback.call(this,e.originalEvent, mousedown[e.originalEvent.pointerId]);
						mousedown[e.originalEvent.pointerId] = e.originalEvent;
					}
					e.preventDefault();
					e.stopPropagation();
				});
		});
	};



	/**
	 * $("form").form()
	 * Converts forms with...
	 * 1. "textarea[type=html]" to a WYSIWYG editor
	 * 2. "table.multiple" to add buttons for adding/removing additional rows
	 * 3. "input[placeholder] will add html5 placeholder
	 */
	$.fn.form = function(){
	
		return ( $(this).is('form') ? $(this) : $('form',this)).each(function(){

			// Add the placeholder support
			$(":input[placeholder],:input[data-placeholder]", this).placeholder();
			
			// Add the number support
			$("input[type=number],input[data-type=number]", this).number();

			// Add range
			$("input[type=range],input[data-type=range]", this).range();

			// Add color
			$("input[type=color],input[data-type=color]", this).color();
		
			// Add date
			$("input[type=date],input[data-type=date]", this).date();
		
			// Add datalist
			$("input[list],input[data-list]", this).datalist();

			// Add textarea expand
			$("textarea", this).textarea();

			// Add generic Events
			$(":input", this).inputCustomEvents();
		

		// prevent propagation of the form if it fails.
		// this has to be bound to the form element directly, before additional events are added, otherwise it may not be executed.
		}).submit(function(e){

			var b = $(this).checkValidity();

			if(b){
				// if this has passed lets remove placeholders
				$(":input.placeholder[placeholder]", this).val("");
			}
			else{
				// find the item in question and focus on it
				var $first = $('.invalid',this);
				if($first.length){
					$first.get(0).focus();
				}

				// prevent any further executions.. of course anything else could have been called.
				e.preventDefault();
				e.stopPropagation();
			}
			return b;
		});
	};
		
	
	/**
	 * Watch
	 * Trigger callbacks when attributes of an element change
	 */
	$.fn.watch = function(props, callback, timeout){

		if(!timeout){
			timeout = 10;
		}
		return this.each(function(){
			var $el		= $(this),
				el		= this,
				func	= function(){ __check.call(el, $(el)); },
				data	= {	props: props.split(","),
							func:  callback,
							vals:  [] };

			$.each(data.props, function(i){
				data.vals[i] = $el.prop(data.props[i]) || $el.css(data.props[i]) || $el.attr(data.props[i]);
			});


			if (typeof (this.onpropertychange) == "object" && "attachEvent" in this){

				this.attachEvent("onpropertychange", func );

			/**
				never seems to work
				} else if ($.browser.mozilla){
				$el.bind("DOMAttrModified", callback);
			*/

			} else {
				setInterval( func, timeout);
			}


			function __check($el) {
				var changed = false,
					temp	= "";
				for(var i=0;i < data.props.length; i++) {
					temp = $el.prop(data.props[i]) || $el.css(data.props[i]) || $el.attr(data.props[i]);
					if(data.vals[i] != temp){
						data.vals[i] = temp;
						changed = true;
						break;
					}
				}
				if(changed && data.func) {
					data.func.call($el, data);
				}
			}
		});
	};


})(jQuery);