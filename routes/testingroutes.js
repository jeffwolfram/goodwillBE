const express = require('express');
const router = express.Router();
const moment = require('moment-timezone')
const pool = require('../prod-db.js'); 
const items = [
    {id: 1, name: "Receivers"},
    {id: 2, name: "TV"},
    {id: 3, name: "Monitor"},
    {id: 4, name: "Game Console"},
    {id: 5, name: "Game Controllers"},
    {id: 6, name: "Gaming Peripherals"},
    {id: 7, name: "Video Game"},
    {id: 8, name: "Router"},
    {id: 9, name: "Speakers"},
    {id: 10, name: "A/V Players"},
    {id: 11, name: "IOT"},
    {id: 12, name: "MISC"},
    {id: 13, name: "Keyboards"},
    {id: 14, name: "Printers"},
    {id: 15, name: "Turntable"},
    {id: 16, name: "Pro Audio"}
   
];
const { checkAuthenticated } = require('../roleMiddleware.js')
const { checkNotAuthenticated} = require('../roleMiddleware.js')


router.get('/testing', checkAuthenticated,  (req, res) => {
    
    const pacificTime = moment().tz("America/Los_Angeles").format();
    const currentDate = pacificTime.toString().split('T')[0];
    const userId = req.user.id;
    const userName = req.user.name;
 
    pool.query(
        'SELECT item_name, SUM(good_count) AS total_good, SUM(bad_count) AS total_bad FROM items WHERE user_id = $1 AND record_date = $2 GROUP BY item_name',
        [userId, currentDate],
        (error, itemResults) => {
            if (error) {
                console.error('Error fetching item data:', error);
                return res.status(500).send('Internal Server Error');
            }

            pool.query(
                'SELECT SUM(bad_count) AS total_bad, SUM(good_count) AS total_good FROM items WHERE user_id = $1 AND record_date = $2',
                [userId, currentDate],
                (error, totalsResults) => {
                    if (error) {
                        console.error('Error fetching total counts:', error);
                        return res.status(500).send('Internal Server Error');
                    }

                    const itemsMap = new Map();
                    itemResults.rows.forEach(row => {
                        itemsMap.set(row.item_name, { total_good: row.total_good, total_bad: row.total_bad });
                    });

                    const totalBad = totalsResults.rows[0].total_bad;
                    const totalGood = totalsResults.rows[0].total_good;

                    res.render('testing.ejs', {
                        items: items,
                        itemsMap: itemsMap,
                        totalBad: totalBad,
                        totalGood: totalGood,
                        pageTitle: "testing",
                        Date: currentDate,
                        name: userName,
                    });
                }
            );
        }
    );
});


router.post('/incrementGood/:id', checkAuthenticated, async (req, res) => {
    const userId = req.user.id;
    const userName = req.user.name;
    const itemId = parseInt(req.params.id);
    const item = items.find(i => i.id === itemId);

    if (item) {
        const now = new Date();
        const pacificTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000) - (7 * 3600000)); // Adjust -7 hours for PT
        const currentDate = pacificTime.toISOString().split('T')[0];
        const itemName = item.name;
        const goodCount = 1;
        

        try {
            
            const query = 'INSERT INTO items (record_date, item_name, user_id, user_name, item_id, good_count) VALUES ($1, $2, $3, $4, $5, $6)';
            await pool.query(query, [currentDate, itemName, userId, userName,  itemId, 1]);

            
        } catch (error) {
            console.error('Error updating the database:', error);
            res.status(500).send('Internal Server Error');
            return;
        }
    }

    res.redirect('/testing');
});

//bad count button

router.post('/incrementBad/:id', checkAuthenticated, async (req, res) => {
    const userId = req.user.id;
    const userName = req.user.name;
    const itemId = parseInt(req.params.id);
    const item = items.find(i => i.id === itemId);

    if (item) {
        const now = new Date();
        const pacificTime = new Date(now.getTime() - (now.getTimezoneOffset() * 60000) - (7 * 3600000)); 
        const currentDate = pacificTime.toISOString().split('T')[0];
        const itemName = item.name;
        const goodCount = 1;

        try {
            
            const query = 'INSERT INTO items (record_date, item_name, user_id, user_name,  item_id, bad_count) VALUES ($1, $2, $3, $4, $5, $6)';
            await pool.query(query, [currentDate, itemName, userId, userName, itemId, 1]);

            
        } catch (error) {
            console.error('Error updating the database:', error);
            res.status(500).send('Internal Server Error');
            return;
        }
    }

    res.redirect('/testing');
});



module.exports = router;