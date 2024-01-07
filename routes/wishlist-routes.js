const express = require('express');
const router = express.Router();
const moment = require('moment-timezone')
const pool = require('../db'); 
const { checkAuthenticated } = require('../roleMiddleware.js')
const { checkNotAuthenticated} = require('../roleMiddleware.js')

async function getAllItems() {
    const result = await pool.query('SELECT item FROM wishlist');
    return result.rows
}


router.get('/wishlist', checkAuthenticated, async(req, res) => {
    try {
        const items = await getAllItems();
        res.render('wishlist.ejs',{
            pageTitle: 'Goodwill',
            items: items,
    });
    } catch (error) {
        
    }
   
});

router.post('/wishlist', checkAuthenticated, async(req, res) => {
    try {
        const item = req.body.item.replace(/[&<>"]/g, function(tag) {
            const charsToReplace = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;'
            };
            return charsToReplace[tag] || tag;
        });
        console.log(item)
        const newEntry = await pool.query(
            'INSERT INTO wishlist (item) VALUES ($1) RETURNING *',
            [item]
        );
        res.redirect('/wishlist')

    } catch (err) {
        console.error(err.message);
        res.redirect('/wishlist')
    }
})

module.exports = router;