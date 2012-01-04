/**
 *	@author Andrew Dodson
 *	@since 25th may 2007
 *  @since Oct 2011 (that's refreshing!)
 */
(function($){

	// test for support
	$.support.placeholder = (function(){
		var test = document.createElement('input');
		return ('placeholder' in test);
	})();

	// test for support
	$.support.datalist = (function(){
		var test = document.createElement('datalist');
		return ('datalist' in test);
	})();

	// test for support
	$.support.range = (function(){
		var test = document.createElement('input');
		try{
			test.type = 'range';
		}
		catch(e){
			return false;
		}
		return test.type === 'range';
	})();

	// test for support
	$.support.number = (function(){
		var test = document.createElement('input');
		try{
			test.type = 'number';
		}
		catch(e){
			return false;
		}
		return test.type === 'number';
	})();


	// local root
    var path = (function (){
        var s = document.getElementsByTagName('script'),
        p = s[s.length-1];
        return (p.src?p.src:p.getAttribute('src')).match(/(.*\/)/)[0] || "";
	})();


	/**
	 * Basic Custom events for user interactions
	 */
	$(":input").live('keydown', function(e){
		if(e.which===40){
			$(this).trigger('down');
		}
		if(e.which===38){
			$(this).trigger('up');
		}
	});

	// the interval would be better if it was per input
	var interval;

	/** 
	 * CheckValidity
	 * Our shim for which recreates the CheckValidity of HTML5 input's upon form submission
	 */
	function checkValidity(elem){

		if ('checkValidity' in elem){
			return null;
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
		var type  = $el.attr('type'),
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
		
		// 

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
		
		// Test each message
		for(var x in elem.validity){

			if(elem.validity[x]){


				$el
					.trigger('invalid')
					.addClass('invalid') // ADD CLASS
					.after('<div class="errormsg">'+errorMsgs[x]+'</div>'); // ADD DIV

				return false;
			}
		}

		return (elem.validity.valid = true);
	};
	

	// Add form submit
	$('form').live('submit', function(){

		var b = true;

		// AN HTML FORM WOULDN'T POST IF THERE ARE ERRORS. HOWEVER
		$(":input", this).each(function(){
			b = checkValidity(this) && b;
		});
		
		if(b){
			// if this has passed lets remove placeholders
			$(":input.placeholder[placeholder]", this).val("");
		}
		return b;
	});


	// Add the oninput check
	$('input,textarea', 'form').live('input blur', function(e){

		$(this)
			.removeClass('error')
			.next('div.error')
			.remove(); // clear away error markup because `it ugly`!

		if(interval){
			clearTimeout(interval);
		}
		
		if(e.type==='blur'||e.type==='focusout'){
			checkValidity(this);
		} else {
			var el = this;
			interval = setTimeout(function(){checkValidity(el);},3000);
		}
	});

	// Placeholder support
	if(!$.support.placeholder){
		$(':input.placeholder[placeholder]', 'form').live('focus', function(e){
			var method = (this.tagName==='INPUT'?'val':'text');
			
			if($(this)[method]()===$(this).attr('placeholder')){
				$(this)[method]("").removeClass('placeholder');
			}
		});
		$(':input[placeholder]', 'form').live('focusout', function(){

			var method = (this.tagName==='INPUT'?'val':'text');

			if($(this)[method]()===''){
				$(this)[method]($(this).attr('placeholder')).addClass("placeholder");
			}
		});
	}


	/**
	 * input[list=id]
	 * Datalist provides a mechanism for suggesting values in an input field
	 */
	if(!$.support.datalist){

		// Add keyup event to build the list based on user suggestions
		$('input[list]').live("keyup",function(e){

			// Show
			$(this).addClass("datalist");

			// $list
			var $list = $(this).nextUntil(":input").filter("div.datalist").eq(0);
			if($list.length===0){
				$list = $("<div class='datalist'></div>").insertAfter(this);
			}

			// dont change the list?
			if((e.which===38||e.which===40)&&$list.find("ul").length>0){
				return;
			}

			// get the datalist
			var list = [],
				value = $(this).val().toLowerCase();

			$( "option", "#" + $(this).attr("list") ).each(function(){
				var v = $(this).attr("value").toLowerCase();
				if(v.indexOf(value)>-1){
					list.push(v);
				}
			});

			$list.empty();
			$list.width($(this).width());

			// AppendTo DOM
			$("<ul><li>"+list.join("<\/li><li>")+"<\/li><\/ul>").appendTo($list);
		});

		// add events
		$("input[list] + div.datalist li").live('click',function(){
			$(this).parents("div.datalist").prevAll("input[list]").eq(0).val( $(this).text() );
		});

		$('input[list]').live("up down",function(e){
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
		});

		// hide the datalist on blur
		$('input[list]').live("blur",function(e){
			// self
			var self = this;

			// hide on timeut, because it might have been the datalist which was selected
			setTimeout(function(){
				$(self).removeClass("datalist");
			},100);
		});
	}

	/**
	 * input[type=color]
	 * @todo: Create a color wheel popup
	 */
	$("form input[type=color]").live("change", function(){
		
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
				this.style.color = ( parseInt(m[1]) + parseInt(m[2]) + parseInt(m[3]) ) < 500 ? 'white' : 'black';
			}
		}
	});


	/**
	 * Calendar
	 */
	$("form input[type=date]").live("focus select", function(){
	
		var $calendar = $("+ div.calendar div", this).fadeIn('fast')
			,days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
			,month= ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
			,$input = $(this);
		
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
				.append('<a href="javascript:void(0);" class="prev">'+ month[d.getMonth()==0?11:(d.getMonth()-1)] +'</a> <span class="current">'+ month[d.getUTCMonth()] + ' ' + d.getUTCFullYear() +'</span> <a href="javascript:void(0);" class="next">'+ month[(d.getMonth()+1)%12] +'</a>')
				.find('a')
				.click(function(){
					if(this.className==='current'){
						//$input.val(d.getUTCFullYear()+'-'+(d.getMonth()+1));
						return false;
					}
					$calendar.fadeIn('fast');
					d.setDate(1);
					d.setMonth((d.getMonth()+{'next':1,'prev':-1}[this.className]));
					log(d);
					createcalendar(d);
					return false;
				});
		})(d);
	});


	/**
	 * Expands textarea as one types
	 */
	$('textarea', 'form').live('keyup focus', function(){

		var el = this;
		if(el.tagName!=="TEXTAREA"){return;}

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



	/**
	 * EXTRA STUFF to enable rich forms
	 * WYSIWYG editor
	 * Additional navigation to create dynamic forms
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


	// Extend jQuery
	// detect if argument passed is an object
	$.fn.isObject = function( s ){
		return ( s !== null && typeof( s ) === "object" ? true:false );
	};

	// detect if argument passed is empty
	$.fn.isEmpty = function(s){
		var x;
		if(this.isObject(s)){
			for(x in s){if(x!=='prototype'){return false;}}
			return true;
		}
		return ( s === null || s === undefined || s === 0 || s === '' || s === false ? true:false );
	}

	/**
	 * Get information about the selected text.
	 * @param the scope/window object
	 & @return selected element
	 */
	$.selectedText = function(win){
		var obj = null,
			text = null,
			sel = null;
	
		win = win || window;
	
		// Get parent element to determine the formatting applied to the selected text
		if(win.getSelection){
			obj	= win.getSelection().anchorNode;
			text= win.getSelection().toString();
			sel	= win.getSelection();
	
			log(sel);
	
			// Mozilla seems to be selecting the wrong Node, the one that comes before the selected node.
			// I'm not sure if there's a configuration to solve this,
			if(!sel.isCollapsed&&$.browser.mozilla){
				// If we've selected an element, (note: only works on Anchors, only checked bold and spans)
				// we can use the anchorOffset to find the childNode that has been selected
				if(sel.focusNode.nodeName !== '#text'){
					// Is selection spanning more than one node, then select the parent
					if((sel.focusOffset - sel.anchorOffset)>1){
						log("Selected spanning more than one",obj = sel.anchorNode);
					}else if ( sel.anchorNode.childNodes[sel.anchorOffset].nodeName !== '#text' ){
						log("Selected non-text",obj = sel.anchorNode.childNodes[sel.anchorOffset]);
					}else{
						log("Selected whole element",obj = sel.anchorNode);
					}
				}
				// if we have selected text which does not touch the boundaries of an element
				// the anchorNode and the anchorFocus will be identical
				else if( sel.anchorNode.data === sel.focusNode.data ){
					log("Selected non bounding text",obj = sel.anchorNode.parentNode);
				}
				// This is the first element, the element defined by anchorNode is non-text.
				// Therefore it is the anchorNode that we want
				else if( sel.anchorOffset === 0 && !sel.anchorNode.data ){
					log("Selected whole element at start of paragraph (whereby selected element has not text e.g. &lt;script&gt;",obj = sel.anchorNode);
				}
				// If the element is the first child of another (no text appears before it)
				else if( ( typeof sel.anchorNode.data !== 'undefined' ) && ( sel.anchorOffset === 0 ) && ( sel.anchorOffset < sel.anchorNode.data.length ) ){
					log("Selected whole element at start of paragraph",obj = sel.anchorNode.parentNode);
				}
				// If we select text preceeding an element. Then the focusNode becomes that element
				// The difference between selecting the preceeding word is that the anchorOffset is less that the anchorNode.length
				// Thus
				else if( typeof sel.anchorNode.data !== 'undefined' && sel.anchorOffset < sel.anchorNode.data.length ){
					log("Selected preceeding element text",obj = sel.anchorNode.parentNode);
				}
				// Selected text which fills an element, i.e. ,.. <b>some text</b> ...
				// The focusNode becomes the suceeding node
				// The previous element length and the anchorOffset will be identical
				// And the focus Offset is greater than zero
				// So basically we are at the end of the preceeding element and have selected 0 of the current.
				else if( typeof sel.anchorNode.data !== 'undefined' && sel.anchorOffset === sel.anchorNode.data.length && sel.focusOffset === 0 ){
					log("Selected whole element text", obj = (sel.anchorNode.nextSibling || sel.focusNode.previousSibling));
				}
				// if the suceeding text, i.e. it bounds an element on the left
				// the anchorNode will be the preceeding element
				// the focusNode will belong to the selected text
				else if( sel.focusOffset > 0 ){
					log("Selected suceeding element text", obj = sel.focusNode.parentNode);
				}
			}
			else if(sel.isCollapsed){
				obj = obj.parentNode;
			}
			
		}
		else if(win.document.selection){
			sel = win.document.selection.createRange();
			obj = sel;
	
			if(sel.parentElement){
				obj = sel.parentElement();
			}else {
				obj = sel.item(0);
			}
			text = sel.text || sel;
		
			if(text.toString){
				text = text.toString();
			}
		}
		else {
			throw 'Error';
		}
		// webkit
		if(obj.nodeName==='#text'){
			obj = obj.parentNode;
		}
	
		// if the selected object has no tagName then return false.
		if(typeof obj.tagName === 'undefined'){
			return false;
		}
		return {'obj':obj,'text':text};
	};
	
		
	/**
	 * ClearForm Control
	 */
	$.fn.clearForm = function(){
		// TODO for all the table.multiple children, remove all but one element
		
		// Loop through all the elements and clear values
		$(":input, iframe", this).each(function(){
			var type = this.type, tag = this.tagName.toLowerCase();
			if(tag == 'form'){
				$(this).clearForm();
			}
			else if(tag == 'iframe' ){
				$( 'body[contenteditable]', this.contentWindow.document || this.contentDocument )[0].innerHTML= '';
			}
			else if(type == 'text' || type == 'password' || tag == 'textarea'){
				this.value = '';
			}
			else if(type == 'checkbox' || type == 'radio'){
				this.checked = false;
			}
			else if(tag == 'select'){
				this.selectedIndex = -1;
			}
		});

		return this;
	};
	
	/**
	 * Create EDITOR on the currently selected TEXTAREA
	 */
	$.fn.editor = function(){

		/**
		 * Action a popup modal box
		 */
		var win;
		function upload(callback){
			$("<input type='file' style='opacity:0;position:absolute;'/>")
				.appendTo(this)
				.trigger('focus')
				.change(function(e){
					if(!(this.files && "FileReader" in window)){
						return;
					};
					var file = this.files[0],
						reader = new FileReader();

					reader.onload = function(event){
						// insert this into the current document as an image 
						$currentiframe.inBetween("insertimage", false, event.target.result)
					};
					reader.readAsDataURL(file);
  				})
				.trigger('click');
			return false;
		}
	
		/**
		 * Add Tools
		 */
		var toolbox = [
			' ',
			{cmd:'bold', desc:'Make the Selected text bold', label:'<b>B</b>'},
			{cmd:'italic', desc:'Make the Selected text Italic', label:'<i>I</i>'},
			{cmd:'underline', desc:'Underline the selected text', label:'<u>U</u>'},
			{cmd:'strikethrough',desc:'Strike through the selected text', label:'<strike>S</strike>'},
			' ',
			{cmd:'createlink', desc:'Create Link', label:'<u>URL</u>',prompt:'URL of a Link?', promptValue:'http://'},
	//		{cmd:'insertimage', desc:'Insert image', label:'<u>IMG</u>',prompt:'URL of an image?'}, // &#9660;
			{cmd:'insertimage', desc:'Insert file or image', label:'IMG',callback:upload}, // &#9660;
			' ',
			{cmd:'insertorderedlist', desc:'Insert Numbered list', label:'<b>1</b> List'},
			{cmd:'insertunorderedlist', desc:'Insert Bullet list', label:'&#9679; List'},		
			' ',
			{cmd:'justifyleft', desc:'Align Left', label:'<b>|</b>&#9668;'},
			{cmd:'outdent', desc:'Outdent', label:'&#9668;'},
			{cmd:'justifycenter', desc:'Align center', label:'&#9679;'},
			{cmd:'indent', desc:'Indent', label:'&#9658;'},
			{cmd:'justifyright', desc:'Align right', label:'&#9658;<b>|</b>'},
			{cmd:'justifyfull', desc:'Jusitfy', label:'&#9776;'},//8801
			' ',
			{label:' Format', cmd:'formatblock', desc:'Format selected text', cmdvalue:[
				{value:'p', desc:'Normal', label:'Normal'},
				{value:'h1', desc:'Heading 1', label:'<h1>Heading 1</h1>'},
				{value:'h2', desc:'Heading 2', label:'<h2>Heading 2</h2>'},
				{value:'h3', desc:'Heading 3', label:'<h3>Heading 3</h3>'},
				{value:'h4', desc:'Heading 4', label:'<h4>Heading 4</h4>'},
				{value:'pre', desc:'Formatted', label:'<pre>Formatted</pre>'},
				{value:'address', desc:'Address', label:'<address>Address</address>'},
				{value:'blockquote', desc:'Blockquote', label:'<blockquote>Blockquote</blockquote>'},
				{value:'div', desc:'Normal Div', label:'Normal (Div)'}
	//			{value:'acronym', desc:'Acronym', cmd:'inserthtml', prompt:'What is the ', label:'<acronym>Acronym</acronym>'}
			]},
			' ', 
			{cmd:'inserthtml', desc:'Insert Special Character or Symbol', label:' Symbol', cmdvalue : [
				// CURRENCY
				'$','&pound;','&euro;','&yen;',
				// COPY
				'&copy;', '&trade;', '&reg;', 
				// LATIN LOWERCASE
				'&aacute;', '&acirc;', '&aelig;', '&agrave;','&aring;', '&atilde;', '&auml;', 
				'&eacute;', '&ecirc;', '&egrave;', '&eth;', '&euml;', 
				'&iacute;', '&icirc;', '&iexcl;', '&igrave;', '&iuml;', 
				'&ntilde;', 
				'&oacute;', '&ocirc;', '&oelig;', '&ograve;', '&otilde;', '&ouml;', 
				'&szlig;',
				'&uacute;', '&ucirc;', '&ugrave;','&uuml;', 
				'&yacute;', '&yuml;', 
				// MATHS
				'&frac12;', '&frac14;', '&frac34;', '&times;', '&divide;', '&lt;', '&gt;', '&deg;', 
				'&circ;', '&plusmn;', '&sum;', '&radic;', '&infin;', '&ne;', '&le;', '&ge;','&asymp;',
				// Punctuation
				'&hellip;', '&iquest;'
			]},
			' ',
			{label:' Font', cmd:'fontname', desc:'Apply font to selected text', cmdvalue:[
				{value:'Times', label:'<span style="font-family:times">Times</span>'},
				{value:'Helvetica', label:'<span style="font-family:Helvetica">Helvetica</span>'},
				{value:'Arial', label:'<span style="font-family:Arial">Arial</span>'},
				{value:'Tahoma', label:'<span style="font-family:Tahoma">Tahoma</span>'},
				{value:'Courier', label:'<span style="font-family:Courier">Courier</span>'},
				{value:'Western', label:'<span style="font-family:Western">Western</span>'},
				{value:'serif', label:'<span style="font-family:serif">Serif</span>'},
				{value:'sans-serif', label:'<span style="font-family:sans-serif">sans-serif</span>'},
				{value:'fantasy', label:'<span style="font-family:fantasy">fantasy</span>'},
				{value:'monospace', label:'<span style="font-family:monospace">monospace</span>'},
				{value:'Verdana', label:'<span style="font-family:Verdana">Verdana</span>'}
			]},
			{cmd:'removeformat', desc:'Remove Formatting', label:'<b style="color:red;">X</b>'}
		];
		
	
		return this.each(function(){
		
			// Unbind the click event
			// We dont want this script running twice for the same textarea
			// This is only useful if the textarea  click event was set, i.e. see how this current lambda function was triggered
			// $(this).unbind('click');
		
			var $textarea = $(this).addClass("source").hide();
		
			// If the iframe is not present, then we need to create it.
			// Set this as the controller for deciding whether to just set events
		
			if($textarea.siblings('iframe').length){
				/**
				 * Delete iframe and toolbar if already exists.
				 */
				$textarea.siblings('iframe').remove();
				$textarea.siblings('div.toolbar').remove();
				/**/
			}
		
			var $iframe = $("<iframe class='editor' tabIndex=-1 src='"+ path +"_blank.htm' frameborder=0>").insertAfter($textarea);
			// ADD toolbar.
			var $toolbar = $('<div class="toolbar">').width($textarea.width()).insertBefore($textarea);
		
			$iframe.attr('style', $textarea.attr('style'));
		
			// just in case the textarea is hidden
			$iframe.show();
		
			// ADD BUTTONS
			// Add controls above the contentEditable(DIV)
			$("<button>").html('<code>Source</code>').css({width:'50px'}).click(function(){
			
				var $editor = $( 'body', $iframe[0].contentWindow.document || $iframe[0].contentDocument );
		
				// Toggle display DIV vs TEXTAREA
				// Copy the content from the div to the textarea
				// Show the Textarea
				if($textarea.css('display')=='none'){
					// DIV => TEXT
					// Copy the div content to the text and show text
					$textarea.val($editor.html().replace(/<(h|b)r>/g, '<$1r/>')).show();
					// Hide the DIV
		
					$iframe.addClass('source');
					
					// change the text on the source button and disable the tools
					$(this).html("<b>Editor</b>").siblings(".tool").attr("disabled", true);
				}
				else {
					// TEXT => DIV
					// Copy the text content to the div and show
					$editor[0].innerHTML = $textarea.val().replace(/<(h|b)r>/g, '<$1r/>');
		
					$iframe.removeClass('source');
		
					// Hide the TEXT
					// Show DIV
					$textarea.hide();
		
					// Change Text and enable tools
					$(this).html("<code>Source</code>").siblings(".tool").removeAttr("disabled");
				}
				return false;
			}).appendTo($toolbar);
					
		
			/**
			 * Insert cmd
			 * 
			 */
			var insert = function(cmd,value,tool){
				
				
				/**
				 * Get the selected Text if there is any. 
				 * This function returns {obj:element,text:string}
				 */
				var sel = $.selectedText($iframe[0].contentWindow);
		
				/**
				 * If this is the createLink or insert image
				 * Get the href|src value of the selected element
				 * set this as the value
				 */
				if( (cmd==='insertimage'||cmd==='createlink') && ( typeof tool.prompt !== 'undefined' )){
					if(sel.obj.tagName==='A'){
						tool.promptValue = sel.obj.href;
					}
					if(sel.obj.tagName==='IMG'){
						tool.promptValue = sel.obj.src;
					}
				}
		
				/**
				 * User prompted to put in a value
				 */
				if(tool&&tool.prompt){
					/**
					 * Is text selected?
					 * Is selected text a URL? Then prepopulate the content of the prompt
					 */
					value = prompt(tool.prompt, (cmd==='createlink'&&sel.text.match('^https?://')?sel.text:(tool.promptValue || '')));
					if(value===null){
						return false;
					}
				}
				
				//If the command is for a Link there must be text
				//Otherwise we need to insertHTML instead
				if(cmd==='createlink'&&(!sel.text.length)){
					// Get the text
					if(!(sel.text = prompt("Text"))){
						sel.text = value;
					}
						
					if(sel.text===null){
						return false;
					}
					// We are going to insert the element manually
					// Using pasteHTML IE and execCommand insertHTML if the browser supports it.
					value = "<a href='"+value+"'>"+sel.text+"</a>";
					cmd = 'inserthtml';
				}
		
				/**
				 * IE requires format block tags (e.g. h1, p, pre) to be wrapped with <> syntax
				 */
				if(cmd=='formatblock'&&$.browser.msie){
					value = '<'+value+'>';
				}
		
				
				// Send the action to the frame
				// update the text area with this new value
		
				try{
					log([$iframe[0].contentWindow, cmd, value]);
					$iframe[0].contentWindow.inBetween(cmd, false, value);
				}
				catch(err){
					//IE WAY to insert at the current point
					if($iframe[0].contentWindow.document.selection){
						var s = $iframe[0].contentWindow.document.selection.createRange();
						if(s.pasteHTML){
							s.pasteHTML(value);
							return false;
						}
					}
					alert("Could not execute "+cmd);
				}
				return false;
			};
		
			var onselectchange = function(){
				// Make sure the focus is on the window
				if($.browser.msie){
					// $('#iframe_'+$(this).parents("div.toolbar")[0].id.match('[0-9]+')[0])
					var win = $iframe[0].contentWindow;
					var doc = win.document;
					doc.focus();
					cursorPos = doc.body.createTextRange();
					cursorPos.moveToPoint( win.posx, win.posy);
					cursorPos.select();
				}
				/**
				 * Add insert event
				 */
				try{
					insert(toolbox[$(this).attr('xtool')].cmd, this.options[this.selectedIndex].value);
				}
				catch(err){
					log("Uncaught error applying insert",err);	
				}
			};
			var onbuttonclick = function(){
				// make sure this is not going to insert outside the contentEditable iframe
				if($.browser.msie){
					try{
					//$('#iframe_'+$(this).parents("div.toolbar")[0].id.match('[0-9]+')[0])
					var win = $iframe[0].contentWindow;
					win.focus();
					var doc = win.document;
					// have we lost cursor positions?
					// excpetions occur selecting images
					var s = doc.selection.createRange().duplicate().getBoundingClientRect();
					if(!(s.left>=0&&s.top>=0)){
						// restore the cursor position
						doc.body.createTextRange().moveToPoint( win.posx, win.posy).select();
					}}
					catch(err){}
				}
				
				/**
				 * Which tool is this
				 */
				var tool = toolbox[$(this).attr('xtool')];
				
				if( $(this).hasClass('selected') ){
					$(this).removeClass('selected');
				}else{
					$(this).addClass('selected');
				}
		
				
				/**
				 * If Callback
				 */
				$currentiframe = $iframe[0].contentWindow;
				$currentiframe.focus();
				if(tool.callback){
					// because the callback does not take the same scope we assign this to the window object
					tool.callback.call($toolbar.get(0));
					return false;
				}
		
				/**
				 * Trigger edit command
				 */
				try{
					insert(tool.cmd, null,tool);
				}
				catch(e){
					log("Uncaught error applying insert",e);	
				}
				return false;
			};
			/**
			 * Loop through toolbox object and create buttons for each
			 */
			for(var x in toolbox){if(toolbox.hasOwnProperty(x)){
				
				/**
				 * Seperator?
				 * If the current tool is a string then insert as just a string
				 */
				if(typeof toolbox[x] == 'string'){
					if(toolbox[x].match('[a-z]', 'ig')){
						toolbox[x] = "<span class='tool'>"+toolbox[x].replace(' ', '&nbsp;')+"</span>";
					}
					$toolbar.append(toolbox[x]);
					continue;
				}
				
				
				/**
				 * Create a drop down list (currently a select->option).
				 * Add values from the tool to the select
				 * Add change event to the list
				 * @todo Change this to a drop down div with buttons and attach events to each of the option. 
						Two reasons: 
						1. Style (selects dont allow us flexibility to style option labels).
						2. Only trigger onchange event. We might want to select the same item twice, the change event wont get fired the second time...  i.e. the user has to navigate away. Using other triggers get fired when selecting anywhere, even the select scrollbar. Deselecting the option after use would be a workaround.
				 * 
				 */
				if(toolbox[x].cmdvalue){
					/**
					 * Create select in memory
					 * Attach event to insert into the current iframe
					 */
					var $select = $("<select>").attr({'class':'tool', 'xtool':x, 'cmd':toolbox[x].cmd, 'title':toolbox[x].desc}).change(onselectchange);
		
					/** 
					 * Create the select OPTIONs
					 */
					for(var y in toolbox[x].cmdvalue){if(toolbox[x].cmdvalue.hasOwnProperty(y)){
						if(typeof toolbox[x].cmdvalue[y] == 'string'){
							toolbox[x].cmdvalue[y] = {value:toolbox[x].cmdvalue[y],label:toolbox[x].cmdvalue[y]};
						}
						$select.append('<option value="'+toolbox[x].cmdvalue[y].value+'">'+toolbox[x].cmdvalue[y].label+'</option>');
					}}
		
					/**
					 * Wrap the select in a div. 
					 * Append the DIV into the toolbar
					 */
					$("<span class='tool'>"+toolbox[x].label.replace(' ', '&nbsp;')+"</span>")
						.append($select)
						.appendTo($toolbar);
		
					continue;
				}
		
				/**
				 * Create a button 
				 * This is the last option for what a tool can be. 
				 */
				$("<button>")
					.attr({
						'class':'tool', 
						'xtool':x, 
						'cmd':toolbox[x].cmd, 
						'title':toolbox[x].desc
					})
					.html(toolbox[x].label)
					.click(onbuttonclick)
					.appendTo($toolbar);
			}}
		})		
	};

	/**
	 * HTML5 Placeholder shim
	 * 1.
	 */
	$.fn.placeholder = function(){
	
		if($.support.placeholder){
			return false;
		}
		// check for support for the placeholder attribute
		return ( $(this).is("[placeholder]") ? $(this) : $(":input", this) ).filter("[placeholder]").each(function(){
			// insert the text as the value
			this.value = $(this).attr('placeholder');
		}).addClass("placeholder")
		.watch("value", function(e){
			$(this).removeClass('placeholder');
		})
		.watch("placeholder", function(e){
			if($(this).hasClass('placeholder')){
				this.value = $(this).attr('placeholder');
				//log("placeholder"+this.value);
			}
		});
		//*/
	};

    var leftButtonDown = false;
    $(":input").live('mousedown',function(e){
        // Left mouse button was pressed, set flag
        if(e.which === 1) leftButtonDown = true;
    });
    $(document).mouseup(function(e){
        // Left mouse button was released, clear flag
        if(e.which === 1) leftButtonDown = false;
    });

	/**
	 * Range
	 */
	$.fn.range = function(){
	
		if($.support.range){
			return false;
		}
		// check for support for the placeholder attribute
		return ( $(this).is("[type=range]") ? $(this) : $("input", this) ).filter("[type=range]").each(function(){
		
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

			$(this).addClass("range").bind("click mousemove",function(e){

				if(!leftButtonDown&&e.type === "mousemove"){
					return;
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
	 * input[type=number]
	 * Adds up and down controls to increment/decrement a number field
	 * Controls: can be clicked once or held down
	 */
	$.fn.number = function(){

		if($.support.number){
			return false;
		}

		// kill iterations to increase the value
		var interval = null;
		$(document.body).mouseup(function(){
			if(interval){
				clearTimeout(interval);
			}
		});

		// check for support for the input[type=number] attribute
		return ( $(this).is("[type=number]") ? $(this) : $("input", this) ).filter("[type=number]").each(function(){
			// Found
			log("input[type=number]", this);

			var el = this,
				w = $(this).outerWidth(),
				min = $(this).attr('min'),
				max = $(this).attr('max'),
				step = parseFloat($(this).attr('step'))||1;

			// Listen for up down events on the element
			$(this).bind('up down', function(e){
				var n = (parseInt($(this).val())||0)+(e.type==='up'?step:-step);
				if(n>max){
					n=max;
				}
				if(n<min){
					n=min;
				}
				$(this).val(n);
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
						$(el).trigger(i?"down":"up");

						// press'n'hold can be cancelled by keyup (above)
						interval = setTimeout(change,100);
					})();
					
				})
				.parents('span.number');

			// add dimensions
			setTimeout(function(){

				var pR = 0,// parseInt($(el).css("paddingRight")),
					mR = parseInt($(el).css("marginRight"));

				$(el).css({
					paddingRight: ( pR + 22 )+"px",
					marginRight: 0,
					width :  ($(el).width() - ($(el).outerWidth() - w)) + "px"
				});

				$span.css({
					marginRight:mR+"px",
					marginTop: ( $(el).offset().top - $span.offset().top ) + 'px'
				});
			},1);
		});
	};

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
	}



	/**
	 * $("form").form()
	 * Converts forms with...
	 * 1. "textarea[type=html]" to a WYSIWYG editor
	 * 2. "table.multiple" to add buttons for adding/removing additional rows
	 * 3. "input[placeholder] will add html5 placeholder
	 */
	$.fn.form = function(){
	
		return $(this).each(function(){

			// Add the editor to textareas with type=html
			$("textarea[type=html]", this).editor();

			// Add the placeholder support
			$(":input[placeholder]", this).placeholder();
			
			// Add the number support
			$(":input[type=number]", this).number();

			// Add multi table support
			$("table.multiple", this).dynamicTable();
			
			// Add range
			$("input[type=range]", this).range();

		});
	};
		
		
		
		
	/**
	 * Dyamic table
	 * Attaches controls to support the addition and subtraction of form items in a table
	 */
	$.fn.dynamicTable = function(){

		return $(this).each(function(){
		
			// append new buttons to rows
			$(this).find("tbody tr").append("<td><a class='delete'>Delete</a></td>");

			// add new column with delete command
			var len = 0;
			$(this).find("thead tr").append("<th>Delete</th>").find("th").each( function (){ len++;} );
	
			// insert tfoot with 
			$(this).append("<tfoot><tr><td colspan='" + len + "'><a class='add'>Add " + ( this.className.match(/\bpivot\b/) ? "Row" : "Col" ) + "</a></td></tr></tfoot>");
			
			
			// Add Controls
			$("tbody tr td a.delete", this).live('click', function(){

				$(this).closest('tr').each(function(){
					/**
					 * Check that if there are no other rows to simply unset all the values
					 */
					if ( this.parentNode.rows.length > 1 ){
						// In IE we can't hide rows, so lets select the td's instead. 
						// This means we can only run the delete rows once. So check that the elements exist.
						$(this).children().fadeOut('fast',function(){
							// once all the td elements have faded out we can remove the row
							$(this).closest('tr').remove();
						});
					}
					else{
						$( this ).clearForm();
					}
				});

			});
			$("tfoot tr td a.add", this).live('click', function(){
				$(this).closest('table').each(dynTable.addRecord);
			});
		});
	};


		
	/****************************************************
	 *
	 * Dynamic Table Methods
	 *
	 ****************************************************/
	
	var dynTable = {
		addRecord : function(){
			var m = /depth_([0-9]+)/.exec(this.className);
			level = m[1];
			// determine the depth based upon the number of nested table elements taken to get to this
			log("LEVEL:", level);
			dynTable['add'+(this.className.match(/\bpivot\b/)?'Row':'Column')]( this, level );
		},
		
		/**
		 * Add row to the table.
		 * This script copies the last row of the table and appends a new row to the table.
		 * It removes all user inserted values in the copy. And increments the keys
		 */
		addRow : function ( tbl, level ){
			/**
			 * Clone the first row
			 */
			var b = tbl.tBodies[0];
			var n = b.rows[b.rows.length - 1].cloneNode(true);
		
			/**
			 * Remove any previous value/and multiple records.
			 * Reassign dynamic effects.
			 */
			dynTable.clearRowFormValues(n,level);
		
			// Add controls to new nodes created.
			// If we were using JQuery this could be done with $(this).clone(true);
			addControls($(n).appendTo(b));
		},
	
		/**
		 * Add row to the table.
		 * This script copies the last column of the table and appends a new column to the table.
		 * It removes all user inserted values in the copy. And increments the keys
		 */
		addColumn : function ( tbl, level )
		{
			var tblHead = tbl.tHead;
			var tblBody = tbl.tBodies[0];
			var i = 0;
			var newCell = {};
		
		
			if ( tblHead !== null && ! $().isUndefined( tblHead.rows ) )
			{
				for ( i=0; i<tblHead.rows.length; h++ )
				{
					/** NOT SUPPORTED */
				}
			}
			
		
			if ( tblBody !== null && ! $().isUndefined( tblBody.rows ) )
			{
				for ( i=0; i<tblBody.rows.length; i++)
				{
					/**
					 * copy the content of the previous cell.
					 */
					newCell = tblBody.rows[i].cells[ tblBody.rows[i].cells.length -1 ].cloneNode(true);
					
					dynTable.clearCellFormValues( newCell, level );
		
					addControls(newCell);
					tblBody.rows[i].appendChild(newCell);
				}
			}
		},
		
		
		
		
		/**************************************************
		 *
		 * Table CELL clear out and reassign properties
		 *
		 * Both the above functions need to clear the cells. 
		 * Since they clone the originals completely, inclusing the user values.
		 *
		 **************************************************/
		
		clearRowFormValues : function(row, level){
			$(row).children().each(function(){
				dynTable.clearCellFormValues( this, level );
			});
		},
		
		
		clearCellFormValues : function(cell, level){
			var elem = {};
			var classInt = 0;
			var classArr = [];
			var previousName = '';
			
			for ( var i=0; i < cell.childNodes.length; i++ )
			{
				/**
				 * Initiate elem
				 */
				elem = cell.childNodes[i];
		
				/**
				 * These are the only element types we have controls for.
				 */
				if ( $.inArray( elem.tagName, ['INPUT', 'TEXTAREA', 'SELECT', 'DIV', 'TABLE'] ) === -1 )
				{
					return;
				}
		
					
				/**
				 * Remove previous values/selections from cells
				 */
				if ( $.inArray( elem.tagName, ['INPUT', "TEXTAREA"] ) !== -1 )
				{
					elem.value = "";
				}
				if ( elem.tagName === "SELECT" )
				{
					elem.selectedIndex = -1;
				}
		
				/**
				 * Change the name to reflect incrementing
				 */
				if ( $.inArray( elem.tagName, ['INPUT', 'SELECT', "TEXTAREA"] ) !== -1 )
				{
					previousName = elem.name;
					elem.name = dynTable.incrementFormName( elem.name, level );
				}
				
				/**
				 * If element of the cell is a TABLE. With a dynamic option. then we need to recurse this table
				 */
				if ( elem.tagName === "TABLE" && elem.className === "dynamic" )
				{
					dynTable.clearTableFormValues( elem, level );
				}
			}
		},
		
		clearTableFormValues : function(tbl, level){
			var elem = {};
			
			/**
			 * Update the depth Variable
			 */
			tbl.depth = level + 1;
			
			/**
			 * Keep the table head. Remove all the other duplicates.
			 */
			var body = tbl.tBodies[0];
		
		
			var count = body.rows.length;
		
			/**
			 * Remove all the other rows
			 */
			for( var i = 1; i < count; i++ )
			{
				
				/**
				 * Because this constantly deletes rows. the orders are re-arranged.
				 * so `1` is always the key of the table row that we want to delete. 
				 */
				body.deleteRow( body.rows[1].sectionRowIndex );
			}
		
			dynTable.clearRowFormValues( body.rows[0], level );
			
			/**
			 * Update the button
			 */
			for( var x in tbl.childNodes ){if(tbl.childNodes.hasOwnProperty(x)){
				elem = tbl.childNodes[x];
				if ( elem.tagName === 'INPUT' && elem.type === 'button' ){
					elem.onclick = dynTable.addRecord;
				}
			}}
		},
		
		
		/****************************************************
		 *
		 * Table Remove Records
		 *
		 ****************************************************/
		
		
		
		deleteColumn : function ( p )
		{
			/**
			 * Find the column number
			 */
			var colInt = $(p).parent("td").get(0).cellIndex;
			
			$(p).parent("tbody").find("tr").each( function(el){
				if ( el.cells.length > 2 && colInt >= 1)
				{
					el.deleteCell( colInt );
				}
				else if ( colInt === 1 )
				{
					dynTable.clearCellFormValues( el.cells[1] );
				}
			} );
		},
		
		
		/**************************************************
		 * 
		 * Special function to Forms 
		 *
		 **************************************************/
		
		
		incrementFormName : function (el,lev)
		{
			/**
			 * Break the string apart.
			 */
			var a = el.split(/[\[\]]+/);
			a.pop();
			var pos = (2*lev)-1;
			a[pos] = -(Math.abs(parseInt(a[pos],0))+1);
			
			if( /\[\]$/.test(el) ){
				a.push();
			}
		
			for (var j=1;j<a.length;j++){
				a[j]="["+a[j]+"]";
			}
			
			return a.join('');
		}
	};
	
	$.fn.watch = function(props, callback, timeout){
	    if(!timeout)
	        timeout = 10;
	    return this.each(function(){
			var $el 	= $(this),
				el 		= this,
				func 	= function(){ __check.call(el, $(el)) },
				data 	= {	props: 	props.split(","),
							func: 	callback,
							vals: 	[] };
	        $.each(data.props, function(i) { data.vals[i] = $el.prop(data.props[i]) || $el.css(data.props[i]) || $el.attr(data.props[i]); });

	        if (typeof (this.onpropertychange) == "object"){
	            this.attachEvent("onpropertychange", func );
	        } else if ($.browser.mozilla){
	            $el.bind("DOMAttrModified", callback);
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
	}

})(jQuery);