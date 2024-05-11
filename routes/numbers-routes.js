const express = require('express');
const router = express.Router();
const moment = require('moment-timezone')
const pool = require('../prod-db.js'); 
const { checkAuthenticated } = require('../roleMiddleware.js')
const { checkNotAuthenticated} = require('../roleMiddleware.js')



async function getAllUsers() {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM users');
        client.release(); // Release the client back to the pool
        return result.rows;
    } catch (error) {
        throw error;
    }
}

// Function to fetch user totals for the last 30 days
async function getUserDetailsAndTotalsLast30Days(userId) {
    try {
        const client = await pool.connect();
        const result = await client.query(`
            SELECT created_at::date AS date, amount, number
            FROM numbers
            WHERE user_id = $1
            AND created_at >= current_date - interval '30 days'
            ORDER BY created_at::date ASC;
        `, [userId]);
        const totalsResult = await client.query(`
            SELECT SUM(amount) AS total_amount, SUM(number) AS total_number
            FROM numbers
            WHERE user_id = $1
            AND created_at >= current_date - interval '30 days';
        `, [userId]);
        client.release();
        return { details: result.rows, totals: totalsResult.rows[0] };
    } catch (error) {
        throw error;
    }
}


async function getUserResultsLast7Days() {
    try {
        const client = await pool.connect();
        const result = await client.query(`
            SELECT users.name, numbers.amount, numbers.number, numbers.itemaverage, numbers.created_at
            FROM numbers
            JOIN users ON numbers.user_id = users.id
            WHERE numbers.created_at >= current_date - interval '7 days'
            ORDER BY numbers.created_at DESC
        `);
        client.release(); // Release the client back to the pool
        return result.rows;
    } catch (error) {
        throw error;
    }
}

router.get('/numbers', checkAuthenticated, (req, res) => {
    res.render('numbers.ejs', {
        pageTitle: "Daily numbers"
    })
})

router.get('/newnumbers', checkAuthenticated, async (req, res) => {
    try {
        const users = await getAllUsers(); // Fetch users from the database
        const currentDate = new Date().toISOString().split('T')[0];
        res.render('new-numbers.ejs', { 
            pageTitle: 'New Numbers',
            users: users,
            currentDate: currentDate
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

router.get('/userresults',checkAuthenticated, async (req, res) => {
    try {
        const users = await getAllUsers();
        const results = await getUserResultsLast7Days();
        res.render('userresults.ejs', {
            pageTitle: 'User Results (Last 7 Days)',
            users: users,
            results: results
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

// GET route to render the page displaying user totals for the last 30 days
router.get('/usertotals', checkAuthenticated, async (req, res) => {
    try {
        const userId = req.user.id;
        const { details, totals } = await getUserDetailsAndTotalsLast30Days(userId);
        res.render('usertotals.ejs', {
            pageTitle: 'Your Details and Totals (Last 30 Days)',
            details: details,
            totals: totals
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/newnumbers', checkAuthenticated, async (req, res) => {
    try {
        const { user, amount, number, date } = req.body;

        // Calculate itemaverage
        const itemaverage = parseFloat(amount) / parseInt(number);

        // Insert data into the numbers table
        const client = await pool.connect();
        const query = 'INSERT INTO numbers (user_id, amount, number, itemaverage, created_at) VALUES ($1, $2, $3, $4, $5)';
        await client.query(query, [user, amount, number, itemaverage, date]);
        client.release(); // Release the client back to the pool

        res.redirect('/newnumbers');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/editnumbers/:id', checkAuthenticated, async (req, res) => {
    const { id } = req.params;
    const { amount, number, date } = req.body;

    // Calculate itemaverage
    const itemaverage = parseFloat(amount) / parseInt(number);

    try {
        const client = await pool.connect();
        const query = 'UPDATE numbers SET amount = $1, number = $2, itemaverage = $3, created_at = $4 WHERE id = $5';
        await client.query(query, [amount, number, itemaverage, date, id]);
        client.release();

        res.redirect('/userresults'); // Redirect to a results page, or wherever appropriate
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
module.exports = router;