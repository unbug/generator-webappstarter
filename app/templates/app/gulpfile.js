var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var fs = require('fs');
var path = require('path');

var gulp = require('gulp');
var source = require('vinyl-source-stream');
var through2 = require('through2');
var $ = require('gulp-load-plugins')();
var del = require('del');
var pem = require('pem');
var rsync = require('rsync');
var sprity = require('sprity');
var pngquant = require('imagemin-pngquant');
var runSequence = require('run-sequence');
var browserSync = require('browser-sync').create();//http://www.browsersync.io/docs/gulp/
var pagespeed = require('psi');
var cachebust = new $.cachebust();
var webpackStream = require("webpack-stream");
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
var isBuild = false;

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

//clear images
gulp.task('clean:images', function (cb) {
  del(['./resources/images/*'], {force: true}, cb);
});

//copy source images to "/resources/images"
gulp.task('copy:source_imgs', function () {
  return gulp.src([sourceImg])
    .pipe(gulp.dest('./resources/images'))
    .pipe($.size({title: 'copy source images'}));
});

//generate sprites.png and _debug-sprites.scss
gulp.task('sprites', function () {
  return sprity.src({
      src: sourceSprites,
      name: 'sprites',
      style: '_sprites.scss',
      cssPath: '../images/',
      processor: 'css'
    })
    .pipe($.if('*.png', gulp.dest('./resources/images/'), gulp.dest('./scss/')))
    .pipe($.size({title: 'sprites'}));
});

//watching script change to start default task
gulp.task('watch', function () {
  return gulp.watch([
    'src/**/*.js', '!src/app.js',
    'scss/**/*.scss',
    'html/**/*.html'
  ], function (event) {
    console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
    var tasks = ['prepare'];
    if (/.*\.js$/.test(event.path)) {
      //jshint
      conf.project.watchJshint && gulp.src(event.path)
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish'));

      tasks.push('webpackjs');
    }
    else if (/.*\.scss$/.test(event.path)) {
      //scsslint
      //https://github.com/noahmiller/gulp-scsslint
      conf.project.watchScsslint && gulp.src(event.path)
        .pipe($.scsslint())
        .pipe($.scsslint.reporter());

      tasks.push('sass');
    }
    else if (/.*\.html$/.test(event.path)) {
      tasks.push('html');
    }
    tasks.push('manifest');
    runSequence.apply(null,tasks);
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
  gulp.src(['./scss/**/*.scss'], {buffer: true})
    .pipe($.replace(/_VIEWPORT_WIDTH_/g, viewport == 'device-width'?'100%': viewport+'px'))
    .pipe(gulp.dest('./.scss'))//fix replace not working
    .on('end', function () {
      gulp.src(['./.scss/**/*.scss'], {buffer: true})
        .pipe($.sourcemaps.init())
        .pipe($.sass({errLogToConsole: true}))
        .pipe($.cached('sass-cache', {
          optimizeMemory: true
        }))
        .pipe($.autoprefixer({browsers: AUTOPREFIXER_BROWSERS}))
        .pipe($.sourcemaps.write())
        .pipe(gulp.dest('./resources/css/'))
        .on('end', function () {
          del(['./.scss'], {force: true});
          cb();
        });
    });
});

//compile js files
var webpackConfig = require('./webpack.config');
gulp.task('webpackjs', function() {
  return gulp.src(['./src/**/*.js'])
    .pipe($.cached('webpackjs-cache', {
      optimizeMemory: true
    }))
    .pipe(webpackStream(webpackConfig[isBuild?'build':'dev']))
    .pipe(gulp.dest('./src'));
});

//compile html files
gulp.task('html', function () {
  return gulp.src(['./html/debug/*.html'])
    .pipe($.fileInclude({
      basepath: './html/'
    }))
    .pipe($.cached('html-cache', {
      optimizeMemory: true
    }))
    .pipe($.replace(/_BUILD_VERSION_/g, buildVersion))
    .pipe($.replace(/_GLOBAL_VERSION_/g, globalVersion))
    .pipe($.replace(/_VIEWPORT_WIDTH_/g, viewport))
    .pipe($.replace(/_TITLE_/g, title))
    .pipe($.replace(/_MANIFEST_/g, conf.project.manifest?'manifest="cache.manifest"':''))
    .pipe(gulp.dest('./'));
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
      gulp.src(['./html/include/cache.manifest'])
        .pipe($.replace(/_BUILD_VERSION_/g, buildVersion))
        .pipe($.replace(/_GLOBAL_VERSION_/g, globalVersion))
        .pipe($.replace(/_FILES_/g, resources.join('\n')))
        .pipe(gulp.dest('./'))
        .on('end', function () {
          cb();
        });
    });
});

//clear dist folder
gulp.task('clean:dist', function (cb) {
  del([distPath + '*'], {force: true}, cb);
});

//copy resources to "/dist/resources/"
gulp.task('dist:resources', function () {
  return gulp.src('./resources/**/*.*')
    .pipe(gulp.dest(distProjectPath + '/resources/'))
    .pipe($.size({title: 'dist:resources'}));
});

//compress images to dist
gulp.task('dist:images', function () {
  return gulp.src(['./resources/**/*.*g'])
    .pipe($.imagemin({
      use: [pngquant()]
    }))
    .pipe(cachebust.resources())
    .pipe(gulp.dest(distProjectPath + '/resources/'))
    .pipe($.size({title: 'dist:images'}));
});

//compress css to dist
gulp.task('dist:css', function () {
  return gulp.src('./resources/**/*.css')
    .pipe(cachebust.references())
    .pipe($.csso())
    .pipe(cachebust.resources())
    .pipe(gulp.dest(distProjectPath + '/resources'))
    .pipe($.size({title: 'dist:css'}));
});

//compress js to dist
gulp.task('dist:js', function () {
  return gulp.src(['./src/app.js'])
    //remove //_DEBUG_ in files,
    //such as: "///_DEBUG_*Todo: debug actions //*/ "
    //will become "/*Todo: debug actions //*/",so uglify could remove all comments
    .pipe($.replace(/\/\/_DEBUG_/g, ''))
    .pipe(cachebust.references())
    .pipe($.uglify())
    .pipe(cachebust.resources())
    .pipe(gulp.dest(distProjectPath + '/src/'))
    .pipe($.size({title: 'dist:js'}));
});

//compress html to dist
gulp.task('dist:html', function () {
  return gulp.src(['html/official/*.html'])
    .pipe($.fileInclude({
      basepath: './html/'
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
    .pipe($.size({title: 'dist:html'}));
});

//copy cache.manifest to dist
gulp.task('dist:manifest', function () {
  return gulp.src('./cache.manifest')
    .pipe(cachebust.references())
    .pipe(gulp.dest(distProjectPath + '/'))
    .pipe($.size({title: 'dist:manifest'}));
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
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'))
    .pipe($.if(!browserSync.active, $.jshint.reporter('fail')));
});

//browser-sync serve
var browserSyncOptions = conf.project.browserSync || {};
gulp.task('serve', function () {
  browserSync.init(browserSyncOptions);

  gulp.watch(['./*.html'], browserSync.reload);
  gulp.watch(['./src/*.js'], browserSync.reload);
  gulp.watch(['./resources/**/*.css'], browserSync.reload);
  gulp.watch(['./resources/**/*.*g'], browserSync.reload);
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

//test
function getProtractorBinary(binaryName){
  var winExt = /^win/.test(process.platform)? '.cmd' : '';
  var pkgPath = require.resolve('protractor');
  var protractorDir = path.resolve(path.join(path.dirname(pkgPath), '..', 'bin'));
  return path.join(protractorDir, '/'+binaryName+winExt);
}

gulp.task('protractor-install', function(done){
  spawn(getProtractorBinary('webdriver-manager'), ['update'], {
    stdio: 'inherit'
  }).once('close', done);
});

gulp.task('wd', function(done){
  spawn(getProtractorBinary('webdriver-manager'), ['start'], {
    stdio: 'inherit'
  }).once('close', done);
});

gulp.task('scenario', function (done) {
  var argv = process.argv.slice(3); // forward args to protractor
  argv.push('test/protractor.conf.js');
  spawn(getProtractorBinary('protractor'), argv, {
    stdio: 'inherit'
  }).once('close', done);
});
//end test

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
  runSequence('sass', 'webpackjs', 'manifest', 'html', cb);
});
gulp.task('dist', function (cb) {
  isBuild = true;
  runSequence('clean:dist', 'prepare', 'compile','dist:resources', 'dist:images', 'dist:css', 'dist:js', 'dist:manifest','dist:html', '_endlog', cb);
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
gulp.task('test', function (done) {
  runSequence('scenario',done);
});
