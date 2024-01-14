const express = require('express');
const router = express.Router();
const moment = require('moment-timezone')
const pool = require('../prod-db.js'); 
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
        const userName = req.user.name;
        const newEntry = await pool.query(
            'INSERT INTO motd (motd, username) VALUES ($1, $2) RETURNING *',
            [motd, userName]
        );
        res.redirect('/')

    } catch (err) {
        console.error(err.message);
        res.redirect('/wishlist')
    }
})

module.exports = router;