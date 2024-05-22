const express = require('express');
const router = express.Router();
const pool = require('../database2');
const { checkAuthenticated } = require('../roleMiddleware.js')
const { checkNotAuthenticated} = require('../roleMiddleware.js')
const {isAdmin, isLead, isManager} = require('../roleMiddleware')

router.get('/categories', checkAuthenticated, async (req, res) => {
    try {
        const result = await pool.query(`SELECT * FROM categories ORDER BY name ASC`);
        res.render('categories.ejs', { categories: result.rows, pageTitle: 'PriceList' })
    } catch (error) {
        console.error(error);
        res.send('An error occurred.')
    }
})

router.post('/categories', checkAuthenticated, async (req, res) => {
try {
    const { name } = req.body;
    await pool.query(`INSERT INTO categories (name) VALUES ($1)`, [name]);
    res.redirect('/categories');
} catch (error) {
    console.error(error);
    res.send('AN error occurred')
}
});



// Delete a category
router.post('/categories/delete/:id', checkAuthenticated, isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM categories WHERE id = $1', [id]);
        res.redirect('/categories');
    } catch (e) {
        console.error(e);
        res.send('An error occurred');
    }
});

// Get all items in a category
router.get('/categories/:id/items', checkAuthenticated, async (req, res) => {
    try {
        const categoryId = req.params.id;

        // Fetch the items for the category
        const itemsResult = await pool.query('SELECT * FROM priceditems WHERE category_id = $1', [categoryId]);
        const items = itemsResult.rows;

        // Fetch the category name
        const categoryResult = await pool.query('SELECT name FROM categories WHERE id = $1', [categoryId]);
        const categoryName = categoryResult.rows[0].name;

        // Render the items page with category name and items
        res.render('items.ejs', { items, pageTitle: 'Items', categoryId, categoryName });
    } catch (e) {
        console.error(e);
        res.send('An error occurred');
    }
});

router.get('/categories/edit/:id', checkAuthenticated, isAdmin, async (req, res) => {
    try {
        const categoryId = req.params.id;
        const result = await pool.query('SELECT * FROM categories WHERE id = $1', [categoryId]);
        const category = result.rows[0];
        res.render('edit-category.ejs', { category });
    } catch (e) {
        console.error(e);
        res.send('An error occurred');
    }
});


// Add a new item to a category
router.post('/categories/:id/items', checkAuthenticated, isAdmin, async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { name, price } = req.body;
        await pool.query('INSERT INTO priceditems (name, price, category_id) VALUES ($1, $2, $3)', [name, price, categoryId]);
        res.redirect(`/categories/${categoryId}/items`);
    } catch (e) {
        console.error(e);
        res.send('An error occurred');
    }
});

// Edit an item
router.post('/categories/:categoryId/items/edit/:itemId', checkAuthenticated, isAdmin, async (req, res) => {
    try {
        const { categoryId, itemId } = req.params;
        const { name, price } = req.body;
        await pool.query('UPDATE priceditems SET name = $1, price = $2 WHERE id = $3', [name, price, itemId]);
        res.redirect(`/categories/${categoryId}/items`);
    } catch (e) {
        console.error(e);
        res.send('An error occurred');
    }
});

router.post('/categories/edit/:id', checkAuthenticated, isAdmin, async (req, res) => {
    try {
        const categoryId = req.params.id;
        const { name } = req.body;
        await pool.query('UPDATE categories SET name = $1 WHERE id = $2', [name, categoryId]);
        res.redirect('/categories');
    } catch (e) {
        console.error(e);
        res.send('An error occurred');
    }
});

// Delete an item
router.post('/categories/:categoryId/items/delete/:itemId', checkAuthenticated, isAdmin, async (req, res) => {
    try {
        const { categoryId, itemId } = req.params;
        await pool.query('DELETE FROM priceditems WHERE id = $1', [itemId]);
        res.redirect(`/categories/${categoryId}/items`);
    } catch (e) {
        console.error(e);
        res.send('An error occurred');
    }
});
// all categories with all items
router.get('/categories-with-items', checkAuthenticated, async (req, res) => {
    try {
        // Fetch all categories
        const categoriesResult = await pool.query('SELECT * FROM categories');
        const categories = categoriesResult.rows;

        // Fetch items for each category
        for (let category of categories) {
            const itemsResult = await pool.query('SELECT * FROM priceditems WHERE category_id = $1', [category.id]);
            category.items = itemsResult.rows;
        }

        // Render the view with categories and items
        res.render('categoriesWithItems.ejs', { categories, pageTitle: 'Categories and Items' });
    } catch (e) {
        console.error(e);
        res.send('An error occurred');
    }
});


module.exports = router;