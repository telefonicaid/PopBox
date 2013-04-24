/**
 * Created with JetBrains WebStorm.
 * User: mru
 * Date: 24/10/12
 * Time: 09:12
 * To change this template use File | Settings | File Templates.
 */

var redisModule = require('redis');
var rc = redisModule.createClient(6379, 'localhost');
var keys = ['uno', 'dos', 'tres'];
var argv = [10];

var joined = keys.concat(argv);

var popScript = "\
local rollback = function(data, key)\n\
  for i, elem in pairs(data) do\n\
    redis.call('lpush',key, elem)\n\
  end\n\
end\n\
local rollbackAll = function(rollbackData)\n\
  for k,d in pairs(rollbackData) do\n\
    rollback(d, k)\n\
  end\n\
end\n\
local max = 0+ARGV[1]\n\
local err = nil\n\
local resultIndex=1\n\
local result={}\n\
local totalLength=0\n\
local rollbackData = {}\n\
for j, k in pairs(KEYS) do\n\
  if max > totalLength then\n\
    local data = redis.pcall('lrange', k, 0, max-1-totalLength)\n\
    local dataLength = table.getn(data)\n\
    local trimerr = redis.pcall('ltrim', k, dataLength, -1)\n\
    if ((not data.err) and (not trimerr.err)) then\n\
      rollbackData[k] = data\n\
    end\n\
    if (data.err or trimerr.err) then\n\
      rollbackAll(rollbackData)\n\
      if trimerr.err then return {err = trimerr.err} end\n\
      if data.err then return {err = data.err} end\n\
    end\n\
    result[resultIndex]=data\n\
    resultIndex = resultIndex + 1\n\
    totalLength = totalLength + dataLength\n\
   end\n\
end\n\
return result\n\
";


rc.eval(popScript, keys.length, joined, function(err, data) {
  'use strict';
  console.dir(err);
  console.dir(data);
});
