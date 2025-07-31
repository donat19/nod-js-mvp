const { query } = require('../config/database');
const logger = require('../config/logger');

// Fake data arrays
const firstNames = [
    'John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'James', 'Lisa', 'Robert', 'Jennifer',
    'William', 'Jessica', 'Christopher', 'Ashley', 'Matthew', 'Amanda', 'Joshua', 'Stephanie',
    'Daniel', 'Melissa', 'Anthony', 'Nicole', 'Mark', 'Elizabeth', 'Steven', 'Helen', 'Andrew',
    'Maria', 'Kevin', 'Rachel', 'Brian', 'Laura', 'George', 'Kimberly', 'Edward', 'Deborah',
    'Ronald', 'Dorothy', 'Timothy', 'Amy', 'Jason', 'Angela', 'Jeffrey', 'Brenda', 'Ryan',
    'Emma', 'Jacob', 'Olivia', 'Gary', 'Cynthia', 'Nicholas', 'Marie', 'Eric', 'Janet',
    'Jonathan', 'Catherine', 'Stephen', 'Frances', 'Larry', 'Christine', 'Justin', 'Samantha'
];

const lastNames = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez',
    'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
    'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez',
    'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King', 'Wright',
    'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker',
    'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Gomez', 'Phillips',
    'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart'
];

const carMakes = [
    'Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan', 'BMW', 'Mercedes-Benz', 'Audi',
    'Volkswagen', 'Hyundai', 'Kia', 'Mazda', 'Subaru', 'Lexus', 'Acura', 'Infiniti',
    'Cadillac', 'Lincoln', 'Buick', 'GMC', 'Jeep', 'Ram', 'Dodge', 'Chrysler',
    'Volvo', 'Jaguar', 'Land Rover', 'Porsche', 'Tesla', 'Mini', 'Mitsubishi', 'Suzuki'
];

const carModels = {
    'Toyota': ['Camry', 'Corolla', 'RAV4', 'Highlander', 'Prius', 'Tacoma', 'Tundra', 'Sienna', 'Avalon', 'C-HR'],
    'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot', 'Odyssey', 'Fit', 'HR-V', 'Passport', 'Ridgeline', 'Insight'],
    'Ford': ['F-150', 'Escape', 'Explorer', 'Focus', 'Mustang', 'Edge', 'Expedition', 'Ranger', 'Fusion', 'Bronco'],
    'Chevrolet': ['Silverado', 'Equinox', 'Malibu', 'Traverse', 'Tahoe', 'Suburban', 'Camaro', 'Corvette', 'Cruze', 'Impala'],
    'Nissan': ['Altima', 'Sentra', 'Rogue', 'Pathfinder', 'Murano', 'Titan', 'Frontier', 'Armada', 'Maxima', 'Leaf'],
    'BMW': ['3 Series', '5 Series', 'X3', 'X5', 'X1', 'X7', '7 Series', 'Z4', 'i3', 'i8'],
    'Mercedes-Benz': ['C-Class', 'E-Class', 'GLC', 'GLE', 'A-Class', 'S-Class', 'GLA', 'GLB', 'CLA', 'G-Class'],
    'Audi': ['A4', 'A6', 'Q5', 'Q7', 'A3', 'Q3', 'A8', 'TT', 'R8', 'e-tron']
};

const bodyTypes = ['Sedan', 'SUV', 'Truck', 'Coupe', 'Convertible', 'Hatchback', 'Wagon', 'Minivan', 'Crossover'];
const fuelTypes = ['Gasoline', 'Diesel', 'Hybrid', 'Electric', 'Plug-in Hybrid'];
const transmissions = ['Automatic', 'Manual', 'CVT'];
const conditions = ['Excellent', 'Very Good', 'Good', 'Fair'];
const colors = ['White', 'Black', 'Silver', 'Gray', 'Red', 'Blue', 'Green', 'Brown', 'Gold', 'Orange', 'Yellow', 'Purple'];

const cities = [
    'Toronto, ON', 'Montreal, QC', 'Vancouver, BC', 'Calgary, AB', 'Edmonton, AB', 'Ottawa, ON',
    'Mississauga, ON', 'Winnipeg, MB', 'Quebec City, QC', 'Hamilton, ON', 'Brampton, ON',
    'Surrey, BC', 'Laval, QC', 'Halifax, NS', 'London, ON', 'Markham, ON', 'Vaughan, ON',
    'Gatineau, QC', 'Saskatoon, SK', 'Longueuil, QC', 'Burnaby, BC', 'Regina, SK',
    'Richmond, BC', 'Richmond Hill, ON', 'Oakville, ON', 'Burlington, ON', 'Sherbrooke, QC',
    'Oshawa, ON', 'Saguenay, QC', 'Lévis, QC', 'Barrie, ON', 'Abbotsford, BC',
    'Coquitlam, BC', 'Trois-Rivières, QC', 'St. Catharines, ON', 'Guelph, ON',
    'Cambridge, ON', 'Whitby, ON', 'Kelowna, BC', 'Kingston, ON', 'Ajax, ON',
    'Langley, BC', 'Saanich, BC', 'Terrebonne, QC', 'Milton, ON', 'St. John\'s, NL',
    'Moncton, NB', 'Thunder Bay, ON', 'Dieppe, NB', 'Waterloo, ON', 'Delta, BC',
    'Chatham-Kent, ON', 'Red Deer, AB', 'Kamloops, BC', 'Brantford, ON', 'Cape Breton, NS',
    'Lethbridge, AB', 'Saint-Jean-sur-Richelieu, QC', 'Clarington, ON', 'Pickering, ON',
    'Nanaimo, BC', 'Sudbury, ON', 'North Vancouver, BC', 'Brossard, QC'
];

const messageTemplates = [
    "Hi! I'm interested in your {make} {model}. Is it still available?",
    "Hello, can you tell me more about the condition of this car?",
    "Is the price negotiable?",
    "Can I schedule a test drive?",
    "What's the maintenance history like?",
    "Are there any issues I should know about?",
    "Has this car been in any accidents?",
    "I'd like to make an offer of ${price}",
    "When would be a good time to see the car?",
    "Do you have all the service records?",
    "Is the title clear?",
    "How many owners has this car had?",
    "What's your best price?",
    "I'm very interested. Can we meet tomorrow?",
    "Thanks for the quick response!",
    "That sounds reasonable. I'll take it!",
    "Let me think about it and get back to you.",
    "Can you send more photos?",
    "What's the fuel economy like?",
    "Does it come with a warranty?"
];

// Utility functions
function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomPrice(basePrice, variance = 0.3) {
    const min = Math.floor(basePrice * (1 - variance));
    const max = Math.floor(basePrice * (1 + variance));
    return getRandomNumber(min, max);
}

function generatePhoneNumber() {
    const area = getRandomNumber(200, 999);
    const exchange = getRandomNumber(200, 999);
    const number = getRandomNumber(1000, 9999);
    return `(${area}) ${exchange}-${number}`;
}

function generateEmail(firstName, lastName) {
    const domains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'];
    const domain = getRandomElement(domains);
    const formats = [
        `${firstName.toLowerCase()}.${lastName.toLowerCase()}`,
        `${firstName.toLowerCase()}${lastName.toLowerCase()}`,
        `${firstName.toLowerCase()}${getRandomNumber(10, 99)}`,
        `${firstName.toLowerCase()}_${lastName.toLowerCase()}`
    ];
    return `${getRandomElement(formats)}@${domain}`;
}

function generateVIN() {
    const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
    let vin = '';
    for (let i = 0; i < 17; i++) {
        vin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return vin;
}

function getCarBasePrice(make, model, year) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - year;
    
    // Base prices by make/model category
    const luxuryBrands = ['BMW', 'Mercedes-Benz', 'Audi', 'Lexus', 'Acura', 'Infiniti', 'Cadillac', 'Jaguar', 'Porsche'];
    const economyBrands = ['Toyota', 'Honda', 'Nissan', 'Hyundai', 'Kia', 'Mazda', 'Subaru'];
    
    let basePrice;
    if (luxuryBrands.includes(make)) {
        basePrice = getRandomNumber(35000, 80000);
    } else if (economyBrands.includes(make)) {
        basePrice = getRandomNumber(15000, 35000);
    } else {
        basePrice = getRandomNumber(20000, 50000);
    }
    
    // Depreciate based on age
    const depreciationRate = 0.15; // 15% per year
    const depreciatedPrice = basePrice * Math.pow(1 - depreciationRate, age);
    
    return Math.max(depreciatedPrice, 2000); // Minimum price of $2000
}

async function createUsers(count = 100) {
    console.log(`Creating ${count} users...`);
    const users = [];
    
    for (let i = 0; i < count; i++) {
        const firstName = getRandomElement(firstNames);
        const lastName = getRandomElement(lastNames);
        const email = generateEmail(firstName, lastName);
        const phone = generatePhoneNumber();
        const hashedPassword = 'hashed_password_123'; // Simple placeholder for demo
        
        try {
            const result = await query(`
                INSERT INTO users (name, email, phone, password_hash, is_admin, is_verified, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                RETURNING id
            `, [
                `${firstName} ${lastName}`,
                email,
                phone,
                hashedPassword,
                i < 5, // First 5 users are admins
                true,
                new Date(Date.now() - getRandomNumber(1, 365) * 24 * 60 * 60 * 1000) // Random date in last year
            ]);
            
            users.push(result.rows[0].id);
        } catch (error) {
            console.log(`Skipping user ${email} (probably duplicate)`);
        }
    }
    
    console.log(`Created ${users.length} users`);
    return users;
}

async function createCars(userIds, count = 200) {
    console.log(`Creating ${count} car listings...`);
    const carIds = [];
    
    for (let i = 0; i < count; i++) {
        const make = getRandomElement(carMakes);
        const model = getRandomElement(carModels[make] || ['Unknown']);
        const year = getRandomNumber(2010, 2024);
        const mileage = getRandomNumber(5000, 200000);
        const basePrice = getCarBasePrice(make, model, year);
        const price = getRandomPrice(basePrice);
        const bodyType = getRandomElement(bodyTypes);
        const fuelType = getRandomElement(fuelTypes);
        const transmission = getRandomElement(transmissions);
        const condition = getRandomElement(conditions);
        const color = getRandomElement(colors);
        const city = getRandomElement(cities);
        const vin = generateVIN();
        const userId = getRandomElement(userIds);
        
        const title = `${year} ${make} ${model}`;
        const description = `Beautiful ${year} ${make} ${model} in ${condition.toLowerCase()} condition. This ${color.toLowerCase()} ${bodyType.toLowerCase()} has been well maintained and runs great. Features ${transmission.toLowerCase()} transmission and ${fuelType.toLowerCase()} engine. Perfect for daily commuting or weekend adventures. Serious inquiries only. Clean title, no accidents. Must see to appreciate!`;
        
        const features = [];
        const possibleFeatures = [
            'Air Conditioning', 'Power Windows', 'Power Locks', 'Cruise Control',
            'Bluetooth', 'GPS Navigation', 'Backup Camera', 'Sunroof', 'Leather Seats',
            'Heated Seats', 'Premium Sound System', 'Alloy Wheels', 'Fog Lights',
            'Keyless Entry', 'Remote Start', 'Third Row Seating', 'Tow Package'
        ];
        
        const numFeatures = getRandomNumber(3, 8);
        for (let j = 0; j < numFeatures; j++) {
            const feature = getRandomElement(possibleFeatures);
            if (!features.includes(feature)) {
                features.push(feature);
            }
        }
        
        try {
            const result = await query(`
                INSERT INTO personal_ads (
                    user_id, title, description, make, model, year, mileage, price,
                    body_type, fuel_type, transmission, condition, exterior_color, 
                    vin, features, is_published, location_city, created_at, updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
                RETURNING id
            `, [
                userId, title, description, make, model, year, mileage, price,
                bodyType, fuelType, transmission, condition, color,
                vin, JSON.stringify(features), true, // is_published = true
                city, // location_city
                new Date(Date.now() - getRandomNumber(1, 180) * 24 * 60 * 60 * 1000), // Random date in last 6 months
                new Date()
            ]);
            
            carIds.push({
                id: result.rows[0].id,
                userId: userId,
                title: title,
                make: make,
                model: model,
                price: price
            });
        } catch (error) {
            console.log(`Error creating car ${i}:`, error.message);
        }
    }
    
    console.log(`Created ${carIds.length} car listings`);
    return carIds;
}

async function createConversations(userIds, carAds, count = 150) {
    console.log(`Creating ${count} conversations...`);
    const conversations = [];
    
    for (let i = 0; i < count; i++) {
        const car = getRandomElement(carAds);
        const sellerId = car.userId;
        let buyerId = getRandomElement(userIds);
        
        // Make sure buyer is not the same as seller
        while (buyerId === sellerId) {
            buyerId = getRandomElement(userIds);
        }
        
        const status = getRandomElement(['active', 'active', 'active', 'closed', 'archived']); // More active conversations
        
        try {
            const result = await query(`
                INSERT INTO conversations (ad_id, buyer_id, seller_id, status, created_at, last_message_at)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id
            `, [
                car.id,
                buyerId,
                sellerId,
                status,
                new Date(Date.now() - getRandomNumber(1, 90) * 24 * 60 * 60 * 1000), // Random date in last 3 months
                new Date(Date.now() - getRandomNumber(0, 7) * 24 * 60 * 60 * 1000)   // Last message within last week
            ]);
            
            conversations.push({
                id: result.rows[0].id,
                adId: car.id,
                buyerId: buyerId,
                sellerId: sellerId,
                carTitle: car.title,
                make: car.make,
                model: car.model,
                price: car.price
            });
        } catch (error) {
            console.log(`Skipping conversation ${i} (probably duplicate buyer-seller-ad combination)`);
        }
    }
    
    console.log(`Created ${conversations.length} conversations`);
    return conversations;
}

async function createMessages(conversations, count = 800) {
    console.log(`Creating ${count} messages...`);
    let messagesCreated = 0;
    
    for (const conversation of conversations) {
        const numMessages = getRandomNumber(3, 15); // 3-15 messages per conversation
        let lastMessageTime = new Date(Date.now() - getRandomNumber(1, 30) * 24 * 60 * 60 * 1000);
        
        for (let i = 0; i < numMessages && messagesCreated < count; i++) {
            const senderId = Math.random() < 0.6 ? conversation.buyerId : conversation.sellerId; // Buyers initiate more
            let messageText = getRandomElement(messageTemplates);
            
            // Replace placeholders in message templates
            messageText = messageText
                .replace('{make}', conversation.make)
                .replace('{model}', conversation.model)
                .replace('{price}', (conversation.price * 0.9).toLocaleString()); // Offer 10% less
            
            const messageType = Math.random() < 0.95 ? 'text' : getRandomElement(['offer', 'system']);
            const isRead = Math.random() < 0.8; // 80% of messages are read
            
            let metadata = null;
            if (messageType === 'offer') {
                metadata = JSON.stringify({
                    offerAmount: Math.floor(conversation.price * (0.8 + Math.random() * 0.2)), // Offer 80-100% of asking price
                    currency: 'USD'
                });
            }
            
            // Increment time for each message (realistic conversation flow)
            lastMessageTime = new Date(lastMessageTime.getTime() + getRandomNumber(10, 1440) * 60 * 1000); // 10 minutes to 24 hours between messages
            
            try {
                await query(`
                    INSERT INTO messages (
                        conversation_id, sender_id, message_text, message_type,
                        is_read, metadata, created_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                `, [
                    conversation.id,
                    senderId,
                    messageText,
                    messageType,
                    isRead,
                    metadata,
                    lastMessageTime
                ]);
                
                messagesCreated++;
            } catch (error) {
                console.log(`Error creating message:`, error.message);
            }
        }
    }
    
    console.log(`Created ${messagesCreated} messages`);
}

async function createVerificationCodes(userIds, count = 50) {
    console.log(`Creating ${count} verification codes...`);
    
    for (let i = 0; i < count; i++) {
        const userId = getRandomElement(userIds);
        const code = getRandomNumber(100000, 999999).toString();
        const isUsed = Math.random() < 0.7; // 70% of codes are used
        
        // Get user's phone number
        const userResult = await query('SELECT phone FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) continue;
        
        const phone = userResult.rows[0].phone;
        
        try {
            await query(`
                INSERT INTO verification_codes (phone, code, used, expires_at, created_at)
                VALUES ($1, $2, $3, $4, $5)
            `, [
                phone,
                code,
                isUsed,
                new Date(Date.now() + (isUsed ? -getRandomNumber(1, 24) : getRandomNumber(1, 24)) * 60 * 60 * 1000), // Expired if used, future if not
                new Date(Date.now() - getRandomNumber(1, 30) * 24 * 60 * 60 * 1000)
            ]);
        } catch (error) {
            console.log(`Error creating verification code:`, error.message);
        }
    }
    
    console.log(`Created verification codes`);
}

async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...\n');
        
        // Create users first
        const userIds = await createUsers(100);
        
        // Create car listings
        const carAds = await createCars(userIds, 200);
        
        // Create conversations
        const conversations = await createConversations(userIds, carAds, 150);
        
        // Create messages
        await createMessages(conversations, 800);
        
        // Create verification codes
        await createVerificationCodes(userIds, 50);
        
        console.log('\n✅ Database seeding completed successfully!');
        console.log('\n📊 Summary:');
        console.log(`- Users: ${userIds.length}`);
        console.log(`- Car Listings: ${carAds.length}`);
        console.log(`- Conversations: ${conversations.length}`);
        console.log(`- Messages: ~800`);
        console.log(`- Verification Codes: ~50`);
        
        console.log('\n🎉 Your AutoHub platform is now populated with realistic test data!');
        console.log('You can now test the chat system, browse car listings, and explore the advanced filter system.');
        
    } catch (error) {
        console.error('❌ Error seeding database:', error);
        logger.error('Database seeding failed', { error: error.message, stack: error.stack });
    }
}

// Run the seeding if this file is executed directly
if (require.main === module) {
    seedDatabase().then(() => {
        process.exit(0);
    }).catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { seedDatabase };
