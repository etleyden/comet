/**
 * Default category taxonomy for the application.
 *
 * This file defines the seed data that can be loaded on any deployment
 * via the admin "Seed Default Categories" action. Categories are created
 * only if they don't already exist (matched by name + parent position).
 */

export interface TaxonomyChild {
    name: string;
    defaultDescription: string;
}

export interface TaxonomyParent {
    name: string;
    defaultDescription: string;
    children: TaxonomyChild[];
}

export const DEFAULT_TAXONOMY: TaxonomyParent[] = [
    {
        name: 'Housing',
        defaultDescription: 'Shelter and housing-related costs',
        children: [
            { name: 'Rent', defaultDescription: 'Monthly rent payments' },
            { name: 'Mortgage', defaultDescription: 'Mortgage payments' },
            { name: 'Home Insurance', defaultDescription: 'Homeowners or renters insurance' },
            { name: 'Home Maintenance', defaultDescription: 'Repairs and upkeep' },
        ],
    },
    {
        name: 'Transportation',
        defaultDescription: 'Getting from place to place',
        children: [
            { name: 'Gas', defaultDescription: 'Fuel for vehicles' },
            { name: 'Car Payment', defaultDescription: 'Vehicle loan or lease' },
            { name: 'Car Insurance', defaultDescription: 'Auto insurance premiums' },
            { name: 'Public Transit', defaultDescription: 'Buses, trains, rideshare' },
            { name: 'Parking', defaultDescription: 'Parking fees and meters' },
        ],
    },
    {
        name: 'Food & Drink',
        defaultDescription: 'All food and beverage spending',
        children: [
            { name: 'Groceries', defaultDescription: 'Grocery store purchases' },
            { name: 'Restaurants', defaultDescription: 'Dining out' },
            { name: 'Coffee Shops', defaultDescription: 'Coffee and tea purchases' },
            { name: 'Fast Food', defaultDescription: 'Quick-service restaurants' },
            { name: 'Alcohol', defaultDescription: 'Bars and liquor stores' },
        ],
    },
    {
        name: 'Utilities',
        defaultDescription: 'Recurring utility bills',
        children: [
            { name: 'Electric', defaultDescription: 'Electricity bills' },
            { name: 'Water', defaultDescription: 'Water and sewer' },
            { name: 'Gas (Utility)', defaultDescription: 'Natural gas bills' },
            { name: 'Internet', defaultDescription: 'Internet service' },
            { name: 'Phone', defaultDescription: 'Mobile and landline' },
        ],
    },
    {
        name: 'Healthcare',
        defaultDescription: 'Medical and health expenses',
        children: [
            { name: 'Doctor', defaultDescription: 'Doctor visits and co-pays' },
            { name: 'Pharmacy', defaultDescription: 'Prescriptions and medications' },
            { name: 'Health Insurance', defaultDescription: 'Health insurance premiums' },
            { name: 'Dental', defaultDescription: 'Dental care' },
            { name: 'Vision', defaultDescription: 'Eye care and glasses' },
        ],
    },
    {
        name: 'Entertainment',
        defaultDescription: 'Leisure and entertainment',
        children: [
            { name: 'Streaming', defaultDescription: 'Video and music streaming' },
            { name: 'Movies & Events', defaultDescription: 'Tickets and live events' },
            { name: 'Hobbies', defaultDescription: 'Hobby-related spending' },
            { name: 'Games', defaultDescription: 'Video games and board games' },
        ],
    },
    {
        name: 'Shopping',
        defaultDescription: 'Retail and merchandise purchases',
        children: [
            { name: 'Clothing', defaultDescription: 'Apparel purchases' },
            { name: 'Electronics', defaultDescription: 'Tech and gadgets' },
            { name: 'Home Goods', defaultDescription: 'Furniture and household items' },
        ],
    },
    {
        name: 'Personal Care',
        defaultDescription: 'Grooming and personal maintenance',
        children: [
            { name: 'Haircut', defaultDescription: 'Haircuts and styling' },
            { name: 'Gym', defaultDescription: 'Gym memberships and fitness' },
        ],
    },
    {
        name: 'Education',
        defaultDescription: 'Learning and educational costs',
        children: [
            { name: 'Tuition', defaultDescription: 'School tuition' },
            { name: 'Books & Supplies', defaultDescription: 'Textbooks and school supplies' },
            { name: 'Online Courses', defaultDescription: 'Online learning platforms' },
        ],
    },
    {
        name: 'Financial',
        defaultDescription: 'Fees, interest, and financial services',
        children: [
            { name: 'Bank Fees', defaultDescription: 'Account and service fees' },
            { name: 'Interest', defaultDescription: 'Interest charges' },
            { name: 'Taxes', defaultDescription: 'Tax payments' },
        ],
    },
    {
        name: 'Income',
        defaultDescription: 'Money received',
        children: [
            { name: 'Salary', defaultDescription: 'Employment income' },
            { name: 'Freelance', defaultDescription: 'Contract and freelance income' },
            { name: 'Refund', defaultDescription: 'Refunds and reimbursements' },
            { name: 'Interest Income', defaultDescription: 'Interest earned' },
        ],
    },
    {
        name: 'Gifts & Donations',
        defaultDescription: 'Giving to others',
        children: [
            { name: 'Gifts', defaultDescription: 'Gifts for others' },
            { name: 'Charitable Donations', defaultDescription: 'Donations to nonprofits' },
        ],
    },
    {
        name: 'Travel',
        defaultDescription: 'Travel-related expenses',
        children: [
            { name: 'Flights', defaultDescription: 'Airfare' },
            { name: 'Hotels', defaultDescription: 'Lodging and accommodations' },
            { name: 'Rental Car', defaultDescription: 'Vehicle rentals' },
        ],
    },
    {
        name: 'Subscriptions',
        defaultDescription: 'Recurring subscription services',
        children: [
            { name: 'Software', defaultDescription: 'Software and app subscriptions' },
            { name: 'News & Media', defaultDescription: 'News and media subscriptions' },
            { name: 'Memberships', defaultDescription: 'Clubs and membership fees' },
        ],
    },
];
