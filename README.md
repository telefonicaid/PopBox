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
#####Edit srv/config.js for configuration Options
### You can find some usage examples at examples folder

[API DOC](https://github.com/telefonicaid/PopBox/wiki/User-Manual)
