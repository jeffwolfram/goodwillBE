const express = require('express');
const router = express.Router();
const moment = require('moment-timezone')
const pool = require('../db'); 
const { checkAuthenticated } = require('../roleMiddleware.js')
const { checkNotAuthenticated} = require('../roleMiddleware.js')

router.get('/processing', (req, res) => {
    res.render('processing.ejs', {
        pageTitle: 'Processing'
    })
})


module.exports = router;