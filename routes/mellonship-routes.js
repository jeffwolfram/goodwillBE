const express = require('express');
const router = express.Router();
const moment = require('moment-timezone')
const pool = require('../prod-db.js'); 
const { checkAuthenticated } = require('../roleMiddleware.js')
const { checkNotAuthenticated} = require('../roleMiddleware.js')

router.get('/mellonship', (req, res) => {
    res.render('mellonship.ejs', {
        pageTitle: "Melonship"
    })  
})

module.exports = router;