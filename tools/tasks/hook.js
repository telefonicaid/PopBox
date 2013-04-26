module.exports = function(grunt) {

  /**
   * Symlink hooks to git
   *
   * Usage: hook:<hook-name> will symlink the hook script <hook-name> in .hooks to .git/hooks/<hook-name>
   *
   * Example: hook:pre-commit
   *
   * @author: javier@tid.es
   *
   */
  grunt.registerTask('hook', 'Initialize dev environment.', function(hook) {
    if (!hook){
      grunt.fail.fatal('Hook name required');
    }

    var fs = require('fs');
    var done = this.async();

    fs.symlink('./tools/hooks/' + hook, '.git/hooks/' + hook, function(e) {
      if (!e) {
        grunt.log.ok('Hook "' + hook + '" installed.');
      }
      done();
    });
  });
};
