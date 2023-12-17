async function incrementGoodCount(itemId) {
    try {
        const response = await fetch('/ingrementGoodCount/${itemId}', {
            method: 'POST'
        });
        const data = await response.json();

        if (data.success) {
            return true;
        } else {
            console.error(data.message);
            return false;
        }
    } catch (error) {
        console.error('Error: ', error);
        return false;
    }
}

async function incrementBadCount(itemId) {
    try {
        const response = await fetch('/ingrementGoodCount/${itemId}', {
            method: 'POST'
        });
        const data = await response.json();

        if (data.success) {
            return true;
        } else {
            console.error(data.message);
            return false;
        }
    } catch (error) {
        console.error('Error: ', error);
        return false;
    }
}

export { incrementBadCount, incrementGoodCount };