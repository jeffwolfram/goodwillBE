const express = require('express');
const router = express.Router();
const moment = require('moment-timezone')
const pool = require('../database2.js'); 
const { checkAuthenticated } = require('../roleMiddleware.js')
const { checkNotAuthenticated} = require('../roleMiddleware.js')
const {isAdmin, isLead, isManager} = require('../roleMiddleware')

async function getProcessingReport() {
    const result = await pool.query('SELECT * FROM processing ORDER BY id DESC LIMIT 1');
    return result.rows[0];
};




async function getUserTotalsForCurrentMonth() {
    try {
        const client = await pool.connect();
        
        // Get current date and start of the month
        const currentDate = new Date();
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        
        const result = await client.query(`
            SELECT users.name, 
                   SUM(numbers.amount) AS total_amount, 
                   SUM(numbers.number) AS total_number, 
                   COUNT(numbers.id) AS entry_count
            FROM numbers
            JOIN users ON numbers.user_id = users.id
            WHERE date_trunc('month', numbers.created_at) = date_trunc('month', current_date)
            GROUP BY users.name
            ORDER BY users.name;
        `);
        client.release();
        
        // Add average per entry to each user's data
        const userTotals = result.rows.map(user => {
            user.average_per_day = (user.total_amount / user.entry_count).toFixed(2);
            return user;
        });
        
        return userTotals;
    } catch (error) {
        throw error;
    }
}


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
     const userTotals = await getUserTotalsForCurrentMonth();
     const processing = await getProcessingReport();
     const dman = await getDmanReport();
     const ecom = await getAllEcom();
     
    
    res.render('dashboard.ejs', {
        pageTitle: "Daily Recap",
        processing: processing,
        dman: dman,
        ecom: ecom,
        items_total: 0, 
        userTotals: userTotals
        
        
        
    })
   } catch (error) {
    console.error(error)
    
   }
   
})


module.exports = router;