		$(document).ready(function(){
			$('pre').each(function(){
				var s = this.innerHTML
					.replace(/<br\/?>/ig," \n")		// Remove all markup that does the same job as the newline character
					.replace(/.+/ig, function(m){return m.replace(/([.]) $/,'$1');})		// Remove the trailing space from items with content
					.replace(/([^:]|^)(\/\/.*)/g,'$1<span class="comment">$2</span>') // Add comments on single lines
					.replace(/&lt;\/?[a-z0-9]+(\s[a-z][^>\n]*?)?&gt;/g,'<span class="html-tag">$&</span>') // Wrap tags
					.replace(/(\b)([a-z\_]+)\(/gi, '$1<span class="function">$2</span>(')
					.replace(/(\n\s*)(\/\*[\s\S]*?\*\/)/ig, function(m,p1,p2){
						return p1 + "<span class='comment'>" + p2.replace(/\n/ig, '<\/span>\n<span class="comment">') + "</span>";
					})
					.replace(/^\/\*[\s\S]*?\*\//ig, function(m){
						return "<span class='comment'>" + m.replace(/\n/ig, '<\/span>\n<span class="comment">') + "</span>";
					})
					.replace(/.+/ig, '<li><span>$&</span><\/li>')
					.replace(/\n/ig,'') // Remove all line breaks;
				
				$ol = $('<ol class="pre">'+s+'<\/ol>').insertAfter(this);
				$('<br\/>').insertBefore(this);
				$('<button class="syntaxswitch" href="javascript:void(0);"><\/button>').toggle(function(){
					$(this).next('pre').hide().next('ol').show();
					this.innerHTML = 'Plain text';
				}, function(){
					$(this).next('pre').show().next('ol').hide();
					this.innerHTML = 'Decorated';
				}).insertBefore(this).trigger('click');
				
			});
		});