Readme
=================
webappstarter generator will give you a Simple Mobile Web App Boilerplate and Structure!

Install
========
```shell
npm install -g generator-webappstarter
```

Prereqs and installation requirements
=====================================
1.install [node](https://nodejs.org/) and [Python](https://www.python.org/).

2.install [yeoman](http://yeoman.io/).
```shell
npm install -g yo
```
3.[option]Clone this git repo to your local,and from the root of the repo,run
```shell
npm link
```
to developing the generator locally.

Generator commands
==================
1.generate a new project,run

```shell
mkdir myProject
cd myProject
yo webappstarter
```
2.generate a new module,run

```shell
//add "html/site/include/modulename.html" and inlude it to "html/site/include/views.html"
//add "scss/_debug-modulename.scss" and inport it to "scss/_debug-view.scss"
//add "src/app/view/ModuleNameView.js"
//add "src/app/controller/ModuleNameController.js"
//add "src/app/resources/TemplateModuleName.js

yo webappstarter:module ModuleName
```
More configurations,please take a look at "project" property of "package.json" file after the generator is done.

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
