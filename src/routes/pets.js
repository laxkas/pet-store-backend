const express = require('express');
const router = express.Router();
const logger = require('../logger');
const modelPath = process.env.USE_LOCAL_DB === 'true'
  ? '../models/petLocal'
  : process.env.USE_MEMORY_DB === 'true'
    ? '../models/pet-memory'
    : '../models/pet';
const { getAll, getById, create, deleteById, updateById } = require(modelPath);

// GET / — List all pets
router.get('/', async (req, res, next) => {
  try {
    let pets = await getAll();
    if (req.query.status) {
      pets = pets.filter(pet => pet.status === req.query.status);
    }
    res.status(200).json(pets);
  } catch (err) {
    next(err);
  }
});

// GET /:id — Get pet by ID
router.get('/:id', async (req, res, next) => {
  try {
    const pet = await getById(req.params.id);
    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }
    res.status(200).json(pet);
  } catch (err) {
    next(err);
  }
});

// POST / — Create a new pet
router.post('/', async (req, res, next) => {
  try {
    const { name, species, price } = req.body;
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!species) missingFields.push('species');
    if (price === undefined || price === null) missingFields.push('price');

    if (missingFields.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}` });
    }

    if (!req.body.status) {
      req.body.status = 'available';
    }
    const pet = await create(req.body);
    logger.info('pet_created', { petId: pet.petId, name: pet.name, species: pet.species, price: pet.price, status: pet.status });
    res.status(201).json(pet);
  } catch (err) {
    next(err);
  }
});

// PUT /:id — Update a pet
router.put('/:id', async (req, res, next) => {
  try {
    const { name, species, price } = req.body;
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!species) missingFields.push('species');
    if (price === undefined || price === null) missingFields.push('price');

    if (missingFields.length > 0) {
      return res.status(400).json({ error: `Missing required fields: ${missingFields.join(', ')}` });
    }

    const pet = await updateById(req.params.id, req.body);
    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }
    logger.info('pet_updated', { petId: pet.petId, name: pet.name, species: pet.species, price: pet.price, status: pet.status });
    res.status(200).json(pet);
  } catch (err) {
    next(err);
  }
});

// PATCH /:id/status — Update pet adoption status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const allowedStatuses = ['available', 'pending', 'adopted'];
    const { status } = req.body;
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}` });
    }
    const pet = await updateById(req.params.id, { status });
    if (!pet) {
      return res.status(404).json({ error: 'Pet not found' });
    }
    logger.info('pet_status_changed', { petId: pet.petId, status: pet.status });
    res.status(200).json(pet);
  } catch (err) {
    next(err);
  }
});

// DELETE /:id — Delete a pet
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await deleteById(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Pet not found' });
    }
    logger.info('pet_deleted', { petId: req.params.id });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
