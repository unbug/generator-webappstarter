Readme
=================
This project require [node](https://nodejs.org/).
Run `npm install` to install dependencies before get started.


Project commands
=================
run this command before you get started.

```shell
npm install -g gulp
```

1.build project,watch change and start browserSync,run

```shell
gulp
```
or run with forever
```shell
forever ./node_modules/.bin/gulp
```
2.deploy to test server,run

```shell
gulp deploytest
```
Please update your ftp auth name and password in ".ftppass".
View the page on test server [http://office.mozat.com:8083/PROJECTNAME/](http://office.mozat.com:8083/PROJECTNAME/).
This command require [openssl](https://www.openssl.org/).
For windows,you might needd to add openssl path to classpath.


3.deploy to offical server,run

```shell
gulp deploy
```
View the page on offical server [http://m.deja.me/PROJECTNAME/](http://m.deja.me/PROJECTNAME/).
This command require [rsync](https://rsync.samba.org/).
For windows,unzip  /tools/rsync.zip to a local path and add the path to classpath.

4.run this command to copy source images to project's `resources/images/` path,then generate `scss/_dubug-sprites.csss` and `resources/images/sprites.png` for sourceSprites in `package.json`.

```shell
gulp copy
``` 

5.run this command to start jshint.

```shell
gulp jshint
```

6.run this command to start browserSync,Change browserSync options in `package.json`.

```shell
gulp serve
``` 

7.run this command to start pagespeed,Change pagespeed options in `package.json`.

```shell
gulp pagespeed
``` 

Git
==========
Random git commit message

```shell
 git commit -m"`curl -s http://whatthecommit.com/index.txt`"
 ```
