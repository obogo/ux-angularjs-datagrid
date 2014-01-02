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
        // automatically adds injections to angular for you.
//        ngmin: {
//            app: {
//                src: [
//                    "*.*"
//                ],
//                dest: "generated/angular-ux-datagrid.js"
//            }
//        },
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
                        'src/ux-datagrid-config.js',
                        'src/lib/*.js',
                        'src/core/Flow.js',
                        'src/ux-datagrid.js',
                        'src/core/addons/*.js'
                    ],
                    'build/addons/desktop/ux-<%= pkg.filename %>-focusManager.js': [
                        'src/addons/libs/ux-visibility.js',
                        'src/addons/libs/ux-selector.js',
                        'src/addons/desktop/gridFocusManager.js'
                    ],
                    'build/addons/desktop/ux-<%= pkg.filename %>-disableHoverWhileScrolling.js': [
                        'src/addons/desktop/disableHoverWhileScrolling.js'
                    ],
                    'build/addons/touch/ios/ux-<%= pkg.filename %>-iosScroll.js': [
                        'src/addons/libs/VirtualScroll.js',
                        'src/addons/touch/ios/iosScroll.js'
                    ],
                    'build/addons/ux-<%= pkg.filename %>-expandRows.js': [
                        'src/addons/expandRows.js'
                    ],
                    'build/addons/ux-<%= pkg.filename %>-infiniteScroll.js': [
                        'src/addons/infiniteScroll.js'
                    ],
                    'build/addons/ux-<%= pkg.filename %>-statsModel.js': [
                        'src/addons/statsModel.js'
                    ],
                    'build/addons/ux-<%= pkg.filename %>-windowScroll.js': [
                        'src/addons/windowScroll.js'
                    ],
                    'build/other/ux-doubleScroll.js': [
                        'src/other/doubleScroll.js'
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
        //https://github.com/gruntjs/grunt-contrib-watch
        watch: {
            scripts: {
                files: 'src/**/*.js',
                tasks: ['jshint', 'uglify'],
                options: {
                    spawn: false,
                    debounceDelay: 1000
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
    grunt.loadNpmTasks('grunt-ngmin');
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Default task(s).
//    grunt.registerTask('default', ['jshint', 'uglify', 'compress']);
    grunt.registerTask('default', ['jshint', 'uglify']);

};