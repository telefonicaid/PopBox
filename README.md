POPBox
===
##Simple High-Performance High-Scalability Inbox Notification Service
####Do you need really simple queues to distribute your work through a P&C schema?
No configuration needed, just name your queue and use it
####Do you need huge amounts of really fast inboxes for all your clients?
Redis support really shines at this
####Do yo need to track the state of your notification messages?
Transient and historic state management
####Are you looking for a http client blocking communication mechanism?
Up to 10K **concurrent** connections per node, no resource gets wasted
####Do you want it 100% H-Scalable?
Scalability has been taken into account from the very beginning (not dynamic yet, but soon)
### Dependencies:
    Requires node.js 
        npm install package.json to install node modules dependencies
        node Agent.js to launch a PopBox Agent.        
    Requires REDIS
    Optional MongoDB (historic data support)
#####Edit src/config.js for configuration Options
### You can find some usage examples at examples folder

[API DOC](https://github.com/telefonicaid/PopBox/wiki/User-Manual)

#Installation Notes
First draft of the installation manual. Please contact us at dtc_support@tid.es if you have any trouble to include further refinements.

##Architecture overview
PopBox has a distributed architecture composed by processing nodes, aka. Agents, and data management nodes (Redis instances). Optionally we can provide a MongoDB in order to keep historic track of the state changes and error log.

The Agents will provide an stateless service with all the necessary operations for any of the roles: Provisioner (may produce and provision new messages to the queues), Consumers (may Pop messages from their inbox), Inspectors (may query transactions and queues to obtain right time information).

The overall architecture may be seen as a central DB cluster (with specialised nodes depending on stored data types) surrounded by N Agents interacting throught that cluster.


##Setup the config file
    At PopBox/src/config.js

In this file it is mandatory to stablish where reside the Redis DBs by stabilising the following properties:
###Queue Servers
```
exports.redisServers = [{host:'localhost'}, {host:'localhost', port:'6789'}];
```
A list of Redis servers to manage the different queues of the system. Queues will be distributed among the nodes (non elastic yet). '''If you have more than one Agent it is important to keep the same redisServers list in all of them'''.
###Transaction Servers
```
exports.tranRedisServer = {'localhost' [, port:]};
```
The hostname of the Redis Server intended to keep track of the transactions and their delivery state.

The same Redis instance may be used between transactions and queues.

###Historic support (opional)
```
exports.ev_lsnr.mongo_host = 'localhost';
exports.ev_lsnr.mongo_port = 27017;
```
Optionally you may indicate a MongoDB in order to keep track of historic data.


##Links and resources dependencies

```
Redis: http://redis.googlecode.com/files/redis-2.4.15.tar.gz
Mongo: http://www.mongodb.org/downloads
Node: http://nodejs.org (preferred v6.* not tested in v8)
```
###HTTPS Support
Popbox is expecting server certificates in order to stablish secure comunitions with secure boxes (BasicAuth-HTTPS).

You may enable the Secure behavior at config file:
```
/**
 *
 * @type {boolean}
 */
exports.enableSecure= true;
```
The certificates are located in /PopBox/utils/ by default, or you can choose your own path in the config file.
```
/**
 *
 * @type {String} absolute path for the certs and keys. Default will be chosen when empty.
 */
exports.agent.crt_path = "";
```
Epected files:
```
server.key
server.crt
```

To obtain them you may execute the following script (You must have openssl properly installed):
PopBox/utils/create_http_certificates.sh

or execute these commands:
```
openssl genrsa -des3 -out server.key 1024
openssl req -new -key server.key -out server.csr
cp server.key server.key.org
openssl rsa -in server.key.org -out server.key
openssl x509 -req -days 365 -in server.csr -signkey server.key -out server.crt
```
At this point you should be able to start all the processes: 
Redis 
External Systems (Optional)
Agents (node Agent.js)
