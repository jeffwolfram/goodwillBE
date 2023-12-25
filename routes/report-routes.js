const express = require('express');
const router = express.Router();
const moment = require('moment-timezone')
const pool = require('../db'); 
const { checkAuthenticated } = require('../roleMiddleware.js')
const { checkNotAuthenticated} = require('../roleMiddleware.js')
const months = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
 ]
const items = [
    {id: 1, name: "Receivers"},
    {id: 2, name: "TV"},
    {id: 3, name: "Monitor"},
    {id: 4, name: "Game Console"},
    {id: 5, name: "Game Controllers"},
    {id: 6, name: "Video Game"},
    {id: 7, name: "Router"},
    {id: 8, name: "Speakers"},
    {id: 9, name: "A/V Players"},
    {id: 10, name: "IOT"},
    {id: 11, name: "MISC"},
    {id: 12, name: "Keyboards"}
   
];

router.get('/reports', checkAuthenticated,(req, res) => {
    res.render('reports.ejs', {
        pageTitle: 'Reports',
        items: items,
        months: months

    });
});

router.get('/todays-results', checkAuthenticated, async (req, res) => {
    const today = moment.tz("America/Los_Angeles").format('YYYY-MM-DD');
    const query = `
    SELECT record_date, user_id, user_name, item_name, SUM(good_count) AS total_good, SUM(bad_count) AS total_bad 
    FROM items 
    WHERE record_date = $1 
    GROUP BY record_date, user_id, user_name, item_name
    ORDER BY user_name, item_name;
    `;

    try {
        const results = await pool.query(query, [today]);
        const usersData = {};

        results.rows.forEach(row => {
            if (!usersData[row.user_name]) {
                usersData[row.user_name] = [];
            }
            usersData[row.user_name].push(row);
        });

        res.render('daily.ejs', { 
            usersData: usersData,
            pageTitle: "Today's Reports"
        });
    } catch (error) {
        console.error('Error fetching data: ', error);
        res.status(500).send('Internal Server Error');
    }
});

router.post('/get-report', checkAuthenticated, (req, res) => {
    const { startYear, startMonth, startDay, endYear, endMonth, endDay } = req.body

    const startDate = moment.tz(`${startYear}-${startMonth}-${startDay}`, "America/Los_Angeles");
    const endDate = moment.tz(`${endYear}-${endMonth}-${endDay}`, "America/Los_Angeles").endOf('day');

    const formattedStartDate = startDate.format('YYYY-MM-DD');
    const formattedEndDate = endDate.format('YYYY-MM-DD');
    const query = `
    SELECT record_date, user_id, user_name, SUM(good_count) AS total_good, SUM(bad_count) AS total_bad 
    FROM items 
    WHERE record_date BETWEEN $1 AND $2 
    GROUP BY record_date, user_id , user_name
    ORDER BY record_date, user_id, user_name;
`;

    pool.query(query, [formattedStartDate, formattedEndDate], (error, results) => {
        if (error) {
            console.error('Error fetching data: ', error);
            return res.status(500).send('Internal Server Error');
        }
        res.render('reportresults.ejs', {
            data: results.rows,
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            pageTitle: "Goodwill Reports"
        })
    })
})









module.exports = router;