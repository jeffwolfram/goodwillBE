
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const path = require('path');
const port = process.env.PORT || 5000;
const moment = require('moment-timezone')
const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const initializePassport = require('./passport-config');
const pool = require("./db"); 
const e = require('express');
const {isAdmin, isLead, isManager} = require('./roleMiddleware')
initializePassport(passport);
const testingRoutes = require('./routes/testingroutes')
const reportRoutes = require('./routes/report-routes')
const app = express();
const { checkAuthenticated } = require('./roleMiddleware.js')
const { checkNotAuthenticated} = require('./roleMiddleware.js')
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
    {id: 12, name: "Keyboards"}
   
];

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


app.use(reportRoutes)
app.use(testingRoutes)

app.get('/newuser', isAdmin, checkAuthenticated, (req, res) => {
    res.render('newuser.ejs', {
        pageTitle: 'Add User'
    });
});

// add users
app.post('/newuser', isAdmin, checkAuthenticated, async (req, res) => {
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







app.listen(port, () => {
    console.log('Server started on port ' + port);
});

