// Environment variables setup
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const initializePassport = require('./passport-config');
const pool = require('./db'); // Your PostgreSQL connection

initializePassport(passport);

const app = express();

app.set('view-engine', 'ejs');
app.use(express.static('public'));
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
    res.render('index.ejs', { name: req.user.name });
});

app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('login.ejs');
});

app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('register.ejs');
});

app.post('/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        await pool.query(
            'INSERT INTO users (name, email, hashed_password) VALUES ($1, $2, $3)', 
            [req.body.name, req.body.email, hashedPassword]
        );
        res.redirect('/login');
    } catch (error) {
        console.error(error);
        res.redirect('/register');
    }
});

app.post('/login', passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}));

app.get('/users', async (req, res) => {
    try {
        const users = await getAllUsers();
        res.render('users.ejs', { users: users });
    } catch (error) {
        console.error(error);
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
    } catch (error) {
        console.error(error);
        res.send('An error occurred');
    }
});

app.listen(3000, () => {
    console.log('Server started on port 3000');
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

