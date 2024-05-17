
require('dotenv').config();

let pool;
if (process.env.NODE_ENV === 'production') {
    pool = require('./prod-db.js');
} else {
    pool = require('./db.js');
}

module.exports = pool;
