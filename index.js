require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./models');
const app = express();
const port = 3000;
const { check, validationResult } = require('express-validator');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');


app.use(bodyParser.json());
app.use(helmet());
app.use(cors());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // Limita cada IP a 100 solicitações por janela
});
app.use(limiter);
app.get('/', (req, res) => {
  res.send('Bem-vindo ao Exercita365 API!');
});


app.listen(port, async () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  try {
    await sequelize.authenticate();
    console.log('Conectado ao banco de dados!');
  } catch (erro) {
    console.error('Não foi possível conectar ao banco de dados:', erro);
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
 *                 description: Nome do usuário
 *                 example: Maria Oliveira
 *               gender:
 *                 type: string
 *                 description: Gênero do usuário (M ou F)
 *                 example: F
 *               cpf:
 *                 type: string
 *                 description: CPF do usuário (11 caracteres)
 *                 example: 98765432150
 *               address:
 *                 type: string
 *                 description: Endereço do usuário
 *                 example: Avenida Brasil, 500
 *               email:
 *                 type: string
 *                 description: Email do usuário
 *                 example: maria.oliveira@example.com
 *               password:
 *                 type: string
 *                 description: Senha do usuário
 *                 example: senha123
 *               birthdate:
 *                 type: string
 *                 format: date
 *                 description: Data de nascimento do usuário
 *                 example: 1985-07-15
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso!
 *       400:
 *         description: Erro no cadastro do usuário.
 */


app.post('/usuario', [
  check('name').not().isEmpty().withMessage('Name is required.'),
  check('gender').isIn(['M', 'F']).withMessage('Gender must be either M or F.'),
  check('cpf').isLength({ min: 11, max: 11 }).withMessage('CPF must be 11 characters long.'),
  check('address').not().isEmpty().withMessage('Address is required.'),
  check('email').isEmail().withMessage('Email is invalid.'),
  check('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long.'),
  check('birthdate').isISO8601().toDate().withMessage('Birthdate is invalid.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { name, gender, cpf, address, email, password, birthdate } = req.body;
  try {
    const existingUser = await User.findOne({ where: { [Op.or]: [{ cpf }, { email }] } });
    if (existingUser) {
      return res.status(400).send({ erro: 'Usuário com o mesmo CPF ou email já cadastrado.' });
    }
    const hashedPassword = await bcrypt.hash(password, 8);
    const user = await User.create({ name, gender, cpf, address, email, password: hashedPassword, birthdate });
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET);
    res.status(201).send({ user, token });
  } catch (erro) {
    console.error('Erro ao criar usuário:', erro);
    res.status(500).send({ erro: 'Erro ao criar usuário.' });
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
 *                 description: Email do usuário
 *                 example: maria.oliveira@example.com
 *               password:
 *                 type: string
 *                 description: Senha do usuário
 *                 example: senha123
 *     responses:
 *       200:
 *         description: Login realizado com sucesso!
 *       400:
 *         description: Erro no login.
 */


app.post('/login', [
  check('email').isEmail().normalizeEmail(),
  check('password').isLength({ min: 8 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).send({ erro: 'Usuário não encontrado.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send({ erro: 'Senha incorreta.' });
    }
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.send({ user, token });
  } catch (erro) {
    console.error('Erro ao realizar login:', erro);
    res.status(500).send({ erro: 'Erro ao realizar login.' });
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
 *                 description: Nome do local
 *                 example: Parque do Ibirapuera
 *               description:
 *                 type: string
 *                 description: Descrição do local
 *                 example: Um dos maiores parques urbanos de São Paulo.
 *               address:
 *                 type: string
 *                 description: Endereço do local
 *                 example: Avenida Pedro Álvares Cabral, s/n - Vila Mariana, São Paulo - SP, 04094-050
 *               coordinates:
 *                 type: string
 *                 description: Coordenadas do local
 *                 example: -23.587416, -46.657634
 *     responses:
 *       201:
 *         description: Local criado com sucesso!
 *       400:
 *         description: Erro na criação do local.
 */

app.post('/local', [
  auth,
  check('name').isString().isLength({ min: 1 }).trim().escape(),
  check('description').isString().isLength({ min: 1 }).trim().escape(),
  check('address').isString().trim().escape(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { name, description, address } = req.body;
  try {
    const location = await Location.create({ name, description, address, userId: req.user.id });
    res.status(201).send(location);
  } catch (erro) {
    console.error('Erro ao criar local:', erro);
    res.status(500).send({ erro: 'Erro ao criar local.' });
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
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   address:
 *                     type: string
 *                   coordinates:
 *                     type: string
 *                   userId:
 *                     type: integer
 *       400:
 *         description: Erro na listagem dos locais
 */

app.get('/local', auth, async (req, res) => {
  try {
    const locations = await Location.findAll({ where: { userId: req.user.id } });
    res.send(locations);
  } catch (erro) {
    console.error('Erro ao listar locais:', erro);
    res.status(500).send({ erro: 'Erro ao listar locais.' });
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
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 description:
 *                   type: string
 *                 address:
 *                   type: string
 *                 coordinates:
 *                   type: string
 *                 userId:
 *                   type: integer
 *       404:
 *         description: Local não encontrado
 */

app.get('/local/:local_id', auth, async (req, res) => {
  const { local_id } = req.params;

  try {
    const location = await Location.findOne({ where: { id: local_id, userId: req.user.id } });
    if (!location) {
      return res.status(404).send({ erro: 'Local não encontrado.' });
    }

    res.send(location);
  } catch (erro) {
    console.error('Erro ao obter detalhes do local:', erro);
    res.status(500).send({ erro: 'Erro ao obter detalhes do local.' });
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
 *                 example: "Academia XYZ"
 *               description:
 *                 type: string
 *                 example: "Academia com diversas modalidades de treino"
 *               address:
 *                 type: string
 *                 example: "Rua Exemplo, 456"
 *               coordinates:
 *                 type: string
 *                 example: "-23.561684, -46.625378"
 *     responses:
 *       200:
 *         description: Local atualizado com sucesso!
 *       404:
 *         description: Local não encontrado.
 */

app.put('/local/:local_id', [
  auth,
  check('name').optional().isString().trim().escape(),
  check('description').optional().isString().trim().escape(),
  check('address').optional().isString().trim().escape(),
  
], async (req, res) => {
  const { local_id } = req.params;
  const updates = req.body;

  try {
    const location = await Location.findOne({ where: { id: local_id, userId: req.user.id } });
    if (!location) {
      return res.status(404).send({ erro: 'Local não encontrado.' });
    }

    Object.keys(updates).forEach(update => location[update] = updates[update]);
    await location.save();

    res.send(location);
  } catch (erro) {
    console.error('Erro ao atualizar local:', erro);
    res.status(500).send({ erro: 'Erro ao atualizar local.' });
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
      return res.status(404).send({ erro: 'Local não encontrado.' });
    }

    await location.destroy();
    res.send({ mensagem: 'Local deletado com sucesso.' });
  } catch (erro) {
    console.error('Erro ao deletar local:', erro);
    res.status(500).send({ erro: 'Erro ao deletar local.' });
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
 *         description: ID do local
 *         example: 11
 *     responses:
 *       200:
 *         description: Link do Google Maps gerado com sucesso!
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 googleMapsLink:
 *                   type: string
 *                   description: Link do Google Maps
 *                   example: https://www.google.com/maps/search/?api=1&query=-23.587416,-46.657634
 *       404:
 *         description: Local ou endereço não encontrado.
 *       500:
 *         description: Erro ao gerar link do Google Maps.
 */

const axios = require('axios');

app.get('/local/:local_id/maps', auth, async (req, res) => {
  const { local_id } = req.params;

  try {
    const location = await Location.findOne({ where: { id: local_id, userId: req.user.id } });
    if (!location) {
      return res.status(404).send({ erro: 'Local não encontrado.' });
    }

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location.address)}&format=json&limit=1`;
    const response = await axios.get(url);
    if (response.data.length === 0) {
      return res.status(404).send({ erro: 'Endereço não encontrado no OpenStreetMap.' });
    }

    const { lat, lon } = response.data[0];
    const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

    res.send({ googleMapsLink });
  } catch (erro) {
    console.error('Erro ao gerar link do Google Maps:', erro);
    res.status(500).send({ erro: 'Erro ao gerar link do Google Maps.' });
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
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).send({ erro: 'Usuário não encontrado.' });
    }

    const locations = await Location.findAll({ where: { userId: id } });
    if (locations.length > 0) {
      return res.status(400).send({ erro: 'Usuário não pode ser deletado, pois possui locais associados.' });
    }

    await user.destroy();
    res.status(200).send({ mensagem: 'Usuário deletado com sucesso.' });
  } catch (erro) {
    console.error('Erro ao deletar usuário:', erro);
    res.status(500).send({ erro: 'Erro ao deletar usuário.' });
  }
});
