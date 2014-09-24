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
                                return grunt.file.read('examples/' + p1 + '/ex.html') + "\n\
                                <link rel=\"stylesheet\" type=\"text/css\" href=\"examples/" + p1 + "/ex.css\">\n\
                                <script src=\"examples/" + p1 + "/ex.js\"></script>";
                            }
                        }
                    ]
                },
                files: [
                    {
                        expand: false,
                        flatten: false,
                        src: ['index.tpl.html'],
                        dest: '../index.html'
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