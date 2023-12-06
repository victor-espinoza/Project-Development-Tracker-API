const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const async  = require('async');
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
  multipleStatements: true
});

//Connect to Database
connection.connect((err) => {
  if (err) throw new Error(err);
  connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DBNAME}`, (err) => {
    if (err) throw new Error(err);
    connection.changeUser({database: process.env.DBNAME}, (err) => {
      if (err) throw new Error(err);
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
        name VARCHAR(100), 
        status_flag VARCHAR(50),
        focus_flag BOOLEAN,
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
        project_id INT NOT NULL,
        sprint_id INT,
        name VARCHAR(100), 
        status_flag VARCHAR(50),
        task_owner VARCHAR(100),
        start_date DATE,
        due_date DATE, 
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
  });
}


//create- app.post('/api', ...) (res.end())
//read- app.get('/api', ...) (res.send())
//update- app.put('/api', ...) (res.end())
//delete- app.delete('/api', ...) (res.end())



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
  connection.query(`SELECT * FROM task`, (err, result) => {
    if (err) throw new Error(err);
    const json = JSON.stringify(result);
    res.send(json);
  });
});

//must have access to the project-data-api and the read:task permission in order to visit the page
app.get('/sprints-overview', jwtCheck, checkReadSprintScope, (req, res) => {
  connection.query(`SELECT * FROM sprint`, (err, result) => {
    if (err) throw new Error(err);
    const json = JSON.stringify(result);
    res.send(json);
  });
});

//must have access to the project-data-api and the read:task permission in order to visit the page
app.get('/projects-overview', jwtCheck, checkReadProjectScope, (req, res) => {
  connection.query(`SELECT * FROM project`, (err, result) => {
    if (err) throw new Error(err);
    const json = JSON.stringify(result);
    res.send(json);
  });
});

app.post('/create-task', jwtCheck, checkCreateTaskScope, (req, res) => {
  const projectId = req.body.data.projectId;
  const name = req.body.data.newName;
  const status = req.body.data.newStatus;
  const owner = req.body.data.owner;
  const startDate = req.body.data.newStartDate;
  const dueDate = req.body.data.newDueDate;
  connection.query('INSERT INTO task SET ?', {
    project_id: projectId,
    name: name,
    status_flag: status,
    task_owner: owner,
    start_date: startDate,
    due_date: dueDate
  }, (err) => {
    if (err) throw new Error(err);
    console.log('Inserted record into table');
    res.send({project_id: projectId}); 
  });
});


//must have access to the project-data-api and the create:sprint permission in order to visit the page
app.get('/create-task', jwtCheck, checkCreateTaskScope, (req, res) => {
  const projectQuery = "SELECT * FROM project";
  const sprintQuery = "SELECT * FROM sprint";

  var data = {};

  async.parallel([
    function(parallel_done) {
      connection.query(projectQuery, {}, function(err, res) {
        if (err) return parallel_done(err);
        data.projects = res;
        parallel_done();
      });
    },
    function(parallel_done) {
      connection.query(sprintQuery, {}, function(err, res) {
        if (err) return parallel_done(err);
        data.sprints = res;
        parallel_done();
      });
    }
  ], function(err) {
    if (err) console.log(err);
      //connection.end();
      const json = JSON.stringify(data);
      res.send(data);
  });
});


//must have access to the project-data-api and the read:task permission in order to visit the page
app.get('/read-task', jwtCheck, checkReadTaskScope, (req, res) => {
  const id = req.query.requested_task_id || -1;
  if (id != -1) {
    connection.query(`SELECT * FROM task WHERE task_id = ${id}`, (err, result) => {
      if (err) throw new Error(err);
      const json = JSON.stringify(result);
      res.send(json);
    });
  } else {
    res.json({});
  }
});


//must have access to the project-data-api and the update:task permission in order to visit the page
app.get('/update-task', jwtCheck, checkUpdateTaskScope, (req, res) => {
  res.json({type: "Update Authorized Task (requires update:task permission)"});
});


//must have access to the project-data-api and the delete:task permission in order to visit the page
app.delete('/delete-task', jwtCheck, checkDeleteTaskScope, (req, res) => {
  connection.query(`DELETE FROM task WHERE task_id = ${req.body.delete_task_id} `, (err, result) => {
    if (err) throw new Error(err);
  });
  res.end(); 
});



app.post('/create-sprint', jwtCheck, checkCreateSprintScope, (req, res) => {
  const projectId = req.body.data.projectId;
  const name = req.body.data.newName;
  const status = req.body.data.newStatus;
  const startDate = req.body.data.newStartDate;
  const dueDate = req.body.data.newDueDate;
  connection.query('INSERT INTO sprint SET ?', {
    project_id: projectId,
    name: name,
    status_flag: status,
    focus_flag: false,
    start_date: startDate,
    due_date: dueDate
  }, (err) => {
    if (err) throw new Error(err);
    console.log('Inserted record into table');
    res.end(); //end the request
  });
  res.send({project_id: projectId}); 
});


//must have access to the project-data-api and the create:sprint permission in order to visit the page
app.get('/create-sprint', jwtCheck, checkCreateSprintScope, (req, res) => {
  connection.query(`SELECT * FROM project`, (err, result) => {
    if (err) throw new Error(err);
    const json = JSON.stringify(result);
    res.send(json);
  });
});


//must have access to the project-data-api and the read:sprint permission in order to visit the page
app.get('/read-sprint', jwtCheck, checkReadSprintScope, (req, res) => {
  const id = req.query.requested_sprint_id || -1;
  if (id != -1) {
    connection.query(`SELECT * FROM sprint WHERE sprint_id = ${id}`, (err, result) => {
      if (err) throw new Error(err);
      const json = JSON.stringify(result);
      res.send(json);
    });
  } else {
    connection.query(`SELECT * FROM sprint WHERE focus_flag = 1`, (err, result) => {
      if (err) throw new Error(err);
      const json = JSON.stringify(result);
      res.send(json);
    });
  }
});


//must have access to the project-data-api and the update:sprint permission in order to visit the page
app.get('/update-sprint', jwtCheck, checkUpdateSprintScope, (req, res) => {
  res.json({type: "Update Authorized Sprint (requires update:sprint permission)"});
});


//requires access to the priject-data-api and the delete:sprint permission in order to visit the page 
app.get('/delete-sprint', jwtCheck, checkDeleteSprintScope, (req, res) => {
  res.json({type: "Delete Authorized Sprint (requires delete:sprint permission)"});
});


//must have access to the project-data-api and the delete:task permission in order to visit the page
app.delete('/delete-sprint', jwtCheck, checkDeleteTaskScope, (req, res) => {
  connection.query(`DELETE FROM sprint WHERE sprint_id = ${req.body.delete_sprint_id} `, (err, result) => {
    if (err) throw new Error(err);
  });
  res.end(); 
});


//must have access to the project-data-api and the create:project permission in order to visit the page
app.get('/create-project', jwtCheck, checkCreateProjectScope, (req, res) => {
  // req.auth.payload.sub //userid from auth0
  res.json({type: "Create Authorized Sprint (requires create:project permission)"});
});


app.post('/create-project', jwtCheck, checkCreateProjectScope, (req, res) => {
  //console.log(req.body.data);
  const name = req.body.data.newName;
  const owner = req.auth.payload.sub;
  const status = req.body.data.newStatus;
  const startDate = req.body.data.newStartDate;
  const dueDate = req.body.data.newDueDate;
  connection.query('INSERT INTO project SET ?', {
    name: name,
    owner: owner,
    status_flag: status,
    focus_flag: false,
    start_date: startDate,
    due_date: dueDate
  }, (err) => {
    if (err) throw new Error(err);
    console.log('Inserted record into table');
    res.end(); //end the request
  });
  res.send('Data received');
});

app.put('/update-project-focus', jwtCheck, checkUpdateProjectScope, (req, res) => {
  const focused_id = req.body.data.project_id;
  console.log(focused_id);
  connection.query(`UPDATE project SET focus_flag = 1 WHERE project_id = ${focused_id}`, (err) => {
    if (err) throw new Error(err);
    res.end(); //end the request
  });
  connection.query(`UPDATE project SET focus_flag = 0 WHERE project_id != ${focused_id}`, (err) => {
    if (err) throw new Error(err);
    res.end(); //end the request
  });
});


app.put('/update-sprint-focus', jwtCheck, checkUpdateProjectScope, (req, res) => {
  const focused_id = req.body.data.sprint_id;
  console.log(focused_id);
  connection.query(`UPDATE sprint SET focus_flag = 1 WHERE sprint_id = ${focused_id}`, (err) => {
    if (err) throw new Error(err);
    res.end(); //end the request
  });
  connection.query(`UPDATE sprint SET focus_flag = 0 WHERE sprint_id != ${focused_id}`, (err) => {
    if (err) throw new Error(err);
    res.end(); //end the request
  });
});


//must have access to the project-data-api and the read:sprint permission in order to visit the page
app.get('/read-project', jwtCheck, checkReadProjectScope, (req, res) => {
  const id = req.query.requested_project_id || -1;
  if (id != -1) {
    connection.query(`SELECT * FROM project WHERE project_id = ${id}`, (err, result) => {
      if (err) throw new Error(err);
      const json = JSON.stringify(result);
      res.send(json);
    });
  } else {
    connection.query(`SELECT * FROM project WHERE focus_flag = 1`, (err, result) => {
      if (err) throw new Error(err);
      const json = JSON.stringify(result);
      res.send(json);
    });
  }
});


//must have access to the project-data-api and the update:sprint permission in order to visit the page
app.get('/update-project', jwtCheck, checkUpdateProjectScope, (req, res) => {
  const id = req.query.requested_project_id || -1;
  if (id != -1) {
    connection.query(`SELECT * FROM project WHERE project_id = ${id}`, (err, result) => {
      if (err) throw new Error(err);
      const json = JSON.stringify(result);
      res.send(json);
    });
  } else {
    connection.query(`SELECT * FROM project WHERE focus_flag = 1`, (err, result) => {
      if (err) throw new Error(err);
      const json = JSON.stringify(result);
      res.send(json);
    });
  }
});


//must have access to the project-data-api and the update:sprint permission in order to visit the page
app.patch('/update-project', jwtCheck, checkUpdateProjectScope, (req, res) => {
  console.log("PATCH Request made...");
  const id = req.body.data.project_id;
  console.log("Input Values:");
  console.log(req.body.data);
  //console.log(req.body.data);
  const newName = req.body.data.newName;
  const status = req.body.data.newStatus;
  const startDate = req.body.data.newStartDate;
  const dueDate = req.body.data.newDueDate;
  // let queryRes = {};
  // connection.query(`SELECT * FROM project WHERE project_id = ${id}`, (err, result) => {
  //   if (err) throw new Error(err);
  //   const json = JSON.stringify(result);
  //   queryRes = json;
  // });
  // console.log("Database values:")
  // console.log(queryRes);

  // connection.query(`UPDATE project SET ? WHERE project_id = ${id}`, {
  //   name: COALESCE(newName, name),
  //   status_flag: COALESCE(status, status_flag),
  //   focus_flag: false,
  //   start_date: startDate,
  //   due_date: dueDate
  // }, (err) => {
  //   if (err) throw new Error(err);
  //   console.log('Inserted record into table');
  //   res.end(); //end the request
  // });

  // res.send('Data received');
  // connection.query(`UPDATE project SET focus_flag = 1 WHERE project_id = ${focused_id}`, (err) => {
  //   if (err) throw new Error(err);
  //   res.end(); //end the request
  // });
  // connection.query(`UPDATE project SET focus_flag = 0 WHERE project_id != ${focused_id}`, (err) => {
  //   if (err) throw new Error(err);
  //   res.end(); //end the request
  // });
});


//requires access to the priject-data-api and the delete:sprint permission in order to visit the page 
app.get('/delete-project', jwtCheck, checkDeleteProjectScope, (req, res) => {
  res.json({type: "Delete Authorized Sprint (requires delete:project permission)"});
});

//must have access to the project-data-api and the delete:task permission in order to visit the page
app.delete('/delete-project', jwtCheck, checkDeleteTaskScope, (req, res) => {
  connection.query(`DELETE FROM project WHERE project_id = ${req.body.delete_project_id} `, (err, result) => {
    if (err) throw new Error(err);
  });
  res.end(); 
});


app.get('/authorized', function (req, res) {
    res.send('Secured Resource');
});


app.listen(port, () => console.log(`Running on port ${port}`));

