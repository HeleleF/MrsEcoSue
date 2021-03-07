# MrsEcoSue

### Heroku

Deploy: `git push heroku master`
Activate site: `heroku ps:scale web=1`
Deactivate site: `heroku ps:scale web=0` (requests will error)
View Logs: `heroku logs --tail`
Create in EU: `heroku create --region eu`
Update name: `heroku apps:rename the-new-name`
Delete completely: `heroku apps:destroy --confirm the-app-name`
