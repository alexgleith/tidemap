# Tidemap

Tidemap is the portal through which customers view our interactive mapping data products, served out of GeoServer.

It's based around Leaflet with a little bit of Bootstrap thrown in for UI.

It's developed using a Yeoman template and uses Bower for package management and Gulp for build/test/deploy.
## Dependencies
I'm a little unclear of exactly what is required, but you definitely need to [install npm](http://blog.npmjs.org/post/85484771375/how-to-install-npm), bower and gulp. First follow the link above to install npm, and then run this:

`npm install --global yo gulp gulp-cli bower`
 
## How to develop
1. Clone a local version of this repository `git clone git@bitbucket.org:tidetech/tidemap.git`
2. Install client libraries bower components: `bower update`
3. Install npm (build) components `npm install`
4. Run [gulp](http://gulpjs.com/) commands, such as:
    * `gulp serve` - runs a local server with live reloading
    * `gulp build` - builds the prod system
    * `gulp serve:prod` - serves the prod system for final testing
    * `gulp deploy` - deploys the site to s3 (currently accessible at [maps-client.tidetech.org](maps-client.tidetech.org).

## Todo
* Get linting working properly (nice to have...)
* Break out some of the main.js into libraries and reusable parts
* AUTHENTICATION!

## Notes