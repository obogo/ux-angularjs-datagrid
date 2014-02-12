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
                    preserveComments: 'all',
                    beautify: true,
                    banner: '<%= banner %><%= wrapStart %>',
                    footer: '<%= wrapEnd %>'
                },
                files: {
                    'build/latest/angular-ux-<%= pkg.filename %>.js': [
                        'src/ux-datagrid-config.js',
                        'src/lib/*.js',
                        'src/core/logWrapper.js',
                        'src/core/Flow.js',
                        'src/ux-datagrid.js',
                        'src/core/addons/*.js'
                    ],
                    'build/latest/addons/desktop/ux-<%= pkg.filename %>-focusManager.js': [
                        'src/addons/libs/ux-visibility.js',
                        'src/addons/libs/ux-selector.js',
                        'src/addons/desktop/gridFocusManager.js'
                    ],
                    'build/latest/addons/desktop/ux-<%= pkg.filename %>-disableHoverWhileScrolling.js': [
                        'src/addons/desktop/disableHoverWhileScrolling.js'
                    ],
                    'build/latest/addons/touch/ux-<%= pkg.filename %>-iscroll.js': [
                        'src/addons/touch/iScrollAddon.js'
                    ],
                    'build/latest/addons/touch/ios/ux-<%= pkg.filename %>-iosScroll.js': [
                        'src/addons/libs/VirtualScroll.js',
                        'src/addons/touch/ios/iosScroll.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-collapsibleGroups.js': [
                        'src/addons/collapsibleGroups.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-expandRows.js': [
                        'src/addons/expandRows.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-findInList.js': [
                        'src/addons/findInList.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-gridLogger.js': [
                        'src/addons/gridLogger.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-infiniteScroll.js': [
                        'src/addons/infiniteScroll.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-scrollHistory.js': [
                        'src/addons/scrollHistory.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-sortModel.js': [
                        'src/addons/sortModel.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-statsModel.js': [
                        'src/addons/statsModel.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-windowScroll.js': [
                        'src/addons/windowScroll.js'
                    ],
                    'build/latest/other/ux-doubleScroll.js': [
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
                    'build/latest/angular-ux-<%= pkg.filename %>.min.js': ['build/latest/angular-ux-<%= pkg.filename %>.js']
                }
            }
        },
        copy: {
            main: {
                files: [
                    // include files withing path
                    {expand: true, cwd: 'build/latest/', src: ['**'], dest: 'build/v<%= pkg.version %>/'}
                ]
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
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Default task(s).
//    grunt.registerTask('default', ['jshint', 'uglify', 'compress']);
    grunt.registerTask('default', ['jshint', 'uglify', 'copy']);

};