const express = require('express');
const router = express.Router();
const moment = require('moment-timezone')
const pool = require('../db.js'); 
const { checkAuthenticated } = require('../roleMiddleware.js')
const { checkNotAuthenticated} = require('../roleMiddleware.js')

router.get("/ecom", (req, res) => {
    res.render('ecom.ejs', {
        pageTitle: 'Goodwill Ecom'
    })
})










module.exports = router;