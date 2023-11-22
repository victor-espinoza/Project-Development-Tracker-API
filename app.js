const express = require('express');
const app = express();
const { auth, requiredScopes } = require('express-oauth2-jwt-bearer');
//scopes for interacting with task data
const checkCreateTaskScope = requiredScopes('create:task');
const checkReadTaskScope = requiredScopes('read:task');
const checkUpdateTaskScope = requiredScopes('update:task');
const checkDeleteTaskScope = requiredScopes('delete:task');
//scopes for interacting with sprint data
const checkCreateSprintScope = requiredScopes('create:sprint');
const checkReadSprintScope = requiredScopes('read:sprint');
const checkUpdateSprintScope = requiredScopes('update:sprint');
const checkDeleteSprintScope = requiredScopes('delete:sprint');
//incoming authorization parameters
const jwtCheck = auth({
  audience: 'https://project-data-api.com',
  issuerBaseURL: 'https://dev-ojajllt52wv7zy8a.us.auth0.com/',
  tokenSigningAlg: 'RS256'
});

app.get('/public', (req, res) => {
  res.json({type: "public"});
});

app.get('/', (req, res) => {
  res.json({type: "Home"});
});

//must have access to the project-data-api in order to visit the page
app.get('/private', jwtCheck, (req, res) => {
  res.json({type: "Read Authorized Data (Login)"});
});


//must have access to the project-data-api and the create:task permission in order to visit the page
app.get('/create-task', jwtCheck, checkCreateTaskScope, (req, res) => {
  res.json({type: "Create Authorized Task (requires create:task permission)"});
});


//must have access to the project-data-api and the read:task permission in order to visit the page
app.get('/read-task', jwtCheck, checkReadTaskScope, (req, res) => {
  res.json({type: "Read Authorized Task (requires read:task permission)"});
});


//must have access to the project-data-api and the update:task permission in order to visit the page
app.get('/update-task', jwtCheck, checkUpdateTaskScope, (req, res) => {
  res.json({type: "Update Authorized Task (requires update:task permission)"});
});


//must have access to the project-data-api and the delete:task permission in order to visit the page
app.get('/delete-task', jwtCheck, checkDeleteTaskScope, (req, res) => {
  res.json({type: "Delete Authorized Task (requires delete:task permission)"});
});


//must have access to the project-data-api and the create:sprint permission in order to visit the page
app.get('/create-sprint', jwtCheck, checkCreateSprintScope, (req, res) => {
  res.json({type: "Create Authorized Sprint (requires create:sprint permission)"});
});


//must have access to the project-data-api and the read:sprint permission in order to visit the page
app.get('/read-sprint', jwtCheck, checkReadSprintScope, (req, res) => {
  res.json({type: "Read Authorized Sprint (requires read:sprint permission)"});
});


//must have access to the project-data-api and the update:sprint permission in order to visit the page
app.get('/update-sprint', jwtCheck, checkUpdateSprintScope, (req, res) => {
  res.json({type: "Update Authorized Sprint (requires update:sprint permission)"});
});


//requires access to the priject-data-api and the delete:sprint permission in order to visit the page 
app.get('/delete-sprint', jwtCheck, checkDeleteSprintScope, (req, res) => {
  res.json({type: "Delete Authorized Sprint (requires delete:sprint permission)"});
});


app.get('/authorized', function (req, res) {
    res.send('Secured Resource');
});


app.listen(5000);
console.log('Running on port 5000');
