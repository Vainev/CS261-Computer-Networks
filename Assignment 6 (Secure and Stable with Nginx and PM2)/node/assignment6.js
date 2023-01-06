/**
 * @file assignment6.js
 * @author Joanna Li (li.j)
 * @par CS261
 */
const userRoute = require('./userRoute');
const database = require('./userDatabase')

const express = require('express');
const res = require('express/lib/response');
const port = process.env.PORT;
const app = express();

app.use(express.json());

// if mongo client connects to server then app listen will work
database.mongoConnectServer(function(err)
{
    if(err)
    {
        return console.log(err);
    }

    app.listen(port);

    app.post('/api/v1/users', userRoute.createUser);

    app.post('/api/v1/login', userRoute.createSession);

    app.post('/api/v1/connect', userRoute.connectToGame);

    app.get('/api/v1/users/:id', userRoute.retrieveUser);

    app.get('/api/v1/users?', userRoute.retrieveUser);

    app.put('/api/v1/users/:id', userRoute.updateUser);
});

