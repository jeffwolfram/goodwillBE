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

module.exports = {
    isAdmin, 
    isLead, 
    isManager
}