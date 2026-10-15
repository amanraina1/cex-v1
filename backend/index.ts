import express from "express";
import bodyParser from "body-parser";

const app = express();
app.use(bodyParser.json({}));

interface Balances {
    [key: string] : number
}

interface User {
    id: string;
    balances: Balances;
}

interface Order {
    userId: string;
    price: number;
    quantity: number;
}

export const TICKER = 'GOOGL';

const users: User[] = [
    {
        id: "1",
        balances: {
            'USD': 50000,
            'GOOGL': 10
        }
    },
    {
        id: "2",
        balances: {
            'USD': 100000,
            'GOOGL': 10
        }
    }
];

const bids: Order[] = [];
const asks: Order[] = [];

// app.post('/signup', (req, res) => {});
// app.post('/signin', (req, res) => {});

// Place a limit order
app.post('/order', (req: any, res: any) => {
    const side: string = req.body.side; // buy/bid or sell/ask
    const price: number = req.body.price;
    const quantity: number = req.body.quantity;
    const userId: string = req.body.userId;

    const remainingQuantity = fillOrders(side, price, quantity, userId);

    if(remainingQuantity == 0) {
        res.status(200).json({message: 'Order placed successfully!!', filledQuantity: quantity});
        return;
    }

    if(side === 'bid') {
        bids.push({userId, price, quantity});
        bids.sort((a,b) => a.price < b.price ? -1: 1)
    } else {
        asks.push({userId, price, quantity});
        bids.sort((a,b) => a.price < b.price ? 1: -1)
    }

    res.status(200).json({message: "Order partially filled", filledQuantity: quantity-remainingQuantity});
});

app.get('/depth', (req, res) => {

    let depth: {
        [price: string]: {
            type: 'bid'|'ask';
            quantity: string;
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

    res.status(200).json({message: "Successfull", depth})
})

function fillOrders(side, price, quantity, userId): number {
    // in this, we return 0, if quantity matches, if not then we return the remaining
    // there are things to keep in mind here, 
    // first, if the highest ask price is less than bid price, then its a early return as the array is sorted
    // second, if the quantity matches or its lower than the listed one, then also swap can happen otherwise not
    let remainingQuantity = quantity;
    if(side === "bid") {
        for(let i=asks.length-1; i>=0; i++) {
            if(asks[i]?.price > price) break;

            if(asks[i]?.quantity >= quantity) {
                asks[i]?.quantity -= quantity;
                flipBalances(asks[i]?.userId, userId, remainingQuantity, asks[i]?.price);
                return 0;
            } else {
                remainingQuantity -= asks[i]?.quantity;
                flipBalances(asks[i]?.userId, userId, asks[i]?.quantity, asks[i]?.price);
                asks.pop()
            }
        }
    } else {
        for(let i=bids.length-1; i>=0; i++) {
            if(bids[i]?.price < price) break;

            if(bids[i]?.quantity >= quantity) {
                bids[i]?.quantity -= quantity;
                flipBalances(bids[i]?.userId, userId, remainingQuantity, bids[i]?.price);
                return 0;
            } else {
                remainingQuantity -= bids[i]?.quantity;
                flipBalances(bids[i]?.userId, userId, bids[i]?.quantity, bids[i]?.price);
                bids.pop()
            }
        }
    }
    return remainingQuantity;
}

function flipBalances(userId1:string, userId2: string, quantity: number, price: number) {
    let user1 = users.find(user => user.id === userId1)
    let user2 = users.find(user => user.id === userId2)
    if(!user1 || !user2) return;

    user1.balances[TICKER] -= quantity;
    user2.balances[TICKER] += quantity;
    user1.balances['USD'] += (quantity * price);
    user1.balances['USD'] -= (quantity * price); 
}

app.get('/balance/:userId', (req, res) => {
    const user = users.find(user => user.id === req.params.userid);
    if(!user) {
        res.json({
            [TICKER]: 0,
            USD: 0
        })
        return;
    }

    res.status(200).json({balances: user.balances});
});

app.listen(3001, () => {
    console.log("Listening")
})

// Reference: https://www.youtube.com/watch?v=aEMBp9Bqfwc&t=690s