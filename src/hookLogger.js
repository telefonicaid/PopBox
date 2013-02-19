/**
 *Copyright 2012 Telefonica Investigación y Desarrollo, S.A.U
 *
 *This file is part of PopBox.
 *
 *PopBox is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
 *PopBox is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.
 *
 *You should have received a copy of the GNU Affero General Public License along with PopBox
 *. If not, seehttp://www.gnu.org/licenses/.
 *
 *For those usages not covered by the GNU Affero General Public License please contact with::dtc_support@tid.es

 * Created with JetBrains WebStorm.
 * User: mru
 * Date: 16/01/13
 * Time: 13:42
 */

//Aspects for logging
var hooker = require('hooker');

//add hooks for exported methods
var init = function(exp, logger){
  'use strict';
  hooker.hook(exp, {
  passName: true,
  pre: function(name){
    var arg = [].slice.call(arguments,1);
    logger.debug(name, arg);
  }
});
};

//hook to Redis
var redisCommands = [
  'append',
  'auth',
  'bgrewriteaof',
  'bgsave',
  'blpop',
  'brpop',
  'brpoplpush',
  'config get',
  'config set',
  'config resetstat',
  'dbsize',
  'debug object',
  'debug segfault',
  'decr',
  'decrby',
  'del',
  'discard',
  'echo',
  'exec',
  'exists',
  'expire',
  'expireat',
  'flushall',
  'flushdb',
  'get',
  'getbit',
  'getrange',
  'getset',
  'hdel',
  'hexists',
  'hget',
  'hgetall',
  'hincrby',
  'hkeys',
  'hlen',
  'hmget',
  'hmset',
  'hset',
  'hsetnx',
  'hvals',
  'incr',
  'incrby',
  'info',
  'keys',
  'lastsave',
  'lindex',
  'linsert',
  'llen',
  'lpop',
  'lpush',
  'lpushx',
  'lrange',
  'lrem',
  'lset',
  'ltrim',
  'mget',
  'monitor',
  'move',
  'mset',
  'msetnx',
  'multi',
  'object',
  'persist',
  'ping',
  'psubscribe',
  'publish',
  'punsubscribe',
  'quit',
  'randomkey',
  'rename',
  'renamenx',
  'rpop',
  'rpoplpush',
  'rpush',
  'rpushx',
  'sadd',
  'save',
  'scard',
  'sdiff',
  'sdiffstore',
  'select',
  'set',
  'setbit',
  'setex',
  'setnx',
  'setrange',
  'shutdown',
  'sinter',
  'sinterstore',
  'sismember',
  'slaveof',
  'smembers',
  'smove',
  'sort',
  'spop',
  'srandmember',
  'srem',
  'strlen',
  'subscribe',
  'sunion',
  'sunionstore',
  'sync',
  'ttl',
  'type',
  'unsubscribe',
  'unwatch',
  'watch',
  'zadd',
  'zcard',
  'zcount',
  'zincrby',
  'zinterstore',
  'zrange',
  'zrangebyscore',
  'zrank',
  'zrem',
  'zremrangebyrank',
  'zremrangebyscore',
  'zrevrange',
  'zrevrangebyscore',
  'zrevrank',
  'zscore',
  'zunionstore'
];

var initRedisHook = function(rc, logger){
  'use strict';
  hooker.hook(rc,redisCommands, {
    passName: true,
    pre: function(name){
      var arg = [].slice.call(arguments,1);
      logger.debug(name, arg);
  }});
};

exports.init = init;
exports.initRedisHook = initRedisHook;


