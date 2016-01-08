module.exports = function (grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        banner: '/*!\n' +
            '* <%= pkg.name %> v.<%= pkg.version %>\n' +
            '* (c) ' + new Date().getFullYear() + ', Obogo\n' +
            '* https://github.com/obogo/ux-angularjs-datagrid\n' +
            '* License: MIT.\n' +
            '*/\n',
        wrapStart: '(function (exports, global) {\nif (typeof define === "function" && define.amd) {\n  define(exports);\n} else if (typeof module !== "undefined" && module.exports) {\n  module.exports = exports;\n} else {\n  global.<%= pkg.packageName %> = exports;\n}\n\n',
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
        compile: {
            catcher: {
                banner: "<%= banner %>",
                wrap: 'util',
                build: 'util/hb/build',
                filename: 'hb',
                scripts: {
                    import: ['dg.api'],
                    src: ['util/hb/src/**/*.js']
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
                        'util/hb/build/util/hb.js',
                        'src/errors/dev-errors.js',
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
                    'build/latest/addons/ux-<%= pkg.filename %>-collapsibleGroups.js': [
                        'src/addons/collapsibleGroups.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-expandableGroups.js': [
                        'src/addons/expandableGroups.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-expandRows.js': [
                        'src/addons/expandRows.js'
                    ],
//                    'build/latest/addons/ux-<%= pkg.filename %>-findInList.js': [
//                        'src/addons/findInList.js'
//                    ],
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
                    'build/latest/addons/ux-<%= pkg.filename %>-memoryOptimizer.js': [
                        'src/addons/memoryOptimizer.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-scrollBar.js': [
                        'src/addons/scrollBar.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-scrollBounce.js': [
                        'src/addons/scrollBounce.js'
                    ],
                    'build/latest/other/ux-doubleScroll.js': [
                        'src/other/doubleScroll.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-dragRows.js': [
                        'src/addons/dragRows.js'
                    ]
                }
            },
            build_min: {
                options: {
                    report: 'gzip',
                    mangle: true,
                    compress: {},
                    preserveComments: 'none',
                    sourceMap: true,
                    sourceMapIncludeSources: true,
                    banner: '<%= banner %><%= wrapStart %>',
                    footer: '<%= wrapEnd %>'
                },
                files: {
                    'build/latest/angular-ux-<%= pkg.filename %>.min.js': [
                        'util/hb/build/util/hb.js',
                        'src/errors/prod-errors.js',
                        'src/ux-datagrid-config.js',
                        'src/lib/*.js',
                        'src/core/logWrapper.js',
                        'src/core/Flow.js',
                        'src/ux-datagrid.js',
                        'src/core/addons/*.js'
                    ],
                    'build/latest/addons/desktop/ux-<%= pkg.filename %>-focusManager.min.js': [
                        'src/addons/libs/ux-visibility.js',
                        'src/addons/libs/ux-selector.js',
                        'src/addons/desktop/gridFocusManager.js'
                    ],
                    'build/latest/addons/desktop/ux-<%= pkg.filename %>-disableHoverWhileScrolling.min.js': [
                        'src/addons/desktop/disableHoverWhileScrolling.js'
                    ],
                    'build/latest/addons/touch/ux-<%= pkg.filename %>-iscroll.min.js': [
                        'src/addons/touch/iScrollAddon.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-collapsibleGroups.min.js': [
                        'src/addons/collapsibleGroups.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-expandableGroups.min.js': [
                        'src/addons/expandableGroups.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-expandRows.min.js': [
                        'src/addons/expandRows.js'
                    ],
//                    'build/latest/addons/ux-<%= pkg.filename %>-findInList.min.js': [
//                        'src/addons/findInList.js'
//                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-gridLogger.min.js': [
                        'src/addons/gridLogger.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-infiniteScroll.min.js': [
                        'src/addons/infiniteScroll.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-scrollHistory.min.js': [
                        'src/addons/scrollHistory.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-sortModel.min.js': [
                        'src/addons/sortModel.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-statsModel.min.js': [
                        'src/addons/statsModel.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-windowScroll.min.js': [
                        'src/addons/windowScroll.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-memoryOptimizer.min.js': [
                        'src/addons/memoryOptimizer.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-scrollBar.min.js': [
                        'src/addons/scrollBar.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-scrollBounce.min.js': [
                        'src/addons/scrollBounce.js'
                    ],
                    'build/latest/other/ux-doubleScroll.min.js': [
                        'src/other/doubleScroll.js'
                    ],
                    'build/latest/addons/ux-<%= pkg.filename %>-dragRows.min.js': [
                        'src/addons/dragRows.js'
                    ]
                }
            }
        },
        replace: {
            build: {
                options: {
                    patterns: [
                        {
                            match: 'version',
                            replacement: '<%= pkg.version %>'
                        }
                    ]
                },
                files: [
                    {
                        expand: true,
                        flatten: true,
                        src: ['build/latest/*.js'],
                        dest: 'build/latest/'
                    }
                ]
            },
            hb: {
                options: {
                    patterns: [
                        //{
                        //    match: /("|')(~)\1/,
                        //    replacement: '$1dg$1'
                        //},
                        {
                            match: /(\s{4}return\s)this;/,
                            replacement: '$1exports;'
                        }
                    ]
                },
                files: [
                    {
                        expand: true,
                        flatten: true,
                        src: 'util/hb/build/hb.js',
                        dest: 'util/hb/build/util'
                    }
                ]
            }
        },
//        copy: {
//            main: {
//                files: [
//                    // include files withing path
//                    {expand: true, cwd: 'build/latest/', src: ['**'], dest: 'build/v<%= pkg.version %>/'}
//                ]
//            }
//        },
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
        },
        jasmine: {
            min: {
                src: ['vendor/angular.js', 'vendor/angular-mocks.js', 'build/latest/angular-ux-datagrid.min.js', 'build/latest/addons/**/*.min.js', 'build/latest/other/**/*.min.js'],
                options: {
                    specs: 'test/unit/tests/**/*.js'
                }
            },
            dev: {
                src: ['vendor/angular.js', 'vendor/angular-mocks.js', 'build/latest/angular-ux-datagrid.js', '!build/latest/addons/**/*.min.js', 'build/latest/addons/**/*.js', '!build/latest/other/**/*.min.js', 'build/latest/other/**/*.js'],
                options: {
                    specs: 'test/unit/tests/**/*.js'
                }
            }
        }
    });

    // Load the plugin that provides the "uglify" task.
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-replace');
    grunt.loadNpmTasks('grunt-contrib-jasmine');
    grunt.loadNpmTasks('hbjs');

    // Default task(s).
//    grunt.registerTask('default', ['jshint', 'uglify', 'compress']);
    grunt.registerTask('hb', ['compile', 'replace:hb']);
    grunt.registerTask('default', ['jshint', 'hb', 'uglify', 'replace:build']);
    grunt.registerTask('integrate', ['jasmine']);
    grunt.registerTask('test', ['default', 'jasmine:min']);
    grunt.registerTask('test-dev', ['default', 'jasmine:dev']);
    grunt.registerTask('release', ['jshint', 'hb', 'uglify', 'replace:build', 'jasmine:min']);

};
