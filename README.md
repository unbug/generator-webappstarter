Readme
=================
webappstarter generator will give you a Simple Mobile Web App Boilerplate and Structure!

Prereqs and installation requirements
=====================================
1.install [node](https://nodejs.org/).

2.install [yeoman](http://yeoman.io/).
```shell
npm install -g yo
```
3.Clone this git repo to your local,and from the root of the repo,run
```shell
npm link
```
to developing the generator locally.

Generator commands
==================
1.generate a new project,run

```shell
yo webappstarter
```
More configurations,please take a look at "project" property of "package.json" file after the generator is done.

Project commands
=================

1.build project,watch change and start browserSync,run

```shell
gulp
```
2.deploy to test server,run

```shell
gulp deploytest
```
view the page on test server [http://m.deja.me/PROJECTNAME/](http://m.deja.me/PROJECTNAME/).

3.deploy to offical server,run

```shell
gulp deploy
```
view the page on offical server [http://office.mozat.com:8081/m/PROJECTNAME/](http://office.mozat.com:8081/m/PROJECTNAME/).

4.run `gulp copy` to copy source images to project's `/resources/images/` path and generates sprites for sourceSprites in `package.json`.

5.run `gulp jshint` to start jshint.

6.run `gulp serve` to start browserSync,Change browserSync options in `package.json`.

7.run `gulp pagespeed` to start pagespeed,Change pagespeed options in `package.json`.

Git
==========
Random git commit message

```shell
 git commit -m"`curl -s http://whatthecommit.com/index.txt`"

 ```
