const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;
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
//scopes for interacting with project data
const checkCreateProjectScope = requiredScopes('create:project');
const checkReadProjectScope = requiredScopes('read:project');
const checkUpdateProjectScope = requiredScopes('update:project');
const checkDeleteProjectScope = requiredScopes('delete:project');

//incoming authorization parameters
const jwtCheck = auth({
  audience: process.env.AUDIENCE,
  issuerBaseURL: process.env.ISSUERBASEURL,
  tokenSigningAlg: 'RS256'
});

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());


//Initialize Database Connection
const connection = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.DBPASSWORD,
});

//Connect to Database
connection.connect((err) => {
  if (err) throw new Error(err);
  console.log("Connected");
  connection.query('CREATE DATABASE IF NOT EXISTS project_development_db', (err) => {
    if (err) throw new Error(err);
    console.log('Database created/exists');
    connection.changeUser({database: process.env.DBNAME}, (err) => {
      if (err) throw new Error(err);
      console.log('Changed user');
      //create all of the necessary tables for the project if they aren't created yet.
      const projectDefinition = `project (
        project_id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
        name VARCHAR(100), 
        owner VARCHAR(100) NOT NULL,
        status_flag VARCHAR(50),
        focus_flag BOOLEAN,
        start_date DATE,
        due_date DATE
      )`
      createTable(projectDefinition);

      //sprint table definition
      const sprintDefinition = `sprint (
        sprint_id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
        project_id INT NOT NULL,
        status_flag VARCHAR(50),
        start_date DATE,
        due_date DATE, 
        sprint_result BOOLEAN,
        CONSTRAINT fk_project 
        FOREIGN KEY (project_id) 
        REFERENCES project(project_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      )`
      createTable(sprintDefinition);

      //task table definition
      const taskDefinition = `task (
        task_id INT AUTO_INCREMENT NOT NULL PRIMARY KEY,
        sprint_id INT,
        project_id INT,
        status_flag VARCHAR(50),
        task_owner VARCHAR(100),
        start_date DATE,
        end_date DATE, 
        CONSTRAINT fk_project_task 
        FOREIGN KEY (project_id) 
        REFERENCES project(project_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_sprint 
        FOREIGN KEY (sprint_id) 
        REFERENCES sprint(sprint_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE
      )`
      createTable(taskDefinition);


    });
  });
});


//Create a database table
function createTable(tableDefinition) {
  connection.query(`CREATE TABLE IF NOT EXISTS ${tableDefinition}`, (err) => {
    if (err) throw new Error(err);
    console.log('Table created/exists');
  });
}


//create- app.post('/api', ...) (res.end())
//read- app.get('/api', ...) (res.send())
//update- app.put('/api', ...) (res.end())
//delete- app.delete('/api', ...) (res.end())

app.post('/api', (req, res) => {
  connection.query('INSERT INTO project SET ?', {
    name: 'Project Development Tracker',
    owner: 'Vic',
    status_flag: 'In Progress',
    focus_flag: false,
    start_date: '2023-11-15'
  }, (err) => {
    if (err) throw new Error(err);
    console.log('Inserted record into table');
    res.end(); //end the request
  });
});

app.get('/api', (req, res) => {
  connection.query(`SELECT * FROM project`, (err, result) => {
    if (err) throw new Error(err);
    const json = JSON.stringify(result);
    console.log(json);
    res.send(json);
  });
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

//must have access to the project-data-api and the read:task permission in order to visit the page
app.get('/tasks-overview', jwtCheck, checkReadTaskScope, (req, res) => {
  res.json({type: "Read Authorized Tasks (requires read:task permission)"});
});

//must have access to the project-data-api and the read:task permission in order to visit the page
app.get('/sprints-overview', jwtCheck, checkReadSprintScope, (req, res) => {
  res.json({type: "Read Authorized Sprints (requires read:sprint permission)"});
});

//must have access to the project-data-api and the read:task permission in order to visit the page
app.get('/projects-overview', jwtCheck, checkReadProjectScope, (req, res) => {
  res.json({type: "Read Authorized Projects (requires read:project permission)"});
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


//must have access to the project-data-api and the create:project permission in order to visit the page
app.get('/create-project', jwtCheck, checkCreateProjectScope, (req, res) => {
  // req.auth.payload.sub //userid from auth0
  res.json({type: "Create Authorized Sprint (requires create:project permission)"});
});


app.post('/create-project', jwtCheck, checkCreateProjectScope, (req, res) => {
  // req.auth.payload.sub //userid from auth0
  //res.json({type: "Create Authorized Sprint (requires create:project permission)"});
  // var newID = req.body.ID;
  // res.redirect("/action")
  res.end();
});


//must have access to the project-data-api and the read:sprint permission in order to visit the page
app.get('/read-project', jwtCheck, checkReadProjectScope, (req, res) => {
  res.json({type: "Read Authorized Sprint (requires read:project permission)"});
});


//must have access to the project-data-api and the update:sprint permission in order to visit the page
app.get('/update-project', jwtCheck, checkUpdateProjectScope, (req, res) => {
  res.json({type: "Update Authorized Sprint (requires update:project permission)"});
});


//requires access to the priject-data-api and the delete:sprint permission in order to visit the page 
app.get('/delete-project', jwtCheck, checkDeleteProjectScope, (req, res) => {
  res.json({type: "Delete Authorized Sprint (requires delete:project permission)"});
});


app.get('/authorized', function (req, res) {
    res.send('Secured Resource');
});


app.listen(port, () => console.log(`Running on port ${port}`));

