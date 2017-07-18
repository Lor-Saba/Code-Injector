module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        compress: {
            main: {
                options: {
                    mode: 'zip'
                },
                expand: true,
                cwd: 'dist/',
                src: ['**'],
                dest: '/'
            }
        },

        copy: {
            dist: {
                expand: true,
                src: [  
                    './browser_action/**', 
                    './icons/default/*', 
                    './options_ui/**',
                    './browser-polyfill.min.js',
                    './inject.js',
                    './main.js',
                    './LICENSE',
                    './manifest.json',
                    './README.md'
                ], 
                dest: 'DIST/',
            },
        }
    });

    // Load the npm plugins
    grunt.loadNpmTasks('grunt-contrib-compress');
    grunt.loadNpmTasks('grunt-contrib-copy');

    // Tasks.
    grunt.registerTask('default', ['copy:dist']);

};


// node_modules/monaco-editor/min/vs

/*

npm install grunt --save-dev

https://gruntjs.com/plugins

https://github.com/gruntjs/grunt-contrib-compress
https://github.com/gruntjs/grunt-contrib-copy

*/
