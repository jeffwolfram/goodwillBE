const express = require('express');
const router = express.Router();
const moment = require('moment-timezone')
const pool = require('../db'); 
const { checkAuthenticated } = require('../roleMiddleware.js')
const { checkNotAuthenticated} = require('../roleMiddleware.js')

router.post('/motd', checkAuthenticated, async(req, res) => {
    try {
        const motd = req.body.motd.replace(/[&<>"]/g, function(tag) {
            const charsToReplace = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;'
            };
            return charsToReplace[tag] || tag;
        });
        const newEntry = await pool.query(
            'INSERT INTO motd (motd) VALUES ($1) RETURNING *',
            [motd]
        );
        res.redirect('/')

    } catch (err) {
        console.error(err.message);
        res.redirect('/wishlist')
    }
})

module.exports = router;