'use strict';
const bcrypt = require('bcrypt');

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.bulkInsert('Users', [
      { 
        name: 'User One', 
        gender: 'Male', 
        cpf: '11111111111', 
        address: '123 Street, City, Country', 
        email: 'userone@example.com', 
        password: await bcrypt.hash('password', 8), 
        birthdate: '1990-01-01', 
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
      { 
        name: 'User Two', 
        gender: 'Female', 
        cpf: '22222222222', 
        address: '456 Street, City, Country', 
        email: 'usertwo@example.com', 
        password: await bcrypt.hash('password', 8), 
        birthdate: '1985-05-05', 
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
      // Adicione mais usuários conforme necessário
    ], {});
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('Users', null, {});
  }
};

