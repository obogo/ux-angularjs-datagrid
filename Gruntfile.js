module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        banner: '/*\n' +
            '* <%= pkg.name %> v.<%= pkg.version %>\n' +
            '* (c) ' + new Date().getFullYear() + ', WebUX\n' +
            '* https://github.com/webux/ux-angularjs-datagrid\n' +
            '* License: MIT.\n' +
            '*/\n',
        wrapStart: '(function(exports, global){\n',
        wrapEnd: '\n}(this.<%= pkg.packageName %> = this.<%= pkg.packageName %> || {}, function() {return this;}()));\n',
        jshint: {
            // define the files to lint
            files: ['examples/**/*.js'],
            // configure JSHint (documented at http://www.jshint.com/docs/)
            options: {
                // more options here if you want to override JSHint defaults
                globals: {
//                    loopfunc: function (name) {} // uglify may have one too.
                }
            }
        },
        replace: {
            build: {
                options: {
                    patterns: [
                        {
                            match: /\#{2}(\w+)\#{2}/g,
                            replacement: function(match, p1) {
                                // look up the file and write it.
                                var content =  grunt.file.read('examples/' + p1 + '/ex.html') + "\n\
                                <link rel=\"stylesheet\" type=\"text/css\" href=\"examples/" + p1 + "/ex.css\">\n\
                                <script src=\"examples/" + p1 + "/ex.js\"></script>";

                                if (content.indexOf('##html##') !== -1) {
                                    var html = content.split("\n");
                                    var i = 0, len = html.length, matching = false, match = [];
                                    while (i < len) {
                                        // turn it off before the comment.
                                        if (html[i].indexOf("html:end") !== -1) {
                                            matching = false;
                                        }
                                        if (matching) {
                                            match.push(html[i]);
                                        }
                                        // don't set until after he comment.
                                        if (html[i].indexOf("html:start") !== -1) {
                                            matching = true;
                                        }
                                        i += 1;
                                    }
                                    grunt.log.writeln(("Found " + p1 + " " + match.length + " lines for html/template").green);
                                    content = content.split('##html##').join(match.join("\n").replace(/</gim, '&lt;'));
                                }

                                if (content.indexOf('##css##') !== -1) {
                                    content = content.split('##css##').join(grunt.file.read('examples/' + p1 + '/ex.css'));
                                }

                                if (content.indexOf('##js##') !== -1) {
                                    content = content.split('##js##').join(grunt.file.read('examples/' + p1 + '/ex.js').replace(/(.*?\/\/ignore\s?\n)/g, '').replace(/^\s{4}/gmi, ''));
                                }

                                return content;
                            }
                        }
                    ]
                },
                files: [
                    {
                        expand: false,
                        flatten: false,
                        src: ['index.tpl.html'],
                        dest: 'index.html'
                    }
                ]
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-replace');

    // Default task(s).
//    grunt.registerTask('default', ['jshint', 'uglify', 'compress']);
    grunt.registerTask('default', ['jshint', 'replace']);

};