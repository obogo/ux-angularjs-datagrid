module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        banner: '/*\n' +
            '* <%= pkg.name %> v.<%= pkg.version %>\n' +
            '* (c) ' + new Date().getFullYear() + ', WebUX\n' +
            '* License: MIT.\n' +
            '*/\n',
        wrapStart: '(function(exports, global){\n',
        wrapEnd: '\n}(this.<%= pkg.packageName %> = this.<%= pkg.packageName %> || {}, function() {return this;}()));\n',
        jshint: {
            // define the files to lint
            files: ['src/**/*.js'],
            // configure JSHint (documented at http://www.jshint.com/docs/)
            options: {
                // more options here if you want to override JSHint defaults
                globals: {
//                    loopfunc: function (name) {} // uglify may have one too.
                }
            }
        },
        uglify: {
            build: {
                options: {
                    mangle: false,
                    compress: false,
                    preserveComments: 'some',
                    beautify: true,
                    banner: '<%= banner %><%= wrapStart %>',
                    footer: '<%= wrapEnd %>'
                },
                files: {
                    'build/angular-ux-<%= pkg.filename %>.js': [
                        'src/lib/*.js',
                        'src/core/Flow.js',
                        'src/ux-listView-config/*.js',
                        'src/ux-listView/*.js',
                        'src/core/addons/*.js',
                        'src/addons/*.js'
                    ]
                }
            },
            build_min: {
                options: {
                    report: 'gzip',
                    banner: '<%= banner %>'
                },
                files: {
                    'build/angular-ux-<%= pkg.filename %>.min.js': ['build/angular-ux-<%= pkg.filename %>.js']
                }
            }
        },
        compress: {
            main: {
                options: {
                    mode: 'gzip'
                },
                expand: true,
                src: ['build/<%= pkg.filename %>.js'],
                dest: ''
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-compress');

    // Default task(s).
//    grunt.registerTask('default', ['jshint', 'uglify', 'compress']);
    grunt.registerTask('default', ['jshint', 'uglify']);

};