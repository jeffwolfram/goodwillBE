const express = require('express');
const router = express.Router();
const moment = require('moment-timezone')
const pool = require('../database2.js'); 
const { checkAuthenticated, isAdminOrSuperUser } = require('../roleMiddleware.js')
const { checkNotAuthenticated} = require('../roleMiddleware.js')

router.use((req, res, next) => {
    if (req.isAuthenticated()) {
        res.locals.user_name = req.user.name;
    }
    next()
})

router.get('/logs', checkAuthenticated, isAdminOrSuperUser, async (req, res) => {
    try {
        const pageTitle = "Logs";
        const result = await pool.query('SELECT * FROM logs ORDER BY datetime DESC');
        const logs = result.rows;
        res.render('logs', { logs, pageTitle });
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.send('An error occurred while fetching logs.');
    }
});


module.exports = router;