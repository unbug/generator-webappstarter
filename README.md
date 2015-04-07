Readme
=================
This project require [node](https://nodejs.org/).
Run `npm link` to develope the generator locally before get started.

1.generate a new project,run

```shell
yo webappstarter
```

Project commands:
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
view the page on offical server [http://m.deja.me/PROJECTNAME/](http://m.deja.me/PROJECTNAME/).

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
I will give you a Simple Mobile Web App Boilerplate and Structure!