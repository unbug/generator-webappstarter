var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var fs = require('fs');

var gulp = require('gulp');
var source = require('vinyl-source-stream');
var through2 = require('through2');
var $ = require('gulp-load-plugins')();
var del = require('del');
var pem = require('pem');
var rsync = require('rsync');
var pngquant = require('imagemin-pngquant');
var sprite = require('css-sprite').stream;
var runSequence = require('run-sequence');
var browserSync = require('browser-sync');//http://www.browsersync.io/docs/gulp/
var reload = browserSync.reload;
var pagespeed = require('psi');
var cachebust = new $.cachebust();
require('date-utils');

//values
var conf = require('./package.json');
var projectName = conf.name;
//not available project names
var notAvailableNames = conf.project.invalidNames;
if (notAvailableNames.split('|').indexOf(projectName) != -1) {
  console.log('\n"' + notAvailableNames + '" are not available project names!\n');
  return;
}
var title = conf.project.title || conf.name;
var viewport = conf.project.viewport || 'device-width';
var globalVersion = conf.version;
var distPath = './dist/';
var distProjectPath = distPath + projectName;
var sourceImg = conf.project.sourceImg;//source images path to copy to this project
var sourceSprites = conf.project.sourceSprites;//source images path to generate sprites

//build version:
//script version
//style version
//manifest version
var startTime = 0;
var buildVersion = 0;
gulp.task('build_version', function (cb) {
  var startDate = new Date();
  startTime = startDate.getTime();
  buildVersion = startDate.toFormat('YYYYMMDDHHMISS');

  cb();
});

//copy source images to "/resources/images"
gulp.task('copy:source_imgs', function () {
  return gulp.src([sourceImg])
    .pipe(gulp.dest('./resources/images'))
    .pipe($.size({title: 'copy source images'}));
});

//generate sprites.png and _debug-sprites.scss
gulp.task('sprites', function () {
  return gulp.src(sourceSprites)
    .pipe(sprite({
      name: 'sprites',
      style: '_debug-sprites.scss',
      cssPath: '../images/',
      processor: 'css'
    }))
    .pipe($.if('*.png', gulp.dest('./resources/images/'), gulp.dest('./scss/')))
    .pipe($.size({title: 'sprites'}));
});

//clear
//clear images
gulp.task('clean:images', function (cb) {
  del(['./resources/images/*'], {force: true}, cb);
});
//clear dist folder
gulp.task('clean:dist', function (cb) {
  del([distPath + '*'], {force: true}, cb);
});

//watching script change to start default task
gulp.task('watch', function () {
  return gulp.watch([
    'gulpfile.js', 'src/**/*.js', '!src/app.js',
    'scss/**/*.scss',
    'html/site/**/*.html'
  ], function (event) {
    console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
    if (/.*\.js$/.test(event.path)) {
      //jshint
      conf.project.watchJshint && gulp.src(event.path)
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish'));

      runSequence('requirejs');
    }
    else if (/.*\.scss$/.test(event.path)) {
      //scsslint
      //https://github.com/noahmiller/gulp-scsslint
      conf.project.watchScsslint && gulp.src(event.path)
        .pipe($.scsslint())
        .pipe($.scsslint.reporter());

      runSequence('sass');
    }
    else if (/.*\.html$/.test(event.path)) {
      runSequence('include:debug');
    }
    runSequence('build_version','manifest');
  });

});

//compile sass files
var AUTOPREFIXER_BROWSERS = [
  'ie >= 10',
  'ie_mob >= 10',
  'ff >= 30',
  'chrome >= 34',
  'safari >= 7',
  'opera >= 23',
  'ios >= 7',
  'android >= 4.4',
  'bb >= 10'
];
gulp.task('sass', function (cb) {
  gulp.src(['./scss/*.scss'], {buffer: true})
    .pipe($.replace(/_VIEWPORT_WIDTH_/g, conf.project.viewport || 640))
    .pipe(gulp.dest('./.scss'))//fix replace not working
    .on('end', function () {
      gulp.src(['./.scss/*.scss'], {buffer: true})
        .pipe($.sourcemaps.init())
        .pipe($.sass({errLogToConsole: true}))
        .pipe($.sourcemaps.write())
        .pipe($.cached('build-cache', {
          optimizeMemory: true
        }))
        .pipe($.autoprefixer({browsers: AUTOPREFIXER_BROWSERS}))
        .pipe(gulp.dest('./resources/css/'))
        .on('end', function () {
          del(['./.scss'], {force: true});
          cb();
        });
    });
});

//compress css to dist
gulp.task('cssmin', function () {
  return gulp.src('./resources/**/*.css')
    .pipe(cachebust.references())
    .pipe($.csso())
    .pipe(cachebust.resources())
    .pipe(gulp.dest(distProjectPath + '/resources'))
    .pipe($.size({title: 'cssmin'}));
});

//compile requirejs modules
//https://github.com/RobinThrift/gulp-requirejs/issues/5
//npm install git://github.com/bleadof/gulp-requirejs#end-stream-and-emit-error --save-dev
gulp.task('requirejs', function (cb) {
  var files = [];
  //enable manifest
  if(conf.project.manifest){
    files.push('util/AppCache.js');
  }
  files.push('app/App.js');
  return $.requirejs({
    baseUrl: './src',
    include: files,
    insertRequire: ['app/App.js'],
    out: 'app.js',
    optimize: 'none',
    name: 'almond',
    wrap: true
  })
    .pipe(through2.obj(function (file, enc, next) {
      this.push(file);
      this.end();
      next();
    }))
    .pipe($.cached('build-cache', {
      optimizeMemory: true
    }))
    .pipe(gulp.dest('./src/'));
});

//compress js to dist
gulp.task('uglifyjs', function () {
  var files = [];
  //enable manifest
  if(conf.project.manifest){
    files.push('util/AppCache.js');
  }
  files.push('app/App.js');
  return $.requirejs({
    baseUrl: './src',
    include: files,
    out: 'app.js',
    optimize: 'none',
    wrap: true
  })
    .pipe(through2.obj(function (file, enc, next) {
      this.push(file);
      this.end();
      next();
    }))
    .pipe($.amdclean.gulp({
      'prefixMode': 'standard'
    }))
    //remove //_DEBUG_ in files,
    //such as: "///_DEBUG_*Todo: debug actions //*/ "
    //will become "/*Todo: debug actions //*/",so uglify could remove all comments
    .pipe($.replace(/\/\/_DEBUG_/g, ''))
    .pipe(cachebust.references())
    .pipe($.uglify())
    .pipe(cachebust.resources())
    .pipe(gulp.dest(distProjectPath + '/src/'))
    .pipe($.size({title: 'uglifyjs'}));
});


//generate cache.manifest
gulp.task('manifest', function (cb) {
  var resources = ['src/app.js'];
  gulp.src(['./resources/**/*.*'])
    .pipe(through2.obj(function (file, enc, next) {
      this.push(file.path.replace(__dirname+'/',''));
      next();
    }))
    .on('data', function (data) {
      resources.push(data)
    })
    .on('end', function () {
      gulp.src(['./html/site/include/cache.manifest'])
        .pipe($.replace(/_BUILD_VERSION_/g, buildVersion))
        .pipe($.replace(/_GLOBAL_VERSION_/g, globalVersion))
        .pipe($.replace(/_FILES_/g, resources.join('\n')))
        .pipe(gulp.dest('./'))
        .on('end', function () {
          cb();
        });
    });
});

//compile html files
gulp.task('include:debug', function () {
  return gulp.src(['./html/site/debug/*.html'])
    .pipe($.fileInclude({
      basepath: './html/site/'
    }))
    .pipe($.cached('build-cache', {
      optimizeMemory: true
    }))
    .pipe($.replace(/_BUILD_VERSION_/g, buildVersion))
    .pipe($.replace(/_GLOBAL_VERSION_/g, globalVersion))
    .pipe($.replace(/_VIEWPORT_WIDTH_/g, viewport))
    .pipe($.replace(/_TITLE_/g, title))
    .pipe($.replace(/_MANIFEST_/g, conf.project.manifest?'manifest="cache.manifest"':''))
    .pipe(gulp.dest('./'));
});
//compress html to dist
gulp.task('includes:official', function () {
  return gulp.src(['html/site/official/*.html'])
    .pipe($.fileInclude({
      basepath: './html/site/'
    }))
    .pipe($.replace(/_BUILD_VERSION_/g, buildVersion))
    .pipe($.replace(/_GLOBAL_VERSION_/g, globalVersion))
    .pipe($.replace(/_VIEWPORT_WIDTH_/g, viewport))
    .pipe($.replace(/_TITLE_/g, title))
    .pipe($.replace(/_MANIFEST_/g, conf.project.manifest?'manifest="cache.manifest"':''))
    .pipe(cachebust.references())
    .pipe($.minifyHtml({
      empty: true,
      cdata: true,
      conditionals: true,
      spare: true,
      quotes: true
    }))
    .pipe(gulp.dest(distProjectPath))
    .pipe($.size({title: 'html'}));
});

//copy resources to "/dist/resources/"
gulp.task('dist:resources', function () {
  return gulp.src('./resources/**/*.*')
    .pipe(gulp.dest(distProjectPath + '/resources/'))
    .pipe($.size({title: 'copy resources'}));
});

//compress images to dist
gulp.task('dist:images', function (cb) {
  return gulp.src(['./resources/**/*.*g'])
    .pipe($.imagemin({
      use: [pngquant()]
    }))
    .pipe(cachebust.resources())
    .pipe(gulp.dest(distProjectPath + '/resources/'))
    .pipe($.size({title: 'images'}));
});
//copy cache.manifest to dist
gulp.task('dist:manifest', function () {
  return gulp.src('./cache.manifest')
    .pipe(cachebust.references())
    .pipe(gulp.dest(distProjectPath + '/'))
    .pipe($.size({title: 'manifest'}));
});
//deploy to test server
//view http://office.mozat.com:8081/m/PROJECTNAME/
gulp.task('deploy:test', function (cb) {
  pem.createCertificate({}, function (err, kyes) {
    gulp.src(distPath + '**/*')
      .pipe($.sftp({
        host: '172.28.2.62',
        port: 22,
        auth: 'testServer',
        key: kyes.clientKey,
        keyContents: kyes.keyContents,
        remotePath: '/home/gaolu/m/'
      }, cb));
  });
});

//deploy to offical server
//view http://m.deja.me/PROJECTNAME/
gulp.task('deploy:offical', function (cb) {
  //set rsync proxy
  process.env.RSYNC_PROXY = 'proxy.lan:8080';
  var client = new rsync()
    .executable('rsync')
    .flags('azv')
    .source(distPath)
    .destination('rsync://10.160.241.153/m.deja.me/');

  client.execute(function (error, code, cmd) {
    console.log('\t' + cmd);
    //reset rsync proxy
    process.env.RSYNC_PROXY = '';
    cb();
  });
});
//deploy to offical server
//view http://m.deja.me/PROJECTNAME/
// deploy guide
// 1. get rsync's port
// grep rsync /etc/services
// 2. open tunnel
// sudo ssh -N -L 127.0.0.1:873:10.160.241.153:873 tunnel@ssh.mozat.com
gulp.task('_deploy:offical', function (cb) {
  //set rsync proxy
  var client = new rsync()
    .executable('rsync')
    .flags('azv')
    .source(distPath)
    .destination('rsync://localhost/m.deja.me/');

  client.execute(function (error, code, cmd) {
    console.log('\t' + cmd);
    //reset rsync proxy
    process.env.RSYNC_PROXY = '';
    cb();
  });
});

// Lint JavaScript
gulp.task('jshint', function () {
  return gulp.src(['./src/**/*.js', '!./src/*.js', '!./src/lib/zepto.js'])
    .pipe(reload({stream: true, once: true}))
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'))
    .pipe($.if(!browserSync.active, $.jshint.reporter('fail')));
});

//browser-sync serve
var browserSyncOptions = conf.project.browserSync || {};
gulp.task('serve', function () {
  browserSync(browserSyncOptions);

  gulp.watch(['./*.html'], reload);
  gulp.watch(['./*.manifest'], reload);
  gulp.watch(['./src/*.js'], reload);
  gulp.watch(['./resources/**/*.css'], reload);
  gulp.watch(['./resources/**/*.*g'], reload);
});

// Run PageSpeed Insights
gulp.task('pagespeed', function (cb) {
  // By default we use the PageSpeed Insights free (no API key) tier.
  // Use a Google Developer API key if you have one: http://goo.gl/RkN0vE
  // key: 'YOUR_API_KEY'
  pagespeed.output(conf.project.pagespeed.url, conf.project.pagespeed.options, function (err, data) {
    cb();
  });
});

//print after tasks all done
gulp.task('_endlog', function (cb) {
  var endDate = new Date();
  var logs = [];
  logs.push('\nBuild version is ' + buildVersion);
  logs.push(', Completed in ' + ((endDate.getTime() - startTime) / 1000) + 's at ' + endDate + '\n');
  console.log(logs.join(''));
  cb();
});

function handleError(err) {
  console.log(err.toString());
  this.emit('end');
}

//task queues
gulp.task('copy', function (cb) {
  runSequence('clean:images', 'copy:source_imgs', 'sprites', cb);
});
gulp.task('prepare', function (cb) {
  runSequence('build_version', cb);
});
gulp.task('compile', function (cb) {
  runSequence(['sass', 'requirejs', 'manifest', 'include:debug'], cb);
});
gulp.task('dist', function (cb) {
  runSequence('clean:dist', 'build_version', 'dist:resources', 'dist:images', 'cssmin', 'uglifyjs', 'manifest', 'dist:manifest','includes:official', '_endlog', cb);
});
gulp.task('default', function (cb) {
  runSequence('prepare', 'compile', 'watch', 'serve', cb);
});

//deploy to test server
gulp.task('deploytest', function (cb) {
  runSequence('dist', 'deploy:test', cb);
});
//deploy to offical server
gulp.task('deploy', function (cb) {
  runSequence('dist', 'deploy:offical', cb);
});
//deploy to offical server
gulp.task('deployrc', function (cb) {
  distProjectPath = distProjectPath +'_rc';
  runSequence('deploy', cb);
});
//deploy to offical server from home
gulp.task('_deploy', function (cb) {
  runSequence('dist', '_deploy:offical', cb);
});
gulp.task('_deployrc', function (cb) {
  distProjectPath = distProjectPath +'_rc';
  runSequence('_deploy', cb);
});
