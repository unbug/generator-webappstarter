Readme
=================
This project require [node](https://nodejs.org/).
Run `npm install` to install dependencies before get started.

Project commands
=================
run
```shell
npm install -g gulp
```
before you get started.

1.build project,watch change and start browserSync,run

```shell
gulp
```
2.deploy to test server,run

```shell
gulp deploytest
```
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

4.run 
```shell
gulp copy
``` 
to copy source images to project's `resources/images/` path,then generate `scss/_dubug-sprites.csss` and `resources/images/sprites.png` for sourceSprites in `package.json`.

5.run 
```shell
gulp jshint
```
 to start jshint.

6.run 
```shell
gulp serve
``` 
to start browserSync,Change browserSync options in `package.json`.

7.run 
```shell
gulp pagespeed
``` 
to start pagespeed,Change pagespeed options in `package.json`.

Git
==========
Random git commit message

```shell
 git commit -m"`curl -s http://whatthecommit.com/index.txt`"

 ```
