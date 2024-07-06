const express = require('express');
const router = express.Router();
const moment = require('moment-timezone')
const pool = require('../database2.js'); 
const { checkAuthenticated } = require('../roleMiddleware.js')
const { checkNotAuthenticated} = require('../roleMiddleware.js')



async function getAllUsers() {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM users ORDER BY name ASC ');
        client.release(); // Release the client back to the pool
        return result.rows;
    } catch (error) {
        throw error;
    }
}

async function getUserWithHighestTotalAmountForMonth() {
    try {
        const client = await pool.connect();
        
        const result = await client.query(`
                SELECT users.id AS user_id, 
                users.name, 
                MAX(numbers.amount) AS highest_single_amount
        FROM numbers
        JOIN users ON numbers.user_id = users.id
        WHERE date_trunc('month', numbers.created_at) = date_trunc('month', current_date)
        GROUP BY users.id, users.name
        ORDER BY highest_single_amount DESC
        LIMIT 1;
        `);
        client.release();
        
        return result.rows[0]; // Return the user with the highest total amount for the month
    } catch (error) {
        throw error;
    }
}

async function getUserWithHightestItemCountForMonth() {
    try {
        const client = await pool.connect();

        const result = await client.query(`
        SELECT users.id AS user_id,
        users.name, 
        MAX(numbers.number) AS highest_single_number
        FROM numbers
        JOIN users ON numbers.user_id = users.id
        WHERE date_trunc('month', numbers.created_at) = date_trunc('month', current_date)
        GROUP BY users.id, users.name
        ORDER BY highest_single_number DESC
        LIMIT 1;
        `);
        client.release();

        return result.rows[0];
        
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


async function getUserResultsLastMonth() {
    const query = `
          SELECT 
              SUM(numbers.amount) AS total_amount
          FROM 
              numbers
          JOIN 
              users ON numbers.user_id = users.id
          WHERE 
              numbers.created_at >= date_trunc('month', current_date) - interval '1 month'
              AND numbers.created_at < date_trunc('month', current_date);
      `;
      const result = await pool.query(query);
      return result.rows[0].total_amount || 0;
  }
async function getUserResultsLast30Days() {
    try {
        const client = await pool.connect();
        const result = await client.query(`
        SELECT 
        users.name, 
        numbers.amount, 
        numbers.id, 
        numbers.number, 
        numbers.itemaverage, 
        numbers.created_at
    FROM 
        numbers
    JOIN 
        users ON numbers.user_id = users.id
    WHERE 
        numbers.created_at >= date_trunc('month', current_date)
    ORDER BY 
        numbers.created_at DESC;
        `);
        client.release(); // Release the client back to the pool
        return result.rows;
    } catch (error) {
        throw error;
    }
}

async function getUserWithHighestAverageNumber() {
    try {
        const client = await pool.connect();
        
        const result = await client.query(`
        SELECT subquery.user_id, subquery.name, AVG(subquery.total_amount_per_day) AS average_total_amount_per_day
        FROM (
            SELECT users.id AS user_id, 
                   users.name, 
                   SUM(numbers.amount) AS total_amount_per_day, 
                   numbers.created_at::date
            FROM numbers
            JOIN users ON numbers.user_id = users.id
            WHERE date_trunc('month', numbers.created_at) = date_trunc('month', current_date)
            GROUP BY users.id, users.name, numbers.created_at::date
        ) AS subquery
        GROUP BY subquery.user_id, subquery.name
        ORDER BY average_total_amount_per_day DESC
        LIMIT 1;
        `);
        client.release();
        
        // Return the user with the highest average number per entry
        return result.rows[0];
    } catch (error) {
        throw error;
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
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

router.get('/userresults', checkAuthenticated, async (req, res) => {
    try {
        const users = await getAllUsers();
        const results = await getUserResultsLast30Days();
        const lastMonth = await getUserResultsLastMonth();  // This now calls the correct function
        const highestAverageUser = await getUserWithHighestAverageNumber();
        const highestTotalAmount = await getUserWithHighestTotalAmountForMonth();
        const highestItemCount = await getUserWithHightestItemCountForMonth();
        const userTotals = await getUserTotalsForCurrentMonth();
        const totalAmounts = await getUserResultsLastMonth();  // This now calls the correct function
    
        res.render('userresults.ejs', {
            pageTitle: 'User Results (Last 30 Days)',
            users: users,
            results: results,
            totalAmounts: totalAmounts,  // Updated to pass the total amount
            highestAverageUser: highestAverageUser || { name: 'N/A', highest_single_amount: 0 },
            highestTotalAmount: highestTotalAmount || { name: 'N/A', highest_single_number: 0 },
            highestItemCount: highestItemCount || { name: 'N/A', highest_item_count: 0 },
            userTotals: userTotals
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});



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
        const client = await pool.connect();
        const commonDate = req.body.commonDate; // Get the common date for all entries

        // Loop through each user
        for (const user of await getAllUsers()) {
            const amount = req.body[`amount_${user.id}`];
            const number = req.body[`number_${user.id}`];

            // Check if the amount and number were provided
            if (amount && number) {
                const itemaverage = parseFloat(amount) / parseInt(number);

                const query = 'INSERT INTO numbers (user_id, amount, number, itemaverage, created_at) VALUES ($1, $2, $3, $4, $5)';
                await client.query(query, [user.id, amount, number, itemaverage, commonDate]);
            }
        }

        client.release();
        res.redirect('/newnumbers');
    } catch (error) {
        console.error(error);
        client?.release();
        res.status(500).send('Internal Server Error');
    }
});


router.get('/editnumbers/:id', checkAuthenticated, async (req, res) => {
    const { id } = req.params;
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM numbers WHERE id = $1', [id]);
        client.release();

        if (result.rows.length > 0) {
            res.render('edit-numbers.ejs', {
                pageTitle: 'Edit Numbers',
                entry: result.rows[0]
            });
        } else {
            res.status(404).send('Number not found');
        }
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