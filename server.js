if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const path = require('path');
const port = process.env.PORT || 5000;
const express = require('express');
const bcrypt = require('bcrypt');
const passport = require('passport');
const flash = require('express-flash');
const session = require('express-session');
const initializePassport = require('./passport-config');
const pool = require("./database2");
const { isAdmin, isLead, isManager, isSuperUser, isAdminOrSuperUser } = require('./roleMiddleware');
initializePassport(passport);

const app = express();
const { checkAuthenticated, checkNotAuthenticated } = require('./roleMiddleware');

// Middleware to serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(flash());
app.use(session({
    secret: process.env.ACCESS_TOKEN_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// Middleware to add authentication status to response locals
app.use((req, res, next) => {
    res.locals.isAuthenticated = req.isAuthenticated();
    if (req.isAuthenticated()) {
        res.locals.user = req.user.role;
        res.locals.user_name = req.user.name;
        res.locals.user_email = req.user.email;
    }
    next();
});
app.use((req, res, next) => {
    
    next();
});
// Routes
const testingRoutes = require('./routes/testingroutes');
const reportRoutes = require('./routes/report-routes');
const noteRoutes = require('./routes/note-routes');
const processingRoutes = require('./routes/processing-routes');
const dashboardRoutes = require('./routes/dashboard-routes');
const dmanRoutes = require('./routes/dman-routes');
const wishlistRoutes = require('./routes/wishlist-routes');
const motdRoutes = require('./routes/motd-routes');
const ecomRoutes = require('./routes/ecom-routes');
const mellonshipRoutes = require('./routes/mellonship-routes');
const numbersRoutes = require('./routes/numbers-routes');
const categoryRoutes = require('./routes/category-routes');

// Use routes
app.use(reportRoutes);
app.use(testingRoutes);
app.use(noteRoutes);
app.use(processingRoutes);
app.use(dashboardRoutes);
app.use(dmanRoutes);
app.use(wishlistRoutes);
app.use(motdRoutes);
app.use(ecomRoutes);
app.use(mellonshipRoutes);
app.use(numbersRoutes);
app.use(categoryRoutes);

app.get('/', checkAuthenticated, async (req, res) => {
    try {
        const motd = await getLastMotd();
        const items = await getAllItems();
        res.render('index.ejs', { 
            name: req.user.name,
            pageTitle: 'Welcome',
            items: items,
            motd: motd
        });
    } catch (error) {
        console.error(error);
    }
});

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




async function getAllUsers() {
    const result = await pool.query('SELECT * FROM users');
    return result.rows
}

async function getTotals() {
    const result = await pool.query('SELECT * FROM ')
}

async function getAllItems() {
    const result = await pool.query('SELECT item FROM wishlist');
    return result.rows
}

async function getLastMotd() {
    const result = await pool.query('SELECT motd, username FROM motd ORDER BY id DESC LIMIT 1');
    return result.rows
}

app.get('/', checkAuthenticated, async(req, res) => {
    
    try {
        const motd = await getLastMotd();
        const items = await getAllItems();
        res.render('index.ejs', { 
        name: req.user.name,
        pageTitle: 'Welcome',
        items: items,
        motd: motd
    });
    } catch (error) {
        console.error(error);
    }
   
});

app.get('/login',  (req, res) => {
    pageTitle: 'login'
    res.render('login.ejs');
});




app.get('/newuser', isAdminOrSuperUser, checkAuthenticated, (req, res) => {
    res.render('newuser.ejs', {
        pageTitle: 'Add User'
    });
});

// add users
app.post('/newuser', isAdminOrSuperUser, checkAuthenticated, async (req, res) => {
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

app.get('/profile', async (req, res) => {
    res.render('profile.ejs', {
        pageTitle: 'profile'
    })
})

app.get('/users',checkAuthenticated, isAdminOrSuperUser, async (req, res) => {
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
app.get('/edit-user/:id',checkAuthenticated, isAdminOrSuperUser, async (req, res) => {
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
app.post('/edit-user/:id', checkAuthenticated, isAdminOrSuperUser, async (req, res) => {
    try {
        const id = req.params.id;
        const { name, role, email, password } = req.body;
        
        const saltRounds = 10
        const hashedPassword = await bcrypt.hash(password, saltRounds)

        await pool.query(
            'UPDATE users SET name = $1, role = $2, email = $3, hashed_password = $4 WHERE id = $5',
            [name, role, email, hashedPassword, id]
        );

        res.redirect('/users');
    } catch (e) {
        console.error(e);
        res.send('An error occurred');
    }
});

app.get('/cps', (req, res) => {
    
 if (!req.isAuthenticated()) {
    return res.redirect('/login');
 }
 res.render('cps.ejs',  {
    pageTitle: "Change Password"
 })
})

app.post('/cps', async (req, res) => {
    try {
        const userId = req.user.id; // Adjust based on your session management
        const { oldPassword, newPassword, confirmPassword } = req.body;

        if (newPassword !== confirmPassword) {
            req.flash('error', 'New passwords do not match.');
            return res.redirect('/cps')
        }

        const user = await pool.query('SELECT hashed_password FROM users WHERE id = $1', [userId]);
        const match = await bcrypt.compare(oldPassword, user.rows[0].hashed_password);

        if (!match) {
            req.flash('error', 'Old Password was incorrect');
            res.redirect('/cps');
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        await pool.query('UPDATE users SET hashed_password = $1 WHERE id = $2', [hashedPassword, userId]);
        req.flash('success', 'Password successfully changed.');
        res.redirect('/');
    } catch (e) {
        console.error(e);
        req.flash('error', 'There was a problem changing the password. Make sure you entered them correctly');
        res.redirect('/cps');
    }
});


function toggleDropdown() {
    var dropdown = document.getElementById("myDropdown");
    if (dropdown.style.display === "block") {
      dropdown.style.display = "none";
    } else {
      dropdown.style.display = "block";
    }
  }



app.listen(port, () => {
    console.log('Server started on port ' + port);
});

