/**
 * jquery.editor.js
 * Adds WYSIWYG controls to TEXTAREA[type=html], or a contenteditable
 * @author Andrew Dodson
 * @description WYSIWYG editor
 */
(function($){

	/**
	 * Make creates a jquery element based on a CSS selector
	 */
	$.make = function(s){
		var a = {};
		s = s.replace(/([\.\#]|\[[a-z]+(\=|\])?)?([a-z0-9\_]*)\]?/ig, function(m,attr,join,val,i){
			if(attr==='.'){ a['class'] = val; }
			else if(attr==='#'){ a.id = val; }
			else if(attr){ a[attr.replace(/[^a-z]/ig,'').toLowerCase()] = val; }
			return '';
		});
		return $('<'+(s||'div')+'>').attr(a);
	}

	/**
	 * Overwrite the form function and bind the original form function to the execution
	 */
	var old_form = $.fn.form;
	$.fn.form = function(){
		// trigger the old form
		old_form.call(this);

		// loop through the assets
		return $(this).each(function(){
			// Add the editor to textareas with type=html
			$("textarea[type=html]", this).editor();
		});
	}
	
	function log(){
		if (typeof(console) === 'undefined'||typeof(console.log) === 'undefined') return;
		if (typeof console.log === 'function') {
			console.log.apply(console, arguments); // FF, CHROME, Webkit
		}
		else{
			console.log(Array.prototype.slice.call(arguments)); // IE
		}
	}
	
	// Define the identifier we're giving to the toolbar
	var toolbar = 'div.toolbar';

	
	/**
	 * Get information about the selected text.
	 * @param the scope/window object
	 & @return selected element
	 */
	$.fn.selectedText = function(){
	
		var r;
	
		this.each(function(e){

			var obj = null,
				text = null,
				sel = null;
	
			win = this;
		
			// Get parent element to determine the formatting applied to the selected text
			if(win.getSelection){
				obj	= win.getSelection().anchorNode;
				text= win.getSelection().toString();
				sel	= win.getSelection();
		
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
				else if(sel.isCollapsed && obj){
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
			if(obj&&obj.nodeName==='#text'){
				obj = obj.parentNode;
			}
	
			// if the selected object has no tagName then return false.
			if(!obj||typeof obj.tagName === 'undefined'){
				return false;
			}
			r = {'obj':obj,'text':text};
		});
		
		return r;
	}






	/**
	 * makeToolbar
	 * Make toolbar with default settings
	 * returns a toolbar object which can be injected into the DOM
	 */
	function makeToolbar(){

		/**
		 * The tools array
		 */
		var tools = [
			{cmd:'editor', desc:'Switch between source and editor', label:'Source'},
			' ',
			{cmd:'bold', desc:'Make the Selected text bold', label:'<b>B</b>'},
			{cmd:'italic', desc:'Make the Selected text Italic', label:'<i>I</i>'},
			{cmd:'underline', desc:'Underline the selected text', label:'<u>U</u>'},
			{cmd:'strikethrough',desc:'Strike through the selected text', label:'<strike>S</strike>'},
			' ',
			{cmd:'createlink', desc:'Create Link', label:'<u>URL</u>'},
	//		{cmd:'insertimage', desc:'Insert image', label:'<u>IMG</u>',prompt:'URL of an image?'}, // &#9660;
			{cmd:'insertimage', desc:'Insert file or image', label:'IMG'}, // &#9660;
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
			{label:' Format', cmd:'formatblock', desc:'Format selected text', options:[
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
			{cmd:'inserthtml', desc:'Insert Special Character or Symbol', label:' Symbol', options : [
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
			{label:' Font', cmd:'fontname', desc:'Apply font to selected text', options:[
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


		/**
		 * Turn the tools array into a HTML string
		 */
		function html(tool){
			/**
			 * Separator?
			 * If the current tool is a string then insert as just a string
			 */
			if(typeof tool == 'string'){
				return "<span class='tool'>"+tool.replace(' ', '&nbsp;')+"</span>";
			}
			
			/**
			 * Create a dropdown list of options?
			 */
			if(tool.options){
				// initiate option array
				var a = [];

				// build select tag
				for(var y in tool.options){if(tool.options.hasOwnProperty(y)){
					var o = tool.options[y];
					if(typeof o == 'string'){
						o = {value:o,label:o};
					}
					a.push('<option value="'+o.value+'">'+o.label+'</option>');
				}}
				return '<span>'+tool.label.replace(' ', '&nbsp;')+'</span><select data-cmd="'+ tool.cmd +'" title="'+tool.desc+'">' + a.join('') + '</select>';
			}

			/**
			 * Else create a button 
			 * This is the last option for what a tool can be. 
			 */
			return '<button data-cmd="'+tool.cmd+'" title="'+tool.desc+'">' + tool.label +'</button>';
		}

		//
		//  Loop through tool object and create buttons for each
		//
		var r = '';
		for(var i = 0; i<tools.length; i++ ){
			r += html(tools[i]);
		};
		return r;
	}






	/**
	 * executeCommand and insert into the page
	 * @param string Command being executed,
	 * @param string Value unique to the item
	 * @param element Element which has been clicked
	 */
	function executeCommand(cmd,value, el){

		// make sure this is not going to insert outside the contentEditable iframe
		/**
		if($.browser.msie){
			try{
			//$('#iframe_'+$(this).parents("div.toolbar")[0].id.match('[0-9]+')[0])
			var win = $('body > article').get(0);
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
			log("Word");
		}*/


		/**
		 * Get the selected Text if there is any. 
		 * This function returns {obj:element,text:string}
		 */
		var sel = $(document).selectedText();


		/**
		 * If this is the createLink or insert image
		 * Get the href|src value of the selected element
		 * set this as the value
		 */
		if( (cmd==='insertimage'||cmd==='createlink') ){
			if(sel.obj.tagName==='A'){
				src = sel.obj.href;
			}
			if(sel.obj.tagName==='IMG'){
				src = sel.obj.src;
			}
		}

		//
		// createlink
		// inserts an anchor tag around the selected content.
		// if there is no selected content we'll just prompt the user to add some text
		// 
		if(cmd==='createlink'){

			// Is text selected?
			// Is selected text a URL? Then prepopulate the content of the prompt
			value = prompt('URL of a Link?', (sel.text.match('^https?://')?sel.text:'http://'));
	
			//If the command is for a Link there must be text
			// Otherwise we need to insertHTML instead
			if(!sel.text.length){
				// Get the text
				if(!(sel.text = prompt("Text")))
					sel.text = value;
					
				if(sel.text===null)
					return false;
				// We are going to insert the element manually
				// Using pasteHTML IE and execCommand insertHTML if the browser supports it.
				value = "<a href='"+value+"'>"+sel.text+"</a>";
				cmd = 'inserthtml';
			}
		}


		//
		// IE requires format block tags (e.g. h1, p, pre) to be wrapped with <> syntax
		//
		if(cmd=='formatblock'&&$.browser.msie){
			value = '<'+value+'>';
		}

		
		// 
		// Try inserting
		// If the typical way doesn't work, lets try IE's
		// 
		try{
			log([window, cmd, value]);
			document.execCommand(cmd, true, value);
		}
		catch(e){
			//IE WAY to insert at the current point
			if(document.selection){
				var s = document.selection.createRange();
				if(s.pasteHTML){
					s.pasteHTML(value);
					return false;
				}
			}
			log("Could not execute "+cmd);
		}
		
		// 
		// Trigger a change event on the div
		// This will be picked up and transfered to the Textarea
		//
		if(sel&&sel.obj){
			var q = '[contenteditable]',
				$sel = $(sel.obj);
			($sel.is(q) ? $sel : $sel.parents(q)).trigger('change');
		}

		return false;
	};


	/**
	 * Button[data-cmd] click
	 * Add handler for when a command button is clicked
	 */
	$("button[data-cmd]").live('click', function(e){

		// ... i.e. dont want to submit a form, if that's where the button was.
		e.preventDefault();
		e.stopPropagation();
	
		// make sure this is not going to insert outside the contentEditable iframe
		if($.browser.msie){
			try{
			//$('#iframe_'+$(this).parents("div.toolbar")[0].id.match('[0-9]+')[0])
			var win = $('[contenteditable]').get(0);
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
			log("Word");
		}

		//
		// cmd is short for the command (or action) which we are applying to our 
		//
		var cmd = $(this).attr('data-cmd');

		//
		// Switch editor mode
		//
		if(cmd === 'editor'){

			// get the selected editor area
			var sel = $(window).selectedText(),
				$sel = $();

			if(!sel){
				//
				// Lets try and guess which editor we're referring too.
				// 
				var $sel = $(this).parents('div.toolbar').next('textarea');
				
				if( !$sel.is(':visible') ){
					$sel = $sel.next('[contenteditable]:visible');
				}
				
				if($sel.length===0){
					log("can't find an element to switch");
					return false;
				}
			}
			else{
				$sel = $(sel.obj);
			}

			var q = '[contenteditable]';

			// Is textarea view
			if( $sel.is('textarea[type=html]') ){
				// find the neighbouring div.contenteditable
				$sel.hide().next(q).show();
			}
			else {
				( $sel.is(q) ? $sel : $sel.parents(q) ).hide().prev('textarea').show().focus();
			}
			
			// this command does not require executing
			return;


		//
		// InsertImage
		// If the user has clicked the insert image command, lets pop a file dialogue
		// 
		} else if(cmd==='insertimage'){
	
			// Reuse an exiting one if not already available
			var $fileType = $(this).siblings("input[type=file]").filter(function(){return $(this).val()===""});
	
			// Add a new one
			if($fileType.length === 0){
				$fileType = $("<input type='file' style='opacity:0;position:absolute;left:-2000px' multiple='true'/>")
					.change(function(){insertimage(this);})
					.insertAfter(this);
			}
	
			// Trigger focus and click events
			$fileType
				.trigger('focus')
				.trigger('click');

			return false;
		}
		else if(!cmd){
			log("ERROR, no command passed to function");
			return false;
		}

		// 
		// Highlight the tool
		// 
		$(this).toggleClass('selected');

		// 
		// Trigger edit command
		// Send the command to the insert function for updating the document
		//
		try{
			executeCommand( cmd, null, this );
		}
		catch(e){
			log("Uncaught error applying insert",e);	
		}
		return false;

	});

	$("select[data-cmd]").live('change', function(){
		//
		try{
			executeCommand($(this).attr('data-cmd'), this.options[this.selectedIndex].value);
		}
		catch(err){
			log("Uncaught error applying insert",err);	
		}
	});


	/**
	 * commandList
	 * When nodes are selected in the WYSIWYG the values in this list are used to determine the command's which have already been applied to the selected node.
	 */
	var commandList = {
		bold 		: {css:{'fontWeight':'bold'}, tag:'B|STRONG'},
		italic		: {css:{'fontStyle':'italic'},tag:'I|EM'},
		underline	: {css:{'textDecoration':'underline'},tag:'U'},
		strikethrough : {css:{'textDecoration':'line-through'},tag:'STRIKE'},
		justifyright : {css:{'textAlign':'right'},attr:{'align':'right'}},
		justifycenter : {css:{'textAlign':'center'}},attr:{'align':'center'},
		justifyfull : {css:{'textAlign':'justify'}},
		justifyleft : {css:{'textAlign':'left'},attr:{'align':'left'}},
		insertorderedlist : {tag:'OL'},
		createlink : {tag:'A'},
		insertimage : {tag:'IMG'},
		insertunorderedlist : {tag:'UL'},
		fontname	: {css:{'fontFamily':null}, attr:{'face':null}},// null: accepts a variety of values
		formatblock : {tag:'ADDRESS|P|PRE|H[0-9]|BLOCKQUOTE'}
	};
	

	/**
	 * Create EDITOR on the currently selected TEXTAREA
	 */
	$.fn.editor = function(){
	
		var query = 'textarea[type=html], [contenteditable=true]';

		return ($(this).is(query) ? $(this) : $(query, this)).each(function(){

			//
			// Lets get the $div WYSIWYG node - If that's the case!
			// 
			var $div = $(this);
			
			//
			// If however this is a textarea, lets create our div WYSIWYG node
			// 
			if($(this).is('textarea')){
			
				// Duplicate any styles
				var style = $(this).attr('style');
				
				// Hide
				var $txt = $(this).addClass("source").hide();

				// lets create a editable region
				$div = $.make('div[contenteditable=true]')
							.width($(this).width())
							.height($(this).height())
							.attr('style', style)
							.html($(this).html())
							.insertAfter(this);
				
				// add change events to textarea
				$(this).add($div).bind('change', function(){
					// check this is visible
					if($(this).is(':visible')){
						// update the other
						if( this === $txt.get(0) ){
							$div.html($txt.val());
						}else{
							$txt.val($div.html());
						}
					}		
				});
			}

			// 
			// Lets get a reference to the element containg all the controls
			// 
			var $controls = $( $(this).attr('data-controls') || '' );
			
			// Add the toolbar if a reference to an existing toolbar has not been defined by the control attribute
			if( $controls.length === 0 ){
				// ADD controls.
				$controls = $.make(toolbar).html(makeToolbar()).width($(this).width()).insertBefore(this);
			}
			
			// 
			// Bind events to the $div
			// Update the $controls with the item selected
			// 
			$div.addClass('editor').bind('click keyup blur', function(e){
				
				if(e.type!=='click'){
					$(this).trigger('change');
				}
				
				if(e.type==='blur')
					return;

				var obj = $(window).selectedText().obj;
			
				if(!obj)
					return;
			

				// loop through each parent of the currently selected
				// Capture styles and tagNames to imply formatting
				// Formatting of some tags, i.e b,i,u, can be overridden by styles
				// And can also be inferred by tagNames.
			
				var c = {}; // commands, these are 
				var getattr = function(){
					if(!this.tagName)
						return;
					var t = this.tagName.toUpperCase(),
						x,y,m;
				
			
					if(t==='BODY'||t==='HTML')
						return;
			
					for(x in commandList){
						if(c[x]) continue;
						for( y in commandList[x].css ){
							if( this.style[y] 
								&& ( this.style[y].match( commandList[x].css[y], 'i' ) 
									|| ( commandList[x].css[y] === null && this.style[y].length > 0 ) ) ){
								c[x] = this.style[y];
								continue;
							}
						}
						if($.browser.msie)
							for( y in commandList[x].attr ){
								if( this.getAttribute 
									&& ( this.getAttribute(y) === commandList[x].attr[y] 
										|| ( commandList[x].attr[y] === null && this.getAttribute(y).length > 0 ) ) ){
									c[x] = this.getAttribute(y);
									continue;
								}
							}
						if(c[x]) continue;
						if((m=t.match( '^('+commandList[x].tag+')$' ))!==null){
							c[x] = m[0].toLowerCase();
						}
					}
				};
			
				$(obj).each(getattr).parents().each(getattr);
			
				//log(["selected",obj,c,$(this).siblings('body header nav').find(':input[cmd]')]);
			
				$controls.find(':input[data-cmd]').each(function(){
					var cmd = $(this).attr('data-cmd');
					var bool = !(typeof c[cmd] === 'undefined');
					
					if(this.tagName === 'BUTTON'){
						if(bool)
							$(this).addClass('selected');
						else
							$(this).removeClass('selected');
					};
					if(this.tagName === 'SELECT'){
						if(bool)
							this.value = c[cmd];
						else 
							this.selectedIndex = -1;
					};
				});
			
				//console.log(c,obj,$(obj).parents());
					
				// Record the last selected position in the Iframe
				try{
					var s = document.selection.createRange().duplicate().getBoundingClientRect();
					window.posx = s.left; 
					window.posy = s.top; 
				}
				catch(e){}

			// 
			// Bind dragdrop events to the $div
			// When the user drops a file over we load it in.
			//
			}).bind('dragover',function(){return false;}).bind('drop', function(e){

				// get the original event
				e = (e&&e.originalEvent?e.originalEvent:window.event) || e;
				
				// prevent default, which is typically loading the file into a new window (urgh nasty results)
				if(e.preventDefault){
					e.preventDefault();
				}
				insertimage(e.files?e:e.dataTransfer);
				return false;
			});
		});
	};
	



	/** 
	 * paste
	 * Grab stuff from the clipboard and insert it into the page.
	 * This works naturally with text into contentEditable areas, but we want to be able to also paste images
	 */ 
	document.onpaste = function(e){
		return !insertimage(e.clipboardData);
	}




	
	/**
	 * Insert images if they are passed as a dataTransfer array.
	 * This is used for body[ondrop]() and input[type=file][onchange]() as well as document[onpaste]
	 * Images are reduced to a smaller size
	 *
	 * @param e event aka from clipboardData and dataTransfer, or <input type=file> element with "files" as an attribute 
	 * @returns true (works), false(failed)
	 */
	function insertimage(e){
	
		if(!("FileReader" in window)){
			return false;
		}
	
	//	log(JSON.stringify(e));
	
		if(e.files&&e.files.length){
			for(var i=0;i<e.files.length;i++){
				file(e.files[i]);
			}
		}
		else if(e.items&&e.items.length){
			// pasted image
			for(var i=0;i<e.items.length;i++){
				if( e.items[i].kind==='file' && e.items[i].type.match(/^image/) ){
					var files;
					file(e.items[i].getAsFile());
				}
				else if (e.items[i].kind==='string'){
					// if clipboard data contains string we're just going to paste it as HTML. Its too much hassle sorting it out
					return false;
				}
			}
		}
		else{
			return false;
		}
	
		return true;
		
		function file(file){
			// Create image
			var temp = 'data:image/gif;base64,R0lGODlhEAAQAOUdAOvr69HR0cHBwby8vOzs7PHx8ff397W1tbOzs+Xl5ebm5vDw8PPz88PDw7e3t+3t7dvb2+7u7vX19eTk5OPj4+rq6tbW1unp6bu7u+fn5+jo6N/f3+/v7/7+/ra2ttXV1f39/fz8/Li4uMXFxfb29vLy8vr6+sLCwtPT0/j4+PT09MDAwL+/v7m5ubS0tM7OzsrKytra2tTU1MfHx+Li4tDQ0M/Pz9nZ2b6+vgAAAAAAAAAAAAAAAAAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQFMAA5ACwAAAAAEAAQAAAGg8CcMAcICAY5QsEwHBYPCMQhl6guGM5GNOqgVhMPbA6y5Xq/kZwkN3Fsu98EJcdYKCo5i7kKwCorVRd4GAg5GVgAfBpxaRtsZwkaiwpfD0NxkYl8QngARF8AdhmeDwl4pngUCQsVHDl2m2iveDkXcZ6YTgS3kAS0RKWxVQ+/TqydrE1BACH5BAkwADkALAAAAAAQABAAAAZ+wJwwJ1kQIgNBgDMcdh6KRILgQSAOn46TIJVSrdZGSMjpeqtgREAoYWi6BFF6xCAJS6ZyYhEIUwxNQgYkFxwBByh2gU0kKRVHi4sgOQuRTRJtJgwSBJElihwMQioqGmw5gEMLKk2AEkSBq4ElQmNNoYG2OVpDuE6Lrzmfp0NBACH5BAUwADkALAAAAAAQABAAAAaFwJwwJ1kQCDlCwTAcMh6KhDQnVSwYTkJ1un1gc5wtdxsh5iqaLbVKyVEWigq4ugZgTyiA9CK/JHIZWCsICCxpVWV/EzkHhAgth1UPQ4OOLXpScmebFA6ELHAZclBycXIULi8VZXCZawplFG05flWlakIVWravCgSaZ1CuksBDFQsAcsfFQQAh+QQJMAA5ACwAAAAAEAAQAAAGQcCccEgsGo/IpHLJzDGaOcKCCUgkAEuFNaFRbq1dJCxX2WKRCFdMmJiiEQjRp1BJwu8y5R3RWNsRBx9+SSsxgzlBACH5BAkwADkALAAAAAAQABAAAAaJwJwwJ1kQCDlCwTAcMh6KhDQnVSwYTkJ1un1gc5wtdxsh5iqaLbVKyTEWigq4ugZglRXpRX5J5DJYAFIAaVVlfhNrURqFVQ9DYhqCgzkzCGdnVQBwGRU0LQiXCRUAORQJCwAcOTChoYplBXIKLq6vUXRCCQ22olUEcroJB66KD8FNCjUrlxWpTUEAIfkEBTAAOQAsAAAAABAAEAAABobAnDAnWRAIOULBMBwyHoqENCdVLBhOQnW6fWBznC13G8nZchXNllql5Bg2xA1cZQOwShwCMdDkLgk5GVgAUgAie3syVDkTbFIaiIkIJ0NiGnp7HiNonRVVAHEuFjlQFVQVAI0JCzYjrKCPZQWnf1unYkMVWrFbBLVoUIaPD8C6CwCnAMhNQQA7';
	
			executeCommand('insertimage',temp);
	
					
			// get position
			var sel = $(window).selectedText();
			
			// render
			var reader = new FileReader();
	
			reader.onload = function(){
	
			    var img = new Image(),
			    	canvas = document.createElement("canvas"),
			    	ctx = canvas.getContext("2d"),
			    	maxWidth = maxHeight = 1000;
		
				
			    img.onload = function()
			    {
					var ratio = 1;
					
					if(img.width > maxWidth){
						ratio = maxWidth / img.width;
					}
					if(img.height > maxHeight){
						ratio = Math.min(maxHeight / img.height, ratio);
					}
					
					canvas.width = img.width * ratio;
					canvas.height = img.height * ratio;
					ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
					
					// insert this into the current document as an image 
					var canvasDataURL = canvas.toDataURL();
					log("CANVAS LENGTH" + canvas.toDataURL().length );
					
					// Replace temp
					$(sel.obj).find("img").filter(function(){
						return $(this).attr('src') === temp;
					}).eq(0).attr('src', canvasDataURL.length < reader.result.length? canvasDataURL : reader.result );
					
					// insert image
					//executeCommand("insertimage", canvasDataURL.length < reader.result.length? canvasDataURL : reader.result  );
		
			    };
			
			    img.src = reader.result;
			    log("IMG LENGTH "+reader.result.length);
			    
			};
			reader.readAsDataURL(file);
		}
	}
	
})(jQuery);