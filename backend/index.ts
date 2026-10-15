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
        bids.sort((a,b) => a.price < b.price ? 1: -1)
    } else {
        asks.push({userId, price, quantity});
        bids.sort((a,b) => a.price < b.price ? -1: 1)
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
    if(side === "bid") {

    }
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