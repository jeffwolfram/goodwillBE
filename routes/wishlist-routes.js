const express = require('express');
const router = express.Router();
const moment = require('moment-timezone')
const pool = require('../db'); 
const { checkAuthenticated } = require('../roleMiddleware.js')
const { checkNotAuthenticated} = require('../roleMiddleware.js')

async function getAllItems() {
    const result = await pool.query('SELECT id, item  FROM wishlist');
    return result.rows
}

async function getLastMotd() {
    const result = await pool.query('SELECT * FROM motd ORDER BY id DESC LIMIT 1');
    return result.rows
}

async function deleteItemsByIds(ids) {
    const query = 'DELETE FROM wishlist WHERE id = ANY($1)';
    await pool.query(query, [ids]);
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

router.get('/motd', checkAuthenticated, async(req, res) => {
    
    try {
        const motd = getLastMotd();
        res.render('motd.ejs', {
            motd: motd, 
            pageTitle: "Goodwill",
            userName: req.user.name
            
        });
        
    } catch (error) {
        
    }
})

router.get('/wishlist-delete', checkAuthenticated, async(req, res) => {
    try {
        const items = await getAllItems();
        res.render('wishlist-delete.ejs',{
            pageTitle: 'Goodwill',
            items: items,
    });
    } catch (error) {
        
    }
   
});
router.post('/wishlist-delete', checkAuthenticated, async (req, res) => {
    console.log("itemids " + req.body.itemIds)
    try {
        
        const itemIds = req.body.itemIds;
        if (!itemIds) {
            return res.status(400).send('No items specified for deletion');
        }

        // Convert to array if not already
        const idsToDelete = Array.isArray(itemIds) ? itemIds : [itemIds];

        // Assuming deleteItemsByIds is a function that takes an array of IDs and deletes them from the database
        await deleteItemsByIds(idsToDelete);

        res.redirect('/wishlist');
    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while deleting items');
    }
});




module.exports = router;