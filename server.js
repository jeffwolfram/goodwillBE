// Environment variables setup
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}
const path = require('path');
const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const initializePassport = require('./passport-config');
const pool = require('./db'); // Your PostgreSQL connection
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

app.get('/', checkAuthenticated, (req, res) => {
    console.log(process.env.ACCESS_TOKEN_SECRET)
    res.render('index.ejs', { 
        name: req.user.name,
        pageTitle: 'Welcome'
    });
});

app.get('/login', checkNotAuthenticated, (req, res) => {
    pageTitle: 'login'
    res.render('login.ejs');
});
app.get('/testing', (req, res) => {
    res.render('testing.ejs', {
        pageTitle: 'testing'
    });
})

app.get('/newuser', checkAuthenticated, (req, res) => {
    console.log(req.user)
    res.render('newuser.ejs');
});

// add users
app.post('/newuser', async (req, res) => {
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

app.get('/users',checkAuthenticated, async (req, res) => {
    try {
        const users = await getAllUsers();
        console.log(req.user)
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
        const userIds = req.body.userId; // This will be an array of user IDs
        console.log(userIds)
        // Ensure userIds is an array
        const idsToDelete = Array.isArray(userIds) ? userIds : [userIds];

        // Construct query to delete users
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

