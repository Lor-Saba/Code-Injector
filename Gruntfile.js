module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

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
            dist: {
                expand: true,
                cwd: 'src',
                src: '**',
                dest: 'dist/',
            },
            readme: {
                expand: true,
                src: './README.md',
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
    grunt.registerTask('build', ['clean:dist', 'copy:dist', 'copy:readme', 'copy:monaco', 'sass:dist', 'clean:sass']);
    grunt.registerTask('zip', ['compress:dist']);

    // Task default
    grunt.registerTask('default', ['build']);

};


// node_modules/monaco-editor/min/vs

/*

npm install grunt --save-dev

https://gruntjs.com/plugins

https://github.com/gruntjs/grunt-contrib-compress
https://github.com/gruntjs/grunt-contrib-copy

*/
