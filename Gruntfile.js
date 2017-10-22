module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        watch: {
            html: {
                files: ['src/html/*'],
                tasks: ['copy:html'],
            },
            script: {
                files: ['src/script/*'],
                tasks: ['copy:script'],
            },
            style: {
                files: ['src/style/fonts/**', 
                        'src/style/images/**'],
                tasks: ['copy:style'],
            },
            sass: {
                files: ['src/style/*'],
                tasks: ['copy:sass', 'sass:dist', 'clean:sass'],
            },
            manifest: {
                files: ['src/manifest.json'],
                tasks: ['copy:manifest'],
            }
        },

        compress: {
            dist: {
                options: {
                    archive: 'code-injector.zip'
                },
                expand: true,
                cwd: 'dist/',
                src: ['**'],
                dest: '/'
            }
        },

        sass: {       
            options: { 
                style: 'compressed' ,
                sourcemap: 'none'
            },        
            dist: {  
                files:{ 
                    'dist/style/browser-action.min.css': 'src/style/browser-action.scss',
                    'dist/style/options-ui.min.css':     'src/style/options-ui.scss',
                }
            }
        },

        copy: {

            html: {
                expand: true,
                cwd: 'src/html',
                src: '**',
                dest: 'dist/html',
            },
            script: {
                expand: true,
                cwd: 'src/script',
                src: '**',
                dest: 'dist/script',
            },
            style: {
                expand: true,
                cwd: 'src/style',
                src: ['images/**', 'fonts/**'],
                dest: 'dist/style',
            },
            sass: {
                expand: true,
                cwd: 'src/style',
                src: '*',
                dest: 'dist/style',
            },
            manifest: {
                expand: true,
                cwd: 'src/',
                src: 'manifest.json',
                dest: 'dist/',
            },

            dist: {
                expand: true,
                cwd: 'src',
                src: '**',
                dest: 'dist/',
            },
            readme: {
                expand: true,
                src: 'README.md',
                dest: 'dist/',
            },
            monaco: {
                expand: true,
                cwd: './node_modules/monaco-editor/min/vs', 
                src: '**',
                dest: 'dist/script/vs',
            },
        },
        
        clean: {   
        	options: {
                force: true
            },
            dist: ['dist/'],
            sass: ['dist/style/*.scss']
        }
    });

    // Load the npm modules
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-clean');

    // Tasks
    grunt.registerTask('build', ['clean:dist', 'copy:dist', 'copy:monaco', 'sass:dist', 'clean:sass']);
    grunt.registerTask('dev', ['build','watch']);
    grunt.registerTask('zip', ['compress:dist']);

    // Task default
    grunt.registerTask('default', ['build']);

};

/*
    https://github.com/gruntjs/grunt-contrib-compress
    https://github.com/gruntjs/grunt-contrib-copy
    https://github.com/gruntjs/grunt-contrib-sass
    https://github.com/gruntjs/grunt-contrib-watch
    https://github.com/gruntjs/grunt-contrib-clean
*/