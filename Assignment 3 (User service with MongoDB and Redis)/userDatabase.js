/**
 * @file userDatabase.js
 * @author Joanna Li (li.j)
 * @par CS261
 */
const mongoOptions = {useUnifiedTopology : true};
const connectionString = 'mongodb://localhost:27017';
const MongoClient = require('mongodb').MongoClient;
const redis = require('redis');

// connect to redis server
redisClient = redis.createClient(6379, '127.0.0.1');
redisClient.on('error', (err) => console.log(err));
(async () => 
{
    await redisClient.connect();
})();

let users;  // users collection

module.exports = {mongoConnectServer, getUsersCollection, getRedisClient, insertKeyValuePair}

/**
 * @brief 
 *  Connects to the mongo server
 * 
 * @param callback 
 *  Function to pass error to
 * 
 * @return 
 *  Errors to the callback
 */
async function mongoConnectServer(callback)
{
    await MongoClient.connect(connectionString, mongoOptions, (err, mongoClient) => 
    {
        if(err != null)
        {
            return callback(err);
        }

        // create database (assignment3) and users collections
        let dB = mongoClient.db('assignment3');
        users = dB.collection('users');     
        
        return callback(err);
    });
}

/**
 * @brief 
 *  Retrieves the user collection
 *
 * @return 
 *  The user collection
 */
function getUsersCollection()
{
    return users;
}

/**
 * @brief 
 *  Retrieves redis client created
 *
 * @return 
 *  The redis client
 */
function getRedisClient()
{
    return redisClient;
}

/**
 * @brief 
 *  Helper function to set key-value to be stored in redis database
 *  and to set the key to expire after 10 seconds
 * 
 * @param formatOption
 *  Whether to store key as sessions or sessionsByUserId
 * 
 * @param sessionId 
 *  Session id to store as part of key
 * 
 * @param data 
 *  Value to be stored with key
 * 
 */
async function insertKeyValuePair(formatOption, id, data)
{
    let key;
    switch(formatOption)
    {
        case "userId":
            key = "sessionsByUserId:" + id;
            break;
        default:
            key = "sessions:" + id;
            break;
    }
    
    await redisClient.set(key, data);
    await redisClient.expire(key, 10);
}

