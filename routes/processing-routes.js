const express = require('express');
const router = express.Router();
const moment = require('moment-timezone')
const pool = require('../db.js'); 
const { checkAuthenticated } = require('../roleMiddleware.js')
const { checkNotAuthenticated} = require('../roleMiddleware.js')

router.get('/processing',checkAuthenticated, (req, res) => {
    res.render('processing.ejs', {
        pageTitle: 'Processing'
    })
})

router.post('/processing', checkAuthenticated, async(req, res) => {
    try {
        const blue_tubs = req.body.blue_tubs === 'on' ? true : false;
        const trash_can = req.body.trash_can === 'on' ? true : false;
        const full_melon = req.body.full_melon === 'on' ? true : false;
        const cut_cables = req.body.cut_cables === 'on' ? true : false;
        const cleaned = req.body.cleaned === 'on' ? true : false;

        const melons_cleared = req.body.melons_cleared ? parseInt(req.body.melons_cleared) : 0;
        const blue_cleared = req.body.blue_cleared ? parseInt(req.body.blue_cleared) : 0;
        const gray_cleared = req.body.gray_cleared ? parseInt(req.body.gray_cleared) : 0;

        const notes = req.body.notes;
        const created_date = moment().tz("America/Los_Angeles").format("YYYY-MM-DD");
        const userName = req.user.name;

        const newEntry = await pool.query(
            'INSERT INTO processing (blue_tubs, trash_can, full_melon, cut_cables, cleaned, melons_cleared, blue_cleared, gray_cleared, username, created_date, notes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
            [blue_tubs, trash_can, full_melon, cut_cables, cleaned, melons_cleared, blue_cleared, gray_cleared, userName, created_date, notes]
        );
        res.redirect('/');
    } catch (err) {
        console.error(err.message);
        res.redirect('/processing')
    }
});



module.exports = router;