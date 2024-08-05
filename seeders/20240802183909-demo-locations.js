'use strict';

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Locations', [
      { 
        name: 'Central Park', 
        description: 'A large public park in New York City.', 
        address: 'New York, NY 10024', 
        coordinates: '40.785091,-73.968285', 
        userId: 1, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
      { 
        name: 'Golden Gate Park', 
        description: 'A large urban park in San Francisco.', 
        address: 'San Francisco, CA 94122', 
        coordinates: '37.769421,-122.486214', 
        userId: 2, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
      
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Locations', null, {});
  }
};
