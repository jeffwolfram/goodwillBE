const express = require('express');
const router = express.Router();
const moment = require('moment-timezone')
const pool = require('../prod-db.js'); 
const { checkAuthenticated } = require('../roleMiddleware.js')
const { checkNotAuthenticated} = require('../roleMiddleware.js')

router.use((req, res, next) => {
    if (req.isAuthenticated()) {
        res.locals.user_name = req.user.name;
    }
    next()
})

router.get('/dman', checkAuthenticated, (req, res) => {
    res.render('dman.ejs', {
        pageTitle: 'DMAN',
        name: req.user.name
    })
})

router.post('/dman', checkAuthenticated, async(req, res) => {
    try {
        const cleaned = req.body.cleaned === 'on' ? true : false;
        const completed = !isNaN(parseInt(req.body.completed)) ? parseInt(req.body.completed) : 0 ;
        const full_pallets_created = !isNaN(parseInt(req.body.full_pallets_created)) ? parseInt(req.body.full_pallets_created) : 0 ;
        const created_date = moment().tz("America/Los_Angeles").format("YYYY-MM-DD");
        const userName = req.user.name;
        const notes = req.body.notes.replace(/[&<>"]/g, function(tag) {
            const charsToReplace = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;'
            };
            return charsToReplace[tag] || tag;
        });

        const newEntry = await pool.query(
            'INSERT INTO dman (cleaned, completed, full_pallets_created, notes, username, created_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [cleaned, completed, full_pallets_created, notes, userName, created_date]
        );
        res.redirect('/')
    } catch (err) {
        console.error(err.message)
        res.redirect('/dman')
    }
})

module.exports = router;