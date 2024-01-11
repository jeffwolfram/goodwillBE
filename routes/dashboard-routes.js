const express = require('express');
const router = express.Router();
const moment = require('moment-timezone')
const pool = require('../db.js'); 
const { checkAuthenticated } = require('../roleMiddleware.js')
const { checkNotAuthenticated} = require('../roleMiddleware.js')
const {isAdmin, isLead, isManager} = require('../roleMiddleware')

async function getProcessingReport() {
    const result = await pool.query('SELECT * FROM processing ORDER BY id DESC LIMIT 1');
    return result.rows[0];
};

async function getDmanReport() {
    const result = await pool.query('SELECT * FROM dman ORDER BY id DESC LIMIT 1');
    return result.rows[0];
}

router.get('/dashboard', checkAuthenticated, isAdmin, async(req, res) => {
   try {
     const processing = await getProcessingReport();
     const dman = await getDmanReport();
    res.render('dashboard.ejs', {
        pageTitle: "Daily Recap",
        processing: processing,
        dman: dman
    })
   } catch (error) {
    console.error(error)
    
   }
   
})


module.exports = router;