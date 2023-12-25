function isAdmin (req, res, next) {
    if (req.isAuthenticated() && req.user.role === 'admin') {
        return next()
    }
    res.status(403).send('Access Denied: You do not have permission to view this page and a message has been sent to admin about attempt')
}

function isManager (req, res, next) {
    if (req.isAuthenticated() && req.user.role === 'manager') {
        next()
    }
    res.status(403).send("You do not have access to this page.")
}

function isLead (req, res, next) {
    if (req.isAuthenticated() && req.user.role === "lead") {
        next()
    }
    res.status(403).send('You do not have access to this page.')
}
function isUser (req, res, next) {
    if (req.isAuthenticated() && req.user.role === "user") {
        next()
    } 
    res.status(403).send('You do not have access to this page. ')
}

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
    {id: 11, name: "Keyboards"},
    {id: 12, name: "MISC"}
   
];


module.exports = {
    isAdmin, 
    isLead, 
    isManager, 
    isUser,
    checkAuthenticated,
    checkNotAuthenticated,
    items
}