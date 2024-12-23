const express = require('express');
const router = express.Router();
const pool = require('../database2.js'); 
const { checkAuthenticated } = require('../roleMiddleware.js')
const { checkNotAuthenticated} = require('../roleMiddleware.js')
const {isAdmin, isLead, isManager, isAdminOrSuperUser, isAdminOrSuperUserOrLead } = require('../roleMiddleware')

// Route to display all items
router.get('/urtitems',checkAuthenticated, isAdminOrSuperUserOrLead, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM urtitems ORDER BY updated_at DESC');
        res.render('urt-items', {
            items: result.rows,
            pageTitle: 'All URT Items'
        });
    } catch (err) {
        console.error('Error retrieving items:', err);
        res.status(500).send('Server Error');
    }
});

// Route to display the form for creating a new item
router.get('/create-urtitem',checkAuthenticated, isAdminOrSuperUserOrLead, (req, res) => {
    res.render('create-urtitem');
});

// Route to handle creating a new item
router.post('/urtitems', checkAuthenticated, isAdminOrSuperUserOrLead, async (req, res) => {
    const { item, price } = req.body;
    try {
        await pool.query('INSERT INTO urtitems (item, price) VALUES ($1, $2)', [item, price]);
        res.redirect('/urtitems');
    } catch (err) {
        console.error('Error creating item:', err);
        res.status(500).send('Server Error');
    }
});

// Route to delete an item by id
router.post('/urtitems/delete/:id', checkAuthenticated, isAdminOrSuperUserOrLead, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM urtitems WHERE id = $1', [id]);
        res.redirect('/urtitems');
    } catch (err) {
        console.error('Error deleting item:', err);
        res.status(500).send('Server Error');
    }
});

// Route to display the edit form for a specific item
router.get('/urtitems/edit/:id', checkAuthenticated, isAdminOrSuperUserOrLead, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM urtitems WHERE id = $1', [id]);
        if (result.rows.length > 0) {
            res.render('edit-urtitem', { item: result.rows[0] });
        } else {
            res.status(404).send('Item not found');
        }
    } catch (err) {
        console.error('Error fetching item for editing:', err);
        res.status(500).send('Server Error');
    }
});

// Route to update an item
router.post('/urtitems/update/:id', checkAuthenticated, isAdminOrSuperUserOrLead, async (req, res) => {
    const { id } = req.params;
    const { item, price } = req.body;
    try {
        await pool.query('UPDATE urtitems SET item = $1, price = $2, updated_at = NOW() WHERE id = $3', [item, price, id]);
        res.redirect('/urtitems');
    } catch (err) {
        console.error('Error updating item:', err);
        res.status(500).send('Server Error');
    }
});

// Route to display the form for entering weights
router.get('/enter-weights', checkAuthenticated, isAdminOrSuperUserOrLead, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM urtitems ORDER BY item');
        res.render('weight-entry', { 
            items: result.rows,
            pageTitle: "Enter Item Weights" 
    });
    } catch (err) {
        console.error('Error retrieving items for dropdown:', err);
        res.status(500).send('Server Error');
    }
});

// Route to handle form submission and save weight data object and entries
router.post('/submit-weights',checkAuthenticated, isAdminOrSuperUserOrLead, async (req, res) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        let { submission_date, ponumber, container_number, sealnumber } = req.body;
        ponumber = ponumber === "" ? null : parseInt(ponumber);
        container_number = container_number === "" ? null : parseInt(container_number);
        sealnumber = sealnumber === "" ? null : parseInt(sealnumber);

        const result = await client.query(
            'INSERT INTO weight_data_objects (submission_date, ponumber, container_number, sealnumber) VALUES ($1, $2, $3, $4) RETURNING id',
            [submission_date, ponumber, container_number, sealnumber]
        );
        const weightDataObjectId = result.rows[0].id;
        const insertEntryQuery = 'INSERT INTO urt_item_weights (weight_data_object_id, item_id, weight, mellon) VALUES ($1, $2, $3, $4)';
        for (let i = 1; i <= 24; i++) {
            const itemId = req.body[`item_${i}`];
            const weight = req.body[`weight_${i}`];
            const mellon = req.body[`mellon_${i}`] === 'true'; 

            // Only process valid rows
            if (itemId && weight) {
                await client.query(insertEntryQuery, [weightDataObjectId, itemId, weight, mellon]);
            }
        }

        await client.query('COMMIT');
        res.redirect('/weight-data');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error saving weight data:', err);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});

// Route to display all weight data objects
router.get('/weight-data',checkAuthenticated, isAdminOrSuperUserOrLead, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM weight_data_objects ORDER BY submission_date DESC');
        res.render('weight-data-list', { 
            weightDataObjects: result.rows, 
            pageTitle: "URT List"
        });
    } catch (err) {
        console.error('Error retrieving weight data objects:', err);
        res.status(500).send('Server Error');
    }
});


// Route to render form to create a new weight data object
router.get('/weight-data/new',checkAuthenticated, isAdminOrSuperUserOrLead, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM urtitems ORDER BY item');
        res.render('weight-data-create', { 
            items: result.rows, 
            pageTitle: "Add Weight Data"
        });
    } catch (err) {
        console.error('Error retrieving items:', err);
        res.status(500).send('Server Error');
    }
});





// Route to display a specific weight data object with its items and weights
router.get('/weight-data/:id', checkAuthenticated, isAdminOrSuperUserOrLead, async (req, res) => {
    const { id } = req.params;
    try {
        const dataObjectResult = await pool.query(
            'SELECT * FROM weight_data_objects WHERE id = $1',
            [id]
        );
        if (dataObjectResult.rows.length === 0) {
            return res.status(404).send('Weight Data Object not found');
        }

        const dataObject = dataObjectResult.rows[0];
        const itemsResult = await pool.query(
            `SELECT urt_item_weights.id, urtitems.item, urt_item_weights.weight,urt_item_weights.mellon,  urtitems.price
             FROM urt_item_weights
             JOIN urtitems ON urt_item_weights.item_id = urtitems.id
             WHERE urt_item_weights.weight_data_object_id = $1`,
            [id]
        );
        res.render('view-weight-data', {
            dataObject,
            items: itemsResult.rows,
            pageTitle: "test"
        });
    } catch (err) {
        console.error('Error retrieving weight data object:', err);
        res.status(500).send('Server Error');
    }
});


// Route to display the edit form for a specific weight data object
router.get('/weight-data/:id/edit', checkAuthenticated, isAdminOrSuperUserOrLead, async (req, res) => {
    const { id } = req.params;
    try {
        const dataObjectResult = await pool.query('SELECT * FROM weight_data_objects WHERE id = $1', [id]);
        if (dataObjectResult.rows.length === 0) {
            return res.status(404).send('Weight Data Object not found');
        }
        let dataObject = dataObjectResult.rows[0];
        const itemsResult = await pool.query(
            `SELECT urt_item_weights.id, urtitems.item, urt_item_weights.weight, urt_item_weights.mellon
             FROM urt_item_weights
             JOIN urtitems ON urt_item_weights.item_id = urtitems.id
             WHERE urt_item_weights.weight_data_object_id = $1`,
            [id]
        );

        const existingItems = itemsResult.rows;
        const existingItemCount = existingItems.length;
        const newFieldsNeeded = 24 - existingItemCount;

        const allItemsResult = await pool.query('SELECT * FROM urtitems ORDER BY item');
        const allItems = allItemsResult.rows;

        res.render('edit-weight-data', {
            dataObject,
            items: existingItems,
            allItems,
            newFieldsNeeded
        });
    } catch (err) {
        console.error('Error retrieving weight data for editing:', err);
        res.status(500).send('Server Error');
    }
});





// Route to handle the update submission for a weight data object
router.post('/weight-data/:id/update', checkAuthenticated, isAdminOrSuperUserOrLead, async (req, res) => {
    const { id } = req.params;
    let { submission_date, ponumber, container_number, sealnumber } = req.body;
   

  
    ponumber = ponumber === "" ? null : parseInt(ponumber);
    container_number = container_number === "" ? null : parseInt(container_number);
    sealnumber = sealnumber === "" ? null : parseInt(sealnumber);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query(
            'UPDATE weight_data_objects SET submission_date = $1, ponumber = $2, container_number = $3, sealnumber = $4 WHERE id = $5',
            [submission_date, ponumber, container_number, sealnumber, id]
        );
        
        



        // Update existing items in urt_item_weights
        for (let i = 1; req.body[`existing_item_${i}`] && req.body[`existing_weight_${i}`]; i++) {
            const itemId = req.body[`existing_item_${i}`];
            const weight = parseInt(req.body[`existing_weight_${i}`], 10); 
            const mellon = req.body[`existing_no_mellon_${i}`] === 'true';
           
        

            if (itemId && weight) {

                const result = await client.query(
                    'UPDATE urt_item_weights SET weight = $1, mellon = $2 WHERE id = $3 AND weight_data_object_id = $4',
                    [weight, mellon, itemId, id]
                );

              
            }
        }

        // Insert new items in urt_item_weights
        for (let i = 1; req.body[`new_item_${i}`] && req.body[`new_weight_${i}`]; i++) {
            const newItemId = req.body[`new_item_${i}`];
            const newWeight = parseInt(req.body[`new_weight_${i}`], 10);
            const mellon = req.body[`new_mellon_${i}`] === 'true'; 
        
            if (newItemId && newWeight) {
                console.log(`Inserting new item ${newItemId} with weight ${newWeight}, mellon=${mellon}`);
                
                await client.query(
                    'INSERT INTO urt_item_weights (weight_data_object_id, item_id, weight, mellon) VALUES ($1, $2, $3, $4)',
                    [id, newItemId, newWeight, mellon] 
                );
            }
        }

        await client.query('COMMIT');
        res.redirect(`/weight-data/${id}`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating weight data:', err);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});


router.post('/weight-data/:id/delete', checkAuthenticated, isAdminOrSuperUserOrLead, async (req, res) => {
    const { id } = req.params;

    const client = await pool.connect();
    try {
        // Start a transaction
        await client.query('BEGIN');

        // Delete associated data from urt_item_weights
        const deleteWeightsResult = await client.query(
            'DELETE FROM urt_item_weights WHERE weight_data_object_id = $1',
            [id]
        );
        console.log(`Deleted ${deleteWeightsResult.rowCount} rows from urt_item_weights`);

        // Delete the weight_data_objects entry
        const deleteDataObjectResult = await client.query(
            'DELETE FROM weight_data_objects WHERE id = $1',
            [id]
        );
        console.log(`Deleted ${deleteDataObjectResult.rowCount} rows from weight_data_objects`);

        // Commit the transaction
        await client.query('COMMIT');
        console.log(`Successfully deleted weight data object with ID: ${id}`);
        res.redirect('/weight-data'); // Redirect to the weight data list or another appropriate page
    } catch (err) {
        // Rollback the transaction in case of an error
        await client.query('ROLLBACK');
        console.error('Error deleting weight data:', err);
        res.status(500).send('Server Error');
    } finally {
        client.release();
    }
});




router.get('/weight-data/:id/summary', checkAuthenticated, isAdminOrSuperUserOrLead, async (req, res) => {
    const { id } = req.params;
    try {
        const dataObjectResult = await pool.query(
            `SELECT submission_date, ponumber, sealnumber, container_number 
             FROM weight_data_objects 
             WHERE id = $1`,
            [id]
        );

        if (dataObjectResult.rows.length === 0) {
            return res.status(404).send('Data not found');
        }
        const dataObject = dataObjectResult.rows[0];
        const itemsResult = await pool.query(
            `SELECT urtitems.item AS itemname, urt_item_weights.weight, urtitems.price
             FROM urt_item_weights
             JOIN urtitems ON urt_item_weights.item_id = urtitems.id
             WHERE urt_item_weights.weight_data_object_id = $1`,
            [id]
        );

        
        const summary = {};
        itemsResult.rows.forEach(item => {
            const { itemname, weight, price } = item;
            if (!summary[itemname]) {
                summary[itemname] = { itemName: itemname, quantity: 0, totalWeight: 0, pricePerLb: price };
            }
            summary[itemname].quantity += 1;
            summary[itemname].totalWeight += weight;
        });

        
        const summarizedItems = Object.values(summary);
        res.render('summary', { summarizedItems, dataObject, pageTitle: "URT Shipment Summary" });
    } catch (err) {
        console.error('Error generating summary:', err);
        res.status(500).send('Server Error');
    }
});



router.get('/weight-data/:id/bill-of-lading', checkAuthenticated, isAdminOrSuperUserOrLead, async (req, res) => {
    const { id } = req.params;

    try {
        // Fetch the weight data object
        const dataObjectResult = await pool.query(
            'SELECT * FROM weight_data_objects WHERE id = $1',
            [id]
        );

        if (dataObjectResult.rows.length === 0) {
            return res.status(404).send('Weight Data Object not found');
        }

        const dataObject = dataObjectResult.rows[0];

        // Fetch associated items and weights
        const itemsResult = await pool.query(
            `SELECT urt_item_weights.id, urtitems.item, urt_item_weights.weight, urtitems.price, urt_item_weights.mellon
             FROM urt_item_weights
             JOIN urtitems ON urt_item_weights.item_id = urtitems.id
             WHERE urt_item_weights.weight_data_object_id = $1`,
            [id]
        );

        const items = itemsResult.rows;

        // Calculate totals
        let totalShippedWeight = 0;
        let totalURTWeight = 0;
        items.forEach(item => {
            totalShippedWeight += item.weight;
            totalURTWeight += item.mellon ? item.weight - 40 : item.weight - 90; // Adjusted weight based on mellon
        });

        

       
        res.render('bill-of-lading', {
            dataObject,
            totalShippedWeight,
            totalURTWeight,
            pageTitle: "bill of lading",
            items
        });
    } catch (err) {
        console.error('Error retrieving bill of lading:', err);
        res.status(500).send('Server Error');
    }
});

router.get('/weight-data/:id/sales-order', checkAuthenticated, isAdminOrSuperUserOrLead, async (req, res) => {
    const { id } = req.params;
    try {
        // Fetch the weight data object
        const dataObjectResult = await pool.query(
            'SELECT * FROM weight_data_objects WHERE id = $1',
            [id]
        );

        if (dataObjectResult.rows.length === 0) {
            return res.status(404).send('Weight Data Object not found');
        }

        const dataObject = dataObjectResult.rows[0];

        // Fetch item weights and prices, calculate total price
        const itemsResult = await pool.query(
            `SELECT uw.weight, ui.price 
             FROM urt_item_weights uw
             JOIN urtitems ui ON uw.item_id = ui.id
             WHERE uw.weight_data_object_id = $1`,
            [id]
        );

        // Calculate total price
        let totalPrice = 0;
        itemsResult.rows.forEach(item => {
            const adjustedWeight = item.weight; 
            const itemPrice = adjustedWeight * (item.price || 0); 
            totalPrice += itemPrice;
        });

        // Render the sales-order page
        res.render('sales-order-form', {
            dataObject,
            totalPrice,
        });
    } catch (err) {
        console.error('Error fetching sales order data:', err);
        res.status(500).send('Server Error');
    }
});




module.exports = router;
