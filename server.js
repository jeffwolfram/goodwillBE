require('dotenv').config()

const express = require('express');
const app = express();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')



app.use(express.json());

const users = []

const posts = [
    {
        username: 'Kyle',
        title: 'Post 1'
    },
    {
        username: 'Jeff',
        title: 'Post 2'
    }

]

app.get('/posts', (req, res) => {
    res.json(posts)
});

app.get('/users' , (req, res) => {
    res.json(users)
})

app.post('/users', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10)
        console.log(hashedPassword)
        const user = { name: req.body.name, password: hashedPassword }
        users.push(user)
        res.status(201).send()
    } catch {
        res.status(500).send()
    }
    
})

app.post('/users/login', async (req, res) => {
    const user = users.find(user => user.name = req.body.name)
    if (user == null) {
        return res.status(400).send('Can not find user')
    }
    try {
        if(await bcrypt.compare(req.body.password, user.password)) {
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
            res.json({ accessToken: accessToken });
            
        } else {
            res.send('Not Allowed')
        }
    } catch {
        res.status(500).send()
    }
    const username = req.body.username 
    const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET)
    res.json({ accessToken: accessToken })
})

app.listen(3000)