const { validationResult } = require('express-validator');
const Review = require('../models/ReviewModel');

const createReview = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const recordId = Number(req.body.recordId);
    const record = await Review.canUserReviewRecord(req.userId, recordId);
    if (!record) {
      return res.status(400).json({ message: 'Отзыв можно оставить только после посещения записи' });
    }

    const existing = await Review.findByRecord(recordId);
    if (existing) {
      return res.status(400).json({ message: 'Для этой записи отзыв уже оставлен' });
    }

    const id = await Review.create({
      recordId,
      userId: req.userId,
      serviceId: record.serviceId,
      barberId: record.barberId,
      authorName: record.userName,
      rating: req.body.rating === undefined || req.body.rating === null || req.body.rating === '' ? null : Number(req.body.rating),
      text: req.body.text === undefined ? null : req.body.text
    });
    await Review.recalcBarberRating(record.barberId);

    res.status(201).json({ message: 'Отзыв сохранен', reviewId: id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateReview = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const review = await Review.findById(req.params.id);
    if (!review || review.userId !== req.userId) {
      return res.status(404).json({ message: 'Отзыв не найден' });
    }

    const updated = await Review.updateByOwner(req.params.id, req.userId, {
      rating:
        req.body.rating === undefined || req.body.rating === null || req.body.rating === ''
          ? null
          : Number(req.body.rating),
      text: req.body.text === undefined ? null : req.body.text
    });

    if (!updated) return res.status(400).json({ message: 'Не удалось обновить отзыв' });
    await Review.recalcBarberRating(review.barberId);
    res.json({ message: 'Отзыв обновлен' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review || review.userId !== req.userId) {
      return res.status(404).json({ message: 'Отзыв не найден' });
    }

    const deleted = await Review.deleteByOwner(req.params.id, req.userId);
    if (!deleted) return res.status(400).json({ message: 'Не удалось удалить отзыв' });
    await Review.recalcBarberRating(review.barberId);
    res.json({ message: 'Отзыв удален' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.listByUser(req.userId);
    res.json(reviews);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { createReview, updateReview, deleteReview, getMyReviews };
