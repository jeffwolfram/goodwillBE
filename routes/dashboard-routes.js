const express = require('express');
const router = express.Router();
const moment = require('moment-timezone')
const pool = require('../prod-db.js'); 
const { checkAuthenticated } = require('../roleMiddleware.js')
const { checkNotAuthenticated} = require('../roleMiddleware.js')
const {isAdmin, isLead, isManager} = require('../roleMiddleware')


router.get('/dashboard', checkAuthenticated, isAdmin, (req, res) => {
    res.render('dashboard.ejs', {
        pageTitle: "Daily Recap"
    })
})


module.exports = router;