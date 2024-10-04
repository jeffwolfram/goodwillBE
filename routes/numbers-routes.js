const express = require('express');
const router = express.Router();
const moment = require('moment-timezone')
const pool = require('../database2.js'); 
const { checkAuthenticated } = require('../roleMiddleware.js')
const { checkNotAuthenticated} = require('../roleMiddleware.js')


function getDaysInPreviousMonth() {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const previousMonth = (currentMonth - 1 + 12) % 12;
    const previousMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    return new Date(previousMonthYear, previousMonth + 1, 0).getDate();
} 

async function getAllUsers() {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT * FROM users ORDER BY name ASC ');
        client.release(); 
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
        
        return result.rows[0]; 
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
        
        
        const userTotals = result.rows.map(user => {
            user.average_per_day = (user.total_amount / user.entry_count).toFixed(2);
            return user;
        });
        
        return userTotals;
    } catch (error) {
        throw error;
    }
}

// code for totals by month
router.get('/totals-by-month', checkAuthenticated, async (req, res) => {
    try {
        const selectedMonth = req.query.month || new Date().toISOString().slice(5, 7); // Default to current month
        const selectedYear = req.query.year || new Date().getFullYear(); // Default to current year

        // If no month and year are provided, show the form with the current month/year
        if (!req.query.month || !req.query.year) {
            return res.render('usertotals-by-month.ejs', {
                pageTitle: 'Select a Month and Year',
                dailyTotals: null, // No data yet, just showing the form
                selectedMonth: selectedMonth,
                selectedYear: selectedYear
            });
        }

        // SQL query to get totals for each user per day for the selected month and year
        const result = await pool.query(`
            SELECT 
                users.name AS user_name,
                numbers.created_at::date AS day,
                SUM(numbers.amount) AS total_amount,
                SUM(numbers.number) AS total_number
            FROM numbers
            JOIN users ON numbers.user_id = users.id
            WHERE EXTRACT(YEAR FROM numbers.created_at) = $1 
              AND EXTRACT(MONTH FROM numbers.created_at) = $2
            GROUP BY users.name, numbers.created_at::date
            ORDER BY numbers.created_at::date, users.name;
        `, [selectedYear, selectedMonth]);

        // Structure the data by day and user
        const dailyTotals = {};
        result.rows.forEach(row => {
            const day = row.day.toDateString();
            if (!dailyTotals[day]) {
                dailyTotals[day] = [];
            }
            dailyTotals[day].push({
                name: row.user_name,
                total_amount: row.total_amount,
                total_number: row.total_number
            });
        });

        // Render the view with the selected month's data
        res.render('usertotals-by-month.ejs', {
            pageTitle: `User Totals for ${selectedMonth}-${selectedYear}`,
            dailyTotals: dailyTotals,
            selectedMonth: selectedMonth,
            selectedYear: selectedYear
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});



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
        const users = await getAllUsers(); 
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
        const lastMonth = await getUserResultsLastMonth();  
        const highestAverageUser = await getUserWithHighestAverageNumber();
        const highestTotalAmount = await getUserWithHighestTotalAmountForMonth();
        const highestItemCount = await getUserWithHightestItemCountForMonth();
        const userTotals = await getUserTotalsForCurrentMonth();
        const totalAmounts = await getUserResultsLastMonth();  
        const daysInPreviousMonth = getDaysInPreviousMonth();
    
        res.render('userresults.ejs', {
            pageTitle: 'User Results (Last 30 Days)',
            users: users,
            results: results,
            totalAmounts: totalAmounts,  
            highestAverageUser: highestAverageUser || { name: 'N/A', highest_single_amount: 0 },
            highestTotalAmount: highestTotalAmount || { name: 'N/A', highest_single_number: 0 },
            highestItemCount: highestItemCount || { name: 'N/A', highest_item_count: 0 },
            daysInPreviousMonth: daysInPreviousMonth,
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
        const commonDate = req.body.commonDate; 

        
        for (const user of await getAllUsers()) {
            const amount = req.body[`amount_${user.id}`];
            const number = req.body[`number_${user.id}`];

            
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

    
    const itemaverage = parseFloat(amount) / parseInt(number);

    try {
        const client = await pool.connect();
        const query = 'UPDATE numbers SET amount = $1, number = $2, itemaverage = $3, created_at = $4 WHERE id = $5';
        await client.query(query, [amount, number, itemaverage, date, id]);
        client.release();

        res.redirect('/userresults'); 
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});


module.exports = router;