# MrsEcoSue

## NPM Scripts

#### Prod

When deploying to heroku `npm run deploy`:

1. Heroku will run `tsc` after installing dependencies, but before removing the devDependencies by calling `heroku:postbuild` (see [FAQ](https://devcenter.heroku.com/articles/nodejs-support#heroku-specific-build-steps)).

This is important because `tsc` needs the typing declarations from the devDependencies (e.g. `@types/pdfkit`) to compile successfully. Running `tsc` later would cause errors like `error TS7016: Could not find a declaration file for module 'pdfkit'` etc.

2. Heroku will start the express server by calling `npm start` (as defined by the `Procfile`). Since `tsc` already ran, the `dist/` directory is guaranteed to exist.


#### Dev

When testing locally: `npm run start:dev`

This uses `concurrently` to both watch for ts file changes and to reload the express server.


## Heroku commands

Deploy: `git push heroku master`
Visit: `heroku open`
Infos: `heroku apps:info`
Add env var: `heroku config:set KEY=VALUE`
Activate site: `heroku ps:scale web=1`
Deactivate site: `heroku ps:scale web=0` (requests will error)
View Logs: `heroku logs --tail`
Create in EU: `heroku create --region eu`
Update name: `heroku apps:rename the-new-name`
Delete completely: `heroku apps:destroy --confirm the-app-name`
