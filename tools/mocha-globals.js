"use strict";

var sinon = require ('sinon'),
  chai = require ('chai');

global.expect = chai.expect;
global.should = chai.should();

beforeEach(function(){
  global.sinon = sinon.sandbox.create();
});

afterEach(function(){
  global.sinon.restore();
});
