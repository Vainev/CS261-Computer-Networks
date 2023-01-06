/**
 * @file userRoute.js
 * @author Joanna Li (li.j)
 * @par CS261
 */
const uuid4 = require('uuid4');
const database = require('./userDatabase')
const ObjectId = require('mongodb').ObjectId;
const crypto = require('crypto');

const gamePort = parseInt(process.env.GAMEPORT);
const secret = process.env.SHAREDSECRET;

module.exports = {createUser, createSession, retrieveUser, updateUser, connectToGame};

/**
 * @brief 
 *  Helps rename the _id to id for the document to be returned in response
 * 
 * @param obj
 *  The document to rename the id field   
 * 
 * @return 
 *  The document with the renamed id field
 */
function renameIdKey(obj)
{
    let doc = JSON.parse(JSON.stringify(obj));
    doc["id"] = doc["_id"];
    delete doc["_id"];

    return doc;
}

/**
 * @brief 
 *  All post requests that end in /users will be called by this funciton 
 *  Creates a new user with the following info
 *  - id (generated by base64url based on username)
 *  - username, password, and avatar
 * 
 * @param req 
 *  The request body (username, password, avatar)    
 * @param res
 *  The response body
 * 
 * @return 
 *  Info regarding the new user that was created (id, username, password, avatar), 
 *  else it will return the appropriate error codes.
 */
async function createUser(req, res)
{
    const users = database.getUsersCollection();

    // Make sure we dont already have an user with the same username
    const foundUser = await users.findOne({username : req.body.username});
    if(foundUser)
    {
        return res.sendStatus(409);
    }

    await users.insertOne({username : req.body.username, password : req.body.password, avatar : req.body.avatar});
    
    let doc = await users.findOne({username : req.body.username});
    return res.json(renameIdKey(doc));
};

/**
 * @brief 
 *  All post requests that end in /login will be called by this funciton 
 *  Creates a new session for the specified user with the following info
 *  - id (id of user of the new session)
 *  - session (random ID generated by uuid4)
 * 
 * @param req 
 *  The request body (username, password)
 * @param res
 *  The response body
 * 
 * @return 
 *  The session ID, else it will return the appropriate error codes
 */
async function createSession(req, res)
{
    const users = database.getUsersCollection();
    const redisClient = database.getRedisClient();

    const foundUser = await users.findOne({username : req.body.username});
    if(!foundUser)
    {
        return res.sendStatus(400);
    }
    else if(JSON.parse(JSON.stringify(foundUser)).password != req.body.password)
    {
        return res.sendStatus(403);
    }

    const userId = JSON.parse(JSON.stringify(foundUser))._id;
    let key = 'sessionsByUserId:' + userId;
    const foundSession = await redisClient.get(key);

    // only one session should be active per user, so if a session is found for the user
    // remove that session (sessions:sessionId and sessionsByUserId:userId) and then create a new one
    if(foundSession)
    {
        await redisClient.del(key);

        key = "sessions:" + foundSession;
        await redisClient.del(key);
    }
   
    const sessionId = uuid4();
    await database.insertKeyValuePair("session", sessionId, sessionId);
    await database.insertKeyValuePair("userId", userId, sessionId);

    return res.json({session : sessionId});
};

/**
 * @brief 
 *  All post requests that end in /connect will be called by this funciton.
 *  Retrieves the username and avatar of the owner of the session along with 
 *  game port they should be using and a token thats calculated.
 * 
 * @param req 
 *  The request body (game type, session)
 * @param res
 *  The response body
 * 
 * @return 
 *  The username, avatar, game port, and token for the user,
 *  else it will return the appropriate error codes
 */
async function connectToGame(req, res)
{
    if(!req.body.game_type)
    {
        return res.sendStatus(400);
    }

    const redisClient = database.getRedisClient();
    const foundSession = await redisClient.get(`sessions:${req.body.session}`);
    if(!foundSession)
    {
        return res.sendStatus(401);
    }

    let userIdKeys = await database.findSessionUserIds();
    let foundId;

    // check which id is associated with the session given
    for(i = 0; i < userIdKeys.length; i++)
    {
        let userSession = await redisClient.get(userIdKeys[i]);
        if(userSession == foundSession)
        {
            foundId = userIdKeys[i].substring(userIdKeys[i].indexOf(':') + 1);
            break;
        }
    }

    // find the user by the id found
    const users = database.getUsersCollection()
    let foundUser = await users.findOne({_id : ObjectId(foundId)});
    if(foundUser)
    {
        let token = foundUser.username + foundUser.avatar + req.body.game_type + secret;
        let result = 
        {
            username: foundUser.username,
            avatar: foundUser.avatar,
            game_port: gamePort,
            token: crypto.createHash('sha256').update(token).digest('base64'),
        }

        return res.json(result);
    }
};

/**
 * @brief 
 *  All get requests that end in /users will be called by this function.
 *  Retrieves information about the specified user by the user ID given or username given. 
 *  - id (id of user of the new session)
 *  - session (random ID generated by uuid4)
 * 
 * @param req 
 *  The request body (id, session), username is passed on a query string
 * @param res
 *  The response body
 *  
 * @return 
 *  The user ID, username, password, and avatar, else it will return the appropriate error codes.
 *  The password is only returned if the user is the owner of the session.
 */
async function retrieveUser(req, res)
{
    const redisClient = database.getRedisClient();
    
    const foundSession = await redisClient.get(`sessions:${req.body.session}`);
    if(!foundSession)
    {
        return res.sendStatus(401);
    }
    
    const users = database.getUsersCollection();
    let foundUser;

    // Check if need to find user by id or username
    if(Object.keys(req.query).length === 0 && req.params.id)
    {
        if(ObjectId.isValid(req.params.id))
        {
            foundUser = await users.findOne({_id : ObjectId(req.params.id)});
        }
    }
    else
    {
        foundUser = await users.findOne({username : req.query.username});
        if(Object.is(req.query.username, undefined))
        {
            return res.sendStatus(400);
        }
    }

    if(!foundUser)
    {
        return res.sendStatus(404);
    }

    const userId = JSON.parse(JSON.stringify(foundUser))._id;
    const key = "sessionsByUserId:" + userId;
    const userSession = await redisClient.get(key);

    // return all the info regarding the user along with the password if
    // user is the owner of the session, else return without the password
    if(userSession == foundSession)
    {
        return res.json(renameIdKey(foundUser));
    }

    return res.json((({id, username, avatar}) => ({id, username, avatar}))(renameIdKey(foundUser)));
}

/**
 * @brief 
 *  All put requests that end in /users will be called by this function.
 *  Updates the specified user. Only owner of the session given may update itself.
 * 
 * @param req 
 *  The request body (id, session, password, avatar)
 * @param res
 *  The response body
 *  
 * @return 
 *  The updated user info, else it will return the appropriate error codes.
 */
async function updateUser(req, res)
{
    const redisClient = database.getRedisClient();
    const users = database.getUsersCollection()

    const key = "sessionsByUserId:" + req.params.id;
    const userSession = await redisClient.get(key);
    
    const foundSession = await redisClient.get(`sessions:${req.body.session}`);

    let foundUser;
    if(ObjectId.isValid(req.params.id))
    {
        foundUser = await users.findOne({_id : ObjectId(req.params.id)});
    }

    if(!foundSession)
    {
        return res.sendStatus(401);
    }
    else if(!foundUser)
    {
        return res.sendStatus(404);
    }
    else if(userSession != foundSession)
    {
        // makes sure updating fails on a different user by
        // checking if owner of the session given is the user(id) given
        return res.sendStatus(403);
    }

    let setCommands = {$set : {_id : ObjectId(req.params.id), username : req.body.username, 
                       password : req.body.password, avatar : req.body.avatar}};
    let setOptions = { upsert: false, returnDocument : 'after'};

    await users.findOneAndUpdate({_id : ObjectId(req.params.id)}, setCommands, setOptions, (err, result) =>
    {
        return res.send(renameIdKey(result.value));
    })
}
