// App.build.js
// Put this in the build package of Sublime Text 2
/*
{
	"cmd": ["node", "${file_path:${folder}}/app.build.js", "$file_path"],
	"working_dir" : "${file_path:${folder}}"
}
*/

// Require IO operations
var fs = require('fs');

// Uglify-JS for compressing Javascript
var UglifyJS = require("uglify-js");

// Clean-CSS, exactly that
var cleanCSS = require("clean-css");


var scripts = [];


fs.readdirSync('./').forEach(function(name){
	if( name.match(/^jquery.*?\.js$/) && name !== "jquery.form.js" && name !== "jquery.editor.js" ){
		scripts.push(name);
	}
});

scripts.push('./jquery.form.js');


var unminifedJS = [],
	minifedJS = [];


scripts.forEach(function(name){
	unminifedJS.push( fs.readFileSync("./"+name, "utf8") );
	minifedJS.push( UglifyJS.minify("./"+name).code );
});

//
// Build Files
// 
var build = {
	"../dist/jquery.form.js" : unminifedJS.join('\n'),
	"../dist/jquery.form.min.js" : minifedJS.join('\n'),
	"../dist/jquery.form.css" : fs.readFileSync("./jquery.form.css", "utf8"),
	"../dist/jquery.form.min.css" : cleanCSS.process(fs.readFileSync("./jquery.form.css").toString()),
	"../dist/jquery.editor.js" : fs.readFileSync("./jquery.editor.js", "utf8"),
	"../dist/jquery.editor.min.js" : UglifyJS.minify("./jquery.editor.js").code,
	"../dist/jquery.editor.css" : fs.readFileSync("./jquery.editor.css", "utf8"),
	"../dist/jquery.editor.min.css" : cleanCSS.process(fs.readFileSync("./jquery.editor.css").toString())
};

for(var x in build){
	(function(name,code){
		fs.writeFile( name, code, function(err) {
			if(err) {
				console.log(err);
			} else {
				console.log(name + " created!");
			}
		});
	})(x, build[x]);
}