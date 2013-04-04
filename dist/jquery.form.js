
/**
 * CheckValidity
 * Our shim for which recreates the CheckValidity of HTML5 input's upon form submission
 */

(function(){

function checkValidity(elem){

	if (elem && 'checkValidity' in elem){
		return elem.checkValidity();
	}

	var $el = $(elem),
		m = {
			url : /^https?\:\/\/[a-z0-9]+/i,
			date : /^[0-9]{2,4}[\/\:\.\-][0-9]{2}[\/\:\.\-][0-9]{2,4}$/,
			time : /^[0-9]{2}\:[0-9]{2}(\:[0-9]{2})?$/,
			tel : /^\+?[0-9\s\.]{10,14}/,
			email : /^[a-z0-9\.\'\-]+@[a-z0-9\.\-]+$/i,
			number : /^-?[0-9]+(\.[0-9]+)?$/i,
			text : /.+/
		};

	// REQUIRED ATTRIBUTES
	var type  = $el.attr('data-type') || $el.attr('type'),
		min = $el.attr('min'),
		max = $el.attr('max'),
		step = $el.attr('step'),
		example = {
			url : "http://www.domain.com",
			time : "12:30",
			email : "name@domain.com",
			date : "2012-12-31"
		}[type],
		required= (!!$el.attr('required')),
		pattern = $el.attr('pattern'),
		value = (type === "checkbox" && !$el.prop('checked')) ? '' : (elem.value || elem.innerHTML),
		errorMsgs = {
			valueMissing  : (type === "checkbox" ? "Please tick this box if you want to proceed" : "Value missing"),
			tooLong      : "Too Long",
			typeMismatch  : "Not a valid " + type + ( example ? " (e.g. " +example+ ")" : ''),
			patternMismatch  : "Invalid pattern",
			rangeOverflow : "Value must be less than or equal to "+max,
			rangeUnderflow : "Value must be greater than or equal to "+min,
			stepMismatch : "Invalid value"
		};


	// Remove placeholder
	if($el.filter(".placeholder").attr('placeholder') === value){
		value = "";
	}

	elem.validity = {
		valueMissing  : required&&value.length===0,
		tooLong      : false,
		typeMismatch   : (value.length>0)&&(type in m)&&!value.match( m[type] ),
		patternMismatch  : pattern&&(value.length>0)&&!value.match( new RegExp('^'+pattern+'$') ),
		rangeOverflow : max && value.length && value > parseFloat(max),
		rangeUnderflow : min && value.length && value < parseFloat(min),
		stepMismatch : step && value.length && value%parseFloat(step),
		customError : false,
		valid : false // default
	};

	// if this is a color?
	if(type==='color'&&value.length>0){
		// does it work?
		var div = document.createElement("color");
		
		try{
			div.style.backgroundColor = value;
		}
		catch(e){}
		if( !div.style.backgroundColor ){
			elem.validity.typeMismatch = true;
		}
	}

	// remove any previous error messages
	if($el.hasClass('invalid')){
		$el
			.removeClass('invalid')
			.nextUntil(':input')
			.filter("div.errormsg")
			.remove();
	}
	

	function fadeOutErrMsg(){
		$el
			.removeClass('invalid')
			.nextUntil(':input')
			.filter("div.errormsg")
			.fadeOut();
	}


	// Test each message
	for(var x in elem.validity){

		if(elem.validity[x]){


			$el
				.trigger('invalid')
				.addClass('invalid') // ADD CLASS
				.after('<div class="errormsg">'+errorMsgs[x]+'</div>');

			setTimeout(fadeOutErrMsg,1000);

			return false;
		}
	}

	return (elem.validity.valid = true);
}


// Check a form, or an individual value
$.fn.checkValidity = function(){
	
	var b = true;
	
	// AN HTML FORM WOULDN'T POST IF THERE ARE ERRORS. HOWEVER
	($(this).is(':input') ? this : $(":input", this)).each(function(){
		if(b){
			b = checkValidity(this);
		}
	});
	
	return b;
};


})();
/**
 * input[type=color]
 * @todo: Create a color wheel popup
 */
$.fn.color = function(){

	if($.support.color){
		return $(this);
	}

	$( $(this).is(":input[type=color]")? this :$("input[type=color]", this ) ).on('click focusout', function(){

		$(this).css({backgroundColor:this.value});

		var rgb = $(this).css("backgroundColor"),
			m;

		if(rgb){
			m = rgb.match(/([0-9]+).*?([0-9]+).*?([0-9]+)/);

			// @todo a fix for IE8 to show colors in rgb format
			if(!m && ("currentStyle" in this)){
				//m = rgb.match(/([0-9]+).*?([0-9]+).*?([0-9]+)/);
			}

			if(m){
				// change the text color to contrast with the backgorund color
				this.style.color = ( parseInt(m[1],10) + parseInt(m[2],10) + parseInt(m[3],10) ) < 500 ? 'white' : 'black';
			}
		}

	});

	return $(this);
};

/**
 * input[list=id]
 * Datalist provides a mechanism for suggesting values in an input field
 */
$.fn.datalist = function(){

	if($.support.datalist){
		return false;
	}

	// Add keyup event to build the list based on user suggestions
	$( $(this).is(':input[list]')? this: $("input[list]", this) ).on("keyup",function(e){

		// Show
		$(this).addClass("datalist");

		// $list
		var $list = $(this).nextUntil(":input").filter("div.datalist").eq(0);
		if($list.length===0){
			$list = $("<div class='datalist'></div>").css({
				position: 'absolute'
			}).insertAfter(this);
		}

		// dont change the list?
		if((e.which===38||e.which===40)&&$list.find("ul").length>0){
			return;
		}

		// get the datalist
		var list = [],
			value = $(this).val().toLowerCase();
			
//		log("#" + $(this).attr("list"));

		$( "option", "#" + $(this).attr("list") ).each(function(){
			var v = $(this).attr("value").toLowerCase();

			//log(v);
			if(v.indexOf(value)>-1){
				list.push(v);
			}
		});

		$list.empty();
		$list.width($(this).width());

		// AppendTo DOM
		$("<ul><li>"+list.join("<\/li><li>")+"<\/li><\/ul>").appendTo($list);

	}).on("up down",function(e){

		var $list = $(this).nextUntil(":input").filter("div.datalist").eq(0),
			$sel = $list.find("li.hover");
		if($sel.length){
			$sel = $sel[e.type==='up'?'prev':'next']().addClass('hover');
			$sel[e.type==='down'?'prev':'next']().removeClass('hover');
		}
		else{
			$sel = $list.find("li:first").addClass('hover');
		}
		$(this).val($sel.text());

	// hide the datalist on blur
	}).on("blur",function(e){
		// self
		var self = this;

		// hide on timeut, because it might have been the datalist which was selected
		setTimeout(function(){
			$(self).removeClass("datalist");
		},100);

	}).find("+ div.datalist li").on('click',function(){

		$(this).parents("div.datalist").prevAll("input[list]").eq(0).val( $(this).text() );

	});

};



/**
 * Calendar
 */

$.fn.date = function(){

	if($.support.date){
		return $(this);
	}


	$( $(this).is("input[type=date],input[data-type=date]")?this:$("input[type=date],input[data-type=date]", this ) ).on("focus select", function(){
	
		var $calendar = $("+ div.calendar div", this).fadeIn('fast'),
			days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
			month= ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
			$input = $(this);
		
		if(!$calendar.length){
			$calendar = $('<div class="calendar"><div></div></div>').insertAfter(this).find('div');
		}

		// trigger close calendar when clicked outside
		$(this).blur(function(){$calendar.fadeOut('fast');});
		
		var d = new Date();
		if($(this).val().match(/^[0-9]{4}\-[0-1]?[0-9]\-[0-3]?[0-9]$/)){
			var a = $(this).val().split("-").slice(0,3);
			d.setYear(a[0]);
			d.setDate(a[2]);
			d.setMonth(--a[1]);
		}

		// print the headline
		(function createcalendar(d){
			var s='<table><caption></caption><thead><tr>';
			for(var x in days){
				s += "<th>"+days[x]+"<\/th>";
			}
			s+='</tr></thead><tbody>';
			var dom = d.getDate();// user selected dom(day of month)?
			d.setDate(1);
			// pad the table
			var dow = d.getDay();// first dom falls on a...
			if(dow>0){
				s += "<tr><td colspan='"+dow+"'>&nbsp;<\/td>";
			}
			// get the last day of the month
			d.setMonth(d.getMonth()+1);
			d.setDate(0);
			
			for(var j=1;j<=d.getDate();j++){
				s += ((dow+j-1)%7===0?'<tr>':'')
					+ "<td"+(dom===j?' class="selected"':'')
					+  "><a href='javascript:void(0);'>"+j+"<\/a><\/td>" 
					+ ((dow+j)%7===0?'</tr>':'');
			}
			// pad the table
			if(d.getDay()<6){
				s += "<td colspan='"+(6-d.getDay())+"'>&nbsp;<\/td><\/tr>";
			}
			s+='<\/tbody><\/table>';
			
			// create the calendar and add events
			$calendar.empty().append('<a href="javascript:void(0);" class="close">close</a>').find('a').click(function(){
				$calendar.fadeOut('fast');
			});

			$(s)
				.prependTo($calendar)
				.find('td')
				.click(function(){
					var s = $(this).text();
					$input.val(d.getUTCFullYear()+'-'+( (d.getMonth()+1) < 10 ? '0' : '' ) + (d.getMonth()+1)+'-'+( s < 10 ? '0' : '' ) + s );
					$input.trigger('blur');
					$calendar.fadeOut('fast');
				})
				.end()
				.find('caption')
				.append('<a href="javascript:void(0);" class="prev">'+ month[d.getMonth()===0?11:(d.getMonth()-1)] +'</a> <span class="current">'+ month[d.getUTCMonth()] + ' ' + d.getUTCFullYear() +'</span> <a href="javascript:void(0);" class="next">'+ month[(d.getMonth()+1)%12] +'</a>')
				.find('a')
				.click(function(e){
					e.preventDefault();
					e.stopPropagation();
					if(this.className==='current'){
						//$input.val(d.getUTCFullYear()+'-'+(d.getMonth()+1));
						return false;
					}
					$calendar.fadeIn('fast');
					d.setDate(1);
					d.setMonth((d.getMonth()+{'next':1,'prev':-1}[this.className]));
					createcalendar(d);
					return false;
				});
		})(d);
	});
};

//
// jquery.event.submit
//
$.event.special.submit = {

	add : function(handleObj){

		// Save a reference to the bound event handler.
		var old_handler = handleObj.handler,
			// The current element.
			elem = $(this);

		handleObj.handler = function( event ) {
			if ( !elem.checkValidity() ) {
				// If the checkValidity passes
				// callback is bound matches the specified selector, prevent the
				// default action without stopping propagation, and don't call
				// the originally bound event handler.
				event.preventDefault();
			} else {
				// Otherwise call the originally-bound event handler and return
				// its value.
				return old_handler.apply( this, arguments );
			}
		};
	}
};
/**
 * input[type=number]
 * Adds up and down controls to increment/decrement a number field
 * Controls: can be clicked once or held down
 */
$.fn.number = function(){

	if($.support.number){
		return $(this);
	}

	// kill iterations to increase the value
	var interval = null;
	$(document.body).mouseup(function(){
		if(interval){
			clearTimeout(interval);
		}
	});

	// check for support for the input[type=number] attribute
	return ( $(this).is("input[type=number],input[data-type=number]") ? $(this) : $("input[type=number],input[data-type=number]", this) ).each(function(){
		// Found

		var el = this,
			w = $(this).outerWidth(),
			min = $(this).attr('min'),
			max = $(this).attr('max'),
			step = parseFloat($(this).attr('step'))||1;

		function increment(change){
			var n = (parseInt($(el).val(),10)||0)+(change*step);
			if(n>max){
				n=max;
			}
			if(n<min){
				n=min;
			}
			$(el).val(n);
		}

		// Listen for up down events on the element
		$(this).bind('keypress', function(e){
			var change = 0;
			if(e.which===40){
				change = -1;
			}
			if(e.which===38){
				change = 1;
			}

			if(!change){
				return;
			}
			increment(change);
		}).bind('blur', function(){
			if( $(this).val() !== $(this).filter('.placeholder').attr('placeholder') ){
				$(this).val( $(this).val().replace(/[^\d\.\-]/ig,'') );
			}
		});

		var $span = $(this)
			// add the controls
			.after('<span class="number" unselectable="on"><span unselectable="on"></span><span unselectable="on"></span></span>')
			.addClass("number")
			.find("+ span.number")
			.attr("unselectable", true)
			.find("span")
			.mousedown(function (e){
				var i = $(this).parent().children().index(this);
				
				(function change(){
					// trigger up down events
					increment(i?-1:1);

					// press'n'hold can be cancelled by keyup (above)
					interval = setTimeout(change,100);
				})();
				
			})
			.parents('span.number');

		// add dimensions
		setTimeout(function(){

			var pR = 0,// parseInt($(el).css("paddingRight")),
				mR = parseInt($(el).css("marginRight"),10);

			$(el).css({
				paddingRight: ( pR + 22 )+"px",
				marginRight: 0,
				width :  ($(el).width() - ($(el).outerWidth() - w)) + "px"
			});

			$span.css({
				marginRight:mR+"px",
				marginTop: ( $(el).offset().top - $span.offset().top ) + 'px'
			});
		},0);
	});
};

/*! http://mths.be/placeholder v2.0.7 by @mathias */
;(function(window, document, $) {

	var isInputSupported = 'placeholder' in document.createElement('input'),
		isTextareaSupported = 'placeholder' in document.createElement('textarea'),
		prototype = $.fn,
		valHooks = $.valHooks,
		hooks,
		placeholder;

	if (isInputSupported && isTextareaSupported) {

		placeholder = prototype.placeholder = function() {
			return this;
		};

		placeholder.input = placeholder.textarea = true;

	} else {

		placeholder = prototype.placeholder = function() {
			var $this = this;
			$this
				.filter((isInputSupported ? 'textarea' : ':input') + '[placeholder]')
				.not('.placeholder')
				.bind({
					'focus.placeholder': clearPlaceholder,
					'blur.placeholder': setPlaceholder
				})
				.data('placeholder-enabled', true)
				.trigger('blur.placeholder');
			return $this;
		};

		placeholder.input = isInputSupported;
		placeholder.textarea = isTextareaSupported;

		hooks = {
			'get': function(element) {
				var $element = $(element);
				return $element.data('placeholder-enabled') && $element.hasClass('placeholder') ? '' : element.value;
			},
			'set': function(element, value) {
				var $element = $(element);
				if (!$element.data('placeholder-enabled')) {
					return element.value = value;
				}
				if (value === '') {
					element.value = value;
					// Issue #56: Setting the placeholder causes problems if the element continues to have focus.
					if (element !== document.activeElement) {
						// We can't use `triggerHandler` here because of dummy text/password inputs :(
						setPlaceholder.call(element);
					}
				} else if ($element.hasClass('placeholder')) {
					clearPlaceholder.call(element, true, value) || (element.value = value);
				} else {
					element.value = value;
				}
				// `set` can not return `undefined`; see http://jsapi.info/jquery/1.7.1/val#L2363
				return $element;
			}
		};

		isInputSupported || (valHooks.input = hooks);
		isTextareaSupported || (valHooks.textarea = hooks);

		$(function() {
			// Look for forms
			$(document).delegate('form', 'submit.placeholder', function() {
				// Clear the placeholder values so they don't get submitted
				var $inputs = $('.placeholder', this).each(clearPlaceholder);
				setTimeout(function() {
					$inputs.each(setPlaceholder);
				}, 10);
			});
		});

		// Clear placeholder values upon page reload
		$(window).bind('beforeunload.placeholder', function() {
			$('.placeholder').each(function() {
				this.value = '';
			});
		});

	}

	function args(elem) {
		// Return an object of element attributes
		var newAttrs = {},
		    rinlinejQuery = /^jQuery\d+$/;
		$.each(elem.attributes, function(i, attr) {
			if (attr.specified && !rinlinejQuery.test(attr.name)) {
				newAttrs[attr.name] = attr.value;
			}
		});
		return newAttrs;
	}

	function clearPlaceholder(event, value) {
		var input = this,
		    $input = $(input);
		if (input.value == $input.attr('placeholder') && $input.hasClass('placeholder')) {
			if ($input.data('placeholder-password')) {
				$input = $input.hide().next().show().attr('id', $input.removeAttr('id').data('placeholder-id'));
				// If `clearPlaceholder` was called from `$.valHooks.input.set`
				if (event === true) {
					return $input[0].value = value;
				}
				$input.focus();
			} else {
				input.value = '';
				$input.removeClass('placeholder');
				input == document.activeElement && input.select();
			}
		}
	}

	function setPlaceholder() {
		var $replacement,
			input = this,
			$input = $(input),
			$origInput = $input,
			id = this.id;
		if (input.value === '') {
			if (input.type === 'password') {
				if (!$input.data('placeholder-textinput')) {
					try {
						$replacement = $input.clone().attr({ 'type': 'text' });
					} catch(e) {
						$replacement = $('<input>').attr($.extend(args(this), { 'type': 'text' }));
					}
					$replacement
						.removeAttr('name')
						.data({
							'placeholder-password': true,
							'placeholder-id': id
						})
						.bind('focus.placeholder', clearPlaceholder);
					$input
						.data({
							'placeholder-textinput': $replacement,
							'placeholder-id': id
						})
						.before($replacement);
				}
				$input = $input.removeAttr('id').hide().prev().attr('id', id).show();
				// Note: `$input[0] != input` now!
			}
			$input.addClass('placeholder');
			$input[0].value = $input.attr('placeholder');
		} else {
			$input.removeClass('placeholder');
		}
	}

}(this, document, jQuery));
/**
 * Range
 */
$.fn.range = function(){

	if($.support.range){
		return false;
	}
	// check for support for the placeholder attribute
	return ( $(this).is("[type=range],[data-type=range]") ? $(this) : $("input", this) ).filter("[type=range],[data-type=range]").each(function(){
	
		/**
			// hide the input box
			$(this).hide();

			// Add a range slider
			$("<div class='range'><div class='line'></div><div class='pointer'></div></div>").insertAfter(this).touch(function(e){
				log(e.offsetX);
				$("div.pointer", this).css({marginLeft:e.offsetX+"px"});
			});
		*/
		var step = parseFloat($(this).attr('step')) || 1,
			max = parseFloat($(this).attr('max')) || 100,
			min = parseFloat($(this).attr('min')) || 0,
			w = $(this).width();

		// Mouse key depressed
		var clicked = false;
		$(document).on("mousedown mouseup", function(e){
			clicked = e.type === 'mousedown';
		});

		$(this).addClass("range").bind("click mousemove",function(e){

			if(e.type === "mousemove" && !clicked ){
				return;
			}

			// FF bug
			if(!e.offsetX){
				e.offsetX = e.clientX - $(this).offset().left;
			}

			var w = $(this).width(),
				v = ((e.offsetX/w)*(max-min))+min,
				m = v%step;
			
			v -= m;

			if((2*m)>step){
				v += step;
			}

			// boundaries
			v = Math.max(v,min);
			v = Math.min(v,max);

			// value
			$(this).val(v);
		});
	}).watch('value', function(){
	
		var step = parseFloat($(this).attr('step')) || 1,
			max = parseFloat($(this).attr('max')) || 100,
			min = parseFloat($(this).attr('min')) || 0,
			w = $(this).width(),
			v = $(this).val();

		// style
		var x = (v-min)/(max-min);
		$(this).css({backgroundPosition: ((x*w)-500)+"px center" });

	});
};


/**
 * Expands textarea as one types
 */
$.fn.textarea = function(){

	$($(this).is('textarea')?this:$("textarea", this ) ).on('keyup focus', function(){

		var el = this;
		if(el.tagName.toLowerCase()!=="textarea"){return;}

		// has the scroll height changed?, we do this because we can successfully change the height
		var prvLen = el.preValueLength;
		el.preValueLength = el.value.length;

		if(el.scrollHeight===el.prvScrollHeight&&el.prvOffsetHeight===el.offsetHeight&&el.value.length>=prvLen){
			return;
		}
		while(el.rows>1 && el.scrollHeight<el.offsetHeight){
			el.rows--;
		}
		var h=0;
		while(el.scrollHeight > el.offsetHeight && h!==el.offsetHeight && (h=el.offsetHeight) ){
			el.rows++;
		}

		el.rows++;

		el.prvScrollHeight = el.scrollHeight;
		el.prvOffsetHeight = el.offsetHeight;
	});

};

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