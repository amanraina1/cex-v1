import express from "express";
import bodyParser from 'body-parser';

const app = express();
app.use(bodyParser.json({}))

const TICKER = 'GOOGL';

interface Balances {
    [key: string]: number
}

interface User {
    userId: string,
    balances: Balances
}

interface Order {
    price: number;
    quantity: number;
    userId: string;
}

const users: User[] = [
    {
        userId: "1",
        balances: {
            'USD': 100000000,
            [TICKER]: 1040332
        }
    },
    {
        userId: "2",
        balances: {
            'USD': 10000,
            [TICKER]: 1040
        }
    }
];

const bids: Order[] = [];
const asks: Order[] = [];

app.post('/order', (req, res) => {
    const {userId, side, quantity, price} = req.body;

    const remainingQuantity = fillOrders(userId, side, quantity, price);

    if(remainingQuantity === 0) {
        res.status(200).json({message: 'Order placed successfully'});
        return;
    }

    if(side === 'bid') {
        const order: Order = {
            price, quantity, userId
        }
        bids.push(order);
        bids.sort((a,b) => a.price - b.price);
    } else {
        const order: Order = {
            price, quantity, userId
        }
        asks.push(order);
        asks.sort((a,b) => b.price - a.price);
    }
    res.status(200).json({message: 'Order partialy filled', filledQuantity: quantity-remainingQuantity});
});

app.get('/balance/:userId', (req, res) => {
    const {userId} = req.params;
    if(!userId) {
        res.json(400).json({message: "No user id found in the params"});
        return;
    }

    const user = users.find(user => user.userId === userId);
    if(!user) {
        res.json(400).json({message: "No user found with this id"});
        return;
    }

    res.json(200).json({message: "Here is your balance", balance: user.balances})
});

app.get('/depth', (req, res) => {
    let depth: {
        [price: string]: {
            type: 'bid'|'ask';
            quantity: number
        }
    } = {};

    for(let i=0; i<bids.length; i++) {
        if(!depth[bids[i]?.price]) {
            depth[bids[i]?.price] = {
                type: 'bid',
                quantity: bids[i]?.quantity
            }
        } else {
            depth[bids[i]?.price].quantity += bids[i]?.quantity;
        }
    }

    for(let i=0; i<asks.length; i++) {
        if(!depth[asks[i]?.price]) {
            depth[asks[i]?.price] = {
                type: 'ask',
                quantity: asks[i]?.quantity
            }
        } else {
            depth[asks[i]?.price].quantity += asks[i]?.quantity;
        }
    }
    res.status(200).json({message: 'Depth fetched successfully', depth})
});

function fillOrders(userId: string, side: 'bid'|'ask', quantity: number, price: number): number {
    let remainingQuantity = quantity;
    if(side === 'bid') {
        for(let i=asks.length-1; i>=0; i++) {
            // assuming the asks array is sorted, so if the 1st element is not matching 
            // means the later one will also not match, thats why breaking
            if(asks[i]?.price > price) break;

            if(asks[i]?.quantity >= quantity) {
                asks[i]?.quantity -= quantity;
                flipBalances(userId, asks[i]?.userId, quantity, price);
                return 0;
            } else {
                flipBalances(userId, asks[i]?.userId, quantity, price);
                asks.pop();
                remainingQuantity -= asks[i]?.quantity;
            }
        }
    } else {
            for(let i=bids.length-1; i>=0; i++) {
                // assuming the asks array is sorted, so if the 1st element is not matching 
                // means the later one will also not match, thats why breaking
                if(bids[i]?.price < price) break;

                if(bids[i]?.quantity >= quantity) {
                    bids[i]?.quantity -= quantity;
                    flipBalances(userId, bids[i]?.userId, quantity, price);
                    return 0;
                } else {
                    flipBalances(userId, bids[i]?.userId, quantity, price);
                    bids.pop();
                    remainingQuantity -= bids[i]?.quantity;
                }
            }
    }
    return remainingQuantity;
}

function flipBalances(userId1:string, userId2: string, quantity: number, price: number) {
    if(!userId1 || !userId2) return;

    const user1 = users.find(user => user.userId === userId1);
    const user2 = users.find(user => user.userId === userId2);

    if(!user1 || !user2) return;

    user1.balances[TICKER] -= quantity;
    user2.balances[TICKER] += quantity;

    user1.balances['USD'] -= (price*quantity);
    user2.balances['USD'] += (price*quantity);
}

app.listen(3001, () => {
    console.log('Listening...')
});