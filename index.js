require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./models');
const app = express();
const port = 3000;

app.use(bodyParser.json());

app.listen(port, async () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  try {
    await sequelize.authenticate();
    console.log('Conectado ao banco de dados!');
  } catch (error) {
    console.error('Não foi possível conectar ao banco de dados:', error);
  }
});

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, Location } = require('./models');
const auth = require('./middleware/auth');
const { Op } = require('sequelize');

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'Exercita365 API',
      version: '1.0.0',
    },
    servers: [
      {
        url: 'http://localhost:3000',
      },
    ],
  },
  apis: ['./index.js'],
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Rotas

/**
 * @swagger
 * /usuario:
 *   post:
 *     summary: Cria um novo usuário
 *     tags: [Usuários]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               gender:
 *                 type: string
 *               cpf:
 *                 type: string
 *               address:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               birthdate:
 *                 type: string
 *                 format: date
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso!
 *       400:
 *         description: Erro no cadastro do usuário.
 */
app.post('/usuario', async (req, res) => {
  const { name, gender, cpf, address, email, password, birthdate } = req.body;

  try {
    const existingUser = await User.findOne({ where: { [Op.or]: [{ cpf }, { email }] } });
    if (existingUser) {
      return res.status(400).send({ error: 'Usuário com o mesmo CPF ou email já cadastrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 8);
    const user = await User.create({ name, gender, cpf, address, email, password: hashedPassword, birthdate });
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);

    res.status(201).send({ user, token });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).send({ error: 'Erro ao criar usuário.' });
  }
});

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Realiza login de um usuário
 *     tags: [Usuários]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login realizado com sucesso!
 *       400:
 *         description: Erro no login.
 */
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).send({ error: 'Usuário não encontrado.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send({ error: 'Senha incorreta.' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
    res.send({ user, token });
  } catch (error) {
    console.error('Erro ao realizar login:', error);
    res.status(500).send({ error: 'Erro ao realizar login.' });
  }
});

/**
 * @swagger
 * /local:
 *   post:
 *     summary: Cria um novo local
 *     tags: [Locais]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               address:
 *                 type: string
 *               coordinates:
 *                 type: string
 *     responses:
 *       201:
 *         description: Local criado com sucesso!
 *       400:
 *         description: Erro na criação do local.
 */
app.post('/local', auth, async (req, res) => {
  const { name, description, address, coordinates } = req.body;

  try {
    const location = await Location.create({ name, description, address, coordinates, userId: req.user.id });
    res.status(201).send(location);
  } catch (error) {
    console.error('Erro ao criar local:', error);
    res.status(500).send({ error: 'Erro ao criar local.' });
  }
});

/**
 * @swagger
 * /local:
 *   get:
 *     summary: Lista todos os locais do usuário autenticado
 *     tags: [Locais]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de locais
 *       400:
 *         description: Erro na listagem dos locais
 */
app.get('/local', auth, async (req, res) => {
  try {
    const locations = await Location.findAll({ where: { userId: req.user.id } });
    res.send(locations);
  } catch (error) {
    console.error('Erro ao listar locais:', error);
    res.status(500).send({ error: 'Erro ao listar locais.' });
  }
});

/**
 * @swagger
 * /local/{local_id}:
 *   get:
 *     summary: Obtém detalhes de um local específico
 *     tags: [Locais]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: local_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalhes do local
 *       404:
 *         description: Local não encontrado
 */
app.get('/local/:local_id', auth, async (req, res) => {
  const { local_id } = req.params;

  try {
    const location = await Location.findOne({ where: { id: local_id, userId: req.user.id } });
    if (!location) {
      return res.status(404).send({ error: 'Local não encontrado.' });
    }

    res.send(location);
  } catch (error) {
    console.error('Erro ao obter detalhes do local:', error);
    res.status(500).send({ error: 'Erro ao obter detalhes do local.' });
  }
});

/**
 * @swagger
 * /local/{local_id}:
 *   put:
 *     summary: Atualiza informações de um local específico
 *     tags: [Locais]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: local_id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               address:
 *                 type: string
 *               coordinates:
 *                 type: string
 *     responses:
 *       200:
 *         description: Local atualizado com sucesso!
 *       404:
 *         description: Local não encontrado.
 */
app.put('/local/:local_id', auth, async (req, res) => {
  const { local_id } = req.params;
  const updates = req.body;

  try {
    const location = await Location.findOne({ where: { id: local_id, userId: req.user.id } });
    if (!location) {
      return res.status(404).send({ error: 'Local não encontrado.' });
    }

    Object.keys(updates).forEach(update => location[update] = updates[update]);
    await location.save();

    res.send(location);
  } catch (error) {
    console.error('Erro ao atualizar local:', error);
    res.status(500).send({ error: 'Erro ao atualizar local.' });
  }
});

/**
 * @swagger
 * /local/{local_id}:
 *   delete:
 *     summary: Deleta um local específico
 *     tags: [Locais]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: local_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Local deletado com sucesso!
 *       404:
 *         description: Local não encontrado.
 */
app.delete('/local/:local_id', auth, async (req, res) => {
  const { local_id } = req.params;

  try {
    const location = await Location.findOne({ where: { id: local_id, userId: req.user.id } });
    if (!location) {
      return res.status(404).send({ error: 'Local não encontrado.' });
    }

    await location.destroy();
    res.send({ message: 'Local deletado com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar local:', error);
    res.status(500).send({ error: 'Erro ao deletar local.' });
  }
});

/**
 * @swagger
 * /local/{local_id}/maps:
 *   get:
 *     summary: Gera link do Google Maps para um local específico
 *     tags: [Locais]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: local_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Link do Google Maps gerado com sucesso!
 *       404:
 *         description: Local ou endereço não encontrado.
 */
const axios = require('axios');

app.get('/local/:local_id/maps', auth, async (req, res) => {
  const { local_id } = req.params;

  try {
    const location = await Location.findOne({ where: { id: local_id, userId: req.user.id } });
    if (!location) {
      return res.status(404).send({ error: 'Local não encontrado.' });
    }

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location.address)}&format=json&limit=1`;
    const response = await axios.get(url);
    if (response.data.length === 0) {
      return res.status(404).send({ error: 'Endereço não encontrado no OpenStreetMap.' });
    }

    const { lat, lon } = response.data[0];
    const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

    res.send({ googleMapsLink });
  } catch (error) {
    console.error('Erro ao gerar link do Google Maps:', error);
    res.status(500).send({ error: 'Erro ao gerar link do Google Maps.' });
  }
});

/**
 * @swagger
 * /usuario/{id}:
 *   delete:
 *     summary: Deleta um usuário específico
 *     tags: [Usuários]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Usuário deletado com sucesso!
 *       404:
 *         description: Usuário não encontrado.
 */
app.delete('/usuario/:id', auth, async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar se o usuário possui locais associados
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).send({ error: 'Usuário não encontrado.' });
    }

    const locations = await Location.findAll({ where: { userId: id } });
    if (locations.length > 0) {
      return res.status(400).send({ error: 'Usuário não pode ser deletado, pois possui locais associados.' });
    }

    await user.destroy();
    res.status(200).send({ message: 'Usuário deletado com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar usuário:', error);
    res.status(500).send({ error: 'Erro ao deletar usuário.' });
  }
});








