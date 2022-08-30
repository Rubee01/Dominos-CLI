#! /usr/bin/env node

import {Order, Customer, Item, Payment, NearbyStores, Tracking} from 'dominos';
import config from 'config';

console.log(config);

//extra cheese thin crust pizza
const pizza = new Item (
    {
        //16 inch hand tossed crust
        code: '14SCREEN',
        options: {
            //sauce, whole pizza : normal
            X: {'1/1' : '1'},
            //cheese, whole pizza : double
            C: {'1/1' : '2'},
            //pepperoni, whole pizza : double
            P: {'1/2' : '2'}
        }
    }
);

const customer = new Customer(
    {
        //this could be an Address instance if you wanted 
        address: config.get('address'),
        firstName: config.get('firstName'),
        lastName: config.get('lastName'),
        //where's that 555 number from?
        phone: config.get('phone'),
        email: config.get('email')
    }
);

const nearbyStores=await new NearbyStores(customer.address);

let storeID = 0;
let distance = 100;
//get closest delivery store
for(const store of nearbyStores.stores){
    //inspect each store
    //console.dir(store,{depth:3});
    if(
        //we check all of these because the API responses seem to say true for some
        //and false for others, but it is only reliably ok for delivery if ALL are true
        //this may become an additional method on the NearbyStores class.
        store.IsOnlineCapable 
        && store.IsDeliveryStore
        && store.IsOpen
        && store.ServiceIsOpen.Delivery
        && store.MinDistance<distance
    ){
        distance=store.MinDistance;
        storeID=store.StoreID;
        //console.log(store)
    }
}

if(storeID==0){
    throw ReferenceError('No Open Stores');
}

const order= new Order(customer); 

order.storeID=storeID;

// add pizza
order.addItem(pizza);
//validate order
await order.validate();
// get the price
await order.price();

const myCard=new Payment(
    {
        amount:order.amountsBreakdown.customer,
        
        // dashes are not needed, they get filtered out
        number: config.get('number'),
        
        //slashes not needed, they get filtered out
        expiration: config.get('expiration'),
        securityCode: config.get('securityCode'),
        postalCode: config.get('postalCode'),
        tipAmount: config.get('tipAmount')
    }
);

order.payments.push(myCard);

try {
    await order.place();
    const tracking=new Tracking();

    const trackingResult=await tracking.byPhone(customer.phone);

    //inspect the tracking info
    console.log('\n\nOrder Tracking\n\n');
    console.dir(trackingResult,{depth:3});
} catch(err){
// catch the error 
    console.trace(err);

    //inspect Order Response to see more information about the 
    //failure, unless you added a real card, then you can inspect
    //the order itself
    console.log('\n\nFailed Order Probably Bad Card, here is order.priceResponse the raw response from Dominos\n\n');
    console.dir(
        order.placeResponse,
        {depth:5}
    );
}