var PopBox = PopBox || {};

PopBox.Provision = function() {
};
PopBox.Provision.prototype = {
  'payload':
    '{\"spanish\": \"hola\", \"english\": \"hello\", \"to\":\"Mr Lopez\"}',
  'priority': 'H',
  'callback': 'http://foo.bar',
  'queue': [
    {
      'id': 'Ax'
    },
    {
      'id': 'Bx'
    }
  ],
  'expirationDelay': 360
};
