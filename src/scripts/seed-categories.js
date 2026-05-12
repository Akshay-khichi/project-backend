require('dotenv').config();
const mongoose = require('mongoose');

const { connectDB } = require('../config/db'); 
const Category = require('../models/Category');

const seedCategories = async () => {
  try {
    await connectDB();

    await Category.deleteMany({});
    console.log('Cleared existing categories');

    const cseBranch = await Category.create({
      name: 'Computer Science',
      type: 'branch',
      slug: 'cse',
      order: 1,
      createdBy: new mongoose.Types.ObjectId()
    });

    const sem3 = await Category.create({
      name: 'Semester 3',
      type: 'semester',
      slug: 'sem3',
      parent: cseBranch._id,
      order: 3
    });

    const dsa = await Category.create({
      name: 'Data Structures & Algorithms',
      type: 'subject',
      slug: 'dsa',
      parent: sem3._id,
      order: 1
    });

    await Category.create({
      name: 'Unit 1: Arrays & Linked Lists',
      type: 'unit',
      slug: 'unit1-arrays',
      parent: dsa._id,
      order: 1
    });

    console.log('Category hierarchy seeded successfully');

    process.exit(0);

  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seedCategories();