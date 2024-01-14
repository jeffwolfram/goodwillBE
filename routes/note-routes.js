const express = require('express');
const router = express.Router();
const moment = require('moment-timezone')
const pool = require('../prod-db.js'); 
const { checkAuthenticated } = require('../roleMiddleware.js')
const { checkNotAuthenticated} = require('../roleMiddleware.js')

router.get('/notes', (req, res) => {
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
            res.render('notes.ejs', {
                pageTitle: 'Notes',
                noteResults2: noteResults2
            });
        }
    );
});









module.exports = router;
