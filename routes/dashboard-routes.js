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

async function getAllEcom() {
    const result = await pool.query('SELECT * FROM ecom WHERE DATE(created_date) = (SELECT MAX(DATE(created_date)) FROM ecom) ORDER BY department')
    return result.rows;
}

async function getTestingReport() {
    const result = await pool.query(`
        SELECT 
            record_date, 
            user_id, 
            user_name, 
            item_name, 
            SUM(good_count) AS total_good, 
            SUM(bad_count) AS total_bad 
        FROM 
            items 
        WHERE 
            record_date = (SELECT MAX(record_date) FROM items)
        GROUP BY 
            record_date, user_id, user_name, item_name 
        ORDER BY 
            user_name, item_name
    `);

    return result.rows;
}


router.get('/dashboard', checkAuthenticated, isAdmin, async(req, res) => {
   try {
     const processing = await getProcessingReport();
     const dman = await getDmanReport();
     const data = await getTestingReport();
     const ecom = await getAllEcom();
     const testing = {};
     data.forEach(item => {
        if (!testing[item.user_name]) {
            testing[item.user_name] = [];
        }
        testing[item.user_name].push(item);
     });
     console.log(testing);
    res.render('dashboard.ejs', {
        pageTitle: "Daily Recap",
        processing: processing,
        dman: dman,
        testing: testing,
        ecom: ecom,
        items_total: 0
        
    })
   } catch (error) {
    console.error(error)
    
   }
   
})


module.exports = router;