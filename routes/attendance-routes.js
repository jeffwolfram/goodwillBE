const express = require('express');
const router = express.Router();
const moment = require('moment-timezone')
const pool = require('../database2.js'); 
const { checkAuthenticated } = require('../roleMiddleware.js')
const { checkNotAuthenticated} = require('../roleMiddleware.js')

router.get('/attendance', (req, res) => {
    res.render('attendance.ejs', {
        pageTitle: 'Attendance'
    })
})





module.exports = router;