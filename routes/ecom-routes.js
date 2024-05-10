const express = require('express');
const router = express.Router();
const moment = require('moment-timezone')
const pool = require('../prod-db.js'); 
const { checkAuthenticated } = require('../roleMiddleware.js')
const { checkNotAuthenticated} = require('../roleMiddleware.js')

async function getAllEcom() {
    const result = await pool.query('SELECT * FROM ecom WHERE DATE(created_date) = (SELECT MAX(DATE(created_date)) FROM ecom) ORDER BY department')
    return result.rows;
}

router.get("/ecom", async(req, res) => {
    try {
        const ecom = await getAllEcom();
        console.log(ecom)
        res.render('ecom.ejs', {
        pageTitle: 'Goodwill Ecom',
        data: ecom,
        total_items: 0
    }) 
    } catch (error) {
        console.error(error)
    }
})



router.post("/newecom", checkAuthenticated, async(req, res) => {
    try {
        const user_name = req.user.name;
        const user_id = req.user.id;
        const created_date = moment().tz("America/Los_Angeles").format("YYYY-MM-DD");
        const first_tag = req.body.firsttag;
        const second_tag = req.body.secondtag;
        const item_count = req.body.itemcount;
        const department = req.body.department
        const newEntry = await pool.query(
            'INSERT INTO ecom (created_date, user_id, user_name, first_tag, second_tag, department, item_count) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [created_date, user_id, user_name, first_tag, second_tag, department, item_count  ]
        );
        res.redirect('/ecom')

    } catch (error) {
        console.error(error);
        res.redirect('/ecom');
    }
})






module.exports = router;