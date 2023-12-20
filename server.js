
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const path = require('path');
const moment = require('moment-timezone')
const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const initializePassport = require('./passport-config');
const pool = require('./db'); 
const e = require('express');
const {isAdmin, isLead, isManager} = require('./roleMiddleware')
initializePassport(passport);

const app = express();

app.set('view-engine', 'ejs');
app.use(express.static('public'));
app.set('views', path.join(__dirname, 'views'))
app.use(express.urlencoded({ extended: true }));
app.use(flash());
app.use(session({
    secret: process.env.ACCESS_TOKEN_SECRET,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

async function getAllUsers() {
    const result = await pool.query('SELECT * FROM users');
    return result.rows
}

async function getTotals() {
    const result = await pool.query('SELECT * FROM ')
}


app.get('/', checkAuthenticated, (req, res) => {
    res.render('index.ejs', { 
        name: req.user.name,
        pageTitle: 'Welcome'
    });
});

app.get('/login',  (req, res) => {
    pageTitle: 'login'
    res.render('login.ejs');
});


const items = [
    {id: 1, name: "Receivers"},
    {id: 2, name: "TV"},
    {id: 3, name: "Monitor"},
    {id: 4, name: "Game Console"},
    {id: 5, name: "Game Controllers"},
    {id: 6, name: "Video Game"},
    {id: 7, name: "Router"},
    {id: 8, name: "Speakers"},
    {id: 9, name: "A/V Players"},
    {id: 10, name: "IOT"},
    {id: 11, name: "MISC"},
   
];

const months = [
   1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
]

app.get('/reports', checkAuthenticated,(req, res) => {
    res.render('reports.ejs', {
        pageTitle: 'Reports',
        items: items,
        months: months

    });
});

app.post('/get-report', checkAuthenticated, (req, res) => {
    const { startYear, startMonth, startDay, endYear, endMonth, endDay } = req.body
    //start and end dates in pacific time

    const startDate = moment.tz(`${startYear}-${startMonth}-${startDay}`, "America/Los_Angeles");
    const endDate = moment.tz(`${endYear}-${endMonth}-${endDay}`, "America/Los_Angeles").endOf('day');

    //format dates
    const formattedStartDate = startDate.format('YYYY-MM-DD');
    const formattedEndDate = endDate.format('YYYY-MM-DD');
    console.log("formattedStartDate: " + formattedStartDate)
    console.log("formattedEndDate: " + formattedEndDate)
    const query = `
    SELECT record_date, user_id, user_name, SUM(good_count) AS total_good, SUM(bad_count) AS total_bad 
    FROM items 
    WHERE record_date BETWEEN $1 AND $2 
    GROUP BY record_date, user_id , user_name
    ORDER BY record_date, user_id, user_name;
`;

    pool.query(query, [formattedStartDate, formattedEndDate], (error, results) => {
        if (error) {
            console.error('Error fetching data: ', error);
            return res.status(500).send('Internal Server Error');
        }
        res.render('reportresults.ejs', {
            data: results.rows,
            startDate: formattedStartDate,
            endDate: formattedEndDate,
            pageTitle: "Goodwill Reports"
        })
    })
})

app.get('/testing', checkAuthenticated, (req, res) => {
    
    const pacificTime = moment().tz("America/Los_Angeles").format();
    const currentDate = pacificTime.toString().split('T')[0];
    const userId = req.user.id;
    const userName = "Jeff Wolfram"

    // Query to get itemized data
    pool.query(
        'SELECT item_name, SUM(good_count) AS total_good, SUM(bad_count) AS total_bad FROM items WHERE user_id = $1 AND record_date = $2 GROUP BY item_name',
        [userId, currentDate],
        (error, itemResults) => {
            if (error) {
                console.error('Error fetching item data:', error);
                return res.status(500).send('Internal Server Error');
            }

            // Query to get total bad count
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
                    });
                }
            );
        }
    );
});


  
// Handle incrementing "goodcount"

app.post('/incrementGood/:id', checkAuthenticated, async (req, res) => {
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

app.post('/incrementBad/:id', checkAuthenticated, async (req, res) => {
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
  



app.get('/newuser', checkAuthenticated, (req, res) => {
    console.log(req.user)
    res.render('newuser.ejs', {
        pageTitle: 'Add User'
    });
});

// add users
app.post('/newuser', checkAuthenticated, async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        await pool.query(
            'INSERT INTO users (name, email, role, hashed_password) VALUES ($1, $2, $3, $4)', 
            [req.body.name, req.body.email, req.body.role,  hashedPassword]
        );
        
        res.redirect('/newuser');
    } catch (e) {
        console.error(e);
        res.redirect('/newuser');
    }
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}));

app.get('/logout', (req, res) => {
    req.logout(function(err) {
        if (err) {
            return next(err);
        }
        res.redirect('/login')
    });
    
    
}) 

app.get('/users',checkAuthenticated, async (req, res) => {
    try {
        const users = await getAllUsers();
        res.render('users.ejs', { 
            users: users,
            pageTitle: 'Users'
         });
    } catch (e) {
        console.error(e);
        res.send('An error has occurred.')
    }
})

app.post('/delete-users', async (req, res) => {
    try {
        const userIds = req.body.userId; 
        
        const idsToDelete = Array.isArray(userIds) ? userIds : [userIds];

        
        const query = 'DELETE FROM users WHERE id = ANY($1)';
        await pool.query(query, [idsToDelete]);

        res.redirect('/users');
    } catch (e) {
        console.error(e);
        res.send('An error occurred');
    }
});

// Edit users
app.get('/edit-user/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
        if (result.rows.length > 0) {
            res.render('edit-user.ejs', {user: result.rows[0]});
        } else {
            res.send('User not found');
        }

    } catch (e) {
        console.error(e);
        res.send('An error has occurred.');
    }
});
// Edit users 
app.post('/edit-user/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { name, role, email } = req.body;
        

        await pool.query(
            'UPDATE users SET name = $1, role = $2, email = $3 WHERE id = $4',
            [name, role, email, id]
        );

        res.redirect('/users');
    } catch (e) {
        console.error(e);
        res.send('An error occurred');
    }
});


function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return res.redirect('/');
    }
    next();
}




app.listen(3000, () => {
    console.log('Server started on port 3000');
});

