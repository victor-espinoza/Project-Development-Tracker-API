const express = require('express');
const moment = require('moment'); 
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
        project_status VARCHAR(50),
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
        sprint_status VARCHAR(50),
        focus_flag BOOLEAN,
        start_date DATE,
        due_date DATE, 
        sprint_result BOOLEAN,
        sprint_review MEDIUMTEXT,
        sprint_retrospective MEDIUMTEXT,
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
        task_status VARCHAR(50),
        task_owner VARCHAR(100),
        start_date DATE,
        due_date DATE, 
        CONSTRAINT fk_sprint_task
        FOREIGN KEY (sprint_id) 
        REFERENCES sprint(sprint_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_project_task
        FOREIGN KEY (project_id) 
        REFERENCES project(project_id)
          ON UPDATE CASCADE
          ON DELETE CASCADE,
        CONSTRAINT fk_sprint_project
        FOREIGN KEY (project_id, sprint_id) 
        REFERENCES sprint(project_id, sprint_id)
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
  const tasksQuery = "SELECT * FROM task ORDER BY sprint_id DESC, task_id DESC";
  const sprintsQuery = "SELECT sprint_id, name FROM sprint";
  const projectsQuery = "SELECT project_id, name FROM project";
  var data = {};

  async.parallel([
    function(parallel_done) {
      connection.query(tasksQuery, {}, function(err, res) {
        if (err) return parallel_done(err);
        data.tasks = res;
        parallel_done();
      }); 
    },
    function(parallel_done) { 
      connection.query(sprintsQuery, {}, function(err, res) {
        if (err) return parallel_done(err);
        data.sprints = res;
        parallel_done();
      });
    },
    function(parallel_done) {
      connection.query(projectsQuery, {}, function(err, res) {
        if (err) return parallel_done(err);
        data.projects = res;
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
app.get('/sprints-overview', jwtCheck, checkReadSprintScope, (req, res) => {
  const sprintQuery = "SELECT * FROM sprint WHERE project_id = (SELECT project_id FROM project WHERE focus_flag = 1) ORDER BY due_date DESC";
  const projectsQuery = "SELECT project_id, name FROM project";
  var data = {};

  async.parallel([
    function(parallel_done) {
      connection.query(sprintQuery, {}, function(err, res) {
        if (err) return parallel_done(err);
        data.sprints = res;
        parallel_done();
      });
    },
    function(parallel_done) {
      connection.query(projectsQuery, {}, function(err, res) {
        if (err) return parallel_done(err);
        data.projects = res;
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
app.get('/projects-overview', jwtCheck, checkReadProjectScope, (req, res) => {
  connection.query(`SELECT * FROM project`, (err, result) => {
    if (err) throw new Error(err);
    const json = JSON.stringify(result);
    res.send(json);
  });
});

app.post('/create-task', jwtCheck, checkCreateTaskScope, (req, res) => {
  const projectId = req.body.data.project_id;
  const sprintId = req.body.data.sprint_id;
  const defaultSprintId = req.body.data.default_sprint_id
  const sprintName = req.body.data.sprintName;
  const newName = req.body.data.newName;
  const owner = req.body.data.newOwner;
  const status = req.body.data.newStatus;
  const startDate = req.body.data.newStartDate;
  const dueDate = req.body.data.newDueDate;

  const queryString = `INSERT INTO task SET ?`;
  let queryParams = { };
  queryParams.project_id = projectId;
  queryParams.sprint_id = (sprintName) ? sprintId : defaultSprintId;
  if (newName) 
    queryParams.name = newName;
  if (status) 
    queryParams.task_status = status;
  if (owner) 
  queryParams.task_owner = owner;
  if (startDate)
    queryParams.start_date = startDate;
  if (dueDate)
    queryParams.due_date = dueDate;


  if (sprintId < 0 && sprintName) {
    console.log(projectId);
    connection.query(`INSERT INTO sprint SET ?; SELECT LAST_INSERT_ID() AS sID;`, {
      project_id: projectId,
      name: sprintName,
      sprint_status: "In Progress",
      focus_flag: false,
      start_date: new Date(),
      due_date: moment(new Date()).add(7, 'D').toDate()
    }, (err, result) => {
      if (err) throw new Error(err);
      queryParams.sprint_id = JSON.stringify((result[1])[0].sID);
      connection.query(queryString, queryParams, (err) => {
        if (err) console.log("Foreign constraint fails");
        res.send({project_id: projectId});
      });
    });
  } else {
    connection.query(queryString, queryParams, (err) => {
      if (err) console.log("Foreign constraint fails");
      res.send({project_id: projectId});
    });
  }

});


//must have access to the project-data-api and the create:sprint permission in order to visit the page
app.get('/create-task', jwtCheck, checkCreateTaskScope, (req, res) => {
  const projectQuery = "SELECT project_id, name, focus_flag FROM project";
  const sprintQuery = "SELECT sprint_id, project_id, name, focus_flag FROM sprint";

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
    const tasksQuery = `SELECT * FROM task WHERE task_id = ${id}`;
    const sprintsQuery = "SELECT sprint_id, project_id, name FROM sprint";
    const projectsQuery = "SELECT project_id, name FROM project";
    var data = {};

    async.parallel([
      function(parallel_done) {
        connection.query(tasksQuery, {}, function(err, res) {
          if (err) return parallel_done(err);
          data.tasks = res;
          parallel_done();
        }); 
      },
      function(parallel_done) { 
        connection.query(sprintsQuery, {}, function(err, res) {
          if (err) return parallel_done(err);
          data.sprints = res;
          parallel_done();
        });
      },
      function(parallel_done) {
        connection.query(projectsQuery, {}, function(err, res) {
          if (err) return parallel_done(err);
          data.projects = res;
          parallel_done();
        });
      }
    ], function(err) {
      if (err) console.log(err);
        //connection.end();
        const json = JSON.stringify(data);
        res.send(data);
    });
  } else {
    res.json({});
  }
});


//must have access to the project-data-api and the update:task permission in order to visit the page
app.get('/update-task', jwtCheck, checkUpdateTaskScope, (req, res) => {
  const id = req.query.requested_task_id;
  const tasksQuery = `SELECT * FROM task WHERE task_id = ${id}`;
  const sprintsQuery = "SELECT sprint_id, project_id, name, focus_flag FROM sprint";
  const projectsQuery = "SELECT project_id, name FROM project";
  var data = {};

  async.parallel([
    function(parallel_done) {
      connection.query(tasksQuery, {}, function(err, res) {
        if (err) return parallel_done(err);
        data.tasks = res;
        parallel_done();
      }); 
    },
    function(parallel_done) { 
      connection.query(sprintsQuery, {}, function(err, res) {
        if (err) return parallel_done(err);
        data.sprints = res;
        parallel_done();
      });
    },
    function(parallel_done) {
      connection.query(projectsQuery, {}, function(err, res) {
        if (err) return parallel_done(err);
        data.projects = res;
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

//must have access to the project-data-api and the update:sprint permission in order to visit the page
app.patch('/update-task', jwtCheck, checkUpdateProjectScope, (req, res) => {
  const taskId = req.body.data.task_id;
  const projectId = req.body.data.project_id;
  const sprintId = req.body.data.sprint_id;
  const defaultSprintId = req.body.data.default_sprint_id
  const sprintName = req.body.data.sprintName;
  const newName = req.body.data.newName;
  const owner = req.body.data.newOwner;
  const status = req.body.data.newStatus;
  const startDate = req.body.data.newStartDate;
  const dueDate = req.body.data.newDueDate;

  const queryString = `UPDATE task SET ? WHERE task_id = ${taskId}`;
  let queryParams = { };
  queryParams.project_id = projectId;
  queryParams.sprint_id = (sprintName) ? sprintId : defaultSprintId;
  if (newName) 
    queryParams.name = newName;
  if (status) 
    queryParams.task_status = status;
  if (owner) 
  queryParams.task_owner = owner;
  if (startDate)
    queryParams.start_date = startDate;
  if (dueDate)
    queryParams.due_date = dueDate;


  if (sprintId < 0 && sprintName) {
    connection.query(`INSERT INTO sprint SET ?; SELECT LAST_INSERT_ID() AS sID;`, {
      project_id: projectId,
      name: sprintName,
      sprint_status: "In Progress",
      focus_flag: false,
      start_date: new Date(),
      due_date: moment(new Date()).add(7, 'D').toDate()
    }, (err, result) => {
      if (err) throw new Error(err);
      queryParams.sprint_id = JSON.stringify((result[1])[0].sID);
      connection.query(queryString, queryParams, (err) => {
        if (err) console.log("Foreign constraint fails");
        res.end(); //end the request
      });
    });
  } else {
    connection.query(queryString, queryParams, (err) => {
      if (err) console.log("Foreign constraint fails");
      res.end(); //end the request
    });
  }
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
  const focus = req.body.data.focus;
  const startDate = req.body.data.newStartDate;
  const dueDate = req.body.data.newDueDate;
  const sprintReview = req.body.data.newSprintReview;
  const sprintRetrospective = req.body.data.newSprintRetrospective;

  connection.query('INSERT INTO sprint SET ?', {
    project_id: projectId,
    name: name,
    sprint_status: status,
    focus_flag: focus,
    start_date: startDate,
    due_date: dueDate,
    sprint_review: sprintReview,
    sprint_retrospective: sprintRetrospective

  }, (err) => {
    if (err) throw new Error(err);
    connection.query('SELECT * FROM sprint where sprint_id = LAST_INSERT_ID()', (err, result) => {
      if (err) throw new Error(err);
      const json = JSON.stringify(result);
      res.send(json);
    }); 
  });
});


//must have access to the project-data-api and the create:sprint permission in order to visit the page
app.get('/create-sprint', jwtCheck, checkCreateSprintScope, (req, res) => {
  connection.query(`SELECT project_id, name FROM project`, (err, result) => {
    if (err) throw new Error(err);
    const json = JSON.stringify(result);
    res.send(json);
  });
});


//must have access to the project-data-api and the read:sprint permission in order to visit the page
app.get('/read-sprint', jwtCheck, checkReadSprintScope, (req, res) => {
  const id = req.query.requested_sprint_id || -1;
  const sprintsQuery = (id != -1) ? `SELECT * FROM sprint WHERE sprint_id = ${id}` : `SELECT * FROM sprint WHERE focus_flag = 1`;
  const projectsQuery = "SELECT project_id, name FROM project";
  const taskQuery = `SELECT * FROM task WHERE sprint_id = ${id} ORDER BY task_id DESC`;
  var data = {};

  async.parallel([
    function(parallel_done) { 
      connection.query(sprintsQuery, {}, function(err, res) {
        if (err) return parallel_done(err);
        data.sprints = res;
        parallel_done();
      });
    },
    function(parallel_done) {
      connection.query(projectsQuery, {}, function(err, res) {
        if (err) return parallel_done(err);
        data.projects = res;
        parallel_done();
      });
    },
    function(parallel_done) {
      connection.query(taskQuery, {}, function(err, res) {
        if (err) return parallel_done(err);
        data.tasks = res;
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


//must have access to the project-data-api and the update:sprint permission in order to visit the page
app.get('/update-sprint', jwtCheck, checkUpdateSprintScope, (req, res) => {
  const id = req.query.requested_sprint_id || -1;
  const sprintQuery = `SELECT * FROM sprint WHERE sprint_id = ${id}`;
  const defaultSprintQuery = "SELECT * FROM sprint WHERE focus_flag = 1";
  const projectsQuery = `SELECT project_id, name FROM project`;
  var data = {};

  async.parallel([
    function(parallel_done) {
      connection.query(((id > 0) ? sprintQuery : defaultSprintQuery), {}, function(err, res) {
        if (err) return parallel_done(err);
        data.sprint = res;
        parallel_done();
      });
    },
    function(parallel_done) {
      connection.query(projectsQuery, {}, function(err, res) {
        if (err) return parallel_done(err);
        data.projects = res;
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

//must have access to the project-data-api and the update:sprint permission in order to visit the page
app.patch('/update-sprint', jwtCheck, checkUpdateSprintScope, (req, res) => {
  const projectId = req.body.data.project_id
  const sprintId = req.body.data.sprint_id;
  const newName = req.body.data.newName; 
  const status = req.body.data.newStatus;
  const focus = req.body.data.focus;
  const review = req.body.data.newSprintReview;
  const retrospective = req.body.data.newSprintRetrospective;
  const startDate = req.body.data.newStartDate;
  const dueDate = req.body.data.newDueDate;

  const queryString = `UPDATE sprint SET ? WHERE sprint_id = ${sprintId}`;
  let queryParams = { };
  queryParams.project_id = projectId;
  if (newName) 
    queryParams.name = newName;
  if (status) 
    queryParams.sprint_status = status;

  queryParams.focus_flag = focus;
  if (startDate)
    queryParams.start_date = startDate;
  if (dueDate)
    queryParams.due_date = dueDate;
  if (review)
    queryParams.sprint_review = review;
  if (retrospective)
    queryParams.sprint_retrospective = retrospective;

  connection.query(queryString, queryParams, (err) => {
    if (err) throw new Error(err);
    res.end(); //end the request
  });
}); 

//requires access to the priject-data-api and the delete:sprint permission in order to visit the page 
app.get('/fix-sprint-focus', jwtCheck, checkUpdateProjectScope, (req, res) => {
  const id = req.query.requested_sprint_id;
  const focusQuery = `SELECT focus_flag FROM sprint WHERE sprint_id = ${id}`;
  const focusCountQuery = `SELECT SUM(focus_flag = 1) AS total_checks FROM sprint`;

  var data = {};
  data.sprint_id = id;
  async.parallel([
    function(parallel_done) {
      connection.query(focusQuery, {}, function(err, res) {
        if (err) return parallel_done(err);
        data.focus_status = res[0].focus_flag;
        parallel_done();
      });
    },
    function(parallel_done) {
      connection.query(focusCountQuery, {}, function(err, res) {
        if (err) return parallel_done(err);
        data.total_checks = res[0].total_checks;
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


//requires access to the priject-data-api and the delete:sprint permission in order to visit the page 
app.patch('/fix-sprint-focus', jwtCheck, checkUpdateProjectScope, (req, res) => {
  const id = req.body.data.sprint_id;
  const isFocused = req.body.data.is_focused;
  const checkmarksCount = req.body.data.checkmarks_count;

  if (isFocused || checkmarksCount > 1) {
    connection.query(`UPDATE sprint SET focus_flag = 0 WHERE sprint_id != ${id}`, (err, result) => {
      if (err) throw new Error(err);
      res.end();
    });
  }
  if (checkmarksCount == 0){
    connection.query(`UPDATE sprint SET focus_flag = 1 ORDER BY sprint_id DESC limit 1`, (err, result) => {
      if (err) throw new Error(err);
      res.end();
    });
  }
  res.end();
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
  const name = req.body.data.newName;
  const owner = req.auth.payload.sub;
  const focus = req.body.data.focus ;
  const status = req.body.data.newStatus;
  const startDate = req.body.data.newStartDate;
  const dueDate = req.body.data.newDueDate;
  connection.query('INSERT INTO project SET ?', {
    name: name,
    owner: owner,
    project_status: status,
    focus_flag: focus,
    start_date: startDate,
    due_date: dueDate
  }, (err) => {
    if (err) throw new Error(err);
    connection.query('SELECT LAST_INSERT_ID() AS project_id', (err, result) => {
      if (err) throw new Error(err);
      const json = JSON.stringify(result);
      res.send(json);
    }); 
  });
});

app.put('/update-project-focus', jwtCheck, checkUpdateProjectScope, (req, res) => {
  const focused_id = req.body.data.project_id;
  const project_query = `UPDATE project SET focus_flag = 1 WHERE project_id = ${focused_id}`;
  const other_projects_query = `UPDATE project SET focus_flag = 0 WHERE project_id != ${focused_id}`;

  async.parallel([
    function(parallel_done) {
      connection.query(project_query, {}, function(err, res) {
        if (err) return parallel_done(err);
        parallel_done();
      });
    },
    function(parallel_done) {
      connection.query(other_projects_query, {}, function(err, res) {
        if (err) return parallel_done(err);
        parallel_done();
      });
    }
  ], function(err) {
    if (err) console.log(err);
      res.end();
  });
});


app.put('/update-sprint-focus', jwtCheck, checkUpdateProjectScope, (req, res) => {
  const focused_id = req.body.data.sprint_id;
  const sprint_query = `UPDATE sprint SET focus_flag = 1 WHERE sprint_id = ${focused_id}`;
  const other_sprints_query = `UPDATE sprint SET focus_flag = 0 WHERE sprint_id != ${focused_id}`;

  async.parallel([
    function(parallel_done) {
      connection.query(sprint_query, {}, function(err, res) {
        if (err) return parallel_done(err);
        parallel_done();
      });
    },
    function(parallel_done) {
      connection.query(other_sprints_query, {}, function(err, res) {
        if (err) return parallel_done(err);
        parallel_done();
      });
    }
  ], function(err) {
    if (err) console.log(err);
      res.end();
  });

});


//must have access to the project-data-api and the read:sprint permission in order to visit the page
app.get('/read-project', jwtCheck, checkReadProjectScope, (req, res) => {
  const id = req.query.requested_project_id || -1;
  const projectsQuery = (id != -1) ? `SELECT * FROM project WHERE project_id = ${id}` : `SELECT * FROM project WHERE focus_flag = 1 LIMIT 1`;
  const sprintsQuery = (id != -1) ? `SELECT * FROM sprint WHERE project_id = ${id} ORDER BY sprint_id DESC` : `SELECT * FROM sprint WHERE project_id = (SELECT * FROM project WHERE focus_flag = 1 LIMIT 1) ORDER BY sprint_id DESC`;
  const tasksQuery = (id != -1) ? `SELECT * FROM task WHERE project_id = ${id} ORDER BY task_id DESC` : `SELECT * FROM task WHERE project_id = (SELECT * FROM project WHERE focus_flag = 1 LIMIT 1) ORDER BY task_id DESC`;


  var data = {};

  async.parallel([
    function(parallel_done) { 
      connection.query(projectsQuery, {}, function(err, res) {
        if (err) return parallel_done(err);
        data.projects = res;
        parallel_done();
      });
    },
    function(parallel_done) {
      connection.query(sprintsQuery, {}, function(err, res) {
        if (err) return parallel_done(err);
        data.sprints = res;
        parallel_done();
      });
    },
    function(parallel_done) {
      connection.query(tasksQuery, {}, function(err, res) {
        if (err) return parallel_done(err);
        data.tasks = res;
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

//requires access to the priject-data-api and the delete:sprint permission in order to visit the page 
app.get('/fix-project-focus', jwtCheck, checkUpdateProjectScope, (req, res) => {
  const id = req.query.requested_project_id;
  const focusQuery = `SELECT focus_flag FROM project WHERE project_id = ${id}`;
  const focusCountQuery = `SELECT SUM(focus_flag = 1) AS total_checks FROM project`;

  var data = {};
  data.project_id = id;
  async.parallel([
    function(parallel_done) {
      connection.query(focusQuery, {}, function(err, res) {
        if (err) return parallel_done(err);
        data.focus_status = res[0].focus_flag;
        parallel_done();
      });
    },
    function(parallel_done) {
      connection.query(focusCountQuery, {}, function(err, res) {
        if (err) return parallel_done(err);
        data.total_checks = res[0].total_checks;
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


//requires access to the priject-data-api and the delete:sprint permission in order to visit the page 
app.patch('/fix-project-focus', jwtCheck, checkUpdateProjectScope, (req, res) => {
  const id = req.body.data.project_id;
  const isFocused = req.body.data.isFocused;
  const checkmarksCount = req.body.data.checkmarksCount;

  if (isFocused || checkmarksCount > 1) {
    connection.query(`UPDATE project SET focus_flag = 0 WHERE project_id != ${id}`, (err, result) => {
      if (err) throw new Error(err);
      res.end();
    });
  }
  if (checkmarksCount == 0){
    connection.query(`UPDATE project SET focus_flag = 1 ORDER BY project_id DESC limit 1`, (err, result) => {
      if (err) throw new Error(err);
      res.end();
    });
  }
  res.end();
});


//must have access to the project-data-api and the update:sprint permission in order to visit the page
app.patch('/update-project', jwtCheck, checkUpdateProjectScope, (req, res) => {
  const id = req.body.data.project_id;
  const newName = req.body.data.newName;
  const status = req.body.data.newStatus;
  const focus = req.body.data.focus;
  const startDate = req.body.data.newStartDate;
  const dueDate = req.body.data.newDueDate;
  const queryString = `UPDATE project SET ? WHERE project_id = ${id}`;
  let queryParams = { };
  if (newName) 
    queryParams.name = newName;
  if (status) 
    queryParams.project_status = status;

  queryParams.focus_flag = focus;
  if (startDate)
    queryParams.start_date = startDate;
  if (dueDate)
    queryParams.due_date = dueDate;

  connection.query(queryString, queryParams, (err) => {
    if (err) throw new Error(err);
    res.end(); //end the request
  });
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

