const express = require('express');
const router = express.Router();
const moment = require('moment-timezone')
const pool = require('../db'); 
const { checkAuthenticated } = require('../roleMiddleware.js')
const { checkNotAuthenticated} = require('../roleMiddleware.js')

router.get('/notes', (req, res) => {
    // Calculate the date 7 days ago
    const startDate = moment().tz("America/Los_Angeles").subtract(7, 'days').format('YYYY-MM-DD');

    pool.query(
        `SELECT * FROM notes WHERE created_date >= $1 ORDER BY username`,
        [startDate],
        (error, noteResults) => {
            if (error) {
                console.error('Error fetching notes:', error);
                return res.status(500).send('Internal Server Error');
            }
            const noteResults2 = noteResults.rows;
            console.log(noteResults2); // Log the results
            res.render('notes.ejs', {
                pageTitle: 'Notes',
                noteResults2: noteResults2
            });
        }
    );
});









module.exports = router;
