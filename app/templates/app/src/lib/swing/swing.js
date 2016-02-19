var global = window;

var Stack = require('lib/swing/stack'),
  Card = require('lib/swing/card');

global.gajus = global.gajus || {};

global.gajus.Swing = {
  Stack: Stack,
  Card: Card
};

module.exports = {
  Stack: Stack,
  Card: Card
};
